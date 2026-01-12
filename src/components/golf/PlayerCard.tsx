import { useState } from 'react';
import { motion } from 'framer-motion';
import { PlayerWithScores, getScoreColor, formatRelativeToPar } from '@/types/golf';
import { cn } from '@/lib/utils';

interface PlayerCardProps {
  player: PlayerWithScores;
  currentHoleScore?: number;
  currentHolePar: number;
  currentHoleNumber: number;
  isLeading: boolean;
  onScoreTap: () => void;
  showNetScores?: boolean;
}

export function PlayerCard({ 
  player, 
  currentHoleScore, 
  currentHolePar,
  currentHoleNumber,
  isLeading, 
  onScoreTap,
  showNetScores = true,
}: PlayerCardProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Get initials (first letter of first and last name if available)
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

  // Score styling based on relative to par (use net if available)
  const getScoreBoxStyles = () => {
    if (currentHoleScore === undefined) {
      return 'border-2 border-dashed border-muted-foreground/30 bg-transparent';
    }
    
    // Use net score for styling if handicap is active
    const scoreToCompare = showNetScores && currentNetScore !== undefined 
      ? currentNetScore 
      : currentHoleScore;
    
    const diff = scoreToCompare - currentHolePar;
    if (diff <= -1) return 'bg-success/10 text-success border-2 border-success/20';
    if (diff === 0) return 'bg-muted text-foreground border-2 border-transparent';
    if (diff === 1) return 'bg-warning/10 text-warning border-2 border-warning/20';
    return 'bg-danger/10 text-danger border-2 border-danger/20';
  };

  const triggerAnimation = () => {
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 300);
  };

  const hasHandicap = player.handicap !== undefined && player.handicap !== null;

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
        <div className="flex items-center gap-2">
          <h4 className="font-semibold text-lg text-foreground truncate">
            {player.name}
          </h4>
          {hasHandicap && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
              {player.playingHandicap}
            </span>
          )}
        </div>
        <div className="text-sm text-muted-foreground">
          {player.holesPlayed > 0 ? (
            <div className="flex items-center gap-2">
              {/* Gross score */}
              <span className={cn("font-medium", getScoreColor(player.totalStrokes, player.holesPlayed * currentHolePar))}>
                {formatRelativeToPar(player.totalRelativeToPar)}
              </span>
              
              {/* Net score (if handicap) */}
              {showNetScores && hasHandicap && player.netRelativeToPar !== undefined && (
                <>
                  <span className="text-muted-foreground/50">→</span>
                  <span className={cn(
                    "font-medium px-1.5 py-0.5 rounded text-xs",
                    player.netRelativeToPar <= -1 ? "bg-success/10 text-success" :
                    player.netRelativeToPar === 0 ? "bg-muted text-foreground" :
                    player.netRelativeToPar === 1 ? "bg-warning/10 text-warning" :
                    "bg-danger/10 text-danger"
                  )}>
                    Net {formatRelativeToPar(player.netRelativeToPar)}
                  </span>
                </>
              )}
              
              <span className="ml-1">thru {player.holesPlayed}</span>
            </div>
          ) : (
            <span className="italic">Tap to enter score</span>
          )}
        </div>
      </div>

      {/* Current Hole Score Box */}
      <div className="flex flex-col items-center gap-1">
        <div 
          className={cn(
            "w-14 h-14 rounded-xl flex items-center justify-center shrink-0 transition-all relative",
            getScoreBoxStyles()
          )}
        >
          <span className="text-2xl font-bold tabular-nums">
            {currentHoleScore ?? '–'}
          </span>
          
          {/* Stroke indicator dots */}
          {holeStrokes > 0 && (
            <div className="absolute -top-1 -right-1 flex gap-0.5">
              {Array.from({ length: Math.min(holeStrokes, 3) }).map((_, i) => (
                <div 
                  key={i}
                  className="w-2 h-2 rounded-full bg-primary shadow-sm"
                />
              ))}
              {holeStrokes > 3 && (
                <span className="text-[10px] font-bold text-primary">+{holeStrokes - 3}</span>
              )}
            </div>
          )}
        </div>
        
        {/* Net score below gross */}
        {showNetScores && holeStrokes > 0 && currentNetScore !== undefined && (
          <span className="text-xs text-muted-foreground">
            net {currentNetScore}
          </span>
        )}
      </div>
    </motion.div>
  );
}
