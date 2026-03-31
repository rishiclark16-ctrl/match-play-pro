import { useState, forwardRef } from 'react';
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

export const HoleNavigator = forwardRef<HTMLDivElement, HoleNavigatorProps>(function HoleNavigator({
  currentHole,
  totalHoles,
  holeInfo,
  onPrevious,
  onNext
}, ref) {
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
    <div ref={ref} className="bg-background border-b-2 border-foreground px-4 py-3 flex items-center justify-between">
      {/* Previous Button */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        onClick={handlePrevious}
        disabled={!canGoPrevious}
        className="w-12 h-12 rounded-full bg-muted flex items-center justify-center disabled:opacity-0 disabled:pointer-events-none touch-manipulation cursor-pointer select-none"
        style={{ WebkitTapHighlightColor: 'transparent' }}
        aria-label="Previous hole"
      >
        <ChevronLeft className="w-6 h-6" strokeWidth={2.5} />
      </motion.button>

      {/* Hole Display */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.12}
        onDragEnd={handleDragEnd}
        className="flex-1 max-w-[200px] sm:max-w-[240px] cursor-grab active:cursor-grabbing touch-pan-y"
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
              {/* Hole Number — dominant element */}
              <div className="text-center flex flex-col items-center">
                <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground mb-0">HOLE</p>
                <AnimatePresence mode="wait">
                  <motion.span
                    key={currentHole}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                    className="text-[72px] font-black tracking-[-0.04em] text-foreground tabular-nums leading-none"
                  >
                    {String(currentHole).padStart(2, '0')}
                  </motion.span>
                </AnimatePresence>
              </div>

              {/* Divider */}
              <div className="w-px h-16 bg-border" />

              {/* Par & Yardage & Handicap */}
              <div className="text-center">
                <div className="inline-flex items-center justify-center">
                  <span className="bg-[#F0EE3A] text-[#0A0A0A] text-[13px] font-bold px-3 py-1 rounded-full">
                    PAR {holeInfo.par}
                  </span>
                </div>
                <div className="flex flex-col items-center gap-0.5 mt-1.5">
                  {holeInfo.yardage && (
                    <span className="text-[11px] text-muted-foreground font-medium tabular-nums">
                      {holeInfo.yardage}y
                    </span>
                  )}
                  {holeInfo.handicap && (
                    <span className="text-[11px] text-muted-foreground tabular-nums">
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
        whileTap={{ scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        onClick={handleNext}
        disabled={!canGoNext}
        className="w-12 h-12 rounded-full bg-muted flex items-center justify-center disabled:opacity-0 disabled:pointer-events-none touch-manipulation cursor-pointer select-none"
        style={{ WebkitTapHighlightColor: 'transparent' }}
        aria-label="Next hole"
      >
        <ChevronRight className="w-6 h-6" strokeWidth={2.5} />
      </motion.button>
    </div>
  );
});
