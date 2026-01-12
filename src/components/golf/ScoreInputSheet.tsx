import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { getScoreLabel, getScoreColor } from '@/types/golf';
import { cn } from '@/lib/utils';

interface ScoreInputSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectScore: (score: number) => void;
  playerName: string;
  holeNumber: number;
  par: number;
  currentScore?: number;
}

export function ScoreInputSheet({
  isOpen,
  onClose,
  onSelectScore,
  playerName,
  holeNumber,
  par,
  currentScore,
}: ScoreInputSheetProps) {
  const scores = Array.from({ length: 12 }, (_, i) => i + 1);

  const handleSelectScore = (score: number) => {
    onSelectScore(score);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-background rounded-t-2xl z-50 safe-bottom"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-muted rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-6 pb-4">
              <div>
                <h3 className="text-lg font-semibold">{playerName}</h3>
                <p className="text-sm text-muted-foreground">Hole {holeNumber} • Par {par}</p>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Score Grid */}
            <div className="grid grid-cols-4 gap-3 px-6 pb-8">
              {scores.map((score) => {
                const isSelected = currentScore === score;
                const label = getScoreLabel(score, par);
                const colorClass = getScoreColor(score, par);

                return (
                  <motion.button
                    key={score}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleSelectScore(score)}
                    className={cn(
                      "flex flex-col items-center justify-center py-4 rounded-xl border-2 transition-all",
                      isSelected 
                        ? "border-primary bg-primary-light" 
                        : "border-border bg-card hover:border-primary/50"
                    )}
                  >
                    <span className={cn("text-2xl font-bold tabular-nums", colorClass)}>
                      {score}
                    </span>
                    <span className={cn("text-xs font-medium mt-1", colorClass)}>
                      {label}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
