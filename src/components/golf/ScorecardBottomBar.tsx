import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, Trophy, Flag, CheckCircle2, Share2, DollarSign, Zap } from 'lucide-react';
import { VoiceButton } from '@/components/golf/VoiceButton';
import { PropBetSheet } from '@/components/golf/PropBetSheet';
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
  completedHoles: number;
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
  onNavigateToLeaderboard: () => void;
  onVoicePress: () => void;
  onShowFinishOptions: () => void;
  onFinishRound: () => void;
  onNextHole?: () => void;
  onPropBetAdded: (bet: PropBet) => Promise<{ success: boolean; error?: string }>;
  onPropBetUpdated: (bet: PropBet) => Promise<{ success: boolean; error?: string }>;
  onShowShare?: () => void;
  /** Solo round — hide leaderboard, prop bets, share, and junk banner. */
  isSolo?: boolean;
}

export function ScorecardBottomBar({
  roundId,
  players,
  currentHole,
  holeInfo,
  completedHoles,
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
  onNavigateToLeaderboard,
  onVoicePress,
  onShowFinishOptions,
  onFinishRound,
  onNextHole,
  onPropBetAdded,
  onPropBetUpdated,
  onShowShare,
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

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-40 transition-all duration-300',
        'bg-[#F8F8F6] border-t border-border/30',
        showFinishOptions && 'opacity-0 pointer-events-none'
      )}
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 8px)',
      }}
    >
      {/* Any Junk? Banner */}
      <AnimatePresence>
        {showJunkBanner && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="px-4 pt-2"
          >
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => { hapticLight(); setShowJunk(true); }}
              className="w-full bg-[#F0EE3A] rounded-2xl px-4 py-2.5 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#0A0A0A]" />
                <span className="text-[13px] font-black text-[#0A0A0A]">Any junk on hole {currentHole}?</span>
              </div>
              <span className="text-[12px] font-bold text-[#0A0A0A]/60">Log it →</span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Secondary Actions Row */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 gap-2">
        {/* Leaderboard — hidden for solo rounds (no one else to rank against) */}
        {!isSolo ? (
          <motion.button
            whileTap={{ scale: 0.93 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            onClick={onNavigateToLeaderboard}
            aria-label="View leaderboard"
            className="bg-white rounded-xl shadow-sm px-3.5 py-2 flex items-center gap-1.5 touch-manipulation"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <BarChart3 className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-bold text-foreground uppercase tracking-[0.06em]">Board</span>
          </motion.button>
        ) : (
          <div /> /* spacer to keep layout */
        )}

        {/* Center: progress indicator */}
        <div className="flex-1 flex items-center justify-center">
          <span className="text-xs text-muted-foreground font-mono tabular-nums">
            {completedHoles}/{totalHoles}
          </span>
        </div>

        {/* Right group: Prop Bets + Share */}
        <div className="flex items-center gap-2">
          {/* Prop Bets — hidden for solo (no other players to bet against) */}
          {!isSolo && !isSpectator && playoffHole === 0 && (
            <div className="bg-white rounded-xl shadow-sm">
              <PropBetSheet
                roundId={roundId}
                players={players}
                currentHole={currentHole}
                holeInfo={holeInfo}
                propBets={propBets}
                onPropBetAdded={onPropBetAdded}
                onPropBetUpdated={onPropBetUpdated}
              />
            </div>
          )}

          {/* Share — hidden for solo rounds (no one to invite) */}
          {!isSolo && onShowShare && (
            <motion.button
              whileTap={{ scale: 0.93 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              onClick={onShowShare}
              aria-label="Share round"
              className="bg-white rounded-xl shadow-sm px-3.5 py-2 flex items-center gap-1.5 touch-manipulation"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <Share2 className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-bold text-foreground uppercase tracking-[0.06em]">Share</span>
            </motion.button>
          )}

          {/* Playoff indicator */}
          {isPlayoffState && (
            <div className="px-3 py-2 flex items-center rounded-xl bg-primary/10 border border-primary/30">
              <span className="font-bold text-xs text-primary">Playoff #{playoffHole}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Action Row */}
      <div className="flex items-center gap-3 px-4 pb-2">
        {/* Voice Button */}
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
        ) : (
          <div className="w-16 flex-shrink-0" />
        )}

        {/* Main CTA Button */}
        <div className="flex-1">
          <AnimatePresence mode="wait">
            {/* Playoff End button */}
            {showPlayoffEnd && (
              <motion.button
                key="playoff-end"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                whileTap={{ scale: 0.97 }}
                onClick={onFinishRound}
                aria-label="End playoff and finish round"
                className="w-full h-12 bg-foreground text-background font-black rounded-2xl flex items-center justify-center gap-2 touch-manipulation relative overflow-hidden"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <Trophy className="w-4 h-4" />
                <span>End Playoff</span>
              </motion.button>
            )}

            {/* Finish Round button (hole 18 done) */}
            {!showPlayoffEnd && showFinishButton && (
              <motion.button
                key="finish-round"
                initial={{ opacity: 0, y: 8 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  boxShadow: canFinish
                    ? [
                        '0 0 0 0 rgba(240,238,58,0.5)',
                        '0 0 0 8px rgba(240,238,58,0)',
                        '0 0 0 0 rgba(240,238,58,0)',
                      ]
                    : '0 0 0 0 rgba(0,0,0,0)',
                }}
                exit={{ opacity: 0, y: -8 }}
                // @ts-expect-error — framer keyframe transition
                transition={{ duration: canFinish ? 2 : 0.3, repeat: canFinish ? Infinity : 0, type: canFinish ? undefined : 'spring', stiffness: 400, damping: 30 }}
                whileTap={{ scale: 0.97 }}
                onClick={onShowFinishOptions}
                aria-label="Finish round"
                className={cn(
                  'w-full h-12 font-black rounded-2xl flex items-center justify-center gap-2 touch-manipulation relative overflow-hidden',
                  canFinish
                    ? 'bg-[#F0EE3A] text-[#0A0A0A]'
                    : 'border-2 border-foreground bg-transparent text-foreground'
                )}
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                {canFinish ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Finish Round</span>
                  </>
                ) : (
                  <>
                    <Flag className="w-4 h-4" />
                    <span>Done?</span>
                  </>
                )}
              </motion.button>
            )}

            {/* Next Hole button (with optional auto-advance progress) */}
            {!showPlayoffEnd && !showFinishButton && showNextHole && (
              <motion.button
                key="next-hole"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                whileTap={{ scale: 0.97 }}
                onClick={onNextHole}
                aria-label={`Go to hole ${currentHole + 1}`}
                className="w-full h-12 bg-foreground text-background font-black rounded-2xl flex items-center justify-center gap-2 touch-manipulation relative overflow-hidden"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                {/* Auto-advance countdown background fill */}
                {autoAdvanceCountdown !== null && autoAdvanceCountdown !== undefined && (
                  <motion.div
                    className="absolute inset-0 bg-white/10 origin-left"
                    initial={{ scaleX: 1 }}
                    animate={{ scaleX: autoAdvanceCountdown / 20 }}
                    transition={{ duration: 1, ease: 'linear' }}
                    style={{ transformOrigin: 'left center' }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <span>Hole {currentHole + 1}</span>
                  <span className="opacity-60">→</span>
                  {autoAdvanceCountdown !== null && autoAdvanceCountdown !== undefined && (
                    <span className="text-xs font-mono opacity-70">({autoAdvanceCountdown}s)</span>
                  )}
                </span>
              </motion.button>
            )}

            {/* Idle state — no main action available */}
            {!showPlayoffEnd && !showFinishButton && !showNextHole && (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-12 rounded-2xl bg-muted/40 flex items-center justify-center"
              >
                <span className="text-xs text-muted-foreground font-medium">
                  {isSpectator ? 'Spectating' : `Hole ${currentHole} of ${totalHoles}`}
                </span>
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
