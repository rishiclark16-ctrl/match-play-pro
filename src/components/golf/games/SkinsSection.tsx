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
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            Skins ${skinsGame.stakes}/hole
          </span>
          {skinsGame.useNet && <NetBadge />}
        </div>
        {skinsResult.carryover > 0 && (
          <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full border border-amber-200 animate-pulse">
            {skinsResult.carryover} carrying
          </span>
        )}
      </div>

      {/* Current pot highlight */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#F0EE3A]/20 border border-[#F0EE3A]/60">
        <DollarSign className="w-4 h-4 text-[#9A9500] shrink-0" />
        <span className="text-sm font-bold text-[#0A0A0A]">
          Current Pot: ${currentPot}
        </span>
        {skinsResult.carryover > 0 && (
          <span className="text-[10px] text-amber-700 ml-auto font-semibold">
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
                className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50"
              >
                <div className="flex items-center gap-2">
                  {isLeader && <Trophy className="w-3 h-3 text-[#F0EE3A] fill-[#F0EE3A]" />}
                  <span className="text-sm font-medium text-[#0A0A0A]">
                    {standing.playerName.split(' ')[0]}
                  </span>
                  {standing.skins > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#0A0A0A] text-white">
                      {standing.skins} skin{standing.skins !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <span
                  className={cn(
                    'text-sm font-bold tabular-nums',
                    standing.earnings > 0 && 'text-[#22C55E]',
                    standing.earnings < 0 && 'text-red-500',
                    standing.earnings === 0 && 'text-slate-400',
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
          <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-400">
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
                    isCarry && 'bg-amber-50 border border-amber-200',
                    !isCarry && 'bg-[#DCFCE7] border border-[#22C55E]/20',
                  )}
                >
                  <span className="text-[8px] font-bold text-slate-400">H{result.holeNumber}</span>
                  {result.value > 1 && (
                    <span className="text-[8px] font-bold text-amber-600">${result.value * skinsGame.stakes}</span>
                  )}
                  <span
                    className={cn(
                      'text-[9px] font-bold truncate max-w-[36px]',
                      isCarry ? 'text-amber-700' : 'text-[#22C55E]',
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
