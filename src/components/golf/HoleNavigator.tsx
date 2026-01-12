import { useState, useRef } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
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
  const [direction, setDirection] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 50;
    if (info.offset.x > threshold && canGoPrevious) {
      setDirection(-1);
      onPrevious();
    } else if (info.offset.x < -threshold && canGoNext) {
      setDirection(1);
      onNext();
    }
  };

  const handlePrevious = () => {
    if (canGoPrevious) {
      setDirection(-1);
      onPrevious();
    }
  };

  const handleNext = () => {
    if (canGoNext) {
      setDirection(1);
      onNext();
    }
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 100 : -100,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 100 : -100,
      opacity: 0,
    }),
  };

  return (
    <div 
      ref={containerRef}
      className="flex items-center justify-center gap-4 py-8 px-6 select-none"
    >
      {/* Previous Button */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={handlePrevious}
        disabled={!canGoPrevious}
        className={cn(
          "w-14 h-14 rounded-full flex items-center justify-center transition-all",
          canGoPrevious 
            ? "bg-card border border-border shadow-sm hover:shadow-md text-foreground" 
            : "opacity-0 pointer-events-none"
        )}
      >
        <ChevronLeft className="w-7 h-7" />
      </motion.button>

      {/* Hole Display - Swipeable */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        className="flex-1 max-w-[200px] cursor-grab active:cursor-grabbing touch-pan-y"
      >
        <div className="text-center overflow-hidden">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-1">
            HOLE
          </p>
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentHole}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="flex flex-col items-center"
            >
              <span className="text-7xl font-bold tracking-tight text-primary">
                {currentHole}
              </span>
              <span className="inline-flex items-center justify-center px-4 py-1 mt-2 rounded-full bg-muted text-muted-foreground text-sm font-semibold">
                PAR {holeInfo.par}
              </span>
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
          "w-14 h-14 rounded-full flex items-center justify-center transition-all",
          canGoNext 
            ? "bg-card border border-border shadow-sm hover:shadow-md text-foreground" 
            : "opacity-0 pointer-events-none"
        )}
      >
        <ChevronRight className="w-7 h-7" />
      </motion.button>
    </div>
  );
}
