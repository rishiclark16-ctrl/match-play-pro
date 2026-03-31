import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatRelativeToPar, PlayerWithScores, Round } from '@/types/golf';
import { MatchPlayResult } from '@/lib/games/matchPlay';

interface WinnerCardProps {
  winner: PlayerWithScores;
  hasTie: boolean;
  sortedPlayers: PlayerWithScores[];
  round: Round;
  matchPlayResult: MatchPlayResult | null;
  useNetScoring: boolean;
}

export function WinnerCard({
  winner,
  hasTie,
  sortedPlayers,
  round,
  matchPlayResult,
  useNetScoring,
}: WinnerCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="mx-4 mb-4"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.85, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24, delay: 0.2 }}
      >
      <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
        {/* Top accent bar */}
        <div className="h-1 bg-[#F0EE3A] w-full" />

        {/* Card body */}
        <div className="px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Trophy className="text-[#F0EE3A] w-6 h-6" />
                <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#D4B800]">
                  {hasTie ? 'Tied' : 'Winner'}
                </span>
              </div>
              <h2 className="font-black text-xl tracking-[-0.03em] text-foreground">
                {hasTie
                  ? sortedPlayers
                      .filter(p => {
                        const pScore = useNetScoring
                          ? (p.totalNetStrokes ?? p.totalStrokes)
                          : p.totalStrokes;
                        const winnerScore = useNetScoring
                          ? (winner.totalNetStrokes ?? winner.totalStrokes)
                          : winner.totalStrokes;
                        return pScore === winnerScore;
                      })
                      .map(p => p.name)
                      .join(' & ')
                  : winner.name}
              </h2>
            </div>

            <div className="text-right">
              {/* For match play, show the match result; otherwise show strokes */}
              {round?.matchPlay && matchPlayResult ? (
                <>
                  <div className="font-black text-xl text-foreground">
                    {matchPlayResult.winMargin ||
                      (matchPlayResult.holesUp > 0 ? `${matchPlayResult.holesUp} UP` : 'AS')}
                  </div>
                  <div className="text-xs font-medium text-muted-foreground">
                    Net {winner.totalNetStrokes ?? winner.totalStrokes}
                  </div>
                </>
              ) : (
                <>
                  <div className="font-black text-3xl tabular-nums text-foreground">
                    {useNetScoring
                      ? (winner.totalNetStrokes ?? winner.totalStrokes)
                      : winner.totalStrokes}
                  </div>
                  <div
                    className={cn(
                      'text-sm font-black',
                      (useNetScoring
                        ? (winner.netRelativeToPar ?? winner.totalRelativeToPar)
                        : winner.totalRelativeToPar) < 0
                        ? 'text-[#22C55E]'
                        : (useNetScoring
                            ? (winner.netRelativeToPar ?? winner.totalRelativeToPar)
                            : winner.totalRelativeToPar) > 0
                        ? 'text-[#EF4444]'
                        : 'text-muted-foreground'
                    )}
                  >
                    {formatRelativeToPar(
                      useNetScoring
                        ? (winner.netRelativeToPar ?? winner.totalRelativeToPar)
                        : winner.totalRelativeToPar
                    )}
                    {useNetScoring && winner.playingHandicap ? ' (net)' : ''}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      </motion.div>
    </motion.div>
  );
}
