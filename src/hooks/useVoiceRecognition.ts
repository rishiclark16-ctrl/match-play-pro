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

/** Silence threshold — stop recording after this much quiet (ms) */
const SILENCE_TIMEOUT_MS = 1800;
/** Audio level below this = silence */
const SILENCE_THRESHOLD = 0.02;
/** Max recording duration (ms) — safety cap */
const MAX_RECORDING_MS = 15000;

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

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

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const noiseSamplesRef = useRef<number[]>([]);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const maxTimerRef = useRef<NodeJS.Timeout | null>(null);
  const speechDetectedRef = useRef(false);
  const isListeningRef = useRef(false);
  const mimeTypeRef = useRef(getPreferredMimeType());

  const isSupported = isVoiceSupported();

  // Audio level monitoring via AnalyserNode — same approach as before
  const startAudioMonitoring = useCallback((stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      noiseSamplesRef.current = [];

      const updateLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const normalized = dataArray[i] / 255;
          sum += normalized * normalized;
        }
        const rms = Math.sqrt(sum / dataArray.length);
        const level = Math.min(1, rms * 3);

        setAudioLevel(level);

        // Detect speech activity for auto-stop
        if (level > SILENCE_THRESHOLD) {
          speechDetectedRef.current = true;
          // Clear silence timer when speech detected
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
        } else if (speechDetectedRef.current && !silenceTimerRef.current && isListeningRef.current) {
          // Speech was detected but now it's quiet — start silence timer
          silenceTimerRef.current = setTimeout(() => {
            if (isListeningRef.current) {
              stopRecording();
            }
          }, SILENCE_TIMEOUT_MS);
        }

        // Collect noise samples for first ~500ms
        if (noiseSamplesRef.current.length < 15) {
          noiseSamplesRef.current.push(rms);
          if (noiseSamplesRef.current.length === 15) {
            const avgNoise = noiseSamplesRef.current.reduce((a, b) => a + b, 0) / 15;
            setIsNoisy(avgNoise > 0.1);
          }
        }

        animFrameRef.current = requestAnimationFrame(updateLevel);
      };

      animFrameRef.current = requestAnimationFrame(updateLevel);
    } catch {
      // Audio monitoring is optional
    }
  }, []);

  const stopAudioMonitoring = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevel(0);
    setIsNoisy(false);
  }, []);

  const cleanup = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (maxTimerRef.current) {
      clearTimeout(maxTimerRef.current);
      maxTimerRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
    recorderRef.current = null;
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    stopAudioMonitoring();
    speechDetectedRef.current = false;
    isListeningRef.current = false;
  }, [stopAudioMonitoring]);

  // Cleanup on unmount
  useEffect(() => cleanup, [cleanup]);

  const stopRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      recorderRef.current.stop();
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (maxTimerRef.current) {
      clearTimeout(maxTimerRef.current);
      maxTimerRef.current = null;
    }
  }, []);

  const processRecording = useCallback(async (blob: Blob) => {
    setIsListening(false);
    isListeningRef.current = false;
    setIsProcessing(true);
    setInterimTranscript('Processing...');

    // Stop mic and monitoring
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    stopAudioMonitoring();

    try {
      if (blob.size < 100) {
        setError('No speech detected. Tap and try again.');
        setIsProcessing(false);
        setInterimTranscript(null);
        return;
      }

      const result = await transcribeAudio(blob, playerNamesRef.current);

      setInterimTranscript(null);

      if (!result.transcript) {
        setError('No speech detected. Tap and try again.');
        setIsProcessing(false);
        return;
      }

      setTranscript(result.transcript);
      setAlternatives(result.alternatives);
      setBrowserConfidence(result.confidence);
      setIsProcessing(true); // stays true until consumer calls reset
    } catch (err) {
      setInterimTranscript(null);
      const message = err instanceof Error ? err.message : 'Transcription failed';
      if (message.includes('Not authenticated')) {
        setError('Please sign in to use voice scoring.');
      } else if (message.includes('Rate limit')) {
        setError('Too many voice requests. Try again in a few minutes.');
      } else {
        setError('Voice transcription failed. Check your connection and try again.');
      }
      setIsProcessing(false);
    }
  }, [stopAudioMonitoring]);

  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('Voice recording not supported on this device.');
      return;
    }

    if (!navigator.onLine) {
      setError('Voice scoring requires an internet connection.');
      return;
    }

    setError(null);
    setTranscript(null);
    setInterimTranscript(null);
    setAlternatives([]);
    setBrowserConfidence(null);
    setIsProcessing(false);
    chunksRef.current = [];
    speechDetectedRef.current = false;

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
        mediaStreamRef.current = stream;
        startAudioMonitoring(stream);

        const mimeType = mimeTypeRef.current;
        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        recorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunksRef.current.push(e.data);
          }
        };

        recorder.onstop = () => {
          const chunks = chunksRef.current;
          chunksRef.current = [];
          if (chunks.length > 0) {
            const blob = new Blob(chunks, { type: mimeType || 'audio/webm' });
            processRecording(blob);
          } else {
            setIsListening(false);
            isListeningRef.current = false;
            setIsProcessing(false);
          }
        };

        recorder.onerror = () => {
          setError('Recording failed. Try again.');
          cleanup();
          setIsListening(false);
          setIsProcessing(false);
        };

        recorder.start();
        setIsListening(true);
        isListeningRef.current = true;
        setInterimTranscript('Listening...');

        // Safety timeout — stop after max duration
        maxTimerRef.current = setTimeout(() => {
          if (isListeningRef.current) {
            stopRecording();
          }
        }, MAX_RECORDING_MS);
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
  }, [isSupported, startAudioMonitoring, processRecording, stopRecording, cleanup]);

  const stopListening = useCallback(() => {
    stopRecording();
  }, [stopRecording]);

  const reset = useCallback(() => {
    setTranscript(null);
    setInterimTranscript(null);
    setAlternatives([]);
    setBrowserConfidence(null);
    setError(null);
    setIsProcessing(false);
  }, []);

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
