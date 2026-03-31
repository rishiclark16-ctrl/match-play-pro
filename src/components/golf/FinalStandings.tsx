import { motion } from 'framer-motion';
import { Trophy, Medal, Award, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatRelativeToPar, PlayerWithScores } from '@/types/golf';
import { Settlement, getTotalWinnings } from '@/lib/games/settlement';

interface FinalStandingsProps {
  sortedPlayers: PlayerWithScores[];
  settlements: Settlement[];
  useNetScoring: boolean;
}

function getRankBadge(rank: number) {
  if (rank === 0) {
    return (
      <div className="w-9 h-9 rounded-xl bg-[#F0EE3A] flex items-center justify-center shrink-0">
        <Trophy className="text-[#0A0A0A] w-4 h-4" />
      </div>
    );
  }
  if (rank === 1) {
    return (
      <div className="w-9 h-9 rounded-xl bg-[#E5E7EB] flex items-center justify-center shrink-0">
        <Medal className="text-[#374151] w-4 h-4" />
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="w-9 h-9 rounded-xl bg-[#FED7AA] flex items-center justify-center shrink-0">
        <Award className="text-[#92400E] w-4 h-4" />
      </div>
    );
  }
  return (
    <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
      <span className="text-sm font-black text-muted-foreground">{rank + 1}</span>
    </div>
  );
}

export function FinalStandings({
  sortedPlayers,
  settlements,
  useNetScoring,
}: FinalStandingsProps) {
  return (
    <div className="mt-4">
      <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground flex items-center gap-2 mb-3">
        <Users className="w-4 h-4" />
        Final Standings
      </div>

      <div>
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
              className={cn(
                'bg-white rounded-2xl px-4 py-3.5 flex items-center gap-3 mb-2',
                isWinner
                  ? 'shadow-[0_0_0_2px_rgba(240,238,58,0.5),0_2px_8px_rgba(240,238,58,0.1)]'
                  : isLast
                  ? 'shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-[#FECACA]'
                  : 'shadow-[0_1px_3px_rgba(0,0,0,0.06)]'
              )}
            >
              {/* Rank badge */}
              {getRankBadge(rank)}

              {/* Name + handicap + winnings */}
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm text-foreground truncate">{player.name}</h4>
                <div className="flex items-center gap-2">
                  {player.handicap && (
                    <span className="text-[11px] text-muted-foreground">HCP {player.handicap}</span>
                  )}
                  {netWinnings !== 0 && (
                    <span
                      className={cn(
                        'text-sm font-black tabular-nums',
                        netWinnings > 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'
                      )}
                    >
                      {netWinnings > 0 ? '+' : ''}${netWinnings.toFixed(0)}
                    </span>
                  )}
                </div>
              </div>

              {/* Score */}
              <div className="text-right shrink-0">
                <p className="font-black text-xl tabular-nums text-foreground">
                  {useNetScoring
                    ? (player.totalNetStrokes ?? player.totalStrokes)
                    : player.totalStrokes}
                </p>
                <p
                  className={cn(
                    'text-xs font-black',
                    (useNetScoring
                      ? (player.netRelativeToPar ?? player.totalRelativeToPar)
                      : player.totalRelativeToPar) < 0
                      ? 'text-[#22C55E]'
                      : (useNetScoring
                          ? (player.netRelativeToPar ?? player.totalRelativeToPar)
                          : player.totalRelativeToPar) > 0
                      ? 'text-[#EF4444]'
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
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
