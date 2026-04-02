import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Plus, Check, ChevronUp } from 'lucide-react';
import { PlayerWithScores, getScoreColor, formatRelativeToPar } from '@/types/golf';
import { cn } from '@/lib/utils';
import { hapticLight, hapticSuccess } from '@/lib/haptics';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

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

// Score label with relative-to-par suffix
function getScoreLabel(score: number, par: number): { label: string; diff: string } {
  const diff = score - par;
  if (score === 1) return { label: 'ACE', diff: '' };
  if (diff <= -3) return { label: 'ALBATROSS', diff: `-${Math.abs(diff)}` };
  if (diff === -2) return { label: 'EAGLE', diff: '-2' };
  if (diff === -1) return { label: 'BIRDIE', diff: '-1' };
  if (diff === 0) return { label: 'PAR', diff: '' };
  if (diff === 1) return { label: 'BOGEY', diff: '+1' };
  if (diff === 2) return { label: 'DOUBLE', diff: '+2' };
  if (diff === 3) return { label: 'TRIPLE', diff: '+3' };
  return { label: `+${diff}`, diff: `+${diff}` };
}

// Card background based on score diff (Direction B spec)
function getCardBg(score: number | undefined, par: number, netScore: number | undefined, useNet: boolean): string {
  if (score === undefined) return 'bg-white';
  const s = useNet && netScore !== undefined ? netScore : score;
  const diff = s - par;
  if (diff <= -2) return 'bg-score-eagle';
  if (diff === -1) return 'bg-score-birdie border border-green-100';
  if (diff === 0) return 'bg-white';
  if (diff === 1) return 'bg-score-bogey';
  return 'bg-score-double';
}

function getScoreNumColor(score: number | undefined, par: number, netScore: number | undefined, useNet: boolean): string {
  if (score === undefined) return 'text-muted-foreground';
  const s = useNet && netScore !== undefined ? netScore : score;
  const diff = s - par;
  if (diff <= -1) return 'text-[#15803D]';
  if (diff === 0) return 'text-[#0A0A0A]';
  if (diff === 1) return 'text-[#92400E]';
  return 'text-[#991B1B]';
}

function getLabelColor(score: number | undefined, par: number, netScore: number | undefined, useNet: boolean): string {
  if (score === undefined) return 'text-muted-foreground/60';
  const s = useNet && netScore !== undefined ? netScore : score;
  const diff = s - par;
  if (diff <= -1) return 'text-[#16A34A]/70';
  if (diff === 0) return 'text-[#6B7280]';
  if (diff === 1) return 'text-[#B45309]/70';
  return 'text-[#B91C1C]/70';
}

