import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatRelativeToPar, PlayerWithScores, Round } from '@/types/golf';
import { TechCard, TechCardContent } from '@/components/ui/tech-card';
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
      <TechCard variant="winner" accentBar="top">
        <TechCardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Trophy className="w-4 h-4 text-gold" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-gold">
                  {hasTie ? 'Tied' : 'Winner'}
                </span>
              </div>
              <h2 className="text-xl font-bold tracking-tight">
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
                  <div className="text-2xl font-black tracking-tight">
                    {matchPlayResult.winMargin ||
                      (matchPlayResult.holesUp > 0 ? `${matchPlayResult.holesUp} UP` : 'AS')}
                  </div>
                  <div className="text-xs font-medium text-muted-foreground">
                    Net {winner.totalNetStrokes ?? winner.totalStrokes}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-3xl font-black tabular-nums tracking-tight">
                    {useNetScoring
                      ? (winner.totalNetStrokes ?? winner.totalStrokes)
                      : winner.totalStrokes}
                  </div>
                  <div
                    className={cn(
                      'text-sm font-bold',
                      (useNetScoring
                        ? (winner.netRelativeToPar ?? winner.totalRelativeToPar)
                        : winner.totalRelativeToPar) < 0
                        ? 'text-success'
                        : (useNetScoring
                            ? (winner.netRelativeToPar ?? winner.totalRelativeToPar)
                            : winner.totalRelativeToPar) > 0
                        ? 'text-destructive'
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
        </TechCardContent>
      </TechCard>
    </motion.div>
  );
}
