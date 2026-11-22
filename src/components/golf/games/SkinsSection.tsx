import { Trophy, DollarSign } from 'lucide-react';
import { PlayerWithScores } from '@/types/golf';
import { Round } from '@/types/golf';
import { SkinsResult } from '@/lib/games/skins';
import { cn } from '@/lib/utils';
import { LiveDot, NetBadge } from './shared';

export function SkinsSection({
  skinsGame,
  skinsResult,
  players,
}: {
  skinsGame: NonNullable<Round['games']>[number];
  skinsResult: SkinsResult;
  players: PlayerWithScores[];
}) {
  const currentPot = skinsResult.carryover > 0
    ? skinsResult.potPerSkin * (skinsResult.carryover + 1)
    : skinsResult.potPerSkin;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-0">
        <div className="flex items-center gap-2">
          <LiveDot />
          <span className="text-[12px] font-bold tracking-[0.08em] text-muted-foreground">
            Skins ${skinsGame.stakes}/hole
          </span>
          {skinsGame.useNet && <NetBadge />}
        </div>
        {skinsResult.carryover > 0 && (
          <span className="text-[10px] font-bold px-2 py-0.5 bg-[#ECFCCB] text-[#14532D] rounded-full border border-[#BEF264] animate-pulse">
            {skinsResult.carryover} carrying
          </span>
        )}
      </div>

      {/* Current pot highlight */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#BEF264]/20 border border-[#BEF264]/60">
        <DollarSign className="w-4 h-4 text-[#9A9500] shrink-0" />
        <span className="text-sm font-bold text-[#0F1F17]">
          Current Pot: ${currentPot}
        </span>
        {skinsResult.carryover > 0 && (
          <span className="text-[10px] text-[#14532D] ml-auto font-semibold">
            {skinsResult.carryover + 1} skins
          </span>
        )}
      </div>

      {/* Standings */}
      <div className="space-y-1.5">
        {skinsResult.standings
          .slice()
          .sort((a, b) => b.skins - a.skins)
          .map(standing => {
            const isLeader = standing.skins === Math.max(...skinsResult.standings.map(s => s.skins)) && standing.skins > 0;
            return (
              <div
                key={standing.playerId}
                className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#FAFAF7]"
              >
                <div className="flex items-center gap-2">
                  {isLeader && <Trophy className="w-3.5 h-3.5 text-[#14532D]" />}
                  <span className="text-sm font-medium text-[#0F1F17]">
                    {standing.playerName.split(' ')[0]}
                  </span>
                  {standing.skins > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#0F1F17] text-white">
                      {standing.skins} skin{standing.skins !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <span
                  className={cn(
                    'text-sm font-bold tabular-nums',
                    standing.earnings > 0 && 'text-[#14532D]',
                    standing.earnings < 0 && 'text-[#B42318]',
                    standing.earnings === 0 && 'text-[#5A6B61]',
                  )}
                >
                  {standing.earnings >= 0 ? '+' : ''}${standing.earnings}
                </span>
              </div>
            );
          })}
      </div>

      {/* Hole-by-hole skin results */}
      {skinsResult.results.length > 0 && (
        <div className="space-y-1">
          <p className="text-[12px] font-semibold text-[#5A6B61]">
            Hole results
          </p>
          <div className="flex flex-wrap gap-1.5">
            {skinsResult.results.map(result => {
              const winner = result.winnerId
                ? players.find(p => p.id === result.winnerId)
                : null;
              const isCarry = !result.winnerId;
              return (
                <div
                  key={result.holeNumber}
                  className={cn(
                    'flex flex-col items-center rounded-lg px-1.5 py-1 min-w-[32px]',
                    isCarry && 'bg-[#ECFCCB] border border-[#BEF264]',
                    !isCarry && 'bg-[#DCFCE7] border border-[#14532D]/20',
                  )}
                >
                  <span className="text-[8px] font-bold text-[#5A6B61]">H{result.holeNumber}</span>
                  {result.value > 1 && (
                    <span className="text-[8px] font-bold text-[#14532D]">${result.value * skinsGame.stakes}</span>
                  )}
                  <span
                    className={cn(
                      'text-[9px] font-bold truncate max-w-[36px]',
                      isCarry ? 'text-[#14532D]' : 'text-[#14532D]',
                    )}
                  >
                    {isCarry ? '→' : winner?.name?.split(' ')[0] ?? '?'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
