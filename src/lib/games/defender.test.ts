import { describe, it, expect } from 'vitest';
import { calculateDefender, getDefenderForHole } from './defender';
import { Player, Score } from '@/types/golf';

function mkPlayer(id: string, name: string, order: number): Player {
  return { id, name, orderIndex: order, handicap: 0 } as Player;
}

function mkScore(playerId: string, hole: number, strokes: number): Score {
  return { playerId, holeNumber: hole, strokes } as Score;
}

const p3 = [mkPlayer('a', 'Alice', 0), mkPlayer('b', 'Bob', 1), mkPlayer('c', 'Carol', 2)];
const p4 = [mkPlayer('a', 'Alice', 0), mkPlayer('b', 'Bob', 1), mkPlayer('c', 'Carol', 2), mkPlayer('d', 'Dan', 3)];

describe('getDefenderForHole', () => {
  it('rotates 3 players correctly', () => {
    expect(getDefenderForHole(p3, 1)?.id).toBe('a');
    expect(getDefenderForHole(p3, 2)?.id).toBe('b');
    expect(getDefenderForHole(p3, 3)?.id).toBe('c');
    expect(getDefenderForHole(p3, 4)?.id).toBe('a');
    expect(getDefenderForHole(p3, 7)?.id).toBe('a');
  });

  it('rotates 4 players correctly', () => {
    expect(getDefenderForHole(p4, 1)?.id).toBe('a');
    expect(getDefenderForHole(p4, 2)?.id).toBe('b');
    expect(getDefenderForHole(p4, 3)?.id).toBe('c');
    expect(getDefenderForHole(p4, 4)?.id).toBe('d');
    expect(getDefenderForHole(p4, 5)?.id).toBe('a');
  });

  it('returns null for 2 players', () => {
    expect(getDefenderForHole(p3.slice(0, 2), 1)).toBeNull();
  });

  it('returns null for 5 players', () => {
    expect(getDefenderForHole([...p4, mkPlayer('e', 'Eve', 4)], 1)).toBeNull();
  });
});

