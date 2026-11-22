import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Loader2, Headphones, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceButtonProps {
  isListening: boolean;
  isProcessing: boolean;
  isSupported: boolean;
  onPress: () => void;
  disabled?: boolean;
  audioLevel?: number;
  interimTranscript?: string | null;
  isNoisy?: boolean;
  isHandsFree?: boolean;
}

export function VoiceButton({
  isListening,
  isProcessing,
  isSupported,
  onPress,
  disabled = false,
  audioLevel = 0,
  interimTranscript = null,
  isNoisy = false,
  isHandsFree = false,
}: VoiceButtonProps) {
  const isActive = isListening || isProcessing;

  // Generate waveform bar heights from audio level
  const waveformBars = useMemo(() => {
    if (!isListening) return [0, 0, 0, 0, 0];
    const base = audioLevel;
    return [
      Math.min(1, base * 0.6 + Math.random() * 0.2),
      Math.min(1, base * 0.8 + Math.random() * 0.15),
      Math.min(1, base * 1.0 + Math.random() * 0.1),
      Math.min(1, base * 0.8 + Math.random() * 0.15),
      Math.min(1, base * 0.6 + Math.random() * 0.2),
    ];
  }, [isListening, audioLevel]);

  const handlePress = () => {
    if (disabled || isProcessing) return;
    if ('vibrate' in navigator) {
      navigator.vibrate(20);
    }
    onPress();
  };

  return (
    <div className="relative flex flex-col items-center">
      {/* Noise warning */}
      <AnimatePresence>
        {isNoisy && isListening && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="absolute -top-[72px] left-0 flex items-center gap-1 bg-white border border-[#E7E9E3] text-[#B42318] text-[12px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap shadow-sm"
          >
            <AlertTriangle className="w-3 h-3" />
            Noisy, speak clearly
          </motion.div>
        )}
      </AnimatePresence>

      {/* Audio-reactive rings when listening */}
      {isListening && (
        <>
          <motion.div
            className="absolute inset-0 rounded-[20px] border-2 border-[#14532D]"
            animate={{
              scale: [1, 1.3 + audioLevel * 0.5],
              opacity: [0.6 * (0.5 + audioLevel * 0.5), 0],
            }}
            transition={{
              duration: 0.8 + (1 - audioLevel) * 0.4,
              repeat: Infinity,
              ease: 'easeOut',
            }}
          />
          <motion.div
            className="absolute inset-0 rounded-[20px] border-2 border-[#14532D]"
            animate={{
              scale: [1, 1.2 + audioLevel * 0.3],
              opacity: [0.5 * (0.5 + audioLevel * 0.5), 0],
            }}
            transition={{
              duration: 0.8 + (1 - audioLevel) * 0.4,
              repeat: Infinity,
              ease: 'easeOut',
              delay: 0.25,
            }}
          />
        </>
      )}

      {/* Hands-free indicator ring */}
      {isHandsFree && !isListening && (
        <motion.div
          className="absolute -inset-1 rounded-[24px] border-2 border-[#14532D]/50"
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}

      {/* Main button */}
      <motion.button
        whileTap={{ scale: isActive ? 1 : 0.94 }}
        animate={isListening ? {
          scale: [1, 1 + audioLevel * 0.05, 1],
        } : {}}
        transition={isListening ? { duration: 0.3, repeat: Infinity } : {}}
        onClick={handlePress}
        disabled={disabled || !isSupported}
        aria-label={
          !isSupported ? 'Voice input not supported' :
          isProcessing ? 'Processing voice input' :
          isListening ? 'Stop listening' :
          isHandsFree ? 'Hands-free mode active' :
          'Start voice scoring'
        }
        className={cn(
          'relative w-[60px] h-[60px] rounded-[20px] flex items-center justify-center transition-colors border-0 touch-manipulation',
          !isSupported && 'bg-[#F0F2EC] cursor-not-allowed',
          isSupported && !isActive && 'bg-[#BEF264] text-[#14532D] active:bg-[#B0E550]',
          isListening && 'bg-[#14532D]',
          isProcessing && 'bg-[#14532D]/85',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        {isProcessing ? (
          <Loader2 className="w-7 h-7 text-[#BEF264] animate-spin" />
        ) : isListening ? (
          // Waveform visualization
          <div className="flex items-center gap-[3px] h-7">
            {waveformBars.map((height, i) => (
              <motion.div
                key={i}
                className="w-[3px] bg-[#BEF264] rounded-full"
                animate={{ height: `${Math.max(4, height * 28)}px` }}
                transition={{ duration: 0.1, ease: 'easeOut' }}
              />
            ))}
          </div>
        ) : !isSupported ? (
          <MicOff className="w-7 h-7 text-[#5A6B61]" />
        ) : isHandsFree ? (
          <Headphones className="w-7 h-7 text-[#14532D]" strokeWidth={2.25} />
        ) : (
          <Mic className="w-7 h-7 text-[#14532D]" strokeWidth={2.25} />
        )}
      </motion.button>

      {/* Status text */}
      <AnimatePresence mode="wait">
        {isListening && interimTranscript ? (
          <motion.p
            key="interim"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute -top-8 left-0 text-[12px] font-medium text-[#0F1F17] bg-white border border-[#E7E9E3] rounded-full px-2.5 py-1 whitespace-nowrap max-w-[240px] truncate shadow-sm"
          >
            {interimTranscript}
          </motion.p>
        ) : isListening ? (
          <motion.p
            key="listening"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute -top-8 left-0 text-[12px] font-semibold text-[#14532D] bg-white border border-[#E7E9E3] rounded-full px-2.5 py-1 whitespace-nowrap shadow-sm"
          >
            Listening
          </motion.p>
        ) : isProcessing ? (
          <motion.p
            key="processing"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute -top-8 left-0 text-[12px] font-semibold text-[#14532D] bg-white border border-[#E7E9E3] rounded-full px-2.5 py-1 whitespace-nowrap shadow-sm"
          >
            Processing
          </motion.p>
        ) : isHandsFree ? (
          <motion.p
            key="handsfree"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute -top-8 left-0 text-[12px] font-semibold text-[#14532D] bg-white border border-[#E7E9E3] rounded-full px-2.5 py-1 whitespace-nowrap shadow-sm"
          >
            Hands-free
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
