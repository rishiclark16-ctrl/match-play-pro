import { useState } from 'react';
import { motion } from 'framer-motion';
import { PlayerWithScores, getScoreColor, formatRelativeToPar } from '@/types/golf';
import { cn } from '@/lib/utils';

interface PlayerCardProps {
  player: PlayerWithScores;
  currentHoleScore?: number;
  currentHolePar: number;
  isLeading: boolean;
  onScoreTap: () => void;
}

export function PlayerCard({ 
  player, 
  currentHoleScore, 
  currentHolePar,
  isLeading, 
  onScoreTap 
}: PlayerCardProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Get initials (first letter of first and last name if available)
  const nameParts = player.name.trim().split(' ');
  const initials = nameParts.length > 1 
    ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
    : player.name.substring(0, 2).toUpperCase();

  // Score styling based on relative to par
  const getScoreBoxStyles = () => {
    if (currentHoleScore === undefined) {
      return 'border-2 border-dashed border-muted-foreground/30 bg-transparent';
    }
    
    const diff = currentHoleScore - currentHolePar;
    if (diff <= -1) return 'bg-success/10 text-success border-2 border-success/20';
    if (diff === 0) return 'bg-muted text-foreground border-2 border-transparent';
    if (diff === 1) return 'bg-warning/10 text-warning border-2 border-warning/20';
    return 'bg-danger/10 text-danger border-2 border-danger/20';
  };

  const triggerAnimation = () => {
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 300);
  };

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      animate={isAnimating ? { scale: [1, 1.02, 1] } : {}}
      transition={{ duration: 0.3 }}
      className={cn(
        "bg-white rounded-xl shadow-sm p-4 flex items-center gap-4 cursor-pointer transition-all border",
        isLeading && player.holesPlayed > 0
          ? "ring-2 ring-primary/30 border-primary/20 bg-primary-light/30" 
          : "border-transparent hover:shadow-md"
      )}
      onClick={() => {
        onScoreTap();
        triggerAnimation();
      }}
    >
      {/* Avatar */}
      <div className={cn(
        "w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
        isLeading && player.holesPlayed > 0
          ? "bg-primary text-primary-foreground" 
          : "bg-muted text-muted-foreground"
      )}>
        {initials}
      </div>

      {/* Name & Running Total */}
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-lg text-foreground truncate">
          {player.name}
        </h4>
        <p className="text-sm text-muted-foreground">
          {player.holesPlayed > 0 ? (
            <>
              <span className={cn("font-medium", getScoreColor(player.totalStrokes, player.holesPlayed * currentHolePar))}>
                {formatRelativeToPar(player.totalRelativeToPar)}
              </span>
              <span className="ml-1">thru {player.holesPlayed}</span>
            </>
          ) : (
            <span className="italic">Tap to enter score</span>
          )}
        </p>
      </div>

      {/* Current Hole Score Box */}
      <div 
        className={cn(
          "w-14 h-14 rounded-xl flex items-center justify-center shrink-0 transition-all",
          getScoreBoxStyles()
        )}
      >
        <span className="text-2xl font-bold tabular-nums">
          {currentHoleScore ?? '–'}
        </span>
      </div>
    </motion.div>
  );
}
