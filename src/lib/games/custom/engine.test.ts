import { describe, it, expect } from 'vitest';
import { calculateCustomGame, customGameTransfers, settleCustomGame, sideMetric } from './engine';
import { PRESETS } from './presets';
import { validateSpec } from './validate';
import { describeSpec } from './describe';
import { calculateSkins } from '../skins';
import { calculateNines } from '../nines';
import { calculateFourballMatchPlay, fourballMoney } from '../matchPlay';
import type { GameSpec, Transfer } from './types';
import type { HoleInfo, Player, Score } from '@/types/golf';

const P4 = ['a', 'b', 'c', 'd'];
const holes18: HoleInfo[] = Array.from({ length: 18 }, (_, i) => ({ number: i + 1, par: [4, 5, 3, 4][i % 4], handicap: i + 1 }));
const players = (ids: string[]): Player[] => ids.map((id, i) => ({ id, roundId: 'r', name: id.toUpperCase(), orderIndex: i }));

/** rows[hole][player] */
function card(ids: string[], rows: number[][]): Score[] {
  return rows.flatMap((r, h) => ids.map((pid, i) => ({ id: `${pid}${h}`, playerId: pid, roundId: 'r', holeNumber: h + 1, strokes: r[i] })));
}

function balance(t: Transfer[]): Record<string, number> {
  const m: Record<string, number> = {};
  for (const x of t) {
    m[x.from] = Math.round(((m[x.from] ?? 0) - x.amount) * 100) / 100;
    m[x.to] = Math.round(((m[x.to] ?? 0) + x.amount) * 100) / 100;
  }
  return m;
}

/** Deterministic pseudo-random scores 2–9. */
function rng(seed: number) {
  let s = seed;
  return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
}
function randomCard(ids: string[], seed: number, n = 18): Score[] {
  const r = rng(seed);
  const rows = Array.from({ length: n }, (_, h) => ids.map(() => Math.max(2, Math.round(holes18[h].par + (r() * 4 - 1.2)))));
  return card(ids, rows);
}

const settle = (spec: GameSpec, ids: string[], scores: Score[], stake = 1, holes = holes18, strokes?: Map<string, Map<number, number>>) =>
  settleCustomGame({ spec, playerIds: ids, scores, holeInfo: holes, strokes, stake, final: true });

describe('side metrics', () => {
  it('vegas puts the low digit first, and a 10+ first', () => {
    expect(sideMetric('vegas', [5, 4], 4)).toBe(45);
    expect(sideMetric('vegas', [4, 10], 4)).toBe(104);
  });
  it('daytona flips when the low score is bogey or worse', () => {
    expect(sideMetric('daytona', [4, 5], 4)).toBe(45);
    expect(sideMetric('daytona', [5, 6], 4)).toBe(65);
  });
});

describe('the game golfers asked for: 2 v 2, add both scores, lower total wins the hole', () => {
  it('pays $5 a hole a man on the holes won', () => {
    // Hole 1: AB 3+7=10 vs CD 4+4=8 -> CD. Hole 2: AB 4+5=9 vs CD 5+5=10 -> AB. Hole 3: AB 4+4 vs CD 5+5 -> AB.
    const scores = card(P4, [[3, 7, 4, 4], [4, 5, 5, 5], [4, 4, 5, 5]]);
    const { result, transfers } = settle(PRESETS.lowTotal([['a', 'b'], ['c', 'd']]), P4, scores, 5, holes18.slice(0, 3));
    expect(result.holes.map(h => h.points)).toEqual([[0, 1], [1, 0], [1, 0]]);
    expect(balance(transfers)).toEqual({ a: 5, b: 5, c: -5, d: -5 });
  });
});

