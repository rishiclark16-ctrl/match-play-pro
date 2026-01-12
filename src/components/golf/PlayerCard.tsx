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
  const initial = player.name.charAt(0).toUpperCase();
  const scoreColor = currentHoleScore 
    ? getScoreColor(currentHoleScore, currentHolePar) 
    : 'text-muted-foreground';

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      className={cn(
        "card-premium p-4 flex items-center gap-4 cursor-pointer transition-all",
        isLeading && "ring-2 ring-primary/20 bg-primary-light"
      )}
      onClick={onScoreTap}
    >
      {/* Avatar */}
      <div className="flex flex-col items-center gap-1 min-w-[48px]">
        <div className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center text-lg font-semibold",
          isLeading ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
        )}>
          {initial}
        </div>
        <span className="text-xs text-muted-foreground font-medium truncate max-w-[60px]">
          {player.name}
        </span>
      </div>

      {/* Running Total */}
      <div className="flex-1">
        <p className="text-sm text-muted-foreground">
          {player.holesPlayed > 0 ? (
            <>
              <span className={cn("font-medium", getScoreColor(player.totalStrokes, player.holesPlayed * 4))}>
                {formatRelativeToPar(player.totalRelativeToPar)}
              </span>
              <span className="ml-1">thru {player.holesPlayed}</span>
            </>
          ) : (
            'No scores yet'
          )}
        </p>
      </div>

      {/* Current Hole Score */}
      <div className="flex items-center justify-center min-w-[56px]">
        <span className={cn(
          "text-3xl font-semibold tabular-nums",
          scoreColor
        )}>
          {currentHoleScore ?? '–'}
        </span>
      </div>
    </motion.div>
  );
}
