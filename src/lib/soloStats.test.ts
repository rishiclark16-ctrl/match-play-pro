import { describe, it, expect } from 'vitest';
import { calcScoreBreakdown, calcBestHole } from './soloStats';
import type { HoleInfo, PlayerWithScores, Score } from '@/types/golf';

const ROUND_ID = 'r1';
const PLAYER_ID = 'p1';

const s = (holeNumber: number, strokes: number): Score => ({
  id: `${holeNumber}`,
  roundId: ROUND_ID,
  playerId: PLAYER_ID,
  holeNumber,
  strokes,
});

// 18 par-4 holes by default
const makeHoles = (n = 18, par = 4): HoleInfo[] =>
  Array.from({ length: n }, (_, i) => ({ number: i + 1, par }));

const makePlayer = (scores: Score[]): Pick<PlayerWithScores, 'scores'> => ({ scores });

describe('calcScoreBreakdown', () => {
  const holes = makeHoles();

  it('returns all-zero breakdown when no scores', () => {
    const b = calcScoreBreakdown(makePlayer([]), holes);
    expect(b).toEqual({ ace: 0, albatross: 0, eagle: 0, birdie: 0, par: 0, bogey: 0, double: 0, triple: 0, worse: 0 });
  });

  it('counts a mix of score types correctly', () => {
    const scores = [
      s(1, 3), // birdie on par 4
      s(2, 4), // par
      s(3, 5), // bogey
      s(4, 6), // double
      s(5, 2), // eagle on par 4
      s(6, 1), // ace
      s(7, 7), // triple
      s(8, 8), // worse (+4)
    ];
    const b = calcScoreBreakdown(makePlayer(scores), holes);
    expect(b.birdie).toBe(1);
    expect(b.par).toBe(1);
    expect(b.bogey).toBe(1);
    expect(b.double).toBe(1);
    expect(b.eagle).toBe(1);
    expect(b.ace).toBe(1);
    expect(b.triple).toBe(1);
    expect(b.worse).toBe(1);
  });

  it('ignores scores whose hole is missing from holeInfo', () => {
    const scores = [s(1, 3), s(99, 4)]; // hole 99 does not exist
    const b = calcScoreBreakdown(makePlayer(scores), holes);
    expect(b.birdie).toBe(1);
    expect(b.par).toBe(0);
  });

  it('respects per-hole par when holes have mixed pars', () => {
    const mixed: HoleInfo[] = [
      { number: 1, par: 3 },
      { number: 2, par: 5 },
    ];
    const scores = [s(1, 3), s(2, 4)]; // par, birdie
    const b = calcScoreBreakdown(makePlayer(scores), mixed);
    expect(b.par).toBe(1);
    expect(b.birdie).toBe(1);
  });
});

describe('calcBestHole', () => {
  const holes = makeHoles();

  it('returns null when player has no scores', () => {
    expect(calcBestHole(makePlayer([]), holes)).toBeNull();
  });

  it('returns the hole with the lowest diff vs par', () => {
    const scores = [
      s(1, 4), // par (diff 0)
      s(2, 3), // birdie (diff -1)
      s(3, 2), // eagle (diff -2)  ← best
      s(4, 5), // bogey (diff +1)
    ];
    const b = calcBestHole(makePlayer(scores), holes);
    expect(b).not.toBeNull();
    expect(b!.hole).toBe(3);
    expect(b!.diff).toBe(-2);
    expect(b!.strokes).toBe(2);
    expect(b!.par).toBe(4);
  });

  it('returns the first hole with the minimum diff when multiple tie', () => {
    const scores = [s(5, 3), s(8, 3), s(12, 3)]; // three birdies
    const b = calcBestHole(makePlayer(scores), holes);
    expect(b!.hole).toBe(5);
    expect(b!.diff).toBe(-1);
  });

  it('skips scores whose hole is missing from holeInfo', () => {
    const scores = [s(99, 2), s(1, 4)]; // hole 99 should be ignored entirely
    const b = calcBestHole(makePlayer(scores), holes);
    expect(b!.hole).toBe(1);
    expect(b!.diff).toBe(0);
  });
});
