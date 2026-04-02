import { Flag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NassauResult, NassauSegment } from '@/lib/games/nassau';
import { Player } from '@/types/golf';

interface DashboardNassauCardProps {
  result: NassauResult;
  players: Player[];
}

function SegmentRow({ label, segment, players }: { label: string; segment: NassauSegment; players: Player[] }) {
  const winner = players.find(p => p.id === segment.winnerId);
  const isTied = !segment.winnerId && segment.holesPlayed > 0;

  return (
    <div className="flex items-center px-4 py-2.5">
      <span className="text-[12px] font-semibold text-muted-foreground w-16">{label}</span>
      <div className="flex-1 flex items-center gap-2">
        {segment.holesPlayed === 0 ? (
          <span className="text-[12px] text-muted-foreground/50">Not played</span>
        ) : isTied ? (
          <span className="text-[12px] text-muted-foreground">Tied</span>
        ) : (
          <>
            <span className="text-[13px] font-bold">{winner?.name ?? 'Unknown'}</span>
            <span className="text-[11px] text-muted-foreground">
              {segment.margin > 0 ? `${segment.margin} up` : ''}
            </span>
          </>
        )}
      </div>
      <div className="flex gap-3">
        {Object.entries(segment.scores).map(([pid, score]) => {
          const p = players.find(pl => pl.id === pid);
          return (
            <div key={pid} className="text-right">
              <div className="text-[10px] text-muted-foreground/60 truncate max-w-[48px]">{p?.name}</div>
              <div className="text-[13px] font-bold">{score}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DashboardNassauCard({ result, players }: DashboardNassauCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-border/40 shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30">
        <Flag className="w-4 h-4 text-blue-500" />
        <span className="text-[13px] font-bold">Nassau</span>
      </div>

      <div className="divide-y divide-border/20">
        <SegmentRow label="Front 9" segment={result.front9} players={players} />
        <SegmentRow label="Back 9" segment={result.back9} players={players} />
        <SegmentRow label="Overall" segment={result.overall} players={players} />
      </div>

      {result.presses.length > 0 && (
        <div className="px-4 py-2.5 border-t border-border/30 bg-muted/10">
          <p className="text-[11px] text-muted-foreground">
            {result.presses.length} press{result.presses.length !== 1 ? 'es' : ''} triggered
          </p>
        </div>
      )}
    </div>
  );
}
