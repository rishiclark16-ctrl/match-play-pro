/**
 * Where a round "is", from its scores. Pure helpers used by the scorecard.
 */
export interface HoleScoreRef {
  holeNumber: number;
  playerId: string;
}

/**
 * The hole to open the scorecard on: the first hole not every player has scored.
 * A finished card returns the last hole. Re-opening the app mid-round lands the
 * golfer where they are instead of on hole 1.
 */
export function resumeHole(scores: HoleScoreRef[], playerCount: number, totalHoles: number): number {
  if (totalHoles < 1) return 1;
  if (playerCount < 1) return 1;
  const counts = new Map<number, Set<string>>();
  for (const s of scores) {
    if (s.holeNumber < 1 || s.holeNumber > totalHoles) continue;
    if (!counts.has(s.holeNumber)) counts.set(s.holeNumber, new Set());
    counts.get(s.holeNumber)!.add(s.playerId);
  }
  for (let h = 1; h <= totalHoles; h++) {
    if ((counts.get(h)?.size ?? 0) < playerCount) return h;
  }
  return totalHoles;
}

/** Highest hole number with any score (0 when nothing is scored). */
export function lastScoredHole(scores: HoleScoreRef[], totalHoles: number): number {
  let max = 0;
  for (const s of scores) {
    if (s.holeNumber <= totalHoles && s.holeNumber > max) max = s.holeNumber;
  }
  return max;
}

/**
 * The hole live money is computed through. Live money is the round's money right now,
 * so it never stops at the hole being viewed: looking back at hole 2 must not hide
 * what was won on holes 3–7. It still extends to the viewed hole when that is later.
 */
export function liveMoneyThroughHole(scores: HoleScoreRef[], currentHole: number, totalHoles: number): number {
  return Math.min(totalHoles, Math.max(currentHole, lastScoredHole(scores, totalHoles)));
}
