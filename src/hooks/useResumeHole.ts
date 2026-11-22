import { useEffect, useRef } from 'react';
import { resumeHole } from '@/lib/scorecardProgress';

interface Args {
  roundId: string | undefined;
  totalHoles: number | undefined;
  players: { id: string }[];
  scores: { holeNumber: number; playerId: string }[];
  loading: boolean;
  setCurrentHole: (hole: number) => void;
}

/**
 * Once per round, after its data first loads, move the scorecard to the hole the
 * group is actually on (first hole not everyone has scored). Later score entries
 * and manual navigation are left alone.
 */
export function useResumeHole({ roundId, totalHoles, players, scores, loading, setCurrentHole }: Args) {
  const resumedFor = useRef<string | null>(null);

  useEffect(() => {
    if (loading || !roundId || !totalHoles || players.length === 0) return;
    if (resumedFor.current === roundId) return;
    resumedFor.current = roundId;
    const hole = resumeHole(scores, players.length, totalHoles);
    if (hole > 1) setCurrentHole(hole);
  }, [loading, roundId, totalHoles, players, scores, setCurrentHole]);
}
