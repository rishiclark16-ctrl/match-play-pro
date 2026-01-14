import { motion } from 'framer-motion';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { hapticLight, hapticMedium } from '@/lib/haptics';

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
  // Default to par if no score
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
    const newScore = Math.min(12, displayScore + 1);
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

  // Get score styling based on relative to par
  const getScoreStyles = () => {
    if (currentScore === undefined) {
      return 'border-2 border-dashed border-muted-foreground/30 bg-card text-muted-foreground';
    }
    
    const diff = currentScore - par;
    if (diff <= -2) return 'bg-success text-success-foreground border-2 border-success';
    if (diff === -1) return 'bg-success/20 text-success border-2 border-success/30';
    if (diff === 0) return 'bg-muted text-foreground border-2 border-transparent';
    if (diff === 1) return 'bg-warning/20 text-warning border-2 border-warning/30';
    return 'bg-danger/20 text-danger border-2 border-danger/30';
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
        whileTap={{ scale: 0.9 }}
        onClick={handleDecrement}
        disabled={disabled || displayScore <= 1}
        className={cn(
          "w-12 h-12 min-w-[48px] min-h-[48px] rounded-xl flex items-center justify-center transition-all touch-manipulation cursor-pointer select-none",
          "bg-muted/80 active:bg-muted",
          disabled || displayScore <= 1 ? "opacity-30" : "opacity-100"
        )}
        style={{ WebkitTapHighlightColor: 'transparent' }}
        aria-label="Decrease score"
      >
        <Minus className="w-5 h-5" />
      </motion.button>

      {/* Score Display */}
      <div 
        className={cn(
          "w-14 h-14 rounded-xl flex items-center justify-center transition-all",
          getScoreStyles()
        )}
      >
        <span className="text-2xl font-bold tabular-nums">
          {currentScore ?? '–'}
        </span>
      </div>

      {/* Plus Button */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={handleIncrement}
        disabled={disabled || displayScore >= 12}
        className={cn(
          "w-12 h-12 min-w-[48px] min-h-[48px] rounded-xl flex items-center justify-center transition-all touch-manipulation cursor-pointer select-none",
          "bg-muted/80 active:bg-muted",
          disabled || displayScore >= 12 ? "opacity-30" : "opacity-100"
        )}
        style={{ WebkitTapHighlightColor: 'transparent' }}
        aria-label="Increase score"
      >
        <Plus className="w-5 h-5" />
      </motion.button>
    </div>
  );
}
