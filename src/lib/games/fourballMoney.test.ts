import { describe, it, expect } from 'vitest';
import { fourballTransfers, calculateFourballMatchPlay } from './matchPlay';
import { calculateSettlement } from './settlement';
import type { Player, Score, Team, HoleInfo } from '@/types/golf';

// Fourball (2v2) match money was never settled: settlement and the live tracker
// only handled 2-player match play, so a "$20 team match" paid nothing.

const teams: Team[] = [
  { id: 'team-a', name: 'A', playerIds: ['a1', 'a2'], color: '#000' },
  { id: 'team-b', name: 'B', playerIds: ['b1', 'b2'], color: '#000' },
];
const players: Player[] = ['a1', 'a2', 'b1', 'b2'].map((id, i) => ({ id, roundId: 'r', name: id, orderIndex: i }));

describe('fourball match money', () => {
  it('each loser pays the stake, split across the winners', () => {
    expect(fourballTransfers(teams, 'team-a', 20)).toEqual([
      { from: 'b1', to: 'a1', amount: 10 }, { from: 'b1', to: 'a2', amount: 10 },
      { from: 'b2', to: 'a1', amount: 10 }, { from: 'b2', to: 'a2', amount: 10 },
    ]);
  });

  it('a halved match or no stake pays nothing', () => {
    expect(fourballTransfers(teams, null, 20)).toEqual([]);
    expect(fourballTransfers(teams, 'team-a', 0)).toEqual([]);
  });

  it('settles to +$20 for each winner and -$20 for each loser', () => {
    const net = calculateSettlement(players, undefined, undefined, null, 0, undefined, undefined, undefined, undefined,
      undefined, undefined, undefined, undefined, fourballTransfers(teams, 'team-a', 20));
    const balance = new Map<string, number>();
    for (const s of net) {
      balance.set(s.fromPlayerId, (balance.get(s.fromPlayerId) ?? 0) - s.amount);
      balance.set(s.toPlayerId, (balance.get(s.toPlayerId) ?? 0) + s.amount);
    }
    expect(balance.get('a1')).toBe(20);
    expect(balance.get('a2')).toBe(20);
    expect(balance.get('b1')).toBe(-20);
    expect(balance.get('b2')).toBe(-20);
  });

  it('the team that wins more holes takes the money end to end', () => {
    const holeInfo: HoleInfo[] = Array.from({ length: 18 }, (_, i) => ({ number: i + 1, par: 4 }));
    const scores: Score[] = [];
    for (let h = 1; h <= 18; h++) {
      // Team A's best ball is a 3 on the first 10 holes, then everyone makes 4.
      scores.push({ id: `a1-${h}`, playerId: 'a1', holeNumber: h, strokes: h <= 10 ? 3 : 4 } as Score);
      for (const p of ['a2', 'b1', 'b2']) scores.push({ id: `${p}-${h}`, playerId: p, holeNumber: h, strokes: 4 } as Score);
    }
    const fb = calculateFourballMatchPlay(scores, players, holeInfo, undefined, 18, teams);
    expect(fb.winnerId).toBe('team-a');
    expect(fourballTransfers(teams, fb.winnerId, 20).reduce((s, t) => s + t.amount, 0)).toBe(40);
  });
});
