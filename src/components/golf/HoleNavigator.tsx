import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { HoleInfo } from '@/types/golf';
import { cn } from '@/lib/utils';

interface HoleNavigatorProps {
  currentHole: number;
  totalHoles: number;
  holeInfo: HoleInfo;
  onPrevious: () => void;
  onNext: () => void;
}

export function HoleNavigator({ 
  currentHole, 
  totalHoles, 
  holeInfo,
  onPrevious, 
  onNext 
}: HoleNavigatorProps) {
  const canGoPrevious = currentHole > 1;
  const canGoNext = currentHole < totalHoles;

  return (
    <div className="flex items-center justify-center gap-6 py-6">
      {/* Previous Button */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={onPrevious}
        disabled={!canGoPrevious}
        className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center transition-colors",
          canGoPrevious 
            ? "bg-muted hover:bg-muted/80 text-foreground" 
            : "bg-muted/50 text-muted-foreground cursor-not-allowed"
        )}
      >
        <ChevronLeft className="w-6 h-6" />
      </motion.button>

      {/* Hole Display */}
      <div className="text-center">
        <motion.div
          key={currentHole}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center"
        >
          <span className="text-6xl font-bold tracking-tight text-foreground">
            {currentHole}
          </span>
          <span className="text-lg font-medium text-muted-foreground mt-1">
            PAR {holeInfo.par}
          </span>
        </motion.div>
      </div>

      {/* Next Button */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={onNext}
        disabled={!canGoNext}
        className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center transition-colors",
          canGoNext 
            ? "bg-muted hover:bg-muted/80 text-foreground" 
            : "bg-muted/50 text-muted-foreground cursor-not-allowed"
        )}
      >
        <ChevronRight className="w-6 h-6" />
      </motion.button>
    </div>
  );
}
