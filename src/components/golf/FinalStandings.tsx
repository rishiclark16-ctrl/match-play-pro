import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatRelativeToPar, PlayerWithScores } from '@/types/golf';
import { NetSettlement, getTotalWinnings } from '@/lib/games/settlement';
import { ResultsCard, SectionLabel } from './results/resultsUi';
import { formatMoney, moneyClass, toParClass } from './results/resultsFormat';

interface FinalStandingsProps {
  sortedPlayers: PlayerWithScores[];
  settlements: NetSettlement[];
  useNetScoring: boolean;
  /** Viewer's player id; their row gets a "You" tag. */
  myPlayerId?: string;
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 0) {
    return (
      <span className="w-9 h-9 rounded-full bg-[#ECFCCB] border-2 border-[#14532D] flex items-center justify-center shrink-0">
        <Trophy className="w-4 h-4 text-[#14532D]" strokeWidth={2.4} />
      </span>
    );
  }
  return (
    <span className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0 text-[14px] font-bold text-foreground tabular-nums">
      {rank + 1}
    </span>
  );
}

export function FinalStandings({
  sortedPlayers,
  settlements,
  useNetScoring,
  myPlayerId,
}: FinalStandingsProps) {
  const hasMoney = settlements.length > 0;

  return (
    <section className="mb-3.5">
      <SectionLabel>Final standings</SectionLabel>

      <ResultsCard>
        {sortedPlayers.map((player, rank) => {
          const netWinnings = getTotalWinnings(player.id, settlements);
          const score = useNetScoring
            ? (player.totalNetStrokes ?? player.totalStrokes)
            : player.totalStrokes;
          const toPar = useNetScoring
            ? (player.netRelativeToPar ?? player.totalRelativeToPar)
            : player.totalRelativeToPar;
          const isMe = !!myPlayerId && player.id === myPlayerId;

          return (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + rank * 0.05 }}
              className="flex items-center gap-3 px-4 py-3.5 min-h-[64px] border-b border-border last:border-b-0"
            >
              <RankBadge rank={rank} />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <h3 className="text-[16px] font-semibold text-foreground truncate">{player.name}</h3>
                  {isMe && (
                    <span className="text-[11px] font-semibold text-[#14532D] bg-[#ECFCCB] rounded-full px-1.5 py-px shrink-0">
                      You
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                  {player.handicap != null && <span>HCP {player.handicap}</span>}
                  {player.handicap != null && hasMoney && <span aria-hidden>·</span>}
                  {hasMoney && (
                    <span className={cn('font-semibold tabular-nums', moneyClass(netWinnings))}>
                      {netWinnings === 0 ? 'Even' : formatMoney(netWinnings)}
                    </span>
                  )}
                </p>
              </div>

              <div className="text-right shrink-0">
                <p className="text-[26px] font-extrabold leading-none tabular-nums tracking-[-0.02em] text-foreground">
                  {score}
                </p>
                <p className={cn('text-[12px] font-semibold mt-1 tabular-nums', toParClass(toPar))}>
                  {formatRelativeToPar(toPar)}
                  {useNetScoring && player.playingHandicap ? ' net' : ''}
                </p>
              </div>
            </motion.div>
          );
        })}
      </ResultsCard>
    </section>
  );
}
