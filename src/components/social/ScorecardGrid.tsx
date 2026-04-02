import { cn } from '@/lib/utils';
import type { RoundDetail } from '@/hooks/useRoundDetailForSheet';

interface ScorecardGridProps {
  detail: RoundDetail;
}

export function ScorecardGrid({ detail }: ScorecardGridProps) {
  const totalHoles = detail.courseHoles;
  const { participants, scores } = detail;

  // Split into front 9 / back 9 for 18-hole rounds
  const showSplit = totalHoles > 9;
  const front = Array.from({ length: Math.min(9, totalHoles) }, (_, i) => i + 1);
  const back = showSplit ? Array.from({ length: totalHoles - 9 }, (_, i) => i + 10) : [];

  const getScore = (playerId: string, hole: number) =>
    scores.find(s => s.playerId === playerId && s.holeNumber === hole)?.strokes ?? null;

  const getTotal = (playerId: string, holes: number[]) =>
    holes.reduce((sum, h) => {
      const s = getScore(playerId, h);
      return sum + (s ?? 0);
    }, 0);

  const hasScores = (playerId: string, holes: number[]) =>
    holes.some(h => getScore(playerId, h) !== null);

  const renderTable = (holes: number[], label: string) => (
    <div className="mb-3">
      <p className="text-[9px] font-black uppercase tracking-[0.1em] text-muted-foreground/50 mb-1">{label}</p>
      <table className="w-full text-[11px] border-separate border-spacing-0">
        <thead>
          <tr>
            <th className="text-left font-bold text-muted-foreground py-1 pr-2 min-w-[60px]">
              Hole
            </th>
            {holes.map(h => (
              <th key={h} className="text-center font-bold text-muted-foreground py-1 px-0.5 min-w-[22px]">
                {h}
              </th>
            ))}
            <th className="text-center font-bold text-foreground py-1 px-1.5">Tot</th>
          </tr>
        </thead>
        <tbody>
          {participants.map((p, pi) => {
            const total = getTotal(p.playerId, holes);
            const scored = hasScores(p.playerId, holes);
            return (
              <tr key={p.playerId} className={cn(pi % 2 === 0 ? 'bg-muted/30' : '')}>
                <td
                  className="font-semibold text-foreground py-1.5 pr-2 truncate max-w-[60px]"
                  style={{ background: pi % 2 === 0 ? 'rgba(0,0,0,0.03)' : 'white' }}
                >
                  {p.name.split(' ')[0]}
                </td>
                {holes.map(h => {
                  const s = getScore(p.playerId, h);
                  return (
                    <td key={h} className="text-center py-1.5 px-0.5 tabular-nums text-foreground/80">
                      {s !== null ? s : '—'}
                    </td>
                  );
                })}
                <td className="text-center font-bold text-foreground py-1.5 px-1.5 tabular-nums">
                  {scored ? total : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="overflow-x-auto -mx-1">
      {renderTable(front, showSplit ? 'Front 9' : 'Holes')}
      {back.length > 0 && renderTable(back, 'Back 9')}
    </div>
  );
}
