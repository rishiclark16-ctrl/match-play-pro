import { describe, it, expect } from 'vitest';
import { calculateSixes } from './sixes';
import { Player, Score } from '@/types/golf';

function mkPlayer(id: string, name: string, order: number): Player {
  return { id, name, orderIndex: order, handicap: 0 } as Player;
}

function mkScore(playerId: string, hole: number, strokes: number): Score {
  return { playerId, holeNumber: hole, strokes } as Score;
}

const players = [
  mkPlayer('a', 'Alice Jones', 0),
  mkPlayer('b', 'Bob Smith', 1),
  mkPlayer('c', 'Carol Lee', 2),
  mkPlayer('d', 'Dan Park', 3),
];

/** Generate scores for a range of holes with fixed strokes per player */
function mkHoleScores(startHole: number, endHole: number, playerStrokes: Record<string, number>): Score[] {
  const scores: Score[] = [];
  for (let h = startHole; h <= endHole; h++) {
    for (const [pid, strokes] of Object.entries(playerStrokes)) {
      scores.push(mkScore(pid, h, strokes));
    }
  }
  return scores;
}

describe('calculateSixes', () => {
  it('returns empty for wrong player count (3 players)', () => {
    const result = calculateSixes([], players.slice(0, 3), 18, 1);
    expect(result.segments).toHaveLength(0);
  });

  it('returns empty for wrong player count (5 players)', () => {
    const result = calculateSixes([], [...players, mkPlayer('e', 'Eve', 4)], 18, 1);
    expect(result.segments).toHaveLength(0);
  });

  it('correct team rotations: AB vs CD, AC vs BD, AD vs BC', () => {
    const scores = mkHoleScores(1, 18, { a: 4, b: 4, c: 4, d: 4 });
    const result = calculateSixes(scores, players, 18, 1);
    expect(result.segments).toHaveLength(3);

    // Segment 0: holes 1-6, A+B vs C+D
    expect(result.segments[0].holeRange).toEqual([1, 6]);
    expect(result.segments[0].team1Ids).toEqual(['a', 'b']);
    expect(result.segments[0].team2Ids).toEqual(['c', 'd']);

    // Segment 1: holes 7-12, A+C vs B+D
    expect(result.segments[1].holeRange).toEqual([7, 12]);
    expect(result.segments[1].team1Ids).toEqual(['a', 'c']);
    expect(result.segments[1].team2Ids).toEqual(['b', 'd']);

    // Segment 2: holes 13-18, A+D vs B+C
    expect(result.segments[2].holeRange).toEqual([13, 18]);
    expect(result.segments[2].team1Ids).toEqual(['a', 'd']);
    expect(result.segments[2].team2Ids).toEqual(['b', 'c']);
  });

  it('all tied holes → all halved, no earnings', () => {
    const scores = mkHoleScores(1, 18, { a: 4, b: 4, c: 4, d: 4 });
    const result = calculateSixes(scores, players, 18, 1);
    result.segments.forEach(seg => {
      expect(seg.team1HolesWon).toBe(0);
      expect(seg.team2HolesWon).toBe(0);
      expect(seg.halved).toBe(6);
      expect(seg.winnerSide).toBeNull();
    });
    result.standings.forEach(s => expect(s.earnings).toBe(0));
  });

  it('best ball: team wins hole when either player has lower score', () => {
    // Holes 1-6: A=3, B=5, C=5, D=5 → team1 (A+B) best=3, team2 (C+D) best=5 → team1 wins all 6
    const scores = mkHoleScores(1, 6, { a: 3, b: 5, c: 5, d: 5 });
    // Fill remaining holes as tied
    scores.push(...mkHoleScores(7, 18, { a: 4, b: 4, c: 4, d: 4 }));
    const result = calculateSixes(scores, players, 18, 1);

    expect(result.segments[0].team1HolesWon).toBe(6);
    expect(result.segments[0].team2HolesWon).toBe(0);
    expect(result.segments[0].winnerSide).toBe('team1');
  });

  it('segment payout = margin × unitValue per player', () => {
    // Segment 1: team1 wins 4, team2 wins 2 → margin=2, payout=2*$5=$10 per player
    const scores: Score[] = [];
    for (let h = 1; h <= 6; h++) {
      if (h <= 4) {
        scores.push(mkScore('a', h, 3), mkScore('b', h, 5), mkScore('c', h, 5), mkScore('d', h, 5));
      } else {
        scores.push(mkScore('a', h, 5), mkScore('b', h, 5), mkScore('c', h, 3), mkScore('d', h, 5));
      }
    }
    // Remaining segments tied
    scores.push(...mkHoleScores(7, 18, { a: 4, b: 4, c: 4, d: 4 }));
    const result = calculateSixes(scores, players, 18, 5);

    // Segment 0: team1 wins 4, team2 wins 2, margin=2, payout=10
    const alice = result.standings.find(s => s.playerId === 'a')!;
    const bob = result.standings.find(s => s.playerId === 'b')!;
    const carol = result.standings.find(s => s.playerId === 'c')!;
    const dan = result.standings.find(s => s.playerId === 'd')!;
    expect(alice.earnings).toBe(10);
    expect(bob.earnings).toBe(10);
    expect(carol.earnings).toBe(-10);
    expect(dan.earnings).toBe(-10);
  });

  it('earnings always sum to zero', () => {
    const scores: Score[] = [];
    for (let h = 1; h <= 18; h++) {
      scores.push(
        mkScore('a', h, 3 + (h % 3)),
        mkScore('b', h, 4 + (h % 2)),
        mkScore('c', h, 5 - (h % 2)),
        mkScore('d', h, 4 + (h % 3)),
      );
    }
    const result = calculateSixes(scores, players, 18, 10);
    const total = result.standings.reduce((sum, s) => sum + s.earnings, 0);
    expect(Math.abs(total)).toBeLessThan(0.01);
  });

  it('handles partial rounds (only 12 holes played)', () => {
    const scores = mkHoleScores(1, 12, { a: 4, b: 4, c: 4, d: 4 });
    const result = calculateSixes(scores, players, 12, 1);
    // Segment 0 (1-6) and Segment 1 (7-12) should have results
    expect(result.segments[0].halved).toBe(6);
    expect(result.segments[1].halved).toBe(6);
    // Segment 2 (13-18) should have 0 holes scored
    expect(result.segments[2].team1HolesWon).toBe(0);
    expect(result.segments[2].team2HolesWon).toBe(0);
    expect(result.segments[2].halved).toBe(0);
  });

  it('tracks segmentsWon per player', () => {
    // Segment 0: team1 (A+B) wins, segment 1: team2 (B+D) wins, segment 2: tied
    const scores: Score[] = [];
    // Seg 0 (1-6): A+B wins all
    for (let h = 1; h <= 6; h++) scores.push(mkScore('a', h, 3), mkScore('b', h, 3), mkScore('c', h, 5), mkScore('d', h, 5));
    // Seg 1 (7-12): B+D wins all
    for (let h = 7; h <= 12; h++) scores.push(mkScore('a', h, 5), mkScore('b', h, 3), mkScore('c', h, 5), mkScore('d', h, 3));
    // Seg 2 (13-18): tied
    for (let h = 13; h <= 18; h++) scores.push(mkScore('a', h, 4), mkScore('b', h, 4), mkScore('c', h, 4), mkScore('d', h, 4));

    const result = calculateSixes(scores, players, 18, 1);
    const alice = result.standings.find(s => s.playerId === 'a')!;
    const bob = result.standings.find(s => s.playerId === 'b')!;
    expect(alice.segmentsWon).toBe(1);  // Won seg 0
    expect(bob.segmentsWon).toBe(2);    // Won seg 0 and seg 1
  });

  it('standings sorted by earnings descending', () => {
    const scores: Score[] = [];
    for (let h = 1; h <= 18; h++) {
      scores.push(mkScore('a', h, 3), mkScore('b', h, 4), mkScore('c', h, 5), mkScore('d', h, 5));
    }
    const result = calculateSixes(scores, players, 18, 1);
    for (let i = 0; i < result.standings.length - 1; i++) {
      expect(result.standings[i].earnings).toBeGreaterThanOrEqual(result.standings[i + 1].earnings);
    }
  });
});
