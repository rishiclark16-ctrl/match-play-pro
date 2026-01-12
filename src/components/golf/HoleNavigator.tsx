import { useState } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { HoleInfo } from '@/types/golf';
import { cn } from '@/lib/utils';
import { hapticLight } from '@/lib/haptics';

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
  const [direction, setDirection] = useState(0);

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 50;
    if (info.offset.x > threshold && canGoPrevious) {
      hapticLight();
      setDirection(-1);
      onPrevious();
    } else if (info.offset.x < -threshold && canGoNext) {
      hapticLight();
      setDirection(1);
      onNext();
    }
  };

  const handlePrevious = () => {
    if (canGoPrevious) {
      hapticLight();
      setDirection(-1);
      onPrevious();
    }
  };

  const handleNext = () => {
    if (canGoNext) {
      hapticLight();
      setDirection(1);
      onNext();
    }
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 60 : -60,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 60 : -60,
      opacity: 0,
    }),
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-card/50 border-b border-border/30">
      {/* Previous Button */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={handlePrevious}
        disabled={!canGoPrevious}
        className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center transition-all",
          canGoPrevious 
            ? "bg-muted text-foreground active:bg-muted-foreground/20" 
            : "opacity-0 pointer-events-none"
        )}
        aria-label="Previous hole"
      >
        <ChevronLeft className="w-6 h-6" />
      </motion.button>

      {/* Hole Display - Compact and Swipeable */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.15}
        onDragEnd={handleDragEnd}
        className="flex-1 max-w-[180px] cursor-grab active:cursor-grabbing touch-pan-y"
      >
        <div className="overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentHole}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              className="flex items-center justify-center gap-4"
            >
              {/* Hole Number */}
              <div className="text-center">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
                  HOLE
                </p>
                <span className="text-4xl font-bold tracking-tight text-primary leading-none">
                  {currentHole}
                </span>
              </div>
              
              {/* Divider */}
              <div className="w-px h-10 bg-border" />
              
              {/* Par & Yardage */}
              <div className="text-center">
                <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-sm font-semibold">
                  PAR {holeInfo.par}
                </span>
                {holeInfo.yardage && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {holeInfo.yardage} yds
                  </p>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Next Button */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={handleNext}
        disabled={!canGoNext}
        className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center transition-all",
          canGoNext 
            ? "bg-muted text-foreground active:bg-muted-foreground/20" 
            : "opacity-0 pointer-events-none"
        )}
        aria-label="Next hole"
      >
        <ChevronRight className="w-6 h-6" />
      </motion.button>
    </div>
  );
}
