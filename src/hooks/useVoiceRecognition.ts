import { useState, useCallback, useRef, useEffect } from 'react';
import { transcribeAudio, getPreferredMimeType, isVoiceSupported } from '@/lib/speechProvider';

interface UseVoiceRecognitionOptions {
  /** Player names to bias the speech model toward (Deepgram keyterm prompting) */
  playerNames?: string[];
}

interface UseVoiceRecognitionReturn {
  isListening: boolean;
  isProcessing: boolean;
  isSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
  transcript: string | null;
  interimTranscript: string | null;
  alternatives: string[];
  browserConfidence: number | null;
  audioLevel: number;
  isNoisy: boolean;
  error: string | null;
  reset: () => void;
}

/** Audio level above this = speech */
const SPEECH_THRESHOLD = 0.025;
/** Silence duration after speech to trigger transcription (ms) */
const SILENCE_AFTER_SPEECH_MS = 1400;
/** Max single utterance recording (ms) */
const MAX_UTTERANCE_MS = 10000;
/**
 * If AnalyserNode never reports audio (iOS Capacitor), auto-stop
 * recording after this many ms regardless.
 */
const IOS_FALLBACK_MS = 4000;
/** Delay before starting next VAD cycle after processing (ms) */
const CYCLE_RESTART_MS = 300;

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/**
 * Continuous voice recognition hook.
 *
 * Flow: press mic → mic stays hot → VAD detects speech → records utterance →
 * silence detected → transcribes via Deepgram → sets transcript → consumer
 * processes & calls reset() → next VAD cycle starts automatically.
 *
 * The mic stream stays open the entire time. Each natural pause between
 * phrases ("Rishi 5" ... "Jake 6") triggers a separate transcription.
 */
