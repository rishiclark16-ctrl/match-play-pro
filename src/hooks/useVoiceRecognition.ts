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
          console.error('Microphone permission error:', err);
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
      console.error('Speech recognition error:', event.error);
      
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
          errorMessage = 'Network error. Please check your connection.';
          break;
        case 'aborted':
          errorMessage = '';
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
      console.error('Failed to start recognition:', err);
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
