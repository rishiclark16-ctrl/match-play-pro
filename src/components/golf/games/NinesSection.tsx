import { PlayerWithScores } from '@/types/golf';
import { NinesResult } from '@/lib/games/nines';
import { cn } from '@/lib/utils';
import { LiveDot, NetBadge } from './shared';

export function NinesSection({
  ninesGame,
  ninesResult,
  players,
}: {
  ninesGame: { stakes: number; useNet?: boolean };
  ninesResult: NinesResult;
  players: PlayerWithScores[];
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LiveDot />
          <span className="text-[12px] font-bold tracking-[0.08em] text-muted-foreground">
            Nines (5-3-1) ${ninesGame.stakes}/pt
          </span>
          {ninesGame.useNet && <NetBadge />}
        </div>
        <span className="text-[10px] text-[#5A6B61]">Thru {ninesResult.holesScored}</span>
      </div>

      {/* Standings */}
      <div className="space-y-1.5">
        {ninesResult.standings.map((standing, index) => (
          <div
            key={standing.playerId}
            className="flex items-center gap-3 px-3 py-2 rounded-xl bg-[#FAFAF7]"
          >
            <span className="text-[11px] font-bold w-4 text-center text-[#5A6B61]">
              {index + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#0F1F17] truncate">
                {standing.playerName.split(' ')[0]}
              </p>
              <p className="text-[10px] text-[#5A6B61]">
                {standing.totalPoints} pts
              </p>
            </div>
            <span
              className={cn(
                'text-sm font-bold tabular-nums',
                standing.earnings > 0 && 'text-[#14532D]',
                standing.earnings < 0 && 'text-[#B42318]',
                standing.earnings === 0 && 'text-[#5A6B61]',
              )}
            >
              {standing.earnings >= 0 ? '+' : ''}${Math.abs(standing.earnings).toFixed(2)}
            </span>
          </div>
        ))}
      </div>

      {/* Recent hole results */}
      {ninesResult.holeResults.length > 0 && (
        <div className="space-y-1">
          <p className="text-[12px] font-semibold text-[#5A6B61]">
            Hole results
          </p>
          <div className="flex flex-wrap gap-1.5">
            {ninesResult.holeResults.slice(-9).map(result => {
              const entries = Object.entries(result.playerPoints).sort((a, b) => b[1] - a[1]);
              return (
                <div
                  key={result.holeNumber}
                  className="flex flex-col items-center rounded-lg px-1.5 py-1 min-w-[36px] bg-[#FAFAF7] border border-[#E7E9E3]"
                >
                  <span className="text-[8px] font-bold text-[#5A6B61]">H{result.holeNumber}</span>
                  {entries.map(([pid, pts]) => {
                    const name = players.find(p => p.id === pid)?.name?.split(' ')[0] ?? '?';
                    return (
                      <span key={pid} className={cn(
                        'text-[8px] font-bold truncate max-w-[40px]',
                        pts === 5 && 'text-[#14532D]',
                        pts === 4 && 'text-blue-500',
                        pts === 3 && 'text-[#5A6B61]',
                        pts <= 2 && 'text-[#5A6B61]',
                      )}>
                        {name} {pts}
                      </span>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
