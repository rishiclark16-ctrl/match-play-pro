import { motion } from 'framer-motion';
import { Mic, MicOff, Loader2, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceButtonProps {
  isListening: boolean;
  isProcessing: boolean;
  isSupported: boolean;
  onPress: () => void;
  disabled?: boolean;
}

export function VoiceButton({
  isListening,
  isProcessing,
  isSupported,
  onPress,
  disabled = false,
}: VoiceButtonProps) {
  const isActive = isListening || isProcessing;

  const handlePress = () => {
    if (disabled || isProcessing) return;

    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(20);
    }

    onPress();
  };

  return (
    <div className="relative">
      {/* Solid pulsing rings when listening */}
      {isListening && (
        <>
          <motion.div
            className="absolute inset-0 rounded-2xl border-2 border-[#F0EE3A]"
            animate={{
              scale: [1, 1.6],
              opacity: [0.6, 0],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: "easeOut",
            }}
          />
          <motion.div
            className="absolute inset-0 rounded-2xl border-2 border-[#F0EE3A]"
            animate={{
              scale: [1, 1.4],
              opacity: [0.5, 0],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: "easeOut",
              delay: 0.3,
            }}
          />
        </>
      )}

      {/* Main button */}
      <motion.button
        whileTap={{ scale: isActive ? 1 : 0.94 }}
        animate={isListening ? {
          scale: [1, 1.03, 1],
          boxShadow: [
            '0 0 0 0 rgba(240,238,58,0.4)',
            '0 0 0 16px rgba(240,238,58,0)',
            '0 0 0 0 rgba(240,238,58,0)',
          ],
        } : {}}
        transition={isListening ? { duration: 0.6, repeat: Infinity } : {}}
        onClick={handlePress}
        disabled={disabled || !isSupported}
        aria-label={
          !isSupported ? 'Voice input not supported' :
          isProcessing ? 'Processing voice input' :
          isListening ? 'Stop listening' :
          'Start voice scoring'
        }
        className={cn(
          "relative w-16 h-16 rounded-2xl flex items-center justify-center transition-all border-0",
          !isSupported && "bg-muted cursor-not-allowed",
          isSupported && !isActive && "bg-foreground",
          isListening && "bg-foreground",
          isProcessing && "bg-foreground/80",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        {isProcessing ? (
          <Loader2 className="w-7 h-7 text-background animate-spin" />
        ) : isListening ? (
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 0.5, repeat: Infinity }}
          >
            <Volume2 className="w-7 h-7 text-background" />
          </motion.div>
        ) : !isSupported ? (
          <MicOff className="w-7 h-7 text-muted-foreground" />
        ) : (
          <Mic className="w-7 h-7 text-background" />
        )}
      </motion.button>

      {/* Listening indicator text */}
      {isListening && (
        <motion.p
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-[0.06em] text-muted-foreground whitespace-nowrap"
        >
          Listening
        </motion.p>
      )}

      {/* Processing indicator */}
      {isProcessing && (
        <motion.p
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-[0.06em] text-muted-foreground whitespace-nowrap"
        >
          Processing
        </motion.p>
      )}
    </div>
  );
}
