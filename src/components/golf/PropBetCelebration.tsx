import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Sparkles, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getPropBetIcon, getPropBetLabel, PropBetType } from '@/types/betting';

interface PropBetCelebrationProps {
  isVisible: boolean;
  winnerName: string;
  betType: string;
  amount: number;
  onComplete: () => void;
}

// Generate random confetti particles
const generateConfetti = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100, // percentage across screen
    delay: Math.random() * 0.3,
    duration: 1 + Math.random() * 1,
    rotation: Math.random() * 360,
    color: [
      'bg-yellow-400',
      'bg-green-400',
      'bg-blue-400',
      'bg-pink-400',
      'bg-purple-400',
      'bg-orange-400',
    ][Math.floor(Math.random() * 6)],
    size: 4 + Math.random() * 8,
  }));
};

export function PropBetCelebration({
  isVisible,
  winnerName,
  betType,
  amount,
  onComplete,
}: PropBetCelebrationProps) {
  const [confetti, setConfetti] = useState<ReturnType<typeof generateConfetti>>([]);

  useEffect(() => {
    if (isVisible) {
      setConfetti(generateConfetti(30));
      // Auto-dismiss after animation
      const timer = setTimeout(onComplete, 2500);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center"
        >
          {/* Backdrop with blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background/60 backdrop-blur-sm"
          />

          {/* Confetti particles */}
          {confetti.map((particle) => (
            <motion.div
              key={particle.id}
              initial={{
                y: -20,
                x: `${particle.x}vw`,
                rotate: 0,
                opacity: 1,
              }}
              animate={{
                y: '100vh',
                rotate: particle.rotation,
                opacity: [1, 1, 0],
              }}
              transition={{
                duration: particle.duration,
                delay: particle.delay,
                ease: 'linear',
              }}
              className={cn(
                'absolute top-0 rounded-sm',
                particle.color
              )}
              style={{
                width: particle.size,
                height: particle.size * 1.5,
                left: `${particle.x}%`,
              }}
            />
          ))}

          {/* Main celebration card */}
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 20,
            }}
            className="relative z-10 bg-card border-2 border-success rounded-3xl p-6 mx-4 max-w-sm shadow-2xl shadow-success/30"
          >
            {/* Sparkle decorations */}
            <motion.div
              animate={{
                rotate: 360,
                scale: [1, 1.2, 1],
              }}
              transition={{
                rotate: { duration: 10, repeat: Infinity, ease: 'linear' },
                scale: { duration: 1, repeat: Infinity },
              }}
              className="absolute -top-4 -right-4"
            >
              <Sparkles className="w-8 h-8 text-yellow-400" />
            </motion.div>
            <motion.div
              animate={{
                rotate: -360,
                scale: [1, 1.3, 1],
              }}
              transition={{
                rotate: { duration: 8, repeat: Infinity, ease: 'linear' },
                scale: { duration: 1.5, repeat: Infinity },
              }}
              className="absolute -bottom-4 -left-4"
            >
              <Sparkles className="w-6 h-6 text-pink-400" />
            </motion.div>

            {/* Trophy icon with bounce */}
            <motion.div
              initial={{ y: -20 }}
              animate={{ y: [0, -8, 0] }}
              transition={{
                duration: 0.5,
                repeat: 3,
                repeatType: 'reverse',
              }}
              className="flex justify-center mb-4"
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg shadow-yellow-500/40">
                <Trophy className="w-9 h-9 text-white" />
              </div>
            </motion.div>

            {/* Bet type icon and label */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center mb-3"
            >
              <span className="text-3xl mb-1 block">{getPropBetIcon(betType as PropBetType)}</span>
              <span className="text-sm font-medium text-muted-foreground">
                {getPropBetLabel(betType as PropBetType)}
              </span>
            </motion.div>

            {/* Winner name */}
            <motion.h2
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, type: 'spring' }}
              className="text-2xl font-black text-center text-foreground mb-2"
            >
              {winnerName}
            </motion.h2>

            {/* "WINS!" text */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-lg font-bold text-center text-success mb-3"
            >
              WINS!
            </motion.p>

            {/* Amount won */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex items-center justify-center gap-1 py-2 px-4 rounded-full bg-success/20 mx-auto w-fit"
            >
              <DollarSign className="w-5 h-5 text-success" />
              <span className="text-xl font-black text-success tabular-nums">
                +${(amount * 3).toFixed(0)}
              </span>
            </motion.div>

            {/* Pulse ring effect */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0.5 }}
              animate={{ scale: 2, opacity: 0 }}
              transition={{
                duration: 1.5,
                repeat: 2,
                repeatType: 'loop',
              }}
              className="absolute inset-0 border-4 border-success rounded-3xl pointer-events-none"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
