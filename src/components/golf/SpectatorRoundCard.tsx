import { motion } from 'framer-motion';
import { Eye, ChevronRight, Flag, X } from 'lucide-react';
import { Round } from '@/types/golf';
import { cn } from '@/lib/utils';

interface SpectatorRoundCardProps {
  round: Round;
  onClick: () => void;
  onLeave?: () => void;
  currentHole?: number;
}

export function SpectatorRoundCard({ round, onClick, onLeave, currentHole }: SpectatorRoundCardProps) {
  const handleLeave = (e: React.MouseEvent) => {
    e.stopPropagation();
    onLeave?.();
  };

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "relative bg-primary/5 rounded-xl p-4 cursor-pointer",
        "border border-primary/20 hover:border-primary/40 transition-all duration-200 group"
      )}
    >
      {/* Spectator badge */}
      <div className="absolute -top-2 left-4">
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider">
          <Eye className="w-3 h-3" />
          <span>Watching</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate pr-3 text-sm">
            {round.courseName}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground">
              {round.holes} holes
            </span>
            
            {currentHole !== undefined && currentHole > 0 && (
              <span className="flex items-center gap-1 text-xs font-medium text-primary">
                <Flag className="w-3 h-3" />
                Hole {currentHole}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          {/* Live indicator */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-success/10 border border-success/20">
            <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            <span className="text-[10px] font-semibold text-success uppercase">Live</span>
          </div>
          
          {onLeave && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleLeave}
              className="w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-muted hover:bg-muted/80"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </motion.button>
          )}
          
          <ChevronRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    </motion.div>
  );
}
