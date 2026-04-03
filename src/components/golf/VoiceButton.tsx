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
            className="absolute -top-10 flex items-center gap-1 bg-[#FEF3C7] text-[#92400E] text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap"
          >
            <AlertTriangle className="w-3 h-3" />
            Noisy — speak clearly
          </motion.div>
        )}
      </AnimatePresence>

      {/* Audio-reactive rings when listening */}
      {isListening && (
        <>
          <motion.div
            className="absolute inset-0 rounded-2xl border-2 border-[#F0EE3A]"
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
            className="absolute inset-0 rounded-2xl border-2 border-[#F0EE3A]"
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
          className="absolute inset-0 rounded-2xl border-2 border-emerald-400/50"
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
          'relative w-16 h-16 rounded-2xl flex items-center justify-center transition-all border-0',
          !isSupported && 'bg-muted cursor-not-allowed',
          isSupported && !isActive && !isHandsFree && 'bg-foreground',
          isSupported && !isActive && isHandsFree && 'bg-emerald-600',
          isListening && 'bg-foreground',
          isProcessing && 'bg-foreground/80',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        {isProcessing ? (
          <Loader2 className="w-7 h-7 text-background animate-spin" />
        ) : isListening ? (
          // Waveform visualization
          <div className="flex items-center gap-[3px] h-7">
            {waveformBars.map((height, i) => (
              <motion.div
                key={i}
                className="w-[3px] bg-background rounded-full"
                animate={{ height: `${Math.max(4, height * 28)}px` }}
                transition={{ duration: 0.1, ease: 'easeOut' }}
              />
            ))}
          </div>
        ) : !isSupported ? (
          <MicOff className="w-7 h-7 text-muted-foreground" />
        ) : isHandsFree ? (
          <Headphones className="w-7 h-7 text-background" />
        ) : (
          <Mic className="w-7 h-7 text-background" />
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
            className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] font-medium text-muted-foreground whitespace-nowrap max-w-[200px] truncate text-center"
          >
            {interimTranscript}
          </motion.p>
        ) : isListening ? (
          <motion.p
            key="listening"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-[0.06em] text-muted-foreground whitespace-nowrap"
          >
            Listening
          </motion.p>
        ) : isProcessing ? (
          <motion.p
            key="processing"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-[0.06em] text-muted-foreground whitespace-nowrap"
          >
            Processing
          </motion.p>
        ) : isHandsFree ? (
          <motion.p
            key="handsfree"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-[0.06em] text-emerald-600 whitespace-nowrap"
          >
            Hands-Free
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
