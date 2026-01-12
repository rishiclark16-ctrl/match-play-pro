import { motion } from 'framer-motion';
import { Mic, MicOff, Loader2 } from 'lucide-react';
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
              scale: [1, 1.6, 1.6],
              opacity: [0.4, 0.1, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeOut",
            }}
          />
          <motion.div
            className="absolute inset-0 rounded-full bg-primary"
            animate={{
              scale: [1, 1.4, 1.4],
              opacity: [0.3, 0.1, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeOut",
              delay: 0.3,
            }}
          />
        </>
      )}
      
      {/* Main button */}
      <motion.button
        whileTap={{ scale: isActive ? 1 : 0.95 }}
        onClick={handlePress}
        disabled={disabled || !isSupported}
        className={cn(
          "relative w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all",
          !isSupported && "bg-muted cursor-not-allowed",
          isSupported && !isActive && "bg-primary shadow-primary/25",
          isListening && "bg-primary/90",
          isProcessing && "bg-primary/80",
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
            <Mic className="w-7 h-7 text-primary-foreground" />
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
          className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-medium text-primary whitespace-nowrap"
        >
          Listening...
        </motion.p>
      )}
    </div>
  );
}
