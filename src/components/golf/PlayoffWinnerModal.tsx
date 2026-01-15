import { motion, AnimatePresence } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PlayoffWinner } from '@/hooks/usePlayoff';

interface PlayoffWinnerModalProps {
  isOpen: boolean;
  winner: PlayoffWinner | null;
  onFinish: () => void;
}

export function PlayoffWinnerModal({ isOpen, winner, onFinish }: PlayoffWinnerModalProps) {
  return (
    <AnimatePresence>
      {isOpen && winner && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="bg-card rounded-2xl p-8 mx-4 max-w-sm w-full text-center shadow-2xl border-2 border-primary"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', damping: 10 }}
              className="w-20 h-20 rounded-full bg-primary flex items-center justify-center mx-auto mb-4"
            >
              <Trophy className="w-10 h-10 text-primary-foreground" />
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-2xl font-black mb-2"
            >
              🎉 PLAYOFF WINNER! 🎉
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-3xl font-black text-primary mb-2"
            >
              {winner.name}
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-muted-foreground mb-6"
            >
              Won on playoff hole #{winner.holeNumber}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Button
                onClick={onFinish}
                className="w-full py-6 text-lg font-bold rounded-xl"
                size="lg"
              >
                <Trophy className="w-5 h-5 mr-2" />
                Finish Round
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
