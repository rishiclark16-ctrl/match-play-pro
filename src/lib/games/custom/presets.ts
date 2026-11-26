/**
 * Known games written as custom specs. They are the worked examples for the AI
 * planner, and the engine tests check each against hand-computed results (and,
 * where the app already has a dedicated calculator, against that calculator).
 */
import type { GameSpec, ParTable } from './types';

const base = (name: string): Omit<GameSpec, 'sides' | 'contests'> => ({
  version: 1, name, ties: 'halve', multipliers: [], segments: [], scoring: 'points',
  payout: 'per_point', money: 'per_man', net: true, quota: false,
});

export const STABLEFORD_TABLE: ParTable = { albatross: 5, eagle: 4, birdie: 3, par: 2, bogey: 1, double: 0, worse: 0 };
export const QUOTA_TABLE: ParTable = { albatross: 8, eagle: 8, birdie: 4, par: 2, bogey: 1, double: 0, worse: 0 };
export const FRONT_BACK_TOTAL = [
  { from: 1, to: 9, label: 'Front' }, { from: 10, to: 18, label: 'Back' }, { from: 1, to: 18, label: 'Total' },
];

export const PRESETS = {
  /** Skins: outright low score takes a point from everyone. */
  skins: (carry: boolean): GameSpec => ({
    ...base('Skins'), sides: { kind: 'individual' }, ties: carry ? 'carry' : 'halve',
    contests: [{ kind: 'low_wins', metric: 'score', points: 1 }],
  }),
  /** Nines (5-3-1), three players. */
  nines: (): GameSpec => ({
    ...base('Nines'), sides: { kind: 'individual' },
    contests: [{ kind: 'rank', metric: 'score', table: [5, 3, 1], ties: 'share' }],
  }),
  /** Split Sixes (4-2-0), three players. */
  splitSixes: (): GameSpec => ({
    ...base('Split Sixes'), sides: { kind: 'individual' },
    contests: [{ kind: 'rank', metric: 'score', table: [4, 2, 0], ties: 'share' }],
  }),
  /** Acey Deucey: outright low collects from everyone, outright high pays everyone. */
  aceyDeucey: (): GameSpec => ({
    ...base('Acey Deucey'), sides: { kind: 'individual' },
    contests: [{ kind: 'rank', metric: 'score', table: [1, 0, 0, -1], ties: 'void' }],
  }),
  /** Dollar a stroke: the total stroke difference between each pair. */
  dollarAStroke: (): GameSpec => ({
    ...base('Dollar a stroke'), sides: { kind: 'individual' },
    contests: [{ kind: 'diff', metric: 'score' }],
  }),
  /** Medal: lowest total wins the stake from everyone. */
  medal: (): GameSpec => ({
    ...base('Low net'), sides: { kind: 'individual' }, payout: 'per_segment',
    contests: [{ kind: 'diff', metric: 'score' }],
  }),
  /** Stableford points, settled per point between players. */
  stablefordBet: (): GameSpec => ({
    ...base('Stableford'), sides: { kind: 'individual' },
    contests: [{ kind: 'vs_par', metric: 'score', table: STABLEFORD_TABLE }],
  }),
  /** Quota (Chicago): gross points against 36 minus handicap. */
  quota: (): GameSpec => ({
    ...base('Quota'), sides: { kind: 'individual' }, net: false, quota: true,
    contests: [{ kind: 'vs_par', metric: 'score', table: QUOTA_TABLE }],
  }),
  /** Nassau between individuals: a match on the front, the back and the 18. */
  nassau: (): GameSpec => ({
    ...base('Nassau'), sides: { kind: 'individual' }, scoring: 'holes', payout: 'per_segment', segments: FRONT_BACK_TOTAL,
    contests: [{ kind: 'low_wins', metric: 'score', points: 1 }],
  }),
  /** Best ball (four-ball) per hole between fixed teams. */
  bestBall: (teams: string[][]): GameSpec => ({
    ...base('Best ball'), sides: { kind: 'teams', teams },
    contests: [{ kind: 'low_wins', metric: 'best', points: 1 }],
  }),
  /** Low total (aggregate) per hole. */
  lowTotal: (teams: string[][]): GameSpec => ({
    ...base('Low total'), sides: { kind: 'teams', teams },
    contests: [{ kind: 'low_wins', metric: 'total', points: 1 }],
  }),
  /** Low ball, low total: a point each. */
  lowBallLowTotal: (teams: string[][]): GameSpec => ({
    ...base('Low ball, low total'), sides: { kind: 'teams', teams },
    contests: [{ kind: 'low_wins', metric: 'best', points: 1 }, { kind: 'low_wins', metric: 'total', points: 1 }],
  }),
  /** High-low: low ball vs low ball and high ball vs high ball. */
  highLow: (teams: string[][]): GameSpec => ({
    ...base('High-low'), sides: { kind: 'teams', teams },
    contests: [{ kind: 'low_wins', metric: 'best', points: 1 }, { kind: 'low_wins', metric: 'worst', points: 1 }],
  }),
  /** Daytona: Vegas numbers, high digit first when the team's low score is bogey or worse. */
  daytona: (teams: string[][]): GameSpec => ({
    ...base('Daytona'), sides: { kind: 'teams', teams },
    contests: [{ kind: 'diff', metric: 'daytona' }],
  }),
  /** Wolfman: the lone player's score doubled against the other two added; the lone player wins or loses against each. */
  wolfman: (order: string[]): GameSpec => ({
    ...base('Wolfman'), sides: { kind: 'one_vs_field', order, loneWeight: 2, fieldMetric: 'total' }, money: 'each_opponent',
    contests: [{ kind: 'low_wins', metric: 'score', points: 1 }],
  }),
  /** Sixes: three six-hole best-ball matches, partners rotating. */
  sixes: ([a, b, c, d]: string[]): GameSpec => ({
    ...base('Sixes'), scoring: 'holes', payout: 'per_segment',
    sides: { kind: 'rotating_teams', rotations: [
      { from: 1, to: 6, teams: [[a, b], [c, d]] },
      { from: 7, to: 12, teams: [[a, c], [b, d]] },
      { from: 13, to: 18, teams: [[a, d], [b, c]] },
    ] },
    segments: [{ from: 1, to: 6, label: 'Holes 1–6' }, { from: 7, to: 12, label: 'Holes 7–12' }, { from: 13, to: 18, label: 'Holes 13–18' }],
    contests: [{ kind: 'low_wins', metric: 'best', points: 1 }],
  }),
};
