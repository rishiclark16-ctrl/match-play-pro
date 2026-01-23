import { motion } from 'framer-motion';
import { Trophy, Medal, Award, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatRelativeToPar, PlayerWithScores } from '@/types/golf';
import { TechCard, TechCardContent } from '@/components/ui/tech-card';
import { Settlement, getTotalWinnings } from '@/lib/games/settlement';

interface FinalStandingsProps {
  sortedPlayers: PlayerWithScores[];
  settlements: Settlement[];
  useNetScoring: boolean;
}

function getRankDisplay(rank: number) {
  if (rank === 0) return <Trophy className="w-4 h-4 text-gold" />;
  if (rank === 1) return <Medal className="w-4 h-4 text-muted-foreground" />;
  if (rank === 2) return <Award className="w-4 h-4 text-amber-600" />;
  return <span className="text-xs font-bold text-muted-foreground">{rank + 1}</span>;
}

export function FinalStandings({
  sortedPlayers,
  settlements,
  useNetScoring,
}: FinalStandingsProps) {
  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-4 h-4 text-primary" />
        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
          Final Standings
        </span>
      </div>

      <div className="space-y-2">
        {sortedPlayers.map((player, rank) => {
          const isWinner = rank === 0;
          const isLast = rank === sortedPlayers.length - 1 && sortedPlayers.length > 2;
          const netWinnings = getTotalWinnings(player.id, settlements);

          return (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + rank * 0.05 }}
            >
              <TechCard
                variant={isWinner ? 'highlighted' : 'default'}
                className={cn(isLast && 'border-destructive/30')}
              >
                <TechCardContent className="p-3">
                  <div className="flex items-center gap-3">
                    {/* Rank */}
                    <div
                      className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                        isWinner
                          ? 'bg-primary text-primary-foreground'
                          : isLast
                          ? 'bg-destructive/10'
                          : 'bg-muted'
                      )}
                    >
                      {getRankDisplay(rank)}
                    </div>

                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm truncate">{player.name}</h4>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {player.handicap && <span>HCP {player.handicap}</span>}
                        {netWinnings !== 0 && (
                          <span
                            className={cn(
                              'font-bold',
                              netWinnings > 0 ? 'text-success' : 'text-destructive'
                            )}
                          >
                            {netWinnings > 0 ? '+' : ''}${netWinnings.toFixed(0)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Score */}
                    <div className="text-right shrink-0">
                      <p className="text-xl font-black tabular-nums">
                        {useNetScoring
                          ? (player.totalNetStrokes ?? player.totalStrokes)
                          : player.totalStrokes}
                      </p>
                      <p
                        className={cn(
                          'text-xs font-bold',
                          (useNetScoring
                            ? (player.netRelativeToPar ?? player.totalRelativeToPar)
                            : player.totalRelativeToPar) < 0
                            ? 'text-success'
                            : (useNetScoring
                                ? (player.netRelativeToPar ?? player.totalRelativeToPar)
                                : player.totalRelativeToPar) > 0
                            ? 'text-destructive'
                            : 'text-muted-foreground'
                        )}
                      >
                        {formatRelativeToPar(
                          useNetScoring
                            ? (player.netRelativeToPar ?? player.totalRelativeToPar)
                            : player.totalRelativeToPar
                        )}
                        {useNetScoring && player.playingHandicap ? ' (net)' : ''}
                      </p>
                    </div>
                  </div>
                </TechCardContent>
              </TechCard>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
