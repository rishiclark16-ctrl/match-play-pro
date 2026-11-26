import { describe, it, expect } from 'vitest';
import { calculateFourballMatchPlay, fourballMoney } from './matchPlay';
import type { GameConfig, HoleInfo, Player, Score, Team } from '@/types/golf';

// Team matches can be scored three ways. The one golfers asked for first:
// "2 v 2, add both scores together, lower total wins the hole".

const teams: Team[] = [
  { id: 'A', name: 'Sam & Jack', playerIds: ['a1', 'a2'], color: '#000' },
  { id: 'B', name: 'Jim & Tim', playerIds: ['b1', 'b2'], color: '#000' },
];
const players: Player[] = ['a1', 'a2', 'b1', 'b2'].map((id, i) => ({ id, roundId: 'r', name: id, orderIndex: i }));
const holes18: HoleInfo[] = Array.from({ length: 18 }, (_, i) => ({ number: i + 1, par: 4, handicap: i + 1 }));

/** rows: [a1, a2, b1, b2] per hole. */
function card(rows: number[][]): Score[] {
  return rows.flatMap((r, h) => ['a1', 'a2', 'b1', 'b2'].map((pid, i) => ({
    id: `${pid}-${h + 1}`, playerId: pid, roundId: 'r', holeNumber: h + 1, strokes: r[i],
  })));
}

// Hole 1: A has the best ball (3) but the worse total (3+7=10 vs 4+4=8).
// Hole 2: A best ball 4 and total 9 beat B's 5 and 10.
const twoHoles = card([[3, 7, 4, 4], [4, 5, 5, 5]]);

describe('team match scoring', () => {
  it('best ball (default): the better ball wins the hole', () => {
    const r = calculateFourballMatchPlay(twoHoles, players, holes18, undefined, 18, teams);
    expect(r.holeResults.map(h => h.winnerId)).toEqual(['A', 'A']);
    expect(r.holesUp).toBe(2);
    expect(r.leaderId).toBe('A');
  });

  it('aggregate: the lower combined score wins the hole', () => {
    const r = calculateFourballMatchPlay(twoHoles, players, holes18, undefined, 18, teams, { scoring: 'aggregate' });
    expect(r.holeResults.map(h => h.winnerId)).toEqual(['B', 'A']);
    expect(r.holeResults[0].teamTotals).toEqual({ A: 10, B: 8 });
    expect(r.holesUp).toBe(0);
    expect(r.statusText).toBe('All Square');
  });

  it('aggregate uses net scores when strokes are given', () => {
    // a2 gets a stroke on hole 1: A's net total 3+6=9 still loses to 8.
    // b1 gets two: B's net total 2+4=6.
    const strokes = new Map([['a2', new Map([[1, 1]])], ['b1', new Map([[1, 2]])]]);
    const r = calculateFourballMatchPlay(card([[3, 7, 4, 4]]), players, holes18, strokes, 18, teams, { scoring: 'aggregate' });
    expect(r.holeResults[0].teamTotals).toEqual({ A: 9, B: 6 });
    expect(r.holeResults[0].winnerId).toBe('B');
  });

  it('aggregate waits until all four have a score on the hole', () => {
    const partial = card([[4, 4, 5, 5]]).filter(s => s.playerId !== 'b2');
    const r = calculateFourballMatchPlay(partial, players, holes18, undefined, 18, teams, { scoring: 'aggregate' });
    expect(r.holesPlayed).toBe(0);
  });

  it('low ball, low total: a point each, so a hole is worth two', () => {
    const r = calculateFourballMatchPlay(twoHoles, players, holes18, undefined, 18, teams, { scoring: 'best_and_aggregate' });
    // Hole 1 splits 1-1 (A low ball, B low total). Hole 2: A takes both.
    expect(r.holeResults.map(h => h.teamPoints)).toEqual([{ A: 1, B: 1 }, { A: 2, B: 0 }]);
    expect(r.holeResults[0].winnerId).toBeNull();
    expect(r.holesUp).toBe(2);
    expect(r.statusText).toBe('Sam & Jack 2 pts up');
  });

  it('a tied low ball halves only that point', () => {
    const r = calculateFourballMatchPlay(card([[4, 6, 4, 5]]), players, holes18, undefined, 18, teams, { scoring: 'best_and_aggregate' });
    expect(r.holeResults[0].teamPoints).toEqual({ A: 0, B: 1 });
  });

  it('a match closes out when the lead is bigger than the points left', () => {
    // A wins 10 holes straight by total: 10 up with 8 to play.
    const rows = Array.from({ length: 10 }, () => [4, 4, 5, 5]);
    const r = calculateFourballMatchPlay(card(rows), players, holes18, undefined, 18, teams, { scoring: 'aggregate' });
    expect(r.matchStatus).toBe('won');
    expect(r.winMargin).toBe('10&8');
  });

  it('a per-hole bet never closes early: every hole still counts', () => {
    const rows = Array.from({ length: 10 }, () => [4, 4, 5, 5]);
    const r = calculateFourballMatchPlay(card(rows), players, holes18, undefined, 18, teams, { scoring: 'aggregate', payout: 'per_hole' });
    expect(r.matchStatus).toBe('ongoing');
    expect(r.holesUp).toBe(10);
  });
});

describe('team match money', () => {
  const base: Pick<GameConfig, 'stakes' | 'matchPlayTeams' | 'matchPayout'> = { stakes: 5, matchPlayTeams: teams };
  const balance = (t: { from: string; to: string; amount: number }[]) => {
    const m = new Map<string, number>();
    for (const x of t) {
      m.set(x.from, (m.get(x.from) ?? 0) - x.amount);
      m.set(x.to, (m.get(x.to) ?? 0) + x.amount);
    }
    return Object.fromEntries(m);
  };

  it('per hole: $5 a hole, 3 holes up = $15 a man', () => {
    const t = fourballMoney({ ...base, matchPayout: 'per_hole' }, { winnerId: null, leaderId: 'A', holesUp: 3 }, true);
    expect(balance(t)).toEqual({ a1: 15, a2: 15, b1: -15, b2: -15 });
  });

  it('per hole pays live too, on the current lead', () => {
    const t = fourballMoney({ ...base, matchPayout: 'per_hole' }, { winnerId: null, leaderId: 'B', holesUp: 1 }, false);
    expect(balance(t)).toEqual({ a1: -5, a2: -5, b1: 5, b2: 5 });
  });

  it('match payout: nothing until the match is won; live credits the leader', () => {
    expect(fourballMoney(base, { winnerId: null, leaderId: 'A', holesUp: 2 }, true)).toEqual([]);
    expect(balance(fourballMoney(base, { winnerId: null, leaderId: 'A', holesUp: 2 }, false))).toEqual({ a1: 5, a2: 5, b1: -5, b2: -5 });
    expect(balance(fourballMoney(base, { winnerId: 'A', leaderId: 'A', holesUp: 3 }, true))).toEqual({ a1: 5, a2: 5, b1: -5, b2: -5 });
  });

  it('all square pays nothing either way', () => {
    expect(fourballMoney({ ...base, matchPayout: 'per_hole' }, { winnerId: null, leaderId: null, holesUp: 0 }, true)).toEqual([]);
  });
});
