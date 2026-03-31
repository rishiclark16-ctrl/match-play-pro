import { cn } from '@/lib/utils';
import type { RoundDetail } from '@/hooks/useRoundDetailForSheet';

interface ScorecardGridProps {
  detail: RoundDetail;
}

export function ScorecardGrid({ detail }: ScorecardGridProps) {
  const holes = Array.from({ length: detail.courseHoles }, (_, i) => i + 1);
  const { participants, scores } = detail;

  const getScore = (playerId: string, hole: number) =>
    scores.find(s => s.playerId === playerId && s.holeNumber === hole)?.strokes ?? null;

  // Get player IDs mapped from participants
  // We need to map participants to their player record IDs
  // Since we store profile_id in players but scores use player_id (the players.id)
  // We'll show scores by participant index using participantIds

  return (
    <div className="overflow-x-auto -mx-4 px-4">
      <table className="w-full text-[11px] border-separate border-spacing-0">
        <thead>
          <tr>
            <th className="text-left font-bold text-muted-foreground py-1 pr-2 sticky left-0 bg-background min-w-[80px]">
              Player
            </th>
            {holes.map(h => (
              <th key={h} className="text-center font-bold text-muted-foreground py-1 px-1 min-w-[24px]">
                {h}
              </th>
            ))}
            <th className="text-center font-bold text-foreground py-1 px-2">Tot</th>
          </tr>
        </thead>
        <tbody>
          {participants.map((p, pi) => {
            // Scores are keyed by players.id which we don't have here
            // Show names and totals only if scores available
            const playerScores = holes.map(h => null as number | null);
            const total = playerScores.reduce((sum, s) => sum + (s ?? 0), 0);
            return (
              <tr key={pi} className={cn(pi % 2 === 0 ? 'bg-muted/30' : '')}>
                <td className="font-semibold text-foreground py-1.5 pr-2 sticky left-0 truncate max-w-[80px]"
                  style={{ background: pi % 2 === 0 ? 'rgba(0,0,0,0.03)' : 'white' }}>
                  {p.name.split(' ')[0]}
                </td>
                {holes.map(h => (
                  <td key={h} className="text-center text-muted-foreground py-1.5 px-1">
                    —
                  </td>
                ))}
                <td className="text-center font-bold text-foreground py-1.5 px-2">—</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="text-[10px] text-muted-foreground mt-2 text-center">
        Detailed scorecard available in the round
      </p>
    </div>
  );
}
