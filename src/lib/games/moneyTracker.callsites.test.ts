/**
 * Regression tests for Notion 09.2 M1/M2/M3: exercise the calculators the way the app
 * calls them (through calculateLiveMoney with a real HoleInfo[]), not with hand-picked
 * numeric args. Before the fix, Nines/Defender/Sixes paid $0 and Vegas scored ≤ 1 hole.
 */
import { describe, it, expect } from 'vitest';
import { calculateLiveMoney } from './moneyTracker';
import { GameConfig, HoleInfo, PlayerWithScores, Score } from '@/types/golf';

const holeInfo: HoleInfo[] = Array.from({ length: 18 }, (_, i) => ({
  number: i + 1, par: 4, yardage: 400, handicap: i + 1,
}));

function mkPlayers(n: number): PlayerWithScores[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i + 1}`, roundId: 'r1', name: `P${i + 1}`, handicap: undefined,
    orderIndex: i, scores: [], totalStrokes: 0, totalRelativeToPar: 0, holesPlayed: 0,
  }));
}

/** p1 always shoots 3, everyone else shoots 4 + index — deterministic, no ties for low. */
function mkScores(players: PlayerWithScores[], holes: number): Score[] {
  const out: Score[] = [];
  for (let h = 1; h <= holes; h++) {
    players.forEach((p, i) => out.push({
      id: `${p.id}-${h}`, roundId: 'r1', playerId: p.id, holeNumber: h, strokes: i === 0 ? 3 : 4 + i,
    }));
  }
  return out;
}

function totals(players: PlayerWithScores[], scores: Score[], game: GameConfig, holes: number) {
  const res = calculateLiveMoney(players, scores, [game], holeInfo, [], holes);
  return players.map(p => res.breakdown.get(p.id)!);
}

const sum = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) * 100) / 100;

describe('live money — production call shape', () => {
  it('Nines pays non-zero and sums to zero (M1)', () => {
    const ps = mkPlayers(3);
    const b = totals(ps, mkScores(ps, 9), { id: 'g', type: 'nines', stakes: 1 } as GameConfig, 9);
    expect(b[0].nines).toBeGreaterThan(0);
    expect(sum(b.map(x => x.nines))).toBe(0);
  });

  it('Defender pays non-zero and sums to zero (M1)', () => {
    const ps = mkPlayers(4);
    const b = totals(ps, mkScores(ps, 12), { id: 'g', type: 'defender', stakes: 1 } as GameConfig, 12);
    expect(b.some(x => x.defender !== 0)).toBe(true);
    expect(sum(b.map(x => x.defender))).toBe(0);
  });

  it('Sixes pays non-zero and sums to zero (M1)', () => {
    const ps = mkPlayers(4);
    const b = totals(ps, mkScores(ps, 18), { id: 'g', type: 'sixes', stakes: 1 } as GameConfig, 18);
    expect(b.some(x => x.sixes !== 0)).toBe(true);
    expect(sum(b.map(x => x.sixes))).toBe(0);
  });

  it('Vegas scores every hole, not just one (M2), with or without carryover', () => {
    const ps = mkPlayers(4);
    const scores = mkScores(ps, 6);
    const one = totals(ps, mkScores(ps, 1), { id: 'g', type: 'vegas', stakes: 1 } as GameConfig, 1)[0].vegas;
    for (const carryover of [false, true]) {
      const six = totals(ps, scores, { id: 'g', type: 'vegas', stakes: 1, carryover } as GameConfig, 6)[0].vegas;
      expect(one).not.toBe(0);
      expect(six).toBeCloseTo(one * 6);
    }
  });

  it('Vegas: each partner wins/loses the full per-player amount (M3)', () => {
    const ps = mkPlayers(4);
    const b = totals(ps, mkScores(ps, 3), { id: 'g', type: 'vegas', stakes: 1 } as GameConfig, 3);
    expect(b[0].vegas).toBe(b[1].vegas);
    expect(b[0].vegas).toBe(-b[2].vegas);
    expect(sum(b.map(x => x.vegas))).toBe(0);
  });
});

describe('live money — snake (M9)', () => {
  it('debits the player recorded on a snake', () => {
    const ps = mkPlayers(3);
    const res = calculateLiveMoney(ps, mkScores(ps, 1), [], holeInfo, [], 1, undefined, [
      { id: 's', roundId: 'r1', type: 'snake', holeNumber: 1, stakes: 2, winnerId: 'p1', createdAt: new Date() },
    ]);
    expect(res.breakdown.get('p1')!.propBets).toBe(-4);
    expect(res.breakdown.get('p2')!.propBets).toBe(2);
  });
});
