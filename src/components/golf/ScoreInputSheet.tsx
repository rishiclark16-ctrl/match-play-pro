import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { getScoreLabel, getScoreColor } from '@/types/golf';
import { cn } from '@/lib/utils';
import { hapticLight, hapticSuccess } from '@/lib/haptics';

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
    hapticSuccess();
    onSelectScore(score);
    onClose();
  };

  // Get background color for score button
  const getScoreButtonBg = (score: number, isSelected: boolean) => {
    if (isSelected) return 'border-primary bg-primary text-primary-foreground';
    
    const diff = score - par;
    if (diff <= -2) return 'border-success/40 bg-success/10 hover:bg-success/20';
    if (diff === -1) return 'border-success/30 bg-success/5 hover:bg-success/15';
    if (diff === 0) return 'border-border bg-card hover:bg-muted';
    if (diff === 1) return 'border-warning/30 bg-warning/5 hover:bg-warning/15';
    return 'border-destructive/30 bg-destructive/5 hover:bg-destructive/15';
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
            transition={{ type: 'spring', damping: 30, stiffness: 400 }}
            className="fixed bottom-0 left-0 right-0 bg-background rounded-t-2xl z-50 border-t border-border"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            {/* Drag Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-muted-foreground/20 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-3">
              <div>
                <h3 className="text-lg font-bold text-foreground">{playerName}</h3>
                <p className="text-xs text-muted-foreground font-medium">
                  Hole {holeNumber} • Par {par}
                </p>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  hapticLight();
                  onClose();
                }}
                className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center"
                aria-label="Close score input"
              >
                <X className="w-4 h-4" />
              </motion.button>
            </div>

            {/* Score Grid */}
            <div className="grid grid-cols-4 gap-2 px-3 pb-4">
              {scores.map((score) => {
                const isSelected = currentScore === score;
                const label = getScoreLabel(score, par);
                const colorClass = isSelected ? 'text-primary-foreground' : getScoreColor(score, par);

                return (
                  <motion.button
                    key={score}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => handleSelectScore(score)}
                    className={cn(
                      "flex flex-col items-center justify-center py-3 rounded-xl border-2 transition-all min-h-[64px]",
                      getScoreButtonBg(score, isSelected)
                    )}
                  >
                    <span className={cn(
                      "text-xl font-bold tabular-nums leading-none",
                      colorClass
                    )}>
                      {score}
                    </span>
                    <span className={cn(
                      "text-[9px] font-bold mt-1 uppercase tracking-wide",
                      colorClass
                    )}>
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
