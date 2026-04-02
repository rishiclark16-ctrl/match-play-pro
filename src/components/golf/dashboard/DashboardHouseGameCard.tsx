import { Dices } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HouseGameResult } from '@/lib/games/houseGame';

interface DashboardHouseGameCardProps {
  result: HouseGameResult;
}

export function DashboardHouseGameCard({ result }: DashboardHouseGameCardProps) {
  const sorted = [...result.standings].sort((a, b) => b.netEarnings - a.netEarnings);

  return (
    <div className="bg-white rounded-2xl border border-border/40 shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30">
        <Dices className="w-4 h-4 text-indigo-500" />
        <span className="text-[13px] font-bold">House Game</span>
      </div>

      <div className="divide-y divide-border/20">
        {sorted.map((s, i) => (
          <div key={s.playerId} className="flex items-center px-4 py-2.5">
            <span className={cn(
              'text-[12px] font-bold w-5',
              i === 0 ? 'text-indigo-600' : 'text-muted-foreground'
            )}>
              {i + 1}
            </span>
            <div className="flex-1">
              <span className="text-[13px] font-medium">{s.playerName}</span>
              <div className="flex gap-3 mt-0.5">
                <span className="text-[10px] text-muted-foreground">{s.holesWon} won</span>
                {s.birdies > 0 && <span className="text-[10px] text-emerald-600">{s.birdies} birdie{s.birdies !== 1 ? 's' : ''}</span>}
                {s.eagles > 0 && <span className="text-[10px] text-amber-600">{s.eagles} eagle{s.eagles !== 1 ? 's' : ''}</span>}
              </div>
            </div>
            <span className={cn(
              'text-[13px] font-bold',
              s.netEarnings > 0 ? 'text-emerald-600' : s.netEarnings < 0 ? 'text-red-500' : 'text-muted-foreground'
            )}>
              {s.netEarnings > 0 ? '+' : ''}{s.netEarnings !== 0 ? `$${Math.abs(s.netEarnings).toFixed(2)}` : '-'}
            </span>
          </div>
        ))}
      </div>

      {result.summary.length > 0 && (
        <div className="px-4 py-2.5 border-t border-border/30 bg-muted/10 space-y-0.5">
          {result.summary.slice(0, 3).map((line, i) => (
            <p key={i} className="text-[10px] text-muted-foreground">{line}</p>
          ))}
        </div>
      )}
    </div>
  );
}
