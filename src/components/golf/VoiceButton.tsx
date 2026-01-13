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
      {/* Pulsing rings when listening */}
      {isListening && (
        <>
          <motion.div
            className="absolute inset-0 rounded-full bg-primary"
            animate={{
              scale: [1, 1.8, 1.8],
              opacity: [0.5, 0.1, 0],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: "easeOut",
            }}
          />
          <motion.div
            className="absolute inset-0 rounded-full bg-primary"
            animate={{
              scale: [1, 1.5, 1.5],
              opacity: [0.4, 0.1, 0],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: "easeOut",
              delay: 0.2,
            }}
          />
          <motion.div
            className="absolute inset-0 rounded-full bg-primary"
            animate={{
              scale: [1, 1.3, 1.3],
              opacity: [0.3, 0.1, 0],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: "easeOut",
              delay: 0.4,
            }}
          />
        </>
      )}
      
      {/* Main button */}
      <motion.button
        whileTap={{ scale: isActive ? 1 : 0.92 }}
        animate={isListening ? { scale: [1, 1.05, 1] } : {}}
        transition={isListening ? { duration: 0.5, repeat: Infinity } : {}}
        onClick={handlePress}
        disabled={disabled || !isSupported}
        className={cn(
          "relative w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all",
          !isSupported && "bg-muted cursor-not-allowed",
          isSupported && !isActive && "bg-primary shadow-primary/30 shadow-xl",
          isListening && "bg-primary shadow-primary/40 shadow-2xl",
          isProcessing && "bg-primary/80",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        {isProcessing ? (
          <Loader2 className="w-7 h-7 text-primary-foreground animate-spin" />
        ) : isListening ? (
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 0.4, repeat: Infinity }}
          >
            <Volume2 className="w-7 h-7 text-primary-foreground" />
          </motion.div>
        ) : !isSupported ? (
          <MicOff className="w-7 h-7 text-muted-foreground" />
        ) : (
          <Mic className="w-7 h-7 text-primary-foreground" />
        )}
      </motion.button>
      
      {/* Listening indicator text */}
      {isListening && (
        <motion.p
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-xs font-semibold text-primary whitespace-nowrap"
        >
          Listening...
        </motion.p>
      )}
      
      {/* Processing indicator */}
      {isProcessing && (
        <motion.p
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-xs font-medium text-muted-foreground whitespace-nowrap"
        >
          Processing...
        </motion.p>
      )}
    </div>
  );
}
