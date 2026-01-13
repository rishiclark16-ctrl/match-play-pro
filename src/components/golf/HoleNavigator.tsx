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
      x: direction > 0 ? 50 : -50,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 50 : -50,
      opacity: 0,
    }),
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-card border-b border-border">
      {/* Previous Button */}
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={handlePrevious}
        disabled={!canGoPrevious}
        className={cn(
          "w-12 h-12 rounded-lg flex items-center justify-center transition-colors border",
          canGoPrevious 
            ? "bg-card border-border text-foreground hover:bg-muted active:bg-muted" 
            : "opacity-0 pointer-events-none border-transparent"
        )}
        aria-label="Previous hole"
      >
        <ChevronLeft className="w-6 h-6" strokeWidth={2.5} />
      </motion.button>

      {/* Hole Display - Technical style */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.12}
        onDragEnd={handleDragEnd}
        className="flex-1 max-w-[200px] cursor-grab active:cursor-grabbing touch-pan-y"
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
              className="flex items-center justify-center gap-5"
            >
              {/* Hole Number - Big and bold */}
              <div className="text-center">
                <p className="data-label mb-0.5">HOLE</p>
                <span className="text-5xl font-black tracking-tight text-foreground tabular-nums leading-none">
                  {String(currentHole).padStart(2, '0')}
                </span>
              </div>
              
              {/* Divider */}
              <div className="w-px h-12 bg-border" />
              
              {/* Par & Yardage & Handicap */}
              <div className="text-center">
                <div className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-primary text-primary-foreground">
                  <span className="text-sm font-bold tracking-wide">PAR {holeInfo.par}</span>
                </div>
                <div className="flex items-center justify-center gap-2 mt-1.5">
                  {holeInfo.yardage && (
                    <span className="text-xs font-semibold text-muted-foreground tabular-nums">
                      {holeInfo.yardage} YDS
                    </span>
                  )}
                  {holeInfo.yardage && holeInfo.handicap && (
                    <span className="text-muted-foreground/40">•</span>
                  )}
                  {holeInfo.handicap && (
                    <span className="text-xs font-semibold text-muted-foreground tabular-nums">
                      HDCP {holeInfo.handicap}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Next Button */}
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={handleNext}
        disabled={!canGoNext}
        className={cn(
          "w-12 h-12 rounded-lg flex items-center justify-center transition-colors border",
          canGoNext 
            ? "bg-card border-border text-foreground hover:bg-muted active:bg-muted" 
            : "opacity-0 pointer-events-none border-transparent"
        )}
        aria-label="Next hole"
      >
        <ChevronRight className="w-6 h-6" strokeWidth={2.5} />
      </motion.button>
    </div>
  );
}
