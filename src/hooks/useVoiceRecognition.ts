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

export function useVoiceRecognition(): UseVoiceRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<any>(null);
  
  const isSupported = typeof window !== 'undefined' && 
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('Voice recognition not supported in this browser');
      return;
    }
    
    // Request microphone permission first
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(() => {
          // Permission granted, proceed with recognition
          initRecognition();
        })
        .catch((err) => {
          // Permission error handled
          setError('Microphone access needed. Please allow microphone access.');
        });
    } else {
      // Try anyway (some browsers don't need explicit permission request)
      initRecognition();
    }
  }, [isSupported]);

  const initRecognition = useCallback(() => {
    setError(null);
    setTranscript(null);
    setIsProcessing(false);
    
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionAPI();
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    
    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };
    
    recognition.onresult = (event) => {
      const result = event.results[0][0].transcript;
      setTranscript(result);
      setIsListening(false);
      setIsProcessing(true);
    };
    
    recognition.onerror = (event) => {
      // Recognition error handled
      
      let errorMessage = 'Could not recognize speech. Try again.';
      
      switch (event.error) {
        case 'no-speech':
          errorMessage = 'No speech detected. Tap and try again.';
          break;
        case 'audio-capture':
          errorMessage = 'No microphone found. Please check your device.';
          break;
        case 'not-allowed':
          errorMessage = 'Microphone access denied. Please allow microphone access.';
          break;
        case 'network':
          // Network error is common in embedded iframes/preview environments
          // The browser's speech API requires internet access to Google's servers
          errorMessage = 'Voice requires a stable connection. Try opening in a new tab or on your phone.';
          break;
        case 'aborted':
          errorMessage = '';
          break;
        case 'service-not-allowed':
          errorMessage = 'Speech service not available. Try opening in a new browser tab.';
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
    };
    
    recognitionRef.current = recognition;
    
    try {
      recognition.start();
    } catch (err) {
      // Start error handled
      setError('Failed to start voice recognition. Try again.');
    }
  }, []);

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
