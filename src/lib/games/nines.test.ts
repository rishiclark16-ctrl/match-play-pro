import { describe, it, expect } from 'vitest';
import { calculateNines } from './nines';
import { Player, Score } from '@/types/golf';

function mkPlayer(id: string, name: string, order: number): Player {
  return { id, name, orderIndex: order, handicap: 0 } as Player;
}

function mkScore(playerId: string, hole: number, strokes: number): Score {
  return { playerId, holeNumber: hole, strokes } as Score;
}

const players = [mkPlayer('a', 'Alice', 0), mkPlayer('b', 'Bob', 1), mkPlayer('c', 'Carol', 2)];

describe('calculateNines', () => {
  it('returns empty for wrong player count (2 players)', () => {
    const result = calculateNines([], players.slice(0, 2), 1, 1);
    expect(result.holeResults).toHaveLength(0);
  });

  it('returns empty for wrong player count (4 players)', () => {
    const result = calculateNines([], [...players, mkPlayer('d', 'Dan', 3)], 1, 1);
    expect(result.holeResults).toHaveLength(0);
  });

  it('all different scores → 5/3/1', () => {
    const scores = [mkScore('a', 1, 3), mkScore('b', 1, 4), mkScore('c', 1, 5)];
    const result = calculateNines(scores, players, 1, 1);
    expect(result.holeResults[0].pattern).toBe('all_different');
    expect(result.holeResults[0].playerPoints['a']).toBe(5);
    expect(result.holeResults[0].playerPoints['b']).toBe(3);
    expect(result.holeResults[0].playerPoints['c']).toBe(1);
  });

  it('two tied for low → 4/4/1', () => {
    const scores = [mkScore('a', 1, 3), mkScore('b', 1, 3), mkScore('c', 1, 5)];
    const result = calculateNines(scores, players, 1, 1);
    expect(result.holeResults[0].pattern).toBe('two_low');
    expect(result.holeResults[0].playerPoints['a']).toBe(4);
    expect(result.holeResults[0].playerPoints['b']).toBe(4);
    expect(result.holeResults[0].playerPoints['c']).toBe(1);
  });

  it('one low + two tied for high → 5/2/2', () => {
    const scores = [mkScore('a', 1, 3), mkScore('b', 1, 5), mkScore('c', 1, 5)];
    const result = calculateNines(scores, players, 1, 1);
    expect(result.holeResults[0].pattern).toBe('two_high');
    expect(result.holeResults[0].playerPoints['a']).toBe(5);
    expect(result.holeResults[0].playerPoints['b']).toBe(2);
    expect(result.holeResults[0].playerPoints['c']).toBe(2);
  });

  it('all three tied → 3/3/3', () => {
    const scores = [mkScore('a', 1, 4), mkScore('b', 1, 4), mkScore('c', 1, 4)];
    const result = calculateNines(scores, players, 1, 1);
    expect(result.holeResults[0].pattern).toBe('all_tied');
    expect(result.holeResults[0].playerPoints['a']).toBe(3);
    expect(result.holeResults[0].playerPoints['b']).toBe(3);
    expect(result.holeResults[0].playerPoints['c']).toBe(3);
  });

  it('points always sum to 9 per hole', () => {
    const patterns = [
      [3, 4, 5], // all_different
      [3, 3, 5], // two_low
      [3, 5, 5], // two_high
      [4, 4, 4], // all_tied
    ];
    patterns.forEach((strokes, i) => {
      const scores = strokes.map((s, j) => mkScore(['a', 'b', 'c'][j], 1, s));
      const result = calculateNines(scores, players, 1, 1);
      const total = Object.values(result.holeResults[0].playerPoints).reduce((a, b) => a + b, 0);
      expect(total).toBe(9);
    });
  });

  it('skips holes with incomplete scores', () => {
    const scores = [mkScore('a', 1, 3), mkScore('b', 1, 4)]; // Carol missing
    const result = calculateNines(scores, players, 1, 1);
    expect(result.holesScored).toBe(0);
  });

  it('multi-hole accumulation', () => {
    const scores = [
      mkScore('a', 1, 3), mkScore('b', 1, 4), mkScore('c', 1, 5), // 5/3/1
      mkScore('a', 2, 5), mkScore('b', 2, 4), mkScore('c', 2, 3), // 1/3/5
    ];
    const result = calculateNines(scores, players, 2, 1);
    expect(result.holesScored).toBe(2);
    const alice = result.standings.find(s => s.playerId === 'a')!;
    const bob = result.standings.find(s => s.playerId === 'b')!;
    const carol = result.standings.find(s => s.playerId === 'c')!;
    expect(alice.totalPoints).toBe(6); // 5+1
    expect(bob.totalPoints).toBe(6);   // 3+3
    expect(carol.totalPoints).toBe(6); // 1+5
  });

  it('pairwise settlement with unit value', () => {
    // Alice dominates: 5 pts, Bob 3, Carol 1
    const scores = [mkScore('a', 1, 3), mkScore('b', 1, 4), mkScore('c', 1, 5)];
    const result = calculateNines(scores, players, 1, 2);
    const alice = result.standings.find(s => s.playerId === 'a')!;
    const bob = result.standings.find(s => s.playerId === 'b')!;
    const carol = result.standings.find(s => s.playerId === 'c')!;
    // A vs B: (5-3)*2 = 4, A vs C: (5-1)*2 = 8 → Alice = +12
    // B vs C: (3-1)*2 = 4 → Bob = -4 + 4 = 0
    // Carol = -8 - 4 = -12
    expect(alice.earnings).toBe(12);
    expect(bob.earnings).toBe(0);
    expect(carol.earnings).toBe(-12);
  });

  it('earnings always sum to zero', () => {
    const scores: Score[] = [];
    for (let h = 1; h <= 9; h++) {
      scores.push(
        mkScore('a', h, 3 + (h % 3)),
        mkScore('b', h, 4 + (h % 2)),
        mkScore('c', h, 5 - (h % 2)),
      );
    }
    const result = calculateNines(scores, players, 9, 5);
    const total = result.standings.reduce((sum, s) => sum + s.earnings, 0);
    expect(Math.abs(total)).toBeLessThan(0.01);
  });

  it('standings sorted by totalPoints descending', () => {
    const scores = [mkScore('a', 1, 5), mkScore('b', 1, 3), mkScore('c', 1, 4)];
    const result = calculateNines(scores, players, 1, 1);
    expect(result.standings[0].totalPoints).toBeGreaterThanOrEqual(result.standings[1].totalPoints);
    expect(result.standings[1].totalPoints).toBeGreaterThanOrEqual(result.standings[2].totalPoints);
  });
});
