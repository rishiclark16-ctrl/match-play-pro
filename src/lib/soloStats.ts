import type { HoleInfo, PlayerWithScores, ScoreType } from '@/types/golf';
import { getScoreType } from '@/types/golf';

/**
 * Pure stat helpers for solo rounds. Kept free of React so they can be
 * unit-tested without rendering.
 */

export type ScoreBreakdown = Record<ScoreType, number>;

export function emptyBreakdown(): ScoreBreakdown {
  return { ace: 0, albatross: 0, eagle: 0, birdie: 0, par: 0, bogey: 0, double: 0, triple: 0, worse: 0 };
}

export function calcScoreBreakdown(
  player: Pick<PlayerWithScores, 'scores'>,
  holeInfo: HoleInfo[],
): ScoreBreakdown {
  const counts = emptyBreakdown();
  for (const s of player.scores) {
    const hole = holeInfo.find(h => h.number === s.holeNumber);
    if (!hole) continue;
    counts[getScoreType(s.strokes, hole.par)]++;
  }
  return counts;
}

export interface BestHole {
  hole: number;
  strokes: number;
  par: number;
  diff: number;
}

export function calcBestHole(
  player: Pick<PlayerWithScores, 'scores'>,
  holeInfo: HoleInfo[],
): BestHole | null {
  let best: BestHole | null = null;
  for (const s of player.scores) {
    const hole = holeInfo.find(h => h.number === s.holeNumber);
    if (!hole) continue;
    const diff = s.strokes - hole.par;
    if (!best || diff < best.diff) {
      best = { hole: s.holeNumber, strokes: s.strokes, par: hole.par, diff };
    }
  }
  return best;
}
