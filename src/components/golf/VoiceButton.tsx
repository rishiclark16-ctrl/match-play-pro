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
            className="absolute inset-0 rounded-full border-2 border-primary"
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
            className="absolute inset-0 rounded-full border-2 border-primary"
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
        animate={isListening ? { scale: [1, 1.03, 1] } : {}}
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
          "relative w-16 h-16 rounded-full flex items-center justify-center transition-all border-2",
          !isSupported && "bg-muted border-border cursor-not-allowed",
          isSupported && !isActive && "bg-primary border-primary shadow-md",
          isListening && "bg-primary border-primary shadow-lg",
          isProcessing && "bg-primary/80 border-primary/80",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        {isProcessing ? (
          <Loader2 className="w-7 h-7 text-primary-foreground animate-spin" />
        ) : isListening ? (
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 0.5, repeat: Infinity }}
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
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-xs font-bold text-primary whitespace-nowrap uppercase tracking-wide"
        >
          Listening
        </motion.p>
      )}
      
      {/* Processing indicator */}
      {isProcessing && (
        <motion.p
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-xs font-medium text-muted-foreground whitespace-nowrap"
        >
          Processing...
        </motion.p>
      )}
    </div>
  );
}
