import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown } from 'lucide-react';
import { getScoreLabel, getScoreColor } from '@/types/golf';
import { cn } from '@/lib/utils';
import { ScoreMark } from '@/components/golf/scorecard/ScoreMark';
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
}

function buildNamedScores(par: number): NamedScore[] {
  const options: NamedScore[] = [];
  // Ace — only for par 3
  if (par === 3) options.push({ label: 'Hole in one', score: 1, diff: 1 - par });
  // Albatross / double eagle — par 5 only
  if (par >= 5) options.push({ label: 'Albatross', score: par - 3, diff: -3 });
  // Eagle — meaningful on par 4+ (on a par 3 it's the ace above)
  if (par >= 4) options.push({ label: 'Eagle', score: par - 2, diff: -2 });
  if (par >= 2) options.push({ label: 'Birdie', score: par - 1, diff: -1 });
  options.push({ label: 'Par', score: par, diff: 0 });
  options.push({ label: 'Bogey', score: par + 1, diff: 1 });
  options.push({ label: 'Double bogey', score: par + 2, diff: 2 });
  options.push({ label: 'Triple bogey', score: par + 3, diff: 3 });
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
    return diff > 0 ? `+${diff}` : `−${Math.abs(diff)}`;
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
            className="fixed inset-x-0 bottom-0 z-50 bg-[#FAFAF7] rounded-t-[28px] max-h-[92vh] overflow-y-auto"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            {/* Drag Handle */}
            <div className="w-10 h-1 bg-[#B4BDB7] rounded-full mx-auto mt-3 mb-3" />

            {/* Header */}
            <div className="px-5 pb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-[22px] font-extrabold tracking-[-0.02em] text-[#0F1F17] leading-tight">
                  {playerName}
                </h3>
                <p className="text-[13px] font-medium text-[#5A6B61] mt-0.5">
                  Hole {holeNumber} · Par {par}
                </p>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  hapticLight();
                  onClose();
                }}
                className="w-11 h-11 rounded-[14px] bg-white border border-[#E7E9E3] flex items-center justify-center shrink-0"
                aria-label="Close score input"
              >
                <X className="w-5 h-5" />
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
                  className="w-full bg-[#F0F2EC] rounded-[20px] min-h-[52px] flex items-center justify-center gap-2"
                >
                  <span className="text-[15px] font-semibold text-[#0F1F17]">Pick up</span>
                  <span className="text-[13px] font-medium text-[#5A6B61] tabular-nums">counts as {pickupScore}</span>
                </motion.button>
              </div>
            )}

            {/* Named Score Buttons */}
            <div className="flex flex-col gap-2 px-3.5 pb-2">
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
                      "w-full min-h-[60px] rounded-[20px] flex items-center gap-3 pl-2.5 pr-5 touch-manipulation border",
                      isSelected
                        ? "bg-[#14532D] border-[#14532D] text-white"
                        : "bg-white border-[#E7E9E3] text-[#0F1F17] active:bg-[#F0F2EC]"
                    )}
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                  >
                    <span className={cn("rounded-[14px] p-0.5", isSelected && "bg-white")}>
                      <ScoreMark strokes={item.score} par={par} />
                    </span>
                    <span className="flex-1 text-left text-[17px] font-semibold">{item.label}</span>
                    <span className={cn("text-[14px] font-semibold tabular-nums", isSelected ? "text-[#CFE3D6]" : "text-[#5A6B61]")}>
                      {diffLabel(item.diff)}
                    </span>
                  </motion.button>
                );
              })}
            </div>

            {/* Separator + Custom numpad toggle */}
            <div className="px-5 pb-2">
              <div className="border-t border-[#E7E9E3] mb-1" />
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  hapticLight();
                  setShowNumpad(prev => !prev);
                }}
                className="w-full flex items-center justify-center gap-1.5 min-h-[44px] text-[14px] font-semibold text-[#14532D]"
              >
                <span>Other score</span>
                <motion.span
                  animate={{ rotate: showNumpad ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="w-4 h-4" />
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
                  <div className="grid grid-cols-6 gap-2 pt-1">
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
                            "rounded-[14px] h-12 flex items-center justify-center touch-manipulation",
                            isSelected
                              ? "bg-[#14532D] text-white font-extrabold"
                              : "bg-white border border-[#E7E9E3] text-[#0F1F17] font-semibold"
                          )}
                          style={{ WebkitTapHighlightColor: 'transparent' }}
                        >
                          <span className="text-[17px] tabular-nums">{score}</span>
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
