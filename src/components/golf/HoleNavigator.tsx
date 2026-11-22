import { useState, forwardRef, type ReactNode } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { HoleInfo } from '@/types/golf';
import { hapticLight } from '@/lib/haptics';

interface HoleNavigatorProps {
  currentHole: number;
  totalHoles: number;
  holeInfo: HoleInfo;
  onPrevious: () => void;
  onNext: () => void;
  /** Optional content rendered inside the hero card, under the hole meta. */
  children?: ReactNode;
}

export const HoleNavigator = forwardRef<HTMLDivElement, HoleNavigatorProps>(function HoleNavigator({
  currentHole,
  totalHoles,
  holeInfo,
  onPrevious,
  onNext,
  children,
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

  const meta = [
    `Par ${holeInfo.par}`,
    holeInfo.yardage ? `${holeInfo.yardage} yds` : null,
    holeInfo.handicap ? `SI ${holeInfo.handicap}` : null,
  ].filter(Boolean).join(' · ');

  const navButton =
    'w-11 h-11 rounded-[14px] bg-white/10 text-white flex items-center justify-center touch-manipulation cursor-pointer select-none active:bg-white/20 disabled:opacity-30 disabled:pointer-events-none';

  return (
    <div ref={ref} className="px-3.5 pt-1 pb-2">
      {/* Forest hero card: the hole is the headline of the screen */}
      <div className="rounded-[28px] bg-[#14532D] text-white px-5 pt-4 pb-4 overflow-hidden">
        <div className="flex items-start justify-between gap-3">
          {/* Hole display — swipe left/right to change hole */}
          <motion.div
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.12}
            onDragEnd={handleDragEnd}
            className="flex-1 min-w-0 cursor-grab active:cursor-grabbing touch-pan-y"
          >
            <AnimatePresence mode="wait" initial={false} custom={direction}>
              <motion.div
                key={currentHole}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              >
                <h2 className="text-[52px] font-extrabold leading-none tracking-[-0.04em] tabular-nums whitespace-nowrap">
                  Hole {currentHole}
                </h2>
                <p className="mt-1.5 text-sm font-medium text-[#CFE3D6] tabular-nums truncate">
                  {meta}
                </p>
              </motion.div>
            </AnimatePresence>
          </motion.div>

          {/* Previous / next */}
          <div className="flex items-center gap-2 shrink-0 pt-1">
            <motion.button
              whileTap={{ scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              onClick={handlePrevious}
              disabled={!canGoPrevious}
              className={navButton}
              style={{ WebkitTapHighlightColor: 'transparent' }}
              aria-label="Previous hole"
            >
              <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              onClick={handleNext}
              disabled={!canGoNext}
              className={navButton}
              style={{ WebkitTapHighlightColor: 'transparent' }}
              aria-label="Next hole"
            >
              <ChevronRight className="w-5 h-5" strokeWidth={2.5} />
            </motion.button>
          </div>
        </div>

        {/* Bet tiles for this hole (skins pot, strokes, match status…) */}
        {children && <div className="mt-3.5">{children}</div>}
      </div>
    </div>
  );
});
