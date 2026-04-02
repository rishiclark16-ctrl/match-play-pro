import { Trophy, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SkinsResult } from '@/lib/games/skins';

interface DashboardSkinsCardProps {
  result: SkinsResult;
}

export function DashboardSkinsCard({ result }: DashboardSkinsCardProps) {
  const sortedStandings = [...result.standings].sort((a, b) => b.skins - a.skins);

  return (
    <div className="bg-white rounded-2xl border border-border/40 shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30">
        <Trophy className="w-4 h-4 text-amber-500" />
        <span className="text-[13px] font-bold">Skins</span>
        <span className="text-[11px] text-muted-foreground ml-auto">
          ${result.potPerSkin.toFixed(0)}/skin · ${result.totalPot.toFixed(0)} pot
        </span>
      </div>

      {/* Standings */}
      <div className="divide-y divide-border/20">
        {sortedStandings.map((s, i) => (
          <div key={s.playerId} className="flex items-center px-4 py-2.5">
            <span className={cn(
              'text-[12px] font-bold w-5',
              i === 0 && s.skins > 0 ? 'text-amber-600' : 'text-muted-foreground'
            )}>
              {i + 1}
            </span>
            <span className="text-[13px] font-medium flex-1">{s.playerName}</span>
            <span className="text-[12px] text-muted-foreground mr-3">{s.skins} skin{s.skins !== 1 ? 's' : ''}</span>
            <span className={cn(
              'text-[13px] font-bold min-w-[48px] text-right',
              s.earnings > 0 ? 'text-emerald-600' : s.earnings < 0 ? 'text-red-500' : 'text-muted-foreground'
            )}>
              {s.earnings > 0 ? '+' : ''}{s.earnings !== 0 ? `$${Math.abs(s.earnings).toFixed(0)}` : '-'}
            </span>
          </div>
        ))}
      </div>

      {/* Hole-by-hole results */}
      <div className="px-4 py-3 border-t border-border/30 bg-muted/10">
        <div className="flex flex-wrap gap-1.5">
          {result.results.map(r => (
            <div
              key={r.holeNumber}
              className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold',
                r.winnerId
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-muted/30 text-muted-foreground/50'
              )}
            >
              {r.holeNumber}
            </div>
          ))}
        </div>
        {result.carryover > 0 && (
          <p className="text-[10px] text-muted-foreground mt-2">
            {result.carryover} skin{result.carryover !== 1 ? 's' : ''} carrying over
          </p>
        )}
      </div>
    </div>
  );
}
