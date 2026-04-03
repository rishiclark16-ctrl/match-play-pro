import { useState, useCallback, useRef, useEffect } from 'react';

interface UseHandsFreeVoiceOptions {
  onTranscript: (transcript: string) => void;
  enabled?: boolean;
}

interface UseHandsFreeVoiceReturn {
  isActive: boolean;
  isDetectingSpeech: boolean;
  start: () => void;
  stop: () => void;
}

/**
 * Hands-free continuous voice mode.
 * Uses Web Speech API in continuous mode to auto-segment speech
 * and dispatch individual commands without requiring a button press.
 */
export function useHandsFreeVoice({
  onTranscript,
  enabled = false,
}: UseHandsFreeVoiceOptions): UseHandsFreeVoiceReturn {
  const [isActive, setIsActive] = useState(false);
  const [isDetectingSpeech, setIsDetectingSpeech] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isActiveRef = useRef(false);
  const onTranscriptRef = useRef(onTranscript);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  const isSupported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const cleanup = useCallback(() => {
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }
  }, []);

  const startSession = useCallback(() => {
    if (!isSupported || !isActiveRef.current) return;

    cleanup();

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionAPI();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      setIsDetectingSpeech(true);

      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        }
      }

      if (finalTranscript.trim()) {
        onTranscriptRef.current(finalTranscript.trim());
        setIsDetectingSpeech(false);
      }
    };

    recognition.onspeechend = () => {
      setIsDetectingSpeech(false);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setIsDetectingSpeech(false);

      // Don't restart on fatal errors
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setIsActive(false);
        isActiveRef.current = false;
        return;
      }

      // Auto-restart on transient errors
      if (isActiveRef.current) {
        restartTimeoutRef.current = setTimeout(startSession, 1000);
      }
    };

    recognition.onend = () => {
      setIsDetectingSpeech(false);

      // If still in hands-free mode, restart recognition
      if (isActiveRef.current) {
        restartTimeoutRef.current = setTimeout(startSession, 500);
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      if (isActiveRef.current) {
        restartTimeoutRef.current = setTimeout(startSession, 1000);
      }
    }
  }, [isSupported, cleanup]);

  const start = useCallback(() => {
    if (!isSupported) return;
    setIsActive(true);
    isActiveRef.current = true;
    startSession();
  }, [isSupported, startSession]);

  const stop = useCallback(() => {
    setIsActive(false);
    isActiveRef.current = false;
    setIsDetectingSpeech(false);
    cleanup();
  }, [cleanup]);

  // Stop on unmount
  useEffect(() => {
    return () => {
      isActiveRef.current = false;
      cleanup();
    };
  }, [cleanup]);

  // Auto-start/stop based on enabled prop
  useEffect(() => {
    if (enabled && !isActive && isSupported) {
      start();
    } else if (!enabled && isActive) {
      stop();
    }
  }, [enabled, isActive, isSupported, start, stop]);

  return {
    isActive,
    isDetectingSpeech,
    start,
    stop,
  };
}