describe('matches the dedicated calculators on random scorecards', () => {
  it('skins, with and without carryovers', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const ids = P4.slice(0, 2 + (seed % 3));
      const scores = randomCard(ids, seed);
      for (const carry of [false, true]) {
        const skins = calculateSkins(scores, players(ids), 18, 2, carry);
        const { transfers } = settle(PRESETS.skins(carry), ids, scores, 2);
        const b = balance(transfers);
        for (const s of skins.standings) expect(b[s.playerId] ?? 0).toBeCloseTo(s.earnings, 2);
      }
    }
  });

  it('nines', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const ids = ['a', 'b', 'c'];
      const scores = randomCard(ids, seed);
      const nines = calculateNines(scores, players(ids), 18, 1);
      const { result } = settle(PRESETS.nines(), ids, scores);
      for (const s of nines.standings) expect(result.byPlayer[s.playerId]).toBeCloseTo(s.totalPoints, 6);
    }
  });

  it('team matches paid per hole: best ball, low total, low ball + low total', () => {
    const teams = [{ id: 'A', name: 'A', playerIds: ['a', 'b'], color: '' }, { id: 'B', name: 'B', playerIds: ['c', 'd'], color: '' }];
    const specs = {
      best: PRESETS.bestBall([['a', 'b'], ['c', 'd']]),
      aggregate: PRESETS.lowTotal([['a', 'b'], ['c', 'd']]),
      best_and_aggregate: PRESETS.lowBallLowTotal([['a', 'b'], ['c', 'd']]),
    } as const;
    for (let seed = 1; seed <= 60; seed++) {
      const scores = randomCard(P4, seed);
      for (const [scoring, spec] of Object.entries(specs)) {
        const fb = calculateFourballMatchPlay(scores, players(P4), holes18, undefined, 18, teams, { scoring: scoring as keyof typeof specs, payout: 'per_hole' });
        const expected = balance(fourballMoney({ stakes: 3, matchPlayTeams: teams, matchPayout: 'per_hole' }, fb, true));
        const got = balance(settle(spec, P4, scores, 3).transfers);
        for (const p of P4) expect(got[p] ?? 0).toBeCloseTo(expected[p] ?? 0, 2);
      }
    }
  });
});

describe('money always nets to zero', () => {
  const all: [string, (ids: string[]) => GameSpec, number][] = [
    ['skins', () => PRESETS.skins(true), 4], ['nines', () => PRESETS.nines(), 3], ['split sixes', () => PRESETS.splitSixes(), 3],
    ['acey deucey', () => PRESETS.aceyDeucey(), 4], ['dollar a stroke', () => PRESETS.dollarAStroke(), 4],
    ['medal', () => PRESETS.medal(), 4], ['stableford', () => PRESETS.stablefordBet(), 4], ['nassau', () => PRESETS.nassau(), 2],
    ['high-low', () => PRESETS.highLow([['a', 'b'], ['c', 'd']]), 4], ['daytona', () => PRESETS.daytona([['a', 'b'], ['c', 'd']]), 4],
    ['wolfman', ids => PRESETS.wolfman(ids), 3], ['sixes', ids => PRESETS.sixes(ids), 4],
  ];
  for (const [name, make, n] of all) {
    it(name, () => {
      for (let seed = 1; seed <= 25; seed++) {
        const ids = P4.slice(0, n);
        const spec = make(ids);
        expect(validateSpec(spec, ids, holes18.map(h => h.number))).toEqual([]);
        const b = balance(settle(spec, ids, randomCard(ids, seed), 2).transfers);
        expect(Math.abs(Object.values(b).reduce((x, y) => x + y, 0))).toBeLessThan(0.02);
      }
    });
  }
});

