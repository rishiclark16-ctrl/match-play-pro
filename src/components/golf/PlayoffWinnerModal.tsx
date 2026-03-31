import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { PlayoffWinner } from '@/hooks/usePlayoff';
import { cn } from '@/lib/utils';

interface PlayoffWinnerModalProps {
  isOpen: boolean;
  winner: PlayoffWinner | null;
  onFinish: () => void;
}

// Generate confetti particles using Direction B colors
const generateConfetti = (count: number) => {
  const colors = ['#F0EE3A', '#22C55E', '#0A0A0A'];
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.3,
    duration: 1 + Math.random() * 1,
    rotation: Math.random() * 360,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: 4 + Math.random() * 8,
  }));
};

export function PlayoffWinnerModal({ isOpen, winner, onFinish }: PlayoffWinnerModalProps) {
  const [confetti, setConfetti] = useState<ReturnType<typeof generateConfetti>>([]);

  useEffect(() => {
    if (isOpen) {
      setConfetti(generateConfetti(30));
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && winner && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
        >
          {/* Confetti particles */}
          {confetti.map((particle) => (
            <motion.div
              key={particle.id}
              initial={{
                y: -20,
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
              className="absolute top-0 rounded-sm pointer-events-none"
              style={{
                width: particle.size,
                height: particle.size * 1.5,
                left: `${particle.x}%`,
                backgroundColor: particle.color,
              }}
            />
          ))}

          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="bg-white rounded-3xl border-2 border-[#F0EE3A] shadow-2xl p-8 mx-6 text-center relative z-10"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 28 }}
              className="w-16 h-16 rounded-2xl bg-[#F0EE3A] flex items-center justify-center mx-auto mb-4"
            >
              <Trophy className="w-8 h-8 text-[#0A0A0A]" />
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-[12px] font-black uppercase tracking-[0.1em] text-[#D4B800] mb-2"
            >
              PLAYOFF WINNER
            </motion.p>

            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="font-black text-3xl tracking-[-0.04em] text-foreground mb-2"
            >
              {winner.name}
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-sm text-muted-foreground mb-6"
            >
              Won on playoff hole #{winner.holeNumber}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={onFinish}
                className="bg-foreground text-background rounded-2xl w-full h-[52px] font-bold text-[15px] flex items-center justify-center gap-2"
              >
                <Trophy className="w-5 h-5" />
                Finish Round
              </motion.button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
