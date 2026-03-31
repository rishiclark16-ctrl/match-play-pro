import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown } from 'lucide-react';
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
  pickupScore?: number;
  onPickup?: () => void;
}

interface NamedScore {
  label: string;
  score: number;
  diff: number;
  bgClass: string;
  textClass: string;
}

function buildNamedScores(par: number): NamedScore[] {
  const options: NamedScore[] = [];

  // Ace — only for par 3
  if (par === 3) {
    options.push({
      label: 'ACE',
      score: 1,
      diff: 1 - par,
      bgClass: 'bg-[#22C55E]',
      textClass: 'text-white',
    });
  }

  // Albatross / Double Eagle — par 5 only (score 2)
  if (par >= 5) {
    options.push({
      label: 'ALBATROSS',
      score: par - 3,
      diff: -3,
      bgClass: 'bg-[#22C55E]',
      textClass: 'text-white',
    });
  }

  // Eagle (par-2) — meaningful on par 4+ (would be hole-in-one on par 3, already covered)
  if (par >= 4) {
    options.push({
      label: 'EAGLE',
      score: par - 2,
      diff: -2,
      bgClass: 'bg-[#22C55E]',
      textClass: 'text-white',
    });
  }

  // Birdie (par-1)
  if (par >= 2) {
    options.push({
      label: 'BIRDIE',
      score: par - 1,
      diff: -1,
      bgClass: 'bg-[#4ADE80]',
      textClass: 'text-[#0A0A0A]',
    });
  }

  // Par
  options.push({
    label: 'PAR',
    score: par,
    diff: 0,
    bgClass: 'bg-[#F0EE3A]',
    textClass: 'text-[#0A0A0A]',
  });

  // Bogey (par+1)
  options.push({
    label: 'BOGEY',
    score: par + 1,
    diff: 1,
    bgClass: 'bg-[#FB923C]',
    textClass: 'text-white',
  });

  // Double bogey (par+2)
  options.push({
    label: 'DOUBLE',
    score: par + 2,
    diff: 2,
    bgClass: 'bg-[#EF4444]',
    textClass: 'text-white',
  });

  // Triple bogey (par+3)
  options.push({
    label: 'TRIPLE+',
    score: par + 3,
    diff: 3,
    bgClass: 'bg-[#991B1B]',
    textClass: 'text-white',
  });

  return options;
}

export function ScoreInputSheet({
  isOpen,
  onClose,
  onSelectScore,
  playerName,
  holeNumber,
  par,
  currentScore,
  pickupScore,
  onPickup,
}: ScoreInputSheetProps) {
  const [showNumpad, setShowNumpad] = useState(false);
  const customScores = Array.from({ length: 12 }, (_, i) => i + 1);
  const namedScores = buildNamedScores(par);
  // Default to par when no score has been entered yet
  const effectiveScore = currentScore ?? par;

  const handleSelectScore = (score: number) => {
    hapticSuccess();
    onSelectScore(score);
    onClose();
  };

  const diffLabel = (diff: number): string => {
    if (diff === 0) return 'E';
    return diff > 0 ? `+${diff}` : `${diff}`;
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
            className="fixed inset-0 bg-black/25 backdrop-blur-[2px] z-40"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 400 }}
            className="fixed inset-x-0 bottom-0 z-50 bg-[#F8F8F6] rounded-t-3xl"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            {/* Drag Handle */}
            <div className="w-10 h-1 bg-muted-foreground/25 rounded-full mx-auto mt-3 mb-4" />

            {/* Header */}
            <div className="px-5 pb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black tracking-[-0.03em] text-foreground">
                  {playerName}
                </h3>
                <p className="text-[13px] font-black tracking-[0.04em] text-foreground mt-0.5">
                  Hole {holeNumber} · Par {par}
                </p>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  hapticLight();
                  onClose();
                }}
                className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center"
                aria-label="Close score input"
              >
                <X className="w-4 h-4" />
              </motion.button>
            </div>

            {/* Pickup button — only when group_pickup_rule is active */}
            {onPickup && pickupScore !== undefined && (
              <div className="px-5 pb-3">
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => {
                    hapticLight();
                    onPickup();
                    onClose();
                  }}
                  className="w-full bg-muted rounded-2xl py-3 flex items-center justify-center gap-2"
                >
                  <span className="text-sm font-bold text-foreground">Pickup</span>
                  <span className="text-xs font-mono text-muted-foreground">({pickupScore})</span>
                </motion.button>
              </div>
            )}

            {/* Named Score Buttons */}
            <div className="flex flex-col gap-2 px-5 pb-3">
              {namedScores.map((item, index) => {
                const isSelected = effectiveScore === item.score;

                return (
                  <motion.button
                    key={item.label}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: index * 0.03,
                      type: 'spring',
                      stiffness: 400,
                      damping: 28,
                    }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleSelectScore(item.score)}
                    aria-label={`${item.label}, ${item.score} strokes`}
                    aria-pressed={isSelected}
                    className={cn(
                      "w-full h-14 rounded-2xl flex items-center justify-between px-5 touch-manipulation",
                      item.bgClass,
                      isSelected && "ring-2 ring-offset-2 ring-[#0A0A0A]"
                    )}
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                  >
                    <span className={cn("text-[15px] font-black tracking-[0.06em]", item.textClass)}>
                      {item.label}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className={cn("text-[13px] font-semibold opacity-70", item.textClass)}>
                        {diffLabel(item.diff)}
                      </span>
                      <span className={cn(
                        "text-xl font-black tabular-nums min-w-[28px] text-right",
                        item.textClass
                      )}>
                        {item.score}
                      </span>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Separator + Custom numpad toggle */}
            <div className="px-5 pb-2">
              <div className="border-t border-black/8 mb-3" />
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  hapticLight();
                  setShowNumpad(prev => !prev);
                }}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-[12px] font-semibold text-muted-foreground"
              >
                <span>Enter number</span>
                <motion.span
                  animate={{ rotate: showNumpad ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </motion.span>
              </motion.button>
            </div>

            {/* Custom numpad — compact, collapsible */}
            <AnimatePresence>
              {showNumpad && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  className="overflow-hidden px-5 pb-5"
                >
                  <div className="grid grid-cols-6 gap-1.5 pt-1">
                    {customScores.map((score) => {
                      const isSelected = effectiveScore === score;
                      return (
                        <motion.button
                          key={score}
                          whileTap={{ scale: 0.92 }}
                          onClick={() => handleSelectScore(score)}
                          aria-label={`Score ${score}`}
                          aria-pressed={isSelected}
                          className={cn(
                            "rounded-xl py-2.5 flex items-center justify-center touch-manipulation",
                            isSelected
                              ? "bg-[#F0EE3A] text-[#0A0A0A] font-black"
                              : "bg-muted text-foreground font-semibold"
                          )}
                          style={{ WebkitTapHighlightColor: 'transparent' }}
                        >
                          <span className="text-sm tabular-nums">{score}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
