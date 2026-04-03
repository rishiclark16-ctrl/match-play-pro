import { useState, useCallback, useRef, useEffect } from 'react';
import '@/types/speech.d.ts';

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

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function shouldRequestMicBeforeStart(): boolean {
  return !isIOS() &&
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia;
}

export function useVoiceRecognition(): UseVoiceRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [interimTranscript, setInterimTranscript] = useState<string | null>(null);
  const [alternatives, setAlternatives] = useState<string[]>([]);
  const [browserConfidence, setBrowserConfidence] = useState<number | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isNoisy, setIsNoisy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const resultReceivedRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const noiseSamplesRef = useRef<number[]>([]);

  const isSupported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  // Audio level monitoring via AnalyserNode
  const startAudioMonitoring = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
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
      // Audio monitoring is optional — continue without it
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
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevel(0);
    setIsNoisy(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
      stopAudioMonitoring();
    };
  }, [stopAudioMonitoring]);

  const initRecognition = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }

    setError(null);
    setTranscript(null);
    setInterimTranscript(null);
    setAlternatives([]);
    setBrowserConfidence(null);
    setIsProcessing(false);
    resultReceivedRef.current = false;

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionAPI();

    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 3;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
      resultReceivedRef.current = false;
    };

    recognition.onresult = (event) => {
      const result = event.results[event.resultIndex];

      if (!result.isFinal) {
        setInterimTranscript(result[0].transcript);
        return;
      }

      resultReceivedRef.current = true;
      const finalTranscript = result[0].transcript;
      const confidence = result[0].confidence;

      const alts: string[] = [];
      for (let i = 1; i < result.length; i++) {
        if (result[i]?.transcript) {
          alts.push(result[i].transcript);
        }
      }

      setTranscript(finalTranscript);
      setBrowserConfidence(confidence);
      setAlternatives(alts);
      setInterimTranscript(null);
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
          errorMessage = isIOS()
            ? 'Microphone or Speech Recognition access denied. Check Settings → Privacy.'
            : 'Microphone access denied. Please allow microphone access.';
          break;
        case 'network':
          errorMessage = isIOS()
            ? 'Speech recognition temporarily unavailable. Try again.'
            : 'Voice requires a stable connection. Try opening in a new tab or on your phone.';
          break;
        case 'aborted':
          errorMessage = '';
          break;
        case 'service-not-allowed':
          errorMessage = isIOS()
            ? 'Speech Recognition not enabled. Check Settings → Privacy → Speech Recognition.'
            : 'Speech service not available. Try opening in a new browser tab.';
          break;
        case 'bad-grammar':
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
      setInterimTranscript(null);
      stopAudioMonitoring();
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript(null);
      if (!resultReceivedRef.current) {
        setIsProcessing(false);
      }
      stopAudioMonitoring();
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (err) {
      setError('Failed to start voice recognition. Try again.');
      setIsListening(false);
      setIsProcessing(false);
    }
  }, [stopAudioMonitoring]);

  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('Voice recognition not supported in this browser');
      return;
    }

    if (shouldRequestMicBeforeStart()) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then((stream) => {
          stream.getTracks().forEach(t => t.stop());
          startAudioMonitoring();
          initRecognition();
        })
        .catch(() => {
          setError('Microphone access needed. Please allow microphone access.');
        });
    } else {
      startAudioMonitoring();
      initRecognition();
    }
  }, [isSupported, initRecognition, startAudioMonitoring]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
    setInterimTranscript(null);
    stopAudioMonitoring();
  }, [stopAudioMonitoring]);

  const reset = useCallback(() => {
    setTranscript(null);
    setInterimTranscript(null);
    setAlternatives([]);
    setBrowserConfidence(null);
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
    interimTranscript,
    alternatives,
    browserConfidence,
    audioLevel,
    isNoisy,
    error,
    reset,
  };
}
