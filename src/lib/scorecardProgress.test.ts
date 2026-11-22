import { describe, it, expect } from 'vitest';
import { resumeHole, lastScoredHole, liveMoneyThroughHole } from './scorecardProgress';

const sc = (holes: number[], players: string[]) =>
  holes.flatMap(h => players.map(p => ({ holeNumber: h, playerId: p })));

describe('resumeHole', () => {
  it('opens a fresh round on hole 1', () => {
    expect(resumeHole([], 4, 18)).toBe(1);
  });
  it('opens on the first hole not every player has scored', () => {
    const scores = [...sc([1, 2, 3, 4, 5, 6, 7], ['a', 'b', 'c', 'd']), { holeNumber: 8, playerId: 'a' }];
    expect(resumeHole(scores, 4, 18)).toBe(8);
  });
  it('fills gaps first (a skipped earlier hole)', () => {
    const scores = sc([1, 3, 4], ['a', 'b']);
    expect(resumeHole(scores, 2, 9)).toBe(2);
  });
  it('a finished card returns the last hole', () => {
    expect(resumeHole(sc([1, 2, 3, 4, 5, 6, 7, 8, 9], ['a']), 1, 9)).toBe(9);
  });
  it('ignores out-of-range holes and duplicate scores', () => {
    const scores = [...sc([1], ['a', 'a', 'b']), { holeNumber: 99, playerId: 'a' }];
    expect(resumeHole(scores, 2, 18)).toBe(2);
  });
});

describe('liveMoneyThroughHole', () => {
  const scores = sc([1, 2, 3, 4, 5, 6, 7], ['a', 'b']);
  it('uses the latest scored hole when viewing an earlier hole', () => {
    expect(liveMoneyThroughHole(scores, 1, 18)).toBe(7);
  });
  it('extends to the viewed hole when it is later', () => {
    expect(liveMoneyThroughHole(scores, 9, 18)).toBe(9);
  });
  it('never exceeds the round length', () => {
    expect(liveMoneyThroughHole(scores, 30, 18)).toBe(18);
    expect(lastScoredHole([{ holeNumber: 20, playerId: 'a' }], 18)).toBe(0);
  });
});