describe('hand-computed games', () => {
  const h3 = holes18.slice(0, 3); // pars 4, 5, 3

  it('acey deucey: outright low collects, outright high pays, ties void', () => {
    // Hole 1: a 3 (ace), d 6 (deuce): the deuce pays the ace twice (ace and deuce), so a +4, d -4.
    // Hole 2: a,b tie low (no ace), d 7 deuce pays everyone. Hole 3: all 3, nothing.
    const { transfers } = settle(PRESETS.aceyDeucey(), P4, card(P4, [[3, 4, 5, 6], [4, 4, 5, 7], [3, 3, 3, 3]]), 1, h3);
    expect(balance(transfers)).toEqual({ a: 5, b: 1, c: 1, d: -7 });
  });

  it('dollar a stroke: the stroke difference between each pair', () => {
    const { transfers } = settle(PRESETS.dollarAStroke(), ['a', 'b'], card(['a', 'b'], [[4, 6], [5, 5], [3, 4]]), 1, h3);
    expect(balance(transfers)).toEqual({ a: 3, b: -3 });
  });

  it('medal: the lowest total takes the stake from each player, ties push', () => {
    const { transfers } = settle(PRESETS.medal(), ['a', 'b', 'c'], card(['a', 'b', 'c'], [[4, 5, 5], [5, 5, 5], [3, 3, 4]]), 10, h3);
    expect(balance(transfers)).toEqual({ a: 20, b: -10, c: -10 });
  });

  it('high-low: a point for low ball and a point for high ball', () => {
    // Hole 1: AB 3/6 vs CD 4/5 -> low ball AB, high ball CD (5<6): 1-1.
    const { result } = settle(PRESETS.highLow([['a', 'b'], ['c', 'd']]), P4, card(P4, [[3, 6, 4, 5]]), 1, holes18.slice(0, 1));
    expect(result.holes[0].points).toEqual([1, 1]);
  });

  it('daytona: bogey or worse flips the number', () => {
    // Par 4. AB 5,6 (bogey) -> 65. CD 4,7 -> 47. CD wins by 18.
    const { transfers } = settle(PRESETS.daytona([['a', 'b'], ['c', 'd']]), P4, card(P4, [[5, 6, 4, 7]]), 1, holes18.slice(0, 1));
    expect(balance(transfers)).toEqual({ a: -18, b: -18, c: 18, d: 18 });
  });

  it('wolfman: the lone score doubled against the other two added, against each opponent', () => {
    // Hole 1 lone a: 4*2=8 vs b+c 5+4=9 -> a wins. Hole 2 lone b: 5*2=10 vs a+c 5+4=9 -> field wins.
    const ids = ['a', 'b', 'c'];
    const { transfers } = settle(PRESETS.wolfman(ids), ids, card(ids, [[4, 5, 4], [5, 5, 4]]), 1, holes18.slice(0, 2));
    // a: +2 (hole 1) +1 (hole 2) ; b: -1 -2 ; c: -1 +1
    expect(balance(transfers)).toEqual({ a: 3, b: -3, c: 0 });
  });

  it('carryovers roll into the next decided hole; birdie wins double', () => {
    const spec: GameSpec = { ...PRESETS.bestBall([['a', 'b'], ['c', 'd']]), ties: 'carry', multipliers: [{ when: 'winner_birdie', factor: 2 }] };
    // Hole 1 tie (4 v 4) carries 1. Hole 2 (par 5) AB best 4 = birdie: (1+1)*2 = 4 points.
    const { result } = settle(spec, P4, card(P4, [[4, 5, 4, 6], [4, 6, 5, 5]]), 1, holes18.slice(0, 2));
    expect(result.holes.map(h => h.points)).toEqual([[0, 0], [4, 0]]);
  });

  it('a hole doubles: "18 is double"', () => {
    const spec: GameSpec = { ...PRESETS.skins(false), multipliers: [{ when: 'holes', holes: [2], factor: 2 }] };
    const { result } = settle(spec, ['a', 'b'], card(['a', 'b'], [[3, 4], [4, 5]]), 1, holes18.slice(0, 2));
    expect(result.byPlayer).toEqual({ a: 3, b: 0 });
  });

  it('nassau: front, back and total are separate matches', () => {
    // a wins holes 1-9, b wins 10-12 and halves the rest: a wins front + total, b wins back.
    const rows = Array.from({ length: 18 }, (_, i) => (i < 9 ? [3, 4] : i < 12 ? [5, 4] : [4, 4]));
    const { transfers, result } = settle(PRESETS.nassau(), ['a', 'b'], card(['a', 'b'], rows), 5);
    expect(result.segments.map(s => s.leaders)).toEqual([['a'], ['b'], ['a']]);
    expect(balance(transfers)).toEqual({ a: 5, b: -5 });
  });

  it('nassau where 18 counts double: winning 18 counts as two holes', () => {
    // a wins 1-9, b wins 10-18. Level on the total without the rule; with it b wins 10-9.
    const rows = Array.from({ length: 18 }, (_, i) => (i < 9 ? [3, 4] : [5, 4]));
    const spec = { ...PRESETS.nassau(), multipliers: [{ when: 'holes' as const, holes: [18], factor: 2 }] };
    const { transfers, result } = settle(spec, ['a', 'b'], card(['a', 'b'], rows), 5);
    expect(result.segments.map(s => s.leaders)).toEqual([['a'], ['b'], ['b']]);
    expect(balance(transfers)).toEqual({ a: -5, b: 5 });
  });

  it('match-style scoring keeps birdie doubles and carried ties', () => {
    const base = { ...PRESETS.skins(false), scoring: 'holes' as const };
    // Hole 1 (par 4): a birdies and wins -> worth 2 with birdies double. Everything else halved.
    const birdie = Array.from({ length: 18 }, (_, i) => (i === 0 ? [3, 4] : [4, 4]));
    const doubled = settle({ ...base, multipliers: [{ when: 'winner_birdie' as const, factor: 2 }] }, ['a', 'b'], card(['a', 'b'], birdie), 1);
    expect(balance(doubled.transfers)).toEqual({ a: 2, b: -2 });
    // Hole 1 halved and carried, a wins hole 2 (par 5) with a par: two holes.
    const carry = Array.from({ length: 18 }, (_, i) => (i === 1 ? [5, 6] : [4, 4]));
    const carried = settle({ ...base, ties: 'carry' as const }, ['a', 'b'], card(['a', 'b'], carry), 1);
    expect(carried.result.holes[1].points).toEqual([2, 0]);
  });

  it('sixes: each six-hole match is its own bet with new partners', () => {
    // a wins every hole with a 3; everyone else makes 5.
    const rows = Array.from({ length: 18 }, () => [3, 5, 5, 5]);
    const { transfers } = settle(PRESETS.sixes(P4), P4, card(P4, rows), 6);
    // a's side wins all three matches ($6 a man): a +18; b, c, d each win one (with a) and lose two: +6 -12 = -6.
    expect(balance(transfers)).toEqual({ a: 18, b: -6, c: -6, d: -6 });
  });

  it('quota: points against 36 minus handicap', () => {
    // 18 pars = 36 points each. a gets 10 strokes (quota 26) -> +10; b gets 0 (quota 36) -> 0.
    const ids = ['a', 'b'];
    const rows = holes18.map(h => [h.par, h.par]);
    const strokes = new Map([['a', new Map(holes18.slice(0, 10).map(h => [h.number, 1]))]]);
    const { result, transfers } = settle(PRESETS.quota(), ids, card(ids, rows), 1, holes18, strokes);
    expect(result.byPlayer).toEqual({ a: 10, b: 0 });
    expect(balance(transfers)).toEqual({ a: 10, b: -10 });
  });

  it('net scores use handicap strokes', () => {
    const strokes = new Map([['b', new Map([[1, 1]])]]);
    const { result } = settle(PRESETS.skins(false), ['a', 'b'], card(['a', 'b'], [[4, 4]]), 1, holes18.slice(0, 1), strokes);
    expect(result.byPlayer).toEqual({ a: 0, b: 1 });
  });

  it('a hole with a missing score is not scored yet', () => {
    const scores = card(P4, [[4, 4, 5, 5]]).filter(s => s.playerId !== 'd');
    const r = calculateCustomGame({ spec: PRESETS.lowTotal([['a', 'b'], ['c', 'd']]), playerIds: P4, scores, holeInfo: holes18.slice(0, 1) });
    expect(r.holesPlayed).toBe(0);
  });

  it('live view credits the leader of an unfinished bet; the final view waits', () => {
    const spec = PRESETS.nassau();
    const scores = card(['a', 'b'], [[3, 4]]);
    const result = calculateCustomGame({ spec, playerIds: ['a', 'b'], scores, holeInfo: holes18 });
    expect(balance(customGameTransfers(spec, result, ['a', 'b'], 5, false))).toEqual({ a: 10, b: -10 });
    expect(customGameTransfers(spec, result, ['a', 'b'], 5, true)).toEqual([]);
  });
});

