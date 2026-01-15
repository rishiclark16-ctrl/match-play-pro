import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Swords } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FinishOptionsOverlayProps {
  isOpen: boolean;
  onFinishRound: () => void;
  onStartPlayoff: () => void;
  onContinue: () => void;
}

export function FinishOptionsOverlay({
  isOpen,
  onFinishRound,
  onStartPlayoff,
  onContinue,
}: FinishOptionsOverlayProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-background via-background to-transparent pt-12 pb-4"
        >
          <div className="px-4 space-y-3">
            <div className="text-center mb-4">
              <h3 className="heading-md">Round Complete! 🎉</h3>
              <p className="text-sm text-muted-foreground">All 18 holes scored</p>
            </div>

            <motion.div whileTap={{ scale: 0.98 }}>
              <Button
                onClick={onFinishRound}
                className="w-full py-6 text-lg font-bold rounded-xl"
                size="lg"
              >
                <Trophy className="w-5 h-5 mr-2" />
                Finish Round
              </Button>
            </motion.div>

            <motion.div whileTap={{ scale: 0.98 }}>
              <Button
                variant="outline"
                onClick={onStartPlayoff}
                className="w-full py-6 text-lg font-bold rounded-xl border-2"
                size="lg"
              >
                <Swords className="w-5 h-5 mr-2" />
                Playoff Hole #1
              </Button>
            </motion.div>

            <button
              onClick={onContinue}
              className="w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Continue Scoring
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
