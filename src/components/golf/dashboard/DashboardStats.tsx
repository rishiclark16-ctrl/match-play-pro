import { BarChart3, TrendingUp, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RoundStatsResult, RoundPlayerStats } from '@/hooks/useRoundStats';

interface DashboardStatsProps {
  stats: RoundStatsResult;
  totalPar: number;
}

function ScoringBreakdown({ ps }: { ps: RoundPlayerStats }) {
  const cats = [
    { label: 'Eagles', count: ps.eagles, color: 'bg-amber-400' },
    { label: 'Birdies', count: ps.birdies, color: 'bg-emerald-400' },
    { label: 'Pars', count: ps.pars, color: 'bg-gray-300' },
    { label: 'Bogeys', count: ps.bogeys, color: 'bg-red-300' },
    { label: 'Double+', count: ps.doubles + ps.worse, color: 'bg-red-500' },
  ];
  const total = cats.reduce((s, c) => s + c.count, 0) || 1;

  return (
    <div>
      <div className="flex h-3 rounded-full overflow-hidden">
        {cats.filter(c => c.count > 0).map(c => (
          <div
            key={c.label}
            className={cn('h-full', c.color)}
            style={{ width: `${(c.count / total) * 100}%` }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
        {cats.filter(c => c.count > 0).map(c => (
          <div key={c.label} className="flex items-center gap-1">
            <div className={cn('w-2 h-2 rounded-full', c.color)} />
            <span className="text-[10px] text-muted-foreground">{c.count} {c.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatBadge({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-muted/20 rounded-xl px-3 py-2 text-center">
      <div className="text-[10px] text-muted-foreground/70 uppercase tracking-wider">{label}</div>
      <div className="text-[16px] font-black leading-tight mt-0.5">{value}</div>
      {sub && <div className="text-[9px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

export function DashboardStats({ stats, totalPar }: DashboardStatsProps) {
  return (
    <div className="px-4 pb-6 space-y-4">
      <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground mb-3">
        Stats & Analytics
      </h3>

      {stats.playerStats.map(ps => {
        const total = ps.front9Total + ps.back9Total;
        const relPar = total - totalPar;
        const relParStr = relPar === 0 ? 'E' : relPar > 0 ? `+${relPar}` : `${relPar}`;

        return (
          <div
            key={ps.playerId}
            className="bg-white rounded-2xl border border-border/40 shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden"
          >
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30">
              <BarChart3 className="w-4 h-4 text-blue-500" />
              <span className="text-[13px] font-bold">{ps.playerName}</span>
              <span className={cn(
                'ml-auto text-[13px] font-bold',
                relPar < 0 ? 'text-emerald-600' : relPar > 0 ? 'text-red-500' : 'text-muted-foreground'
              )}>
                {total} ({relParStr})
              </span>
            </div>

            <div className="p-4 space-y-4">
              {/* Scoring breakdown bar */}
              <ScoringBreakdown ps={ps} />

              {/* Key stats grid */}
              <div className="grid grid-cols-3 gap-2">
                {ps.par3Avg != null && (
                  <StatBadge label="Par 3 Avg" value={ps.par3Avg.toFixed(1)} />
                )}
                {ps.par4Avg != null && (
                  <StatBadge label="Par 4 Avg" value={ps.par4Avg.toFixed(1)} />
                )}
                {ps.par5Avg != null && (
                  <StatBadge label="Par 5 Avg" value={ps.par5Avg.toFixed(1)} />
                )}
              </div>

              {/* Front vs Back */}
              <div className="grid grid-cols-2 gap-2">
                <StatBadge label="Front 9" value={`${ps.front9Total}`} />
                <StatBadge label="Back 9" value={ps.back9Total > 0 ? `${ps.back9Total}` : '-'} />
              </div>

              {/* Best/Worst holes + streak */}
              <div className="grid grid-cols-3 gap-2">
                {ps.bestHole && (
                  <StatBadge
                    label="Best Hole"
                    value={`#${ps.bestHole.number}`}
                    sub={`${ps.bestHole.score} (par ${ps.bestHole.par})`}
                  />
                )}
                {ps.worstHole && (
                  <StatBadge
                    label="Worst Hole"
                    value={`#${ps.worstHole.number}`}
                    sub={`${ps.worstHole.score} (par ${ps.worstHole.par})`}
                  />
                )}
                {ps.longestBirdieStreak > 0 && (
                  <StatBadge
                    label="Birdie Streak"
                    value={`${ps.longestBirdieStreak}`}
                    sub="consecutive"
                  />
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Round-level stats */}
      {(stats.mostCompetitiveHole || stats.biggestBlowupHole) && (
        <div className="bg-white rounded-2xl border border-border/40 shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-4">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-violet-500" />
            <span className="text-[13px] font-bold">Round Highlights</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {stats.mostCompetitiveHole && (
              <StatBadge
                label="Most Competitive"
                value={`#${stats.mostCompetitiveHole.number}`}
                sub={`${stats.mostCompetitiveHole.spread} stroke spread`}
              />
            )}
            {stats.biggestBlowupHole && (
              <StatBadge
                label="Biggest Spread"
                value={`#${stats.biggestBlowupHole.number}`}
                sub={`${stats.biggestBlowupHole.spread} stroke spread`}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
