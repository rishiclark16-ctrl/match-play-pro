import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { hapticLight, hapticMedium } from '@/lib/haptics';
import { numberChange } from '@/lib/animations';

interface QuickScoreButtonsProps {
  currentScore: number | undefined;
  par: number;
  onScoreChange: (score: number) => void;
  onLongPress?: () => void;
  disabled?: boolean;
}

export function QuickScoreButtons({
  currentScore,
  par,
  onScoreChange,
  onLongPress,
  disabled = false,
}: QuickScoreButtonsProps) {
  // Default to par if no score (bug fix: was par + 1, now par)
  const displayScore = currentScore ?? par;

  const handleDecrement = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (disabled) return;
    hapticLight();
    const newScore = Math.max(1, displayScore - 1);
    onScoreChange(newScore);
  };

  const handleIncrement = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (disabled) return;
    hapticLight();
    // First tap when no score: set to par (not par+1)
    const newScore = currentScore === undefined ? par : Math.min(12, currentScore + 1);
    onScoreChange(newScore);
  };

  // Long press handler for opening full sheet
  let longPressTimer: NodeJS.Timeout | null = null;

  const handleTouchStart = () => {
    if (onLongPress) {
      longPressTimer = setTimeout(() => {
        hapticMedium();
        onLongPress();
      }, 500);
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  };

  // Get score pill styling based on relative to par (Direction B)
  const getScoreStyles = () => {
    if (currentScore === undefined) {
      return 'bg-muted/50 border border-border';
    }

    const diff = currentScore - par;
    if (diff <= -2) return 'bg-[#DCFCE7] border border-[#86EFAC]';
    if (diff === -1) return 'bg-[#F0FFF4] border border-[#BBF7D0]';
    if (diff === 0) return 'bg-white border border-[#E5E7EB]';
    if (diff === 1) return 'bg-[#FFFBEB] border border-[#FDE68A]';
    return 'bg-[#FEF2F2] border border-[#FECACA]';
  };

  // Score text color relative to par
  const getScoreTextColor = () => {
    if (currentScore === undefined) return 'text-muted-foreground';
    const diff = currentScore - par;
    if (diff <= -1) return 'text-[#15803D]';
    if (diff === 0) return 'text-[#0A0A0A]';
    if (diff === 1) return 'text-[#92400E]';
    return 'text-[#991B1B]';
  };

  return (
    <div
      className="flex items-center gap-1"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
    >
      {/* Minus Button */}
      <motion.button
        whileTap={{ scale: 0.88 }}
        onClick={handleDecrement}
        disabled={disabled || displayScore <= 1}
        className={cn(
          "w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl bg-muted flex items-center justify-center touch-manipulation cursor-pointer select-none",
          disabled || displayScore <= 1 ? "opacity-25" : "opacity-100"
        )}
        style={{ WebkitTapHighlightColor: 'transparent' }}
        aria-label="Decrease score"
      >
        <Minus className="w-5 h-5" />
      </motion.button>

      {/* Score Display Pill */}
      <div
        className={cn(
          "w-14 h-10 rounded-xl flex items-center justify-center overflow-hidden",
          getScoreStyles()
        )}
      >
        <AnimatePresence mode="popLayout">
          <motion.span
            key={currentScore ?? 'empty'}
            variants={numberChange}
            initial="initial"
            animate="animate"
            exit="exit"
            className={cn("font-black text-xl tabular-nums", getScoreTextColor())}
          >
            {currentScore ?? '–'}
          </motion.span>
        </AnimatePresence>
      </div>

      {/* Plus Button */}
      <motion.button
        whileTap={{ scale: 0.88 }}
        onClick={handleIncrement}
        disabled={disabled || displayScore >= 12}
        className={cn(
          "w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl bg-muted flex items-center justify-center touch-manipulation cursor-pointer select-none",
          disabled || displayScore >= 12 ? "opacity-25" : "opacity-100"
        )}
        style={{ WebkitTapHighlightColor: 'transparent' }}
        aria-label="Increase score"
      >
        <Plus className="w-5 h-5" />
      </motion.button>
    </div>
  );
}
