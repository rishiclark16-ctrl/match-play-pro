import { Swords } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MatchPlayResult } from '@/lib/games/matchPlay';
import { Player, Round } from '@/types/golf';

interface DashboardMatchPlayCardProps {
  result: MatchPlayResult;
  players: Player[];
  round: Round;
}

export function DashboardMatchPlayCard({ result, players, round }: DashboardMatchPlayCardProps) {
  const winner = players.find(p => p.id === result.winnerId);

  return (
    <div className="bg-white rounded-2xl border border-border/40 shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30">
        <Swords className="w-4 h-4 text-purple-500" />
        <span className="text-[13px] font-bold">Match Play</span>
        <span className="text-[11px] text-muted-foreground ml-auto">{result.statusText}</span>
      </div>

      {/* Result banner */}
      <div className="px-4 py-4 text-center">
        {result.matchStatus === 'won' ? (
          <>
            <p className="text-[18px] font-black">{winner?.name ?? 'Unknown'} wins</p>
            {result.winMargin && (
              <p className="text-[13px] text-muted-foreground mt-0.5">{result.winMargin}</p>
            )}
          </>
        ) : result.matchStatus === 'halved' ? (
          <p className="text-[18px] font-black">Match Halved</p>
        ) : (
          <p className="text-[15px] font-bold text-muted-foreground">{result.statusText}</p>
        )}
      </div>

      {/* Hole dots */}
      <div className="px-4 pb-3">
        <div className="flex flex-wrap gap-1.5 justify-center">
          {result.holeResults.map(h => {
            const p1Won = h.winnerId === players[0]?.id;
            const p2Won = h.winnerId === players[1]?.id;
            return (
              <div
                key={h.holeNumber}
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold',
                  p1Won ? 'bg-blue-100 text-blue-700' :
                  p2Won ? 'bg-red-100 text-red-600' :
                  'bg-muted/30 text-muted-foreground/50'
                )}
              >
                {h.holeNumber}
              </div>
            );
          })}
        </div>
        <div className="flex justify-center gap-6 mt-2">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-400" />
            <span className="text-[10px] text-muted-foreground">{players[0]?.name}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <span className="text-[10px] text-muted-foreground">{players[1]?.name}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
