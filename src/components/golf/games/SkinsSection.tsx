import { Trophy, DollarSign } from 'lucide-react';
import { PlayerWithScores } from '@/types/golf';
import { Round } from '@/types/golf';
import { SkinsResult } from '@/lib/games/skins';
import { cn } from '@/lib/utils';
import { LiveDot, NetBadge } from './shared';
import { signedMoney } from './money';

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
          <span className="text-[15px] font-semibold text-[#0F1F17]">
            Skins ${skinsGame.stakes}/hole
          </span>
          {skinsGame.useNet && <NetBadge />}
        </div>
        {skinsResult.carryover > 0 && (
          <span className="text-[12px] font-semibold px-2 py-0.5 bg-[#BEF264] text-[#14532D] rounded-full">
            {skinsResult.carryover} carrying
          </span>
        )}
      </div>

      {/* Current pot highlight */}
      <div className="flex items-center gap-2 px-3 min-h-[44px] rounded-[14px] bg-[#ECFCCB]">
        <DollarSign className="w-4 h-4 text-[#14532D] shrink-0" />
        <span className="text-[15px] font-bold text-[#14532D]">
          Current pot ${currentPot}
        </span>
        {skinsResult.carryover > 0 && (
          <span className="text-[12px] text-[#14532D] ml-auto font-semibold">
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
                className="flex items-center justify-between px-3 py-2 rounded-[14px] bg-[#FAFAF7]"
              >
                <div className="flex items-center gap-2">
                  {isLeader && <Trophy className="w-3.5 h-3.5 text-[#14532D]" />}
                  <span className="text-sm font-medium text-[#0F1F17]">
                    {standing.playerName.split(' ')[0]}
                  </span>
                  {standing.skins > 0 && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#F0F2EC] text-[#0F1F17]">
                      {standing.skins} skin{standing.skins !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <span
                  className={cn(
                    'text-[15px] font-bold tabular-nums',
                    standing.earnings > 0 && 'text-[#14532D]',
                    standing.earnings < 0 && 'text-[#B42318]',
                    standing.earnings === 0 && 'text-[#5A6B61]',
                  )}
                >
                  {signedMoney(standing.earnings)}
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
                    'flex flex-col items-center justify-center rounded-[10px] px-1.5 py-1 min-w-[40px] min-h-[44px]',
                    isCarry && 'bg-[#F0F2EC]',
                    !isCarry && 'bg-[#14532D]',
                  )}
                >
                  <span className={cn('text-[11px] font-semibold', isCarry ? 'text-[#5A6B61]' : 'text-[#CFE3D6]')}>{result.holeNumber}</span>
                  {result.value > 1 && (
                    <span className={cn('text-[11px] font-bold', isCarry ? 'text-[#14532D]' : 'text-[#BEF264]')}>${result.value * skinsGame.stakes}</span>
                  )}
                  <span
                    className={cn(
                      'text-[11px] font-semibold truncate max-w-[52px]',
                      isCarry ? 'text-[#5A6B61]' : 'text-white',
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
