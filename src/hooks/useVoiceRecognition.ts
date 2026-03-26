import { useState, useCallback, useRef, useEffect } from 'react';
import '@/types/speech.d.ts';

interface UseVoiceRecognitionReturn {
  isListening: boolean;
  isProcessing: boolean;
  isSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
  transcript: string | null;
  error: string | null;
  reset: () => void;
}

// Detect iOS (iPhone/iPad) — WKWebView via Capacitor uses webkitSpeechRecognition
function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

// On iOS via Capacitor (WKWebView), navigator.mediaDevices.getUserMedia is not the
// correct way to request speech recognition permission.  We must call
// SpeechRecognition.start() directly and handle the not-allowed error there.
// Calling getUserMedia first on iOS causes a double-permission prompt and may
// interfere with the speech API.
function shouldRequestMicBeforeStart(): boolean {
  return !isIOS() &&
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia;
}

export function useVoiceRecognition(): UseVoiceRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  // Track whether a result was received — used to distinguish silent onend from errors
  const resultReceivedRef = useRef(false);

  const isSupported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
    };
  }, []);

  const initRecognition = useCallback(() => {
    // Abort any existing recognition session before starting a new one
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }

    setError(null);
    setTranscript(null);
    setIsProcessing(false);
    resultReceivedRef.current = false;

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionAPI();

    // continuous = false: fire onresult once when speech ends (best for golf score entry)
    recognition.continuous = false;
    // interimResults = false: only deliver the final result (reduces noise on iOS)
    recognition.interimResults = false;
    // Language: en-US is the safest default; iOS honors this setting
    recognition.lang = 'en-US';
    // maxAlternatives = 1: we only need the top result for golf scoring
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
      resultReceivedRef.current = false;
    };

    recognition.onresult = (event) => {
      const result = event.results[0][0].transcript;
      resultReceivedRef.current = true;
      setTranscript(result);
      setIsListening(false);
      setIsProcessing(true);
    };

    recognition.onerror = (event) => {
      let errorMessage = 'Could not recognize speech. Try again.';

      switch (event.error) {
        case 'no-speech':
          errorMessage = 'No speech detected. Tap and try again.';
          break;
        case 'audio-capture':
          errorMessage = 'No microphone found. Please check your device.';
          break;
        case 'not-allowed':
          // On iOS: the user may need to grant Speech Recognition permission in Settings
          errorMessage = isIOS()
            ? 'Microphone or Speech Recognition access denied. Check Settings → Privacy.'
            : 'Microphone access denied. Please allow microphone access.';
          break;
        case 'network':
          // Chrome on desktop requires network access; Safari / WKWebView does on-device recognition
          errorMessage = isIOS()
            ? 'Speech recognition temporarily unavailable. Try again.'
            : 'Voice requires a stable connection. Try opening in a new tab or on your phone.';
          break;
        case 'aborted':
          // Intentional abort — no user-facing error needed
          errorMessage = '';
          break;
        case 'service-not-allowed':
          errorMessage = isIOS()
            ? 'Speech Recognition not enabled. Check Settings → Privacy → Speech Recognition.'
            : 'Speech service not available. Try opening in a new browser tab.';
          break;
        case 'bad-grammar':
          // Shouldn't happen since we don't set a grammar, but handle gracefully
          errorMessage = 'Could not understand. Please try again.';
          break;
        case 'language-not-supported':
          errorMessage = 'Language not supported. Please try again.';
          break;
      }

      if (errorMessage) {
        setError(errorMessage);
      }
      setIsListening(false);
      setIsProcessing(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      // On iOS, onend can fire without onresult when the microphone times out silently.
      // If no result was received and we're still in "listening" state, treat it as
      // a no-speech condition so the UI doesn't get stuck in a processing state.
      if (!resultReceivedRef.current) {
        setIsProcessing(false);
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (err) {
      setError('Failed to start voice recognition. Try again.');
      setIsListening(false);
      setIsProcessing(false);
    }
  }, []);

  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('Voice recognition not supported in this browser');
      return;
    }

    if (shouldRequestMicBeforeStart()) {
      // Non-iOS: explicitly request mic permission so the browser shows a clear prompt
      // before we start the recognition session.
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(() => {
          initRecognition();
        })
        .catch(() => {
          setError('Microphone access needed. Please allow microphone access.');
        });
    } else {
      // iOS (Capacitor / WKWebView) or environments without getUserMedia:
      // Start recognition directly — the OS will show its own permission prompt
      // on first use, and subsequent calls are handled natively.
      initRecognition();
    }
  }, [isSupported, initRecognition]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  }, []);

  const reset = useCallback(() => {
    setTranscript(null);
    setError(null);
    setIsProcessing(false);
    resultReceivedRef.current = false;
  }, []);

  return {
    isListening,
    isProcessing,
    isSupported,
    startListening,
    stopListening,
    transcript,
    error,
    reset,
  };
}
