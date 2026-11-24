import { RefObject } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { Mic } from 'lucide-react';
import { PlayerCard } from '@/components/golf/PlayerCard';
import { GamesSection } from '@/components/golf/GamesSection';
import { LiveLeaderboard } from '@/components/golf/LiveLeaderboard';
import { MoneyTracker } from '@/components/golf/MoneyTracker';
import { PlayerWithScores, Press, Round, Score } from '@/types/golf';
import { PropBet } from '@/types/betting';

interface ScorecardBodyProps {
  round: Round;
  playersWithScores: PlayerWithScores[];
  roundScores: Score[];
  propBets: PropBet[];
  currentHole: number;
  currentHolePar: number;
  playoffHole: number;
  leadingPlayerId: string | null | undefined;
  isSolo: boolean;
  isSpectator: boolean;
  canEditScores: boolean;
  isListening: boolean;
  isSupported: boolean;
  voiceSuccessPlayerIds: Set<string>;
  playerCardRef: RefObject<HTMLDivElement>;
  leaderboardRef: RefObject<HTMLDivElement>;
  onSelectPlayer: (playerId: string) => void;
  onQuickScore: (playerId: string, score: number) => void;
  onAddPress: (press: Press) => void;
}

/**
 * The scrollable middle of the scorecard: player rows for the current hole,
 * then standings, live money and the live games. Extracted from Scorecard.tsx
 * (render-only; all state and handlers stay in the page).
 */
export function ScorecardBody({
  round, playersWithScores, roundScores, propBets, currentHole, currentHolePar, playoffHole,
  leadingPlayerId, isSolo, isSpectator, canEditScores, isListening, isSupported,
  voiceSuccessPlayerIds, playerCardRef, leaderboardRef, onSelectPlayer, onQuickScore, onAddPress,
}: ScorecardBodyProps) {
  const matchGame = round.games?.find(g => g.type === 'match');

  return (
    <>
      <div className="space-y-2">
        {/* Regular scoring mode */}
        {playoffHole === 0 && (
          <LayoutGroup>
            <AnimatePresence mode="popLayout">
              {playersWithScores.map((player, index) => {
                const holeScore = player.scores.find(s => s.holeNumber === currentHole)?.strokes;
                return (
                  <motion.div
                    key={player.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{
                      layout: { type: 'spring', stiffness: 300, damping: 30 },
                      opacity: { duration: 0.2 },
                    }}
                  >
                    <div ref={index === 0 ? playerCardRef : undefined}>
                      <PlayerCard
                        player={player}
                        currentHoleScore={holeScore}
                        currentHolePar={currentHolePar}
                        currentHoleNumber={currentHole}
                        isLeading={player.id === leadingPlayerId}
                        onScoreTap={canEditScores && !player.isGhost ? () => onSelectPlayer(player.id) : undefined}
                        onQuickScore={canEditScores && !player.isGhost ? score => onQuickScore(player.id, score) : undefined}
                        showNetScores={true}
                        voiceHighlight={isListening}
                        voiceSuccess={voiceSuccessPlayerIds.has(player.id)}
                        isGhost={player.isGhost}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </LayoutGroup>
        )}

        {/* Live Leaderboard — hide during playoff and for solo rounds (nothing to rank) */}
        {!isSolo && playoffHole === 0 && playersWithScores.some(p => p.holesPlayed > 0) && (
          <div className="pt-3">
            <LiveLeaderboard
              ref={leaderboardRef}
              players={playersWithScores}
              useNetScoring={round.matchPlay || round.games?.some(g => g.useNet) || false}
              isMatchPlay={round.matchPlay}
              holeInfo={round.holeInfo}
              scores={roundScores}
              matchPlayFormat={matchGame?.matchPlayFormat}
              matchPlayTeams={matchGame?.matchPlayTeams}
            />
          </div>
        )}

        {/* Live Money Tracker */}
        {playoffHole === 0 && (round.games?.length > 0 || propBets.some(pb => pb.winnerId)) && (
          <div className="pt-3">
            <MoneyTracker
              players={playersWithScores}
              scores={roundScores}
              games={round.games || []}
              holeInfo={round.holeInfo}
              presses={round.presses || []}
              currentHole={currentHole}
              propBets={propBets}
            />
          </div>
        )}

        {/* Games Section — hide during playoff */}
        {playoffHole === 0 && (round.games?.length > 0 || propBets.length > 0) && (
          <>
            <div className="pt-3" />
            <GamesSection
              round={round}
              players={playersWithScores}
              scores={roundScores}
              currentHole={currentHole}
              onAddPress={onAddPress}
              propBets={propBets}
            />
          </>
        )}
      </div>

      {/* Voice hint */}
      {playoffHole === 0 && !isSpectator && isSupported && playersWithScores.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center justify-center gap-1.5 mt-6"
        >
          <Mic className="w-3.5 h-3.5 text-[#5A6B61]" />
          <p className="text-[13px] text-[#5A6B61] font-medium">
            {isSolo
              ? `Say "I made a 4 on ${currentHole}" to score`
              : <>Say "{(playersWithScores[0]?.name || 'Mike').split(' ')[0]} 5,{' '}
                  {(playersWithScores[1]?.name || 'Tim').split(' ')[0]} 4" to score</>
            }
          </p>
        </motion.div>
      )}
    </>
  );
}
