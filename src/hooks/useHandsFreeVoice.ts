import { useState, useCallback, useRef, useEffect } from 'react';
import { transcribeAudio, getPreferredMimeType, isVoiceSupported } from '@/lib/speechProvider';

interface UseHandsFreeVoiceOptions {
  onTranscript: (transcript: string) => void;
  enabled?: boolean;
  /** Player names to bias the speech model toward */
  playerNames?: string[];
}

interface UseHandsFreeVoiceReturn {
  isActive: boolean;
  isDetectingSpeech: boolean;
  start: () => void;
  stop: () => void;
}

/** Audio level above this = speech detected */
const SPEECH_THRESHOLD = 0.04;
/** Silence duration to trigger end-of-utterance (ms) */
const SILENCE_DURATION_MS = 1500;
/** Min speech duration to bother transcribing (ms) */
const MIN_SPEECH_MS = 300;
/** Max single utterance recording (ms) */
const MAX_UTTERANCE_MS = 12000;
/** Pause between utterances before restarting detection (ms) */
const RESTART_DELAY_MS = 500;

/**
 * Hands-free continuous voice mode.
 * Uses MediaRecorder + VAD (voice activity detection) to auto-segment speech.
 * Each detected utterance is sent to the speech-to-text edge function.
 */
export function useHandsFreeVoice({
  onTranscript,
  enabled = false,
  playerNames = [],
}: UseHandsFreeVoiceOptions): UseHandsFreeVoiceReturn {
  const [isActive, setIsActive] = useState(false);
  const [isDetectingSpeech, setIsDetectingSpeech] = useState(false);

  const isActiveRef = useRef(false);
  const onTranscriptRef = useRef(onTranscript);
  const playerNamesRef = useRef(playerNames);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const maxTimerRef = useRef<NodeJS.Timeout | null>(null);
  const restartTimerRef = useRef<NodeJS.Timeout | null>(null);
  const speechStartedRef = useRef(false);
  const recordingStartTimeRef = useRef(0);
  const isProcessingRef = useRef(false);

  const mimeType = useRef(getPreferredMimeType()).current;
  const supported = isVoiceSupported();

  useEffect(() => { onTranscriptRef.current = onTranscript; }, [onTranscript]);
  useEffect(() => { playerNamesRef.current = playerNames; }, [playerNames]);

  const clearTimers = useCallback(() => {
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    if (maxTimerRef.current) { clearTimeout(maxTimerRef.current); maxTimerRef.current = null; }
    if (restartTimerRef.current) { clearTimeout(restartTimerRef.current); restartTimerRef.current = null; }
  }, []);

  const stopMonitoring = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
  }, []);

  const cleanup = useCallback(() => {
    clearTimers();
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
    recorderRef.current = null;
    stopMonitoring();
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    speechStartedRef.current = false;
    isProcessingRef.current = false;
  }, [clearTimers, stopMonitoring]);

  /** Send a recorded utterance to the provider and fire callback */
  const processUtterance = useCallback(async (blob: Blob) => {
    if (blob.size < 100 || isProcessingRef.current) return;

    const speechDuration = Date.now() - recordingStartTimeRef.current;
    if (speechDuration < MIN_SPEECH_MS) return;

    isProcessingRef.current = true;
    try {
      const result = await transcribeAudio(blob, playerNamesRef.current);
      if (result.transcript && isActiveRef.current) {
        onTranscriptRef.current(result.transcript);
      }
    } catch {
      // Silently continue — transient errors shouldn't kill hands-free mode
    } finally {
      isProcessingRef.current = false;
    }
  }, []);

  /** Start VAD-based recording cycle on the given stream */
  const startVADCycle = useCallback((stream: MediaStream) => {
    if (!isActiveRef.current) return;

    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    // Set up audio analysis if not already running
    if (!audioContextRef.current) {
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
    }

    const analyser = analyserRef.current;
    if (!analyser) return;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    speechStartedRef.current = false;
    setIsDetectingSpeech(false);

    const startRecording = () => {
      if (!isActiveRef.current || !mediaStreamRef.current) return;

      chunksRef.current = [];
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const chunks = chunksRef.current;
        chunksRef.current = [];
        setIsDetectingSpeech(false);

        if (chunks.length > 0) {
          const blob = new Blob(chunks, { type: mimeType || 'audio/webm' });
          processUtterance(blob).then(() => {
            // Restart detection after processing
            if (isActiveRef.current) {
              restartTimerRef.current = setTimeout(() => {
                if (isActiveRef.current && mediaStreamRef.current) {
                  startVADCycle(mediaStreamRef.current);
                }
              }, RESTART_DELAY_MS);
            }
          });
        } else if (isActiveRef.current && mediaStreamRef.current) {
          restartTimerRef.current = setTimeout(() => {
            if (isActiveRef.current && mediaStreamRef.current) {
              startVADCycle(mediaStreamRef.current);
            }
          }, RESTART_DELAY_MS);
        }
      };

      recorder.start();
      recordingStartTimeRef.current = Date.now();
      setIsDetectingSpeech(true);

      // Max utterance safety cap
      maxTimerRef.current = setTimeout(() => {
        if (recorderRef.current?.state === 'recording') {
          recorderRef.current.stop();
        }
      }, MAX_UTTERANCE_MS);
    };

    // VAD loop — monitor audio level to detect speech start/end
    const monitorVAD = () => {
      if (!isActiveRef.current || !analyserRef.current) return;

      analyserRef.current.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const n = dataArray[i] / 255;
        sum += n * n;
      }
      const rms = Math.sqrt(sum / dataArray.length);
      const level = Math.min(1, rms * 3);

      if (!speechStartedRef.current) {
        // Waiting for speech to start
        if (level > SPEECH_THRESHOLD) {
          speechStartedRef.current = true;
          startRecording();
        }
        animFrameRef.current = requestAnimationFrame(monitorVAD);
      } else {
        // Speech started — monitor for silence to stop recording
        if (level > SPEECH_THRESHOLD) {
          // Still speaking — reset silence timer
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
        } else if (!silenceTimerRef.current) {
          // Silence detected — start timer
          silenceTimerRef.current = setTimeout(() => {
            if (recorderRef.current?.state === 'recording') {
              if (maxTimerRef.current) { clearTimeout(maxTimerRef.current); maxTimerRef.current = null; }
              recorderRef.current.stop();
            }
          }, SILENCE_DURATION_MS);
        }
        animFrameRef.current = requestAnimationFrame(monitorVAD);
      }
    };

    animFrameRef.current = requestAnimationFrame(monitorVAD);
  }, [mimeType, processUtterance]);

  const start = useCallback(() => {
    if (!supported || !navigator.onLine) return;

    setIsActive(true);
    isActiveRef.current = true;

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
        if (!isActiveRef.current) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        mediaStreamRef.current = stream;
        startVADCycle(stream);
      })
      .catch(() => {
        setIsActive(false);
        isActiveRef.current = false;
      });
  }, [supported, startVADCycle]);

  const stop = useCallback(() => {
    setIsActive(false);
    isActiveRef.current = false;
    setIsDetectingSpeech(false);
    cleanup();
  }, [cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isActiveRef.current = false;
      cleanup();
    };
  }, [cleanup]);

  // Auto-start/stop based on enabled prop
  useEffect(() => {
    if (enabled && !isActive && supported && navigator.onLine) {
      start();
    } else if (!enabled && isActive) {
      stop();
    }
  }, [enabled, isActive, supported, start, stop]);

  // Stop if we go offline
  useEffect(() => {
    const handleOffline = () => {
      if (isActiveRef.current) stop();
    };
    window.addEventListener('offline', handleOffline);
    return () => window.removeEventListener('offline', handleOffline);
  }, [stop]);

  return {
    isActive,
    isDetectingSpeech,
    start,
    stop,
  };
}
