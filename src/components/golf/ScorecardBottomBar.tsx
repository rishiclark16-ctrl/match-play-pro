import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Flag, CheckCircle2, ArrowRight, Zap, ChevronRight } from 'lucide-react';
import { VoiceButton } from '@/components/golf/VoiceButton';
import { JunkBetSheet } from '@/components/golf/JunkBetSheet';
import { cn } from '@/lib/utils';
import { PlayerWithScores, HoleInfo } from '@/types/golf';
import { PropBet } from '@/types/betting';
import { hapticLight } from '@/lib/haptics';

interface ScorecardBottomBarProps {
  roundId: string;
  players: PlayerWithScores[];
  currentHole: number;
  holeInfo: HoleInfo[];
  totalHoles: number;
  playoffHole: number;
  canFinish: boolean;
  hole18FullyScored: boolean;
  isSpectator: boolean;
  canEditScores: boolean;
  showFinishOptions: boolean;
  isListening: boolean;
  isProcessing: boolean;
  isSupported: boolean;
  audioLevel?: number;
  interimTranscript?: string | null;
  isNoisy?: boolean;
  isHandsFree?: boolean;
  propBets: PropBet[];
  junkStakes?: number;
  autoAdvanceCountdown?: number | null;
  allCurrentHoleScored?: boolean;
  voiceButtonRef?: React.RefObject<HTMLDivElement>;
  onVoicePress: () => void;
  onShowFinishOptions: () => void;
  onFinishRound: () => void;
  onNextHole?: () => void;
  /** Solo round — hide the junk banner. */
  isSolo?: boolean;
}