const spring = { type: 'spring' as const, stiffness: 300, damping: 28 };

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
  const [celebrationType, setCelebrationType] = useState<'birdie' | 'eagle' | null>(null);

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
      const type = currentHoleScore <= currentHolePar - 2 ? 'eagle' : 'birdie';
      setCelebrationType(type);
      setCelebrated(true);
      const timer = setTimeout(() => {
        setCelebrated(false);
        setCelebrationType(null);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [currentHoleScore, currentHolePar]);

  // Get initials - with defensive null check
  const playerName = player.name || 'Player';
  const nameParts = playerName.trim().split(' ').filter(Boolean);
  const initials = nameParts.length > 1
    ? `${nameParts[0][0] || ''}${nameParts[nameParts.length - 1][0] || ''}`.toUpperCase()
    : playerName.substring(0, 2).toUpperCase();

  // Get handicap strokes for current hole
  const holeStrokes = player.strokesPerHole?.get(currentHoleNumber) || 0;

  // Calculate net score for current hole
  const currentNetScore = currentHoleScore !== undefined
    ? currentHoleScore - holeStrokes
    : undefined;

  const hasHandicap = player.handicap !== undefined && player.handicap !== null;
  const displayScore = currentHoleScore ?? currentHolePar;
  const useNet = showNetScores && hasHandicap;

  // Eagle indicator (≤ -2)
  const isEagle = currentHoleScore !== undefined && (
    (useNet && currentNetScore !== undefined
      ? currentNetScore
      : currentHoleScore) - currentHolePar <= -2
  );

  const triggerAnimation = () => {
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 300);
  };

  const handleDecrement = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (!onQuickScore) return;
    hapticLight();
    const newScore = Math.max(1, displayScore - 1);
    onQuickScore(newScore);
    triggerAnimation();
  };

  const handleIncrement = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (!onQuickScore) return;
    hapticLight();
    const newScore = Math.min(12, displayScore + 1);
    onQuickScore(newScore);
    triggerAnimation();
  };

  const handleCardTap = () => {
    if (onScoreTap) {
      hapticLight();
      onScoreTap();
      triggerAnimation();
    }
  };

  const scoreLabel = currentHoleScore !== undefined
    ? getScoreLabel(
        useNet && currentNetScore !== undefined ? currentNetScore : currentHoleScore,
        currentHolePar
      )
    : null;

  const cardBg = getCardBg(currentHoleScore, currentHolePar, currentNetScore, useNet);
  const scoreNumColor = getScoreNumColor(currentHoleScore, currentHolePar, currentNetScore, useNet);
  const labelColor = getLabelColor(currentHoleScore, currentHolePar, currentNetScore, useNet);

  const celebrationShadow = celebrated
    ? celebrationType === 'eagle'
      ? 'shadow-[0_0_0_2px_#F0EE3A]'
      : 'shadow-[0_0_0_2px_#22C55E]'
    : '';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={
        celebrated
          ? { opacity: 1, y: 0, scale: [1, 1.02, 1] }
          : scoreFlash
          ? {
              opacity: 1,
              y: 0,
              backgroundColor: [
                'rgba(240,238,58,0)',
                'rgba(240,238,58,0.18)',
                'rgba(240,238,58,0)',
              ],
            }
          : voiceSuccess
          ? { opacity: 1, y: 0, scale: [1, 1.02, 1] }
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
        'rounded-2xl p-4 relative overflow-hidden',
        'shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]',
        cardBg,
        celebrated
          ? celebrationShadow
          : isLeading && player.holesPlayed > 0
          ? 'shadow-[0_0_0_2px_rgba(34,197,94,0.35),0_4px_16px_rgba(34,197,94,0.1)]'
          : '',
        isLeading && player.holesPlayed > 0 && 'border-l-[3px] border-[#F0EE3A]',
        voiceHighlight && 'ring-2 ring-[#22C55E]/40',
      )}
    >
      {/* Leading badge */}
      {isLeading && player.holesPlayed > 0 && (
        <div className="absolute top-0 right-0 bg-[#22C55E] text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-xl rounded-tr-2xl flex items-center gap-1">
          <span>Leader</span>
        </div>
      )}

      {/* Voice success overlay */}
      <AnimatePresence>
        {voiceSuccess && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-[#22C55E]/10 z-10 pointer-events-none"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ ...spring, delay: 0.1 }}
              className="w-8 h-8 rounded-full bg-[#22C55E] flex items-center justify-center"
            >
              <Check className="w-4 h-4 text-white" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main layout: left info | center score | right buttons ── */}
      <div className="flex items-center gap-3">

        {/* Left: Avatar + name + running total */}
        <motion.div
          className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
          whileTap={{ scale: 0.97 }}
          onClick={handleCardTap}
          aria-label={`Open score sheet for ${player.name}`}
        >
          {/* Avatar */}
          <div className="shrink-0 relative">
            {isGhost ? (
              <div className="w-10 h-10 rounded-xl bg-muted/60 border border-dashed border-border/50 flex items-center justify-center text-xl">
                👻
              </div>
            ) : (
              <>
                <Avatar className="w-10 h-10 rounded-xl">
                  <AvatarImage src={player.avatarUrl} className="rounded-xl object-cover" />
                  <AvatarFallback className="bg-[#0A0A0A] text-white text-sm font-bold rounded-xl">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                {/* Handicap stroke dot indicator */}
                {holeStrokes > 0 && (
                  <div className="absolute -top-1 -right-1 flex gap-0.5">
                    {Array.from({ length: Math.min(holeStrokes, 2) }).map((_, i) => (
                      <div
                        key={i}
                        className="w-2 h-2 rounded-full bg-[#F0EE3A] border border-white shadow-sm"
                      />
                    ))}
                    {holeStrokes > 2 && (
                      <span className="text-[7px] font-bold text-[#888]">+{holeStrokes - 2}</span>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Name + running total */}
          <div className="min-w-0">
            {/* Name row */}
            <div className="flex items-center gap-1.5">
              <h4 className="text-sm font-bold text-[#0A0A0A] truncate leading-tight">
                {nameParts[0] || playerName}
              </h4>
              {isGhost ? (
                <span className="shrink-0 bg-black/6 text-[#0A0A0A]/40 text-[10px] font-bold px-1.5 py-0.5 rounded-md leading-tight">
                  net par
                </span>
              ) : hasHandicap && (
                <span className="shrink-0 bg-black/6 text-[#0A0A0A]/50 text-[10px] font-bold px-1.5 py-0.5 rounded-md leading-tight">
                  {player.playingHandicap}
                </span>
              )}
            </div>

            {/* Running total */}
            <div className="mt-0.5">
              {player.holesPlayed > 0 ? (
                <div className="flex items-center gap-1.5">
                  <span className={cn("text-xs font-semibold", getScoreColor(player.totalStrokes, player.holesPlayed * currentHolePar))}>
                    {formatRelativeToPar(player.totalRelativeToPar)}
                  </span>
                  {useNet && player.netRelativeToPar !== undefined && (
                    <>
                      <span className="text-muted-foreground/30 text-[10px]">·</span>
                      <span className={cn(
                        "text-[11px] font-medium",
                        player.netRelativeToPar <= -1 ? "text-success" :
                        player.netRelativeToPar === 0 ? "text-foreground" :
                        player.netRelativeToPar === 1 ? "text-warning" :
                        "text-destructive"
                      )}>
                        Net {formatRelativeToPar(player.netRelativeToPar)}
                      </span>
                    </>
                  )}
                </div>
              ) : (
                <span className="text-[11px] text-muted-foreground/60 italic">Thru {player.holesPlayed}</span>
              )}
            </div>
          </div>
        </motion.div>

        {/* Center + Right: score display + adjust buttons */}
        {onQuickScore ? (
          <div className="flex items-center gap-2 shrink-0">
            {/* Minus button — large circular tap target */}
            <motion.button
              whileTap={{ scale: 0.86 }}
              transition={spring}
              onClick={handleDecrement}
              disabled={displayScore <= 1}
              className={cn(
                "w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-black/5 flex items-center justify-center touch-manipulation cursor-pointer select-none",
                displayScore <= 1 ? "opacity-20" : "active:bg-black/10"
              )}
              style={{ WebkitTapHighlightColor: 'transparent' }}
              aria-label="Decrease score"
            >
              <Minus className="w-4 h-4 text-[#0A0A0A]" strokeWidth={2.5} />
            </motion.button>

            {/* Score display — tappable to open sheet */}
            <motion.button
              layout
              transition={spring}
              whileTap={{ scale: 0.94 }}
              onClick={handleCardTap}
              className="flex flex-col items-center justify-center w-[52px] touch-manipulation select-none"
              aria-label={`Score ${currentHoleScore ?? 'not set'}. Tap for more options`}
            >
              {/* Large score number */}
              <AnimatePresence mode="popLayout">
                <motion.span
                  key={currentHoleScore ?? 'empty'}
                  initial={{ opacity: 0, y: -8, scale: 0.85 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.85 }}
                  transition={spring}
                  className={cn(
                    "text-4xl font-black tabular-nums leading-none tracking-tight",
                    scoreNumColor
                  )}
                >
                  {currentHoleScore ?? '–'}
                </motion.span>
              </AnimatePresence>

              {/* Score label (BIRDIE -1, PAR, BOGEY +1 …) */}
              <AnimatePresence mode="popLayout">
                {scoreLabel ? (
                  <motion.div
                    key={`${currentHoleScore}-label`}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="mt-0.5 flex items-baseline gap-0.5"
                  >
                    <span className={cn("text-[12px] font-bold uppercase tracking-wide leading-none", labelColor)}>
                      {scoreLabel.label}
                    </span>
                    {scoreLabel.diff !== '' && (
                      <span className={cn("text-[12px] font-bold leading-none", labelColor)}>
                        {scoreLabel.diff}
                      </span>
                    )}
                  </motion.div>
                ) : (
                  <motion.span
                    key="no-score-label"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-[9px] text-muted-foreground/50 mt-0.5 leading-none"
                  >
                    tap
                  </motion.span>
                )}
              </AnimatePresence>

              {/* Net score subscript */}
              {useNet && holeStrokes > 0 && currentNetScore !== undefined && (
                <span className="text-[8px] text-muted-foreground/50 leading-none mt-0.5 font-medium">
                  net {currentNetScore}
                </span>
              )}
            </motion.button>

            {/* Plus button — large circular tap target */}
            <motion.button
              whileTap={{ scale: 0.86 }}
              transition={spring}
              onClick={handleIncrement}
              disabled={displayScore >= 12}
              className={cn(
                "w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-black/5 flex items-center justify-center touch-manipulation cursor-pointer select-none",
                displayScore >= 12 ? "opacity-20" : "active:bg-black/10"
              )}
              style={{ WebkitTapHighlightColor: 'transparent' }}
              aria-label="Increase score"
            >
              <Plus className="w-4 h-4 text-[#0A0A0A]" strokeWidth={2.5} />
            </motion.button>
          </div>
        ) : (
          /* Read-only score display for spectators */
          <div className="flex flex-col items-center justify-center w-[52px] shrink-0">
            <span className={cn("text-4xl font-black tabular-nums leading-none tracking-tight", scoreNumColor)}>
              {currentHoleScore ?? '–'}
            </span>
            {scoreLabel && (
              <div className="mt-0.5 flex items-baseline gap-0.5">
                <span className={cn("text-[12px] font-bold uppercase tracking-wide leading-none", labelColor)}>
                  {scoreLabel.label}
                </span>
                {scoreLabel.diff !== '' && (
                  <span className={cn("text-[12px] font-bold leading-none", labelColor)}>
                    {scoreLabel.diff}
                  </span>
                )}
              </div>
            )}
            {holeStrokes > 0 && (
              <div className="flex gap-0.5 mt-1">
                {Array.from({ length: Math.min(holeStrokes, 2) }).map((_, i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-[#F0EE3A] shadow-sm"
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tap-to-edit affordance (only when no score set and can edit) */}
      {currentHoleScore === undefined && onScoreTap && (
        <motion.button
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.25 }}
          onClick={handleCardTap}
          className="mt-2.5 w-full flex items-center justify-center gap-1 py-1.5 rounded-xl border border-dashed border-black/10 text-[11px] text-muted-foreground/50 font-medium touch-manipulation"
        >
          <ChevronUp className="w-3 h-3" />
          tap to enter score
        </motion.button>
      )}
    </motion.div>
  );
}