describe('calculateDefender — 3 players', () => {
  it('returns empty for wrong player count', () => {
    const result = calculateDefender([], p3.slice(0, 2), 1, 1);
    expect(result.holeResults).toHaveLength(0);
    expect(result.standings).toHaveLength(0);
  });

  it('defender wins outright → +3 pts', () => {
    // Hole 1: Alice defends. Alice=3, Bob=4, Carol=5 → defender wins
    const scores = [mkScore('a', 1, 3), mkScore('b', 1, 4), mkScore('c', 1, 5)];
    const result = calculateDefender(scores, p3, 1, 1);
    expect(result.holeResults).toHaveLength(1);
    expect(result.holeResults[0].outcome).toBe('defender_wins');
    expect(result.holeResults[0].defenderPoints).toBe(3);
    expect(result.holeResults[0].attackerPoints).toBe(0);
  });

  it('defender ties → +1 pt', () => {
    // Hole 1: Alice defends. Alice=4, Bob=4, Carol=5 → tie
    const scores = [mkScore('a', 1, 4), mkScore('b', 1, 4), mkScore('c', 1, 5)];
    const result = calculateDefender(scores, p3, 1, 1);
    expect(result.holeResults[0].outcome).toBe('defender_ties');
    expect(result.holeResults[0].defenderPoints).toBe(1);
  });

  it('defender loses to one → attackers get +1 each', () => {
    // Hole 1: Alice defends. Alice=5, Bob=3, Carol=6 → loses to one
    const scores = [mkScore('a', 1, 5), mkScore('b', 1, 3), mkScore('c', 1, 6)];
    const result = calculateDefender(scores, p3, 1, 1);
    expect(result.holeResults[0].outcome).toBe('defender_loses_one');
    expect(result.holeResults[0].defenderPoints).toBe(0);
    expect(result.holeResults[0].attackerPoints).toBe(1);
  });

  it('defender loses to all → attackers get +2 each', () => {
    // Hole 1: Alice defends. Alice=6, Bob=4, Carol=5 → loses to all
    const scores = [mkScore('a', 1, 6), mkScore('b', 1, 4), mkScore('c', 1, 5)];
    const result = calculateDefender(scores, p3, 1, 1);
    expect(result.holeResults[0].outcome).toBe('defender_loses_all');
    expect(result.holeResults[0].attackerPoints).toBe(2);
  });

  it('skips holes where not all players have scored', () => {
    const scores = [mkScore('a', 1, 4), mkScore('b', 1, 4)]; // Carol missing
    const result = calculateDefender(scores, p3, 1, 1);
    expect(result.holesScored).toBe(0);
  });

  it('multi-hole accumulation and pairwise settlement', () => {
    const scores = [
      // Hole 1: Alice defends, wins (+3)
      mkScore('a', 1, 3), mkScore('b', 1, 4), mkScore('c', 1, 5),
      // Hole 2: Bob defends, loses to all (+2 each attacker)
      mkScore('a', 2, 3), mkScore('b', 2, 6), mkScore('c', 2, 4),
      // Hole 3: Carol defends, ties (+1)
      mkScore('a', 3, 4), mkScore('b', 3, 5), mkScore('c', 3, 4),
    ];
    const result = calculateDefender(scores, p3, 3, 1);
    expect(result.holesScored).toBe(3);

    // Alice: 3 (defend win) + 2 (attack hole 2) + 0 = 5
    // Bob: 0 + 0 (defend lose) + 2 (attack hole 3...wait no, Carol ties on hole 3)
    // Let me recalculate:
    // Hole 1: Alice defends, wins. A+3, B+0, C+0
    // Hole 2: Bob defends, A=3, B=6, C=4. Both beat Bob. defender_loses_all. B+0, A+2, C+2
    // Hole 3: Carol defends, A=4, B=5, C=4. Carol ties Alice, Bob loses.
    //   attackersBeatDefender = 0 (nobody < 4), attackersTiedDefender = 1 (Alice=4)
    //   → defender_ties, C+1
    // Totals: A=5, B=0, C=3
    const alice = result.standings.find(s => s.playerId === 'a')!;
    const bob = result.standings.find(s => s.playerId === 'b')!;
    const carol = result.standings.find(s => s.playerId === 'c')!;
    expect(alice.totalPoints).toBe(5);
    expect(bob.totalPoints).toBe(0);
    expect(carol.totalPoints).toBe(3);

    // Pairwise: A-B=5, A-C=2, B-C=-3 → earnings sum to 0
    expect(alice.earnings + bob.earnings + carol.earnings).toBe(0);
  });

  it('unit value scales earnings', () => {
    const scores = [mkScore('a', 1, 3), mkScore('b', 1, 4), mkScore('c', 1, 5)];
    const r1 = calculateDefender(scores, p3, 1, 1);
    const r5 = calculateDefender(scores, p3, 1, 5);
    const alice1 = r1.standings.find(s => s.playerId === 'a')!;
    const alice5 = r5.standings.find(s => s.playerId === 'a')!;
    expect(alice5.earnings).toBe(alice1.earnings * 5);
  });

  it('tracks timesDefender and defenderWins', () => {
    const scores = [
      mkScore('a', 1, 3), mkScore('b', 1, 4), mkScore('c', 1, 5), // A defends, wins
      mkScore('a', 2, 4), mkScore('b', 2, 3), mkScore('c', 2, 5), // B defends, wins
      mkScore('a', 3, 4), mkScore('b', 3, 5), mkScore('c', 3, 6), // C defends, loses
    ];
    const result = calculateDefender(scores, p3, 3, 1);
    const alice = result.standings.find(s => s.playerId === 'a')!;
    expect(alice.timesDefender).toBe(1);
    expect(alice.defenderWins).toBe(1);
  });
});

describe('calculateDefender — 4 players', () => {
  it('defender loses to all 3 attackers → +2 each', () => {
    // Hole 1: Alice defends. A=7, B=4, C=5, D=3
    const scores = [mkScore('a', 1, 7), mkScore('b', 1, 4), mkScore('c', 1, 5), mkScore('d', 1, 3)];
    const result = calculateDefender(scores, p4, 1, 1);
    expect(result.holeResults[0].outcome).toBe('defender_loses_all');
    expect(result.holeResults[0].attackerPoints).toBe(2);
  });

  it('defender wins outright against 3 attackers → +3', () => {
    const scores = [mkScore('a', 1, 3), mkScore('b', 1, 5), mkScore('c', 1, 4), mkScore('d', 1, 6)];
    const result = calculateDefender(scores, p4, 1, 1);
    expect(result.holeResults[0].outcome).toBe('defender_wins');
    expect(result.holeResults[0].defenderPoints).toBe(3);
  });

  it('earnings always sum to zero', () => {
    const scores: Score[] = [];
    for (let h = 1; h <= 8; h++) {
      scores.push(mkScore('a', h, 3 + (h % 3)), mkScore('b', h, 4 + (h % 2)),
        mkScore('c', h, 5 - (h % 2)), mkScore('d', h, 4 + (h % 3)));
    }
    const result = calculateDefender(scores, p4, 8, 2);
    const total = result.standings.reduce((sum, s) => sum + s.earnings, 0);
    expect(Math.abs(total)).toBeLessThan(0.01);
  });
});
