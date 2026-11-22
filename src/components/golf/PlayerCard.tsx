import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Plus, Check } from 'lucide-react';
import { PlayerWithScores, formatRelativeToPar } from '@/types/golf';
import { cn } from '@/lib/utils';
import { hapticLight } from '@/lib/haptics';
import { ScoreMark } from '@/components/ui/score-mark';
import { scoreName } from '@/lib/scoreMarks';

interface PlayerCardProps {
  player: PlayerWithScores;
  currentHoleScore?: number;
  currentHolePar: number;
  currentHoleNumber: number;
  isLeading: boolean;
  onScoreTap?: () => void;
  onQuickScore?: (score: number) => void;
  showNetScores?: boolean;
  voiceHighlight?: boolean;
  voiceSuccess?: boolean;
  index?: number;
  isGhost?: boolean;
}

const spring = { type: 'spring' as const, stiffness: 300, damping: 28 };

/** "−4" with a true minus sign; formatRelativeToPar uses a hyphen. */
const toPar = (n: number) => formatRelativeToPar(n).replace('-', '−');

/**
 * Player row (Fairway Day, board 08): white, radius 20, hairline border.
 * Name 16/600 + caption, then "−" (muted) · score mark · "+" (Forest), each 46px.
 */
export function PlayerCard({
  player,
  currentHoleScore,
  currentHolePar,
  currentHoleNumber,
  isLeading,
  onScoreTap,
  onQuickScore,
  showNetScores = true,
  voiceHighlight = false,
  voiceSuccess = false,
  index = 0,
  isGhost = false,
}: PlayerCardProps) {
  // Ghost players are always read-only — suppress edit callbacks
  if (isGhost) {
    onScoreTap = undefined;
    onQuickScore = undefined;
  }
  const [isAnimating, setIsAnimating] = useState(false);
  const [scoreFlash, setScoreFlash] = useState(false);
  const [celebrated, setCelebrated] = useState(false);

  // Score change flash effect
  useEffect(() => {
    if (currentHoleScore !== undefined) {
      setScoreFlash(true);
      const timer = setTimeout(() => setScoreFlash(false), 400);
      return () => clearTimeout(timer);
    }
  }, [currentHoleScore]);

  // Birdie/Eagle celebration effect
  useEffect(() => {
    if (currentHoleScore !== undefined && currentHoleScore <= currentHolePar - 1) {
      setCelebrated(true);
      const timer = setTimeout(() => setCelebrated(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [currentHoleScore, currentHolePar]);

  const playerName = player.name || 'Player';
  const firstName = playerName.trim().split(' ').filter(Boolean)[0] || playerName;

  // Handicap strokes on this hole
  const holeStrokes = player.strokesPerHole?.get(currentHoleNumber) || 0;
  const currentNetScore = currentHoleScore !== undefined ? currentHoleScore - holeStrokes : undefined;

  const hasHandicap = player.handicap !== undefined && player.handicap !== null;
  const displayScore = currentHoleScore ?? currentHolePar;
  const useNet = showNetScores && hasHandicap;
  const showLeader = isLeading && player.holesPlayed > 0;

  const triggerAnimation = () => {
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 300);
  };

  const handleDecrement = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (!onQuickScore) return;
    hapticLight();
    onQuickScore(Math.max(1, displayScore - 1));
    triggerAnimation();
  };

  const handleIncrement = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (!onQuickScore) return;
    hapticLight();
    onQuickScore(Math.min(12, displayScore + 1));
    triggerAnimation();
  };

  const handleCardTap = () => {
    if (onScoreTap) {
      hapticLight();
      onScoreTap();
      triggerAnimation();
    }
  };

  // Caption: "E · net −4 · thru 7"
  const caption = player.holesPlayed > 0
    ? [
        toPar(player.totalRelativeToPar),
        useNet && player.netRelativeToPar !== undefined ? `net ${toPar(player.netRelativeToPar)}` : null,
        `thru ${player.holesPlayed}`,
      ].filter(Boolean).join(' · ')
    : 'No score yet';

  const scoreAria = currentHoleScore !== undefined
    ? `Score ${currentHoleScore}, ${scoreName(currentHoleScore, currentHolePar).toLowerCase()}. Tap for more options`
    : 'Score not set. Tap for more options';

  const mark = (
    <div className="flex flex-col items-center justify-center">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={currentHoleScore ?? 'empty'}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={spring}
          className="inline-flex"
        >
          <ScoreMark strokes={currentHoleScore} par={currentHolePar} />
        </motion.span>
      </AnimatePresence>
    </div>
  );

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={
        celebrated || voiceSuccess
          ? { opacity: 1, y: 0, scale: [1, 1.015, 1] }
          : scoreFlash
          ? { opacity: 1, y: 0, backgroundColor: ['#FFFFFF', '#F4FDE4', '#FFFFFF'] }
          : isAnimating
          ? { opacity: 1, y: 0, scale: [1, 1.01, 1] }
          : { opacity: 1, y: 0 }
      }
      transition={
        celebrated
          ? { type: 'spring', stiffness: 300, damping: 20, duration: 0.5 }
          : scoreFlash
          ? { duration: 0.4 }
          : voiceSuccess
          ? { duration: 0.5 }
          : isAnimating
          ? { duration: 0.2 }
          : { ...spring, delay: index * 0.05 }
      }
      className={cn(
        'relative overflow-hidden bg-white rounded-[20px] border border-[#E7E9E3] pl-4 pr-2 py-2',
        celebrated && 'border-[#14532D]',
        voiceHighlight && 'ring-2 ring-[#BEF264] ring-offset-1 ring-offset-[#FAFAF7]',
      )}
    >
      {/* Voice success overlay */}
      <AnimatePresence>
        {voiceSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-[#ECFCCB]/70 z-10 pointer-events-none"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ ...spring, delay: 0.1 }}
              className="w-9 h-9 rounded-full bg-[#14532D] flex items-center justify-center"
            >
              <Check className="w-5 h-5 text-white" strokeWidth={3} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-2">
        {/* Name + caption — tap opens the score sheet */}
        <motion.div
          className={cn('flex-1 min-w-0 min-h-[46px] flex flex-col justify-center', onScoreTap && 'cursor-pointer')}
          whileTap={onScoreTap ? { scale: 0.98 } : undefined}
          onClick={handleCardTap}
          aria-label={`Open score sheet for ${player.name}`}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <h4 className="text-base font-semibold text-[#0F1F17] truncate leading-tight">{firstName}</h4>
            {showLeader && (
              <span className="shrink-0 rounded-full bg-[#14532D] text-white text-[11px] font-semibold leading-none px-2 py-1">
                Leads
              </span>
            )}
            {isGhost && (
              <span className="shrink-0 rounded-full bg-[#F0F2EC] text-[#5A6B61] text-[11px] font-semibold leading-none px-2 py-1">
                Net par
              </span>
            )}
            {holeStrokes > 0 && !isGhost && (
              <span className="shrink-0 rounded-full bg-[#ECFCCB] text-[#14532D] text-[11px] font-semibold leading-none px-2 py-1 whitespace-nowrap">
                {useNet && currentNetScore !== undefined
                  ? `net ${currentNetScore}`
                  : holeStrokes === 1 ? '1 shot' : `${holeStrokes} shots`}
              </span>
            )}
          </div>
          <p className="mt-1 text-[12px] font-medium text-[#5A6B61] truncate tabular-nums leading-tight">
            {caption}
          </p>
        </motion.div>

        {onQuickScore ? (
          <div className="flex items-center gap-1.5 shrink-0">
            <motion.button
              whileTap={{ scale: 0.88 }}
              transition={spring}
              onClick={handleDecrement}
              disabled={displayScore <= 1}
              className="w-[46px] h-[46px] rounded-[14px] bg-[#F0F2EC] text-[#0F1F17] flex items-center justify-center touch-manipulation select-none active:bg-[#E4E7DF] disabled:opacity-30"
              style={{ WebkitTapHighlightColor: 'transparent' }}
              aria-label="Decrease score"
            >
              <Minus className="w-5 h-5" strokeWidth={2.5} />
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.94 }}
              transition={spring}
              onClick={handleCardTap}
              className="w-[52px] min-h-[46px] flex items-center justify-center touch-manipulation select-none"
              style={{ WebkitTapHighlightColor: 'transparent' }}
              aria-label={scoreAria}
            >
              {mark}
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.88 }}
              transition={spring}
              onClick={handleIncrement}
              disabled={displayScore >= 12}
              className="w-[46px] h-[46px] rounded-[14px] bg-[#14532D] text-white flex items-center justify-center touch-manipulation select-none active:bg-[#0F3F22] disabled:opacity-30"
              style={{ WebkitTapHighlightColor: 'transparent' }}
              aria-label="Increase score"
            >
              <Plus className="w-5 h-5" strokeWidth={2.5} />
            </motion.button>
          </div>
        ) : (
          /* Read-only score for spectators and ghosts */
          <div className="w-[52px] min-h-[46px] flex items-center justify-center shrink-0 mr-1">{mark}</div>
        )}
      </div>
    </motion.div>
  );
}
