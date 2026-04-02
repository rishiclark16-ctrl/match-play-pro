import { PlayerWithScores } from '@/types/golf';
import { PropBet, getPropBetIcon, getPropBetLabel } from '@/types/betting';
import { cn } from '@/lib/utils';
import { LiveDot } from './shared';

export function PropBetsSection({
  propBets,
  propBetsSummary,
  players,
}: {
  propBets: PropBet[];
  propBetsSummary: { totalBets: number; playerStats: Map<string, { count: number; earnings: number; types: string[] }> };
  players: PlayerWithScores[];
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-0">
        <div className="flex items-center gap-2">
          <LiveDot />
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            Side Bets
          </span>
        </div>
        <span className="text-[10px] text-slate-400">{propBetsSummary.totalBets} won</span>
      </div>
      <div className="space-y-1.5">
        {players.map(player => {
          const stats = propBetsSummary.playerStats.get(player.id);
          if (!stats) return null;
          return (
            <div
              key={player.id}
              className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[#0A0A0A]">
                  {player.name?.split(' ')[0] ?? player.name}
                </span>
                <div className="flex gap-0.5">
                  {stats.types.slice(0, 4).map((type) => (
                    <span key={type} className="text-xs" title={getPropBetLabel(type as PropBet['type'])}>
                      {getPropBetIcon(type as PropBet['type'])}
                    </span>
                  ))}
                  {stats.types.length > 4 && (
                    <span className="text-[10px] text-slate-400">+{stats.types.length - 4}</span>
                  )}
                </div>
              </div>
              <span className="text-sm font-bold text-[#22C55E]">+${stats.earnings}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