export function ScorecardBottomBar({
  roundId,
  players,
  currentHole,
  holeInfo,
  totalHoles,
  playoffHole,
  canFinish,
  hole18FullyScored,
  isSpectator,
  canEditScores,
  showFinishOptions,
  isListening,
  isProcessing,
  isSupported,
  audioLevel = 0,
  interimTranscript = null,
  isNoisy = false,
  isHandsFree = false,
  propBets,
  junkStakes = 1,
  autoAdvanceCountdown,
  allCurrentHoleScored,
  voiceButtonRef,
  onVoicePress,
  onShowFinishOptions,
  onFinishRound,
  onNextHole,
  isSolo = false,
}: ScorecardBottomBarProps) {
  const isLastHole = currentHole === totalHoles;
  const isFinishState = (canFinish || hole18FullyScored) && !isSpectator && playoffHole === 0;
  const isPlayoffState = playoffHole > 0;

  // Junk bet sheet state
  const [showJunk, setShowJunk] = useState(false);
  // Track which holes have had the junk prompt dismissed so it doesn't re-show
  const junkDismissedRef = useRef<Set<number>>(new Set());
  const prevHoleRef = useRef<number>(currentHole);

  // Reset dismissed flag when hole changes
  useEffect(() => {
    if (prevHoleRef.current !== currentHole) {
      prevHoleRef.current = currentHole;
    }
  }, [currentHole]);

  // Show junk prompt when all players have scored (if not dismissed for this hole)
  // Junk bets only make sense in a betting round — never in solo.
  const showJunkBanner = !isSolo && !isSpectator && playoffHole === 0 && !!allCurrentHoleScored
    && !junkDismissedRef.current.has(currentHole);

  const handleJunkDismiss = () => {
    junkDismissedRef.current.add(currentHole);
    setShowJunk(false);
  };

  // Determine what the main action button does
  const showNextHole = !isSpectator && !isLastHole && playoffHole === 0 && allCurrentHoleScored;
  const showFinishButton = isFinishState;
  const showPlayoffEnd = isPlayoffState && !isSpectator;

  const scoredCount = players.filter(p => p.scores.some(s => s.holeNumber === currentHole)).length;
  const hasCountdown = autoAdvanceCountdown !== null && autoAdvanceCountdown !== undefined;

  const ctaBase =
    'w-full h-[60px] rounded-[20px] flex items-center justify-center gap-2 text-[17px] font-bold tracking-[-0.01em] touch-manipulation relative overflow-hidden';
  const ctaMotion = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
    transition: { type: 'spring' as const, stiffness: 400, damping: 30 },
    whileTap: { scale: 0.97 },
  };

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-40 transition-all duration-300',
        'bg-[#FAFAF7]/95 backdrop-blur-md border-t border-[#E7E9E3]',
        showFinishOptions && 'opacity-0 pointer-events-none'
      )}
      style={{
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)',
      }}
    >
      {/* Any junk? prompt */}
      <AnimatePresence>
        {showJunkBanner && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="px-3.5 pt-3"
          >
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => { hapticLight(); setShowJunk(true); }}
              className="w-full min-h-[52px] bg-white border border-[#E7E9E3] rounded-[20px] pl-2 pr-4 py-1.5 flex items-center gap-3 touch-manipulation"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <span className="w-9 h-9 rounded-[12px] bg-[#ECFCCB] flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4 text-[#14532D]" strokeWidth={2.5} />
              </span>
              <span className="flex-1 text-left text-[15px] font-semibold text-[#0F1F17]">Any junk on hole {currentHole}?</span>
              <span className="flex items-center gap-0.5 text-[14px] font-semibold text-[#14532D]">
                Log it
                <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
              </span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main action row: lime voice button + Ink primary CTA */}
      <div className="flex items-center gap-3 px-3.5 pt-3">
        {canEditScores ? (
          <div ref={voiceButtonRef} className="flex-shrink-0">
            <VoiceButton
              isListening={isListening}
              isProcessing={isProcessing}
              isSupported={isSupported}
              onPress={onVoicePress}
              audioLevel={audioLevel}
              interimTranscript={interimTranscript}
              isNoisy={isNoisy}
              isHandsFree={isHandsFree}
            />
          </div>
        ) : null}

        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            {/* Playoff End button */}
            {showPlayoffEnd && (
              <motion.button
                key="playoff-end"
                {...ctaMotion}
                onClick={onFinishRound}
                aria-label="End playoff and finish round"
                className={cn(ctaBase, 'bg-[#0F1F17] text-white')}
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <Trophy className="w-5 h-5 text-[#BEF264]" />
                <span>End playoff</span>
                <span className="text-[13px] font-semibold text-white/60">· hole {playoffHole}</span>
              </motion.button>
            )}

            {/* Finish Round button (last hole done) */}
            {!showPlayoffEnd && showFinishButton && (
              <motion.button
                key="finish-round"
                {...ctaMotion}
                onClick={onShowFinishOptions}
                aria-label="Finish round"
                className={cn(
                  ctaBase,
                  canFinish
                    ? 'bg-[#14532D] text-white'
                    : 'bg-white border-2 border-[#0F1F17] text-[#0F1F17]'
                )}
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                {canFinish ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-[#BEF264]" />
                    <span>Finish round</span>
                  </>
                ) : (
                  <>
                    <Flag className="w-5 h-5" />
                    <span>Finish round?</span>
                  </>
                )}
              </motion.button>
            )}

            {/* Next hole (with optional auto-advance countdown) */}
            {!showPlayoffEnd && !showFinishButton && showNextHole && (
              <motion.button
                key="next-hole"
                {...ctaMotion}
                onClick={onNextHole}
                aria-label={`Go to hole ${currentHole + 1}`}
                className={cn(ctaBase, 'bg-[#0F1F17] text-white')}
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                {hasCountdown && (
                  <motion.div
                    className="absolute left-0 right-0 bottom-0 h-[3px] bg-[#BEF264] origin-left"
                    initial={{ scaleX: 1 }}
                    animate={{ scaleX: (autoAdvanceCountdown as number) / 20 }}
                    transition={{ duration: 1, ease: 'linear' }}
                    style={{ transformOrigin: 'left center' }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <span>Next hole</span>
                  <ArrowRight className="w-5 h-5" strokeWidth={2.5} />
                  {hasCountdown && (
                    <span className="ml-1 rounded-full bg-white/10 px-2 py-0.5 text-[12px] font-semibold tabular-nums text-white/80">
                      {autoAdvanceCountdown}s
                    </span>
                  )}
                </span>
              </motion.button>
            )}

            {/* Idle state — no main action available yet */}
            {!showPlayoffEnd && !showFinishButton && !showNextHole && (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-[60px] rounded-[20px] bg-[#F0F2EC] flex flex-col items-center justify-center"
              >
                <span className="text-[15px] font-semibold text-[#0F1F17]">
                  {isSpectator ? 'Spectating' : `Hole ${currentHole} of ${totalHoles}`}
                </span>
                {!isSpectator && players.length > 0 && (
                  <span className="text-[12px] font-medium text-[#5A6B61] tabular-nums">
                    {scoredCount} of {players.length} scored
                  </span>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Junk Bet Sheet */}
      <JunkBetSheet
        isOpen={showJunk}
        onClose={handleJunkDismiss}
        roundId={roundId}
        currentHole={currentHole}
        holeInfo={holeInfo}
        players={players}
        existingBets={propBets}
        defaultStakes={junkStakes}
      />
    </div>
  );
}
