import { DollarSign, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NetSettlement } from '@/lib/games/settlement';
import { Player } from '@/types/golf';

interface DashboardMoneyProps {
  settlements: NetSettlement[];
  players: Player[];
}

export function DashboardMoney({ settlements, players }: DashboardMoneyProps) {
  if (settlements.length === 0) {
    return (
      <div className="px-4 py-12 text-center">
        <p className="text-muted-foreground text-sm">No money to settle this round.</p>
      </div>
    );
  }

  // Calculate net position per player
  const netMap: Record<string, number> = {};
  players.forEach(p => { netMap[p.id] = 0; });
  settlements.forEach(s => {
    netMap[s.fromPlayerId] = (netMap[s.fromPlayerId] ?? 0) - s.amount;
    netMap[s.toPlayerId] = (netMap[s.toPlayerId] ?? 0) + s.amount;
  });

  const positions = players
    .map(p => ({ id: p.id, name: p.name, net: netMap[p.id] ?? 0 }))
    .sort((a, b) => b.net - a.net);

  const maxAbs = Math.max(...positions.map(p => Math.abs(p.net)), 1);

  return (
    <div className="px-4 pb-6 space-y-4">
      <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground mb-3">
        Money
      </h3>

      {/* Net positions bar chart */}
      <div className="bg-white rounded-2xl border border-border/40 shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30">
          <DollarSign className="w-4 h-4 text-emerald-500" />
          <span className="text-[13px] font-bold">Net Positions</span>
        </div>

        <div className="p-4 space-y-3">
          {positions.map(p => {
            const pct = (Math.abs(p.net) / maxAbs) * 100;
            const isPositive = p.net >= 0;
            return (
              <div key={p.id}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[12px] font-medium">{p.name}</span>
                  <span className={cn(
                    'text-[13px] font-bold',
                    isPositive ? 'text-emerald-600' : 'text-red-500'
                  )}>
                    {isPositive ? '+' : '-'}${Math.abs(p.net).toFixed(2)}
                  </span>
                </div>
                <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      isPositive ? 'bg-emerald-400' : 'bg-red-400'
                    )}
                    style={{ width: `${Math.max(pct, 2)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Settlement ledger */}
      <div className="bg-white rounded-2xl border border-border/40 shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="px-4 py-3 border-b border-border/30">
          <span className="text-[13px] font-bold">Settlement Ledger</span>
        </div>

        <div className="divide-y divide-border/20">
          {settlements.map((s, i) => (
            <div key={i} className="flex items-center px-4 py-3">
              <span className="text-[12px] font-medium flex-1">{s.fromPlayerName}</span>
              <div className="flex items-center gap-2 mx-3">
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[13px] font-bold text-emerald-600">${s.amount.toFixed(2)}</span>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <span className="text-[12px] font-medium flex-1 text-right">{s.toPlayerName}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