describe('validation', () => {
  const ids = P4;
  const holes = holes18.map(h => h.number);
  it('accepts every preset', () => {
    expect(validateSpec(PRESETS.lowTotal([['a', 'b'], ['c', 'd']]), ids, holes)).toEqual([]);
  });
  it('catches teams that leave someone out or name a stranger', () => {
    expect(validateSpec(PRESETS.lowTotal([['a', 'b'], ['c']]), ids, holes)).toContain('Teams: every player needs a team');
    expect(validateSpec(PRESETS.lowTotal([['a', 'b'], ['c', 'x']]), ids, holes).join()).toMatch(/isn't in this round/);
  });
  it('catches Vegas numbers with three players a side, and bad multipliers', () => {
    const spec: GameSpec = { ...PRESETS.daytona([['a', 'b', 'c'], ['d']]), multipliers: [{ when: 'holes', holes: [19], factor: 2 }] };
    const issues = validateSpec(spec, ids, holes).join(' | ');
    expect(issues).toMatch(/two players a side/);
    expect(issues).toMatch(/not on this course/);
  });
  it('catches rotations that skip holes', () => {
    const spec = PRESETS.sixes(ids);
    if (spec.sides.kind === 'rotating_teams') spec.sides.rotations[1].from = 8;
    expect(validateSpec(spec, ids, holes).join()).toMatch(/cover every hole/);
  });
});

describe('plain-English rules', () => {
  it('says the low total game back the way golfers say it', () => {
    const lines = describeSpec(PRESETS.lowTotal([['a', 'b'], ['c', 'd']]), id => ({ a: 'Sam', b: 'Jack', c: 'Jim', d: 'Tim' })[id]!, 5);
    expect(lines).toEqual([
      'Sam & Jack vs Jim & Tim',
      'Each hole: 1 point for the low team total',
      'Tied holes are halved',
      '$5 a point, a man, settled between every pair',
      'Net scores',
    ]);
  });
});