export function useVoiceRecognition(options: UseVoiceRecognitionOptions = {}): UseVoiceRecognitionReturn {
  const { playerNames = [] } = options;
  const playerNamesRef = useRef(playerNames);
  playerNamesRef.current = playerNames;

  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [interimTranscript, setInterimTranscript] = useState<string | null>(null);
  const [alternatives, setAlternatives] = useState<string[]>([]);
  const [browserConfidence, setBrowserConfidence] = useState<number | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isNoisy, setIsNoisy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs — mic stream is kept open across recording cycles
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const maxTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fallbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const cycleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const noiseSamplesRef = useRef<number[]>([]);

  /** true while the mic session is active (across multiple recording cycles) */
  const sessionActiveRef = useRef(false);
  /** true while a MediaRecorder is actively capturing audio */
  const isRecordingRef = useRef(false);
  /** true once the AnalyserNode has reported at least one non-zero level */
  const analyserWorkingRef = useRef(false);
  /** true once speech was detected in the current recording */
  const speechDetectedRef = useRef(false);
  /** true while we're waiting for the consumer to call reset() */
  const awaitingResetRef = useRef(false);

  const mimeType = useRef(getPreferredMimeType()).current;
  const isSupported = isVoiceSupported();

  // ── Timers ──────────────────────────────────────────────────────────

  const clearTimers = useCallback(() => {
    for (const ref of [silenceTimerRef, maxTimerRef, fallbackTimerRef, cycleTimerRef]) {
      if (ref.current) { clearTimeout(ref.current); ref.current = null; }
    }
  }, []);

  // ── Audio monitoring ────────────────────────────────────────────────

  const stopMonitoring = useCallback(() => {
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null; }
    if (audioContextRef.current) { audioContextRef.current.close().catch(() => {}); audioContextRef.current = null; }
    analyserRef.current = null;
    setAudioLevel(0);
    setIsNoisy(false);
  }, []);

  // ── Stop the current recorder without killing the mic stream ────────

  const stopCurrentRecorder = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      recorderRef.current.stop();
    }
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    if (maxTimerRef.current) { clearTimeout(maxTimerRef.current); maxTimerRef.current = null; }
    if (fallbackTimerRef.current) { clearTimeout(fallbackTimerRef.current); fallbackTimerRef.current = null; }
    isRecordingRef.current = false;
  }, []);

  // ── Full cleanup — kills mic stream, monitoring, everything ─────────

  const fullCleanup = useCallback(() => {
    clearTimers();
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try { recorderRef.current.stop(); } catch { /* already stopped */ }
    }
    recorderRef.current = null;
    stopMonitoring();
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    sessionActiveRef.current = false;
    isRecordingRef.current = false;
    speechDetectedRef.current = false;
    awaitingResetRef.current = false;
    analyserWorkingRef.current = false;
  }, [clearTimers, stopMonitoring]);

  useEffect(() => fullCleanup, [fullCleanup]);

  // ── Transcribe a recorded blob ──────────────────────────────────────

  const transcribeBlob = useCallback(async (blob: Blob) => {
    setIsProcessing(true);
    setInterimTranscript('Processing...');
    awaitingResetRef.current = true;

    try {
      console.log('[Voice] Sending blob to Deepgram, size:', blob.size, 'type:', blob.type);

      if (blob.size < 200) {
        console.log('[Voice] Blob too small, skipping');
        // Don't show error — just restart the cycle silently
        setIsProcessing(false);
        setInterimTranscript(null);
        awaitingResetRef.current = false;
        return;
      }

      const result = await transcribeAudio(blob, playerNamesRef.current);
      console.log('[Voice] Result:', JSON.stringify(result));

      setInterimTranscript(null);

      if (!result.transcript) {
        // Empty transcript — restart cycle, no error
        setIsProcessing(false);
        awaitingResetRef.current = false;
        return;
      }

      // Set transcript — the consumer (useVoiceScoring) will process it
      // and call reset(), which starts the next cycle
      setTranscript(result.transcript);
      setAlternatives(result.alternatives);
      setBrowserConfidence(result.confidence);
    } catch (err) {
      console.error('[Voice] Transcription error:', err);
      setInterimTranscript(null);
      setIsProcessing(false);
      awaitingResetRef.current = false;

      const message = err instanceof Error ? err.message : 'Transcription failed';
      if (message.includes('Not authenticated')) {
        setError('Please sign in to use voice scoring.');
      } else if (message.includes('Rate limit')) {
        setError('Too many voice requests. Try again in a few minutes.');
      } else {
        setError('Voice transcription failed. Check your connection.');
      }
    }
  }, []);

  // ── Start a single recording cycle (VAD → record → silence → transcribe) ──

  const startRecordingCycle = useCallback(() => {
    const stream = mediaStreamRef.current;
    if (!stream || !sessionActiveRef.current) return;

    // Set up AnalyserNode if not already running
    if (!analyserRef.current) {
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          audioContextRef.current = ctx;
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          analyser.smoothingTimeConstant = 0.8;
          analyserRef.current = analyser;
          ctx.createMediaStreamSource(stream).connect(analyser);
        }
      } catch {
        // Will use fallback timer
      }
    }

    // Reset per-cycle state
    speechDetectedRef.current = false;
    isRecordingRef.current = false;
    chunksRef.current = [];
    noiseSamplesRef.current = [];
    analyserWorkingRef.current = false;

    // Create recorder (but don't start yet — wait for speech)
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      isRecordingRef.current = false;
      const chunks = chunksRef.current;
      chunksRef.current = [];

      if (chunks.length > 0 && sessionActiveRef.current) {
        const blob = new Blob(chunks, { type: mimeType || 'audio/webm' });
        transcribeBlob(blob);
      }
    };

    recorder.onerror = () => {
      isRecordingRef.current = false;
      // Silently restart cycle
      if (sessionActiveRef.current) {
        cycleTimerRef.current = setTimeout(() => startRecordingCycle(), CYCLE_RESTART_MS);
      }
    };

    // Start recording immediately — don't wait for VAD on iOS since
    // AnalyserNode often doesn't work. The user pressed the mic button,
    // they're about to speak.
    recorder.start();
    isRecordingRef.current = true;
    setInterimTranscript('Listening...');

    // iOS fallback: if analyser never reports audio, stop after fixed duration
    fallbackTimerRef.current = setTimeout(() => {
      if (isRecordingRef.current && !analyserWorkingRef.current && sessionActiveRef.current) {
        console.log('[Voice] iOS fallback — stopping recording');
        stopCurrentRecorder();
      }
    }, IOS_FALLBACK_MS);

    // Absolute max recording cap
    maxTimerRef.current = setTimeout(() => {
      if (isRecordingRef.current) {
        console.log('[Voice] Max duration — stopping recording');
        stopCurrentRecorder();
      }
    }, MAX_UTTERANCE_MS);

    // VAD loop — monitor for silence after speech
    const analyser = analyserRef.current;
    if (analyser) {
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const vadLoop = () => {
        if (!sessionActiveRef.current || !analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const n = dataArray[i] / 255;
          sum += n * n;
        }
        const rms = Math.sqrt(sum / dataArray.length);
        const level = Math.min(1, rms * 3);

        setAudioLevel(level);

        // Track if analyser is actually working (reports non-zero)
        if (level > 0.001) {
          analyserWorkingRef.current = true;
        }

        // Noise detection (first ~500ms)
        if (noiseSamplesRef.current.length < 15) {
          noiseSamplesRef.current.push(rms);
          if (noiseSamplesRef.current.length === 15) {
            const avg = noiseSamplesRef.current.reduce((a, b) => a + b, 0) / 15;
            setIsNoisy(avg > 0.1);
          }
        }

        if (level > SPEECH_THRESHOLD) {
          speechDetectedRef.current = true;
          // Cancel fallback timer — analyser is working and speech detected
          if (fallbackTimerRef.current) {
            clearTimeout(fallbackTimerRef.current);
            fallbackTimerRef.current = null;
          }
          // Clear silence timer — still speaking
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
        } else if (speechDetectedRef.current && !silenceTimerRef.current && isRecordingRef.current) {
          // Speech ended — start silence timer
          silenceTimerRef.current = setTimeout(() => {
            if (isRecordingRef.current && sessionActiveRef.current) {
              console.log('[Voice] Silence detected — stopping recording');
              stopCurrentRecorder();
            }
          }, SILENCE_AFTER_SPEECH_MS);
        }

        animFrameRef.current = requestAnimationFrame(vadLoop);
      };

      animFrameRef.current = requestAnimationFrame(vadLoop);
    }
  }, [mimeType, transcribeBlob, stopCurrentRecorder]);

  // ── Public API ──────────────────────────────────────────────────────

  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('Voice recording not supported on this device.');
      return;
    }
    if (!navigator.onLine) {
      setError('Voice scoring requires an internet connection.');
      return;
    }

    // Reset state
    setError(null);
    setTranscript(null);
    setInterimTranscript(null);
    setAlternatives([]);
    setBrowserConfidence(null);
    setIsProcessing(false);
    awaitingResetRef.current = false;

    // If session is already active, just restart a cycle
    if (sessionActiveRef.current && mediaStreamRef.current) {
      startRecordingCycle();
      setIsListening(true);
      return;
    }

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
        mediaStreamRef.current = stream;
        sessionActiveRef.current = true;
        setIsListening(true);
        startRecordingCycle();
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'NotAllowedError') {
          setError(
            isIOS()
              ? 'Microphone access denied. Check Settings → Privacy → Microphone.'
              : 'Microphone access denied. Please allow microphone access.',
          );
        } else {
          setError('Could not access microphone. Please check your device.');
        }
      });
  }, [isSupported, startRecordingCycle]);

  const stopListening = useCallback(() => {
    // Stop the recorder — this triggers onstop → transcribeBlob
    // The mic stream stays alive until transcription completes and reset() is called
    if (isRecordingRef.current) {
      stopCurrentRecorder();
    }
    setIsListening(false);
    clearTimers();
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  }, [stopCurrentRecorder, clearTimers]);

  const reset = useCallback(() => {
    setTranscript(null);
    setInterimTranscript(null);
    setAlternatives([]);
    setBrowserConfidence(null);
    setError(null);
    setIsProcessing(false);
    awaitingResetRef.current = false;

    // Single-utterance mode — don't auto-restart.
    // Clean up the session fully.
    if (sessionActiveRef.current) {
      sessionActiveRef.current = false;
      setIsListening(false);
      stopMonitoring();
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
        mediaStreamRef.current = null;
      }
    }
  }, [stopMonitoring]);

  return {
    isListening,
    isProcessing,
    isSupported,
    startListening,
    stopListening,
    transcript,
    interimTranscript,
    alternatives,
    browserConfidence,
    audioLevel,
    isNoisy,
    error,
    reset,
  };
}
