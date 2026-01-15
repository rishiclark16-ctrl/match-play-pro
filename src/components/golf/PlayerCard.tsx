import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Plus, Check } from 'lucide-react';
import { PlayerWithScores, getScoreColor, formatRelativeToPar } from '@/types/golf';
import { cn } from '@/lib/utils';
import { hapticLight, hapticSuccess } from '@/lib/haptics';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface PlayerCardProps {
  player: PlayerWithScores;
  currentHoleScore?: number;
  currentHolePar: number;
  currentHoleNumber: number;
  isLeading: boolean;
  onScoreTap?: () => void;
  onQuickScore?: (score: number) => void;
  showNetScores?: boolean;
  voiceHighlight?: boolean;
  voiceSuccess?: boolean;
}

export function PlayerCard({ 
  player, 
  currentHoleScore, 
  currentHolePar,
  currentHoleNumber,
  isLeading, 
  onScoreTap,
  onQuickScore,
  showNetScores = true,
  voiceHighlight = false,
  voiceSuccess = false,
}: PlayerCardProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Get initials
  const nameParts = player.name.trim().split(' ');
  const initials = nameParts.length > 1 
    ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
    : player.name.substring(0, 2).toUpperCase();

  // Get handicap strokes for current hole
  const holeStrokes = player.strokesPerHole?.get(currentHoleNumber) || 0;
  
  // Calculate net score for current hole
  const currentNetScore = currentHoleScore !== undefined 
    ? currentHoleScore - holeStrokes 
    : undefined;

  // Score styling based on relative to par
  const getScoreBoxStyles = () => {
    if (currentHoleScore === undefined) {
      return 'border-2 border-dashed border-muted-foreground/20 bg-muted/30';
    }
    
    const scoreToCompare = showNetScores && currentNetScore !== undefined 
      ? currentNetScore 
      : currentHoleScore;
    
    const diff = scoreToCompare - currentHolePar;
    if (diff <= -2) return 'bg-success text-success-foreground shadow-lg shadow-success/20';
    if (diff === -1) return 'bg-success/15 text-success border border-success/30';
    if (diff === 0) return 'bg-muted text-foreground border border-border';
    if (diff === 1) return 'bg-warning/15 text-warning border border-warning/30';
    return 'bg-destructive/15 text-destructive border border-destructive/30';
  };

  const triggerAnimation = () => {
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 300);
  };

  const hasHandicap = player.handicap !== undefined && player.handicap !== null;
  const displayScore = currentHoleScore ?? currentHolePar;

  const handleDecrement = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (!onQuickScore) return;
    hapticLight();
    const newScore = Math.max(1, displayScore - 1);
    onQuickScore(newScore);
    triggerAnimation();
  };

  const handleIncrement = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (!onQuickScore) return;
    hapticLight();
    const newScore = Math.min(12, displayScore + 1);
    onQuickScore(newScore);
    triggerAnimation();
  };

  const handleCardTap = () => {
    if (onScoreTap) {
      hapticLight();
      onScoreTap();
      triggerAnimation();
    }
  };

  return (
    <motion.div
      animate={
        voiceSuccess 
          ? { scale: [1, 1.02, 1] }
          : isAnimating 
            ? { scale: [1, 1.01, 1] } 
            : {}
      }
      transition={{ duration: voiceSuccess ? 0.5 : 0.2 }}
      className={cn(
        "bg-card rounded-xl p-4 flex items-center gap-4 transition-all border relative overflow-hidden",
        isLeading && player.holesPlayed > 0
          ? "border-primary/30 border-2 shadow-md" 
          : "border-border shadow-sm",
        voiceHighlight && "ring-2 ring-primary/50 border-primary/30",
        voiceSuccess && "bg-success/5"
      )}
    >
      {/* Voice success overlay */}
      <AnimatePresence>
        {voiceSuccess && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-success/10 z-10 pointer-events-none"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="w-14 h-14 rounded-full bg-success flex items-center justify-center shadow-lg shadow-success/30"
            >
              <Check className="w-8 h-8 text-white" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Avatar */}
      <motion.div
        whileTap={{ scale: 0.9 }}
        onClick={handleCardTap}
        className="shrink-0 cursor-pointer"
        aria-label={`Open score sheet for ${player.name}`}
      >
        <Avatar className={cn(
          "w-12 h-12 rounded-xl transition-all",
          isLeading && player.holesPlayed > 0 && "ring-2 ring-primary/50 shadow-md shadow-primary/15"
        )}>
          <AvatarImage src={(player as any).avatarUrl} className="rounded-xl object-cover" />
          <AvatarFallback className="bg-ink text-ink-foreground text-sm font-bold rounded-xl">
            {initials}
          </AvatarFallback>
        </Avatar>
      </motion.div>

      {/* Name & Running Total */}
      <div className="flex-1 min-w-0" onClick={handleCardTap}>
        <div className="flex items-center gap-2">
          <h4 className="font-semibold text-base text-foreground truncate">
            {player.name.split(' ')[0]}
          </h4>
          {hasHandicap && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-primary/10 text-primary font-semibold">
              {player.playingHandicap}
            </span>
          )}
        </div>
        <div className="text-sm text-muted-foreground mt-0.5">
          {player.holesPlayed > 0 ? (
            <div className="flex items-center gap-2">
              <span className={cn("font-semibold", getScoreColor(player.totalStrokes, player.holesPlayed * currentHolePar))}>
                {formatRelativeToPar(player.totalRelativeToPar)}
              </span>
              
              {showNetScores && hasHandicap && player.netRelativeToPar !== undefined && (
                <>
                  <span className="text-muted-foreground/40">→</span>
                  <span className={cn(
                    "text-xs font-medium",
                    player.netRelativeToPar <= -1 ? "text-success" :
                    player.netRelativeToPar === 0 ? "text-foreground" :
                    player.netRelativeToPar === 1 ? "text-warning" :
                    "text-destructive"
                  )}>
                    Net {formatRelativeToPar(player.netRelativeToPar)}
                  </span>
                </>
              )}
            </div>
          ) : (
            <span className="text-xs italic">Thru {player.holesPlayed}</span>
          )}
        </div>
      </div>

      {/* Quick Score Buttons */}
      {onQuickScore ? (
        <div className="flex items-center gap-1">
          {/* Minus Button */}
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={handleDecrement}
            disabled={displayScore <= 1}
            className={cn(
              "w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center transition-all touch-manipulation",
              "bg-muted/50 hover:bg-muted active:bg-muted-foreground/20",
              displayScore <= 1 ? "opacity-30" : "opacity-100"
            )}
            style={{ WebkitTapHighlightColor: 'transparent' }}
            aria-label="Decrease score"
          >
            <Minus className="w-5 h-5" />
          </motion.button>

          {/* Score Display */}
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={handleCardTap}
            className={cn(
              "w-14 h-14 rounded-xl flex flex-col items-center justify-center shrink-0 transition-all relative",
              getScoreBoxStyles()
            )}
            aria-label={`Score ${currentHoleScore ?? 'not set'}. Tap for more options`}
          >
            <span className="text-xl font-bold tabular-nums leading-none">
              {currentHoleScore ?? '–'}
            </span>
            
            {/* Stroke indicator dots */}
            {holeStrokes > 0 && (
              <div className="absolute -top-1 -right-1 flex gap-0.5">
                {Array.from({ length: Math.min(holeStrokes, 2) }).map((_, i) => (
                  <div 
                    key={i}
                    className="w-2 h-2 rounded-full bg-primary shadow-sm"
                  />
                ))}
                {holeStrokes > 2 && (
                  <span className="text-[8px] font-bold text-primary">+{holeStrokes - 2}</span>
                )}
              </div>
            )}
            
            {/* Net score below */}
            {showNetScores && holeStrokes > 0 && currentNetScore !== undefined && (
              <span className="text-[9px] text-muted-foreground leading-none mt-0.5 font-medium">
                net {currentNetScore}
              </span>
            )}
          </motion.button>

          {/* Plus Button */}
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={handleIncrement}
            disabled={displayScore >= 12}
            className={cn(
              "w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center transition-all touch-manipulation",
              "bg-muted/50 hover:bg-muted active:bg-muted-foreground/20",
              displayScore >= 12 ? "opacity-30" : "opacity-100"
            )}
            style={{ WebkitTapHighlightColor: 'transparent' }}
            aria-label="Increase score"
          >
            <Plus className="w-5 h-5" />
          </motion.button>
        </div>
      ) : (
        /* Read-only score display for spectators */
        <div 
          className={cn(
            "w-14 h-14 rounded-xl flex items-center justify-center shrink-0 transition-all relative",
            getScoreBoxStyles()
          )}
        >
          <span className="text-xl font-bold tabular-nums">
            {currentHoleScore ?? '–'}
          </span>
          
          {holeStrokes > 0 && (
            <div className="absolute -top-1 -right-1 flex gap-0.5">
              {Array.from({ length: Math.min(holeStrokes, 2) }).map((_, i) => (
                <div 
                  key={i}
                  className="w-2 h-2 rounded-full bg-primary shadow-sm"
                />
              ))}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
