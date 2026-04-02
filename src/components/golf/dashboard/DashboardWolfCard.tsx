import { Dog } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WolfStanding } from '@/lib/games/wolf';

interface DashboardWolfCardProps {
  standings: WolfStanding[];
}

export function DashboardWolfCard({ standings }: DashboardWolfCardProps) {
  const sorted = [...standings].sort((a, b) => b.earnings - a.earnings);

  return (
    <div className="bg-white rounded-2xl border border-border/40 shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30">
        <Dog className="w-4 h-4 text-orange-500" />
        <span className="text-[13px] font-bold">Wolf</span>
      </div>

      <div className="divide-y divide-border/20">
        {sorted.map((s, i) => (
          <div key={s.playerId} className="flex items-center px-4 py-2.5">
            <span className={cn(
              'text-[12px] font-bold w-5',
              i === 0 ? 'text-orange-600' : 'text-muted-foreground'
            )}>
              {i + 1}
            </span>
            <div className="flex-1">
              <span className="text-[13px] font-medium">{s.playerName}</span>
              <div className="flex gap-3 mt-0.5">
                <span className="text-[10px] text-muted-foreground">{s.totalPoints} pts</span>
                <span className="text-[10px] text-muted-foreground">{s.timesAsWolf}x wolf</span>
                {s.loneWolfWins > 0 && (
                  <span className="text-[10px] text-amber-600">{s.loneWolfWins} lone</span>
                )}
                {s.blindWolfWins > 0 && (
                  <span className="text-[10px] text-purple-600">{s.blindWolfWins} blind</span>
                )}
              </div>
            </div>
            <span className={cn(
              'text-[13px] font-bold',
              s.earnings > 0 ? 'text-emerald-600' : s.earnings < 0 ? 'text-red-500' : 'text-muted-foreground'
            )}>
              {s.earnings > 0 ? '+' : ''}{s.earnings !== 0 ? `$${Math.abs(s.earnings).toFixed(0)}` : '-'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
