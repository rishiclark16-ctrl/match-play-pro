/**
 * Custom games: a declarative rule set ("GameSpec") that the AI round builder can
 * compose for almost any stroke-based golf game, and a pure engine that scores it.
 *
 * The building blocks:
 *  - sides      who plays whom: everyone for themselves, fixed teams, partners that
 *               rotate by holes, or a rotating one-against-the-field.
 *  - contests   how points are won on each hole: low score wins, finish order earns a
 *               table of points, points for score against par, or the stroke difference.
 *  - metric     how a side's number on a hole is formed: its best ball, worst ball,
 *               total, a Vegas or Daytona two-digit number.
 *  - ties, multipliers, segments (front / back / total, six-hole matches) and payout.
 *
 * Everything a golfer sees about a custom game is generated from the spec
 * (describe.ts), so what they confirm on the review screen is exactly what is scored.
 * Player references are player ids once a round exists (names while planning).
 */

/** How a side's number on a hole is formed from its players' scores. */
export type SideMetric =
  | 'score'   // a one-player side's own score
  | 'best'    // the side's lowest score ("low ball", "best ball")
  | 'worst'   // the side's highest score ("high ball")
  | 'total'   // all the side's scores added ("low total", "aggregate")
  | 'vegas'   // two scores as a two-digit number, low digit first (4 and 5 make 45)
  | 'daytona'; // like vegas, but high digit first when the low score is bogey or worse

export type SidesSpec =
  /** Everyone plays for themselves. */
  | { kind: 'individual' }
  /** Fixed teams for the whole round. */
  | { kind: 'teams'; teams: string[][] }
  /** Teams that change by hole range (Sixes / Round Robin). Ranges must cover the round. */
  | { kind: 'rotating_teams'; rotations: { from: number; to: number; teams: string[][] }[] }
  /**
   * One player against the rest, rotating every hole in `order` (Defender, Wolfman).
   * The lone player's score is multiplied by `loneWeight` (Wolfman doubles it); the
   * field's number is its `fieldMetric`.
   */
  | { kind: 'one_vs_field'; order: string[]; loneWeight: number; fieldMetric: 'best' | 'total' };

/** Points for a score relative to par (Stableford, Quota, birdie points). */
export interface ParTable {
  albatross: number;
  eagle: number;
  birdie: number;
  par: number;
  bogey: number;
  double: number;
  /** Triple bogey or worse. */
  worse: number;
}

export type ContestSpec =
  /** The side with the lowest metric takes `points`. Ties follow the game's `ties` rule. */
  | { kind: 'low_wins'; metric: SideMetric; points: number }
  /** Points by finish order among the sides (Nines 5-3-1, Split Sixes 4-2-0). */
  | { kind: 'rank'; metric: SideMetric; table: number[]; ties: 'share' | 'void' }
  /** Each side scores points from the table for its metric against par. */
  | { kind: 'vs_par'; metric: SideMetric; table: ParTable }
  /** Points are minus the metric, so money follows the stroke (or Vegas number) difference. */
  | { kind: 'diff'; metric: SideMetric };

export interface MultiplierSpec {
  /**
   * winner_birdie: a low_wins contest won with a gross birdie or better.
   * any_birdie: anyone made a gross birdie or better on the hole.
   * par3 / par5: the hole's par. holes: the listed hole numbers ("18 is double").
   */
  when: 'winner_birdie' | 'any_birdie' | 'par3' | 'par5' | 'holes';
  holes?: number[];
  factor: number;
}

export interface SegmentSpec {
  from: number;
  to: number;
  label: string;
}

export interface GameSpec {
  version: 1;
  /** What the golfer called it ("Daytona", "High-low", "Our usual"). */
  name: string;
  sides: SidesSpec;
  contests: ContestSpec[];
  /** low_wins ties: 'halve' (nobody scores) or 'carry' (the points roll to the next hole). */
  ties: 'halve' | 'carry';
  multipliers: MultiplierSpec[];
  /** Separate bets over hole ranges. Empty means one bet over the whole round. */
  segments: SegmentSpec[];
  /**
   * points: each hole's points count. holes: each hole is won by the side with the
   * most points on it (match play), and holes won are what count.
   */
  scoring: 'points' | 'holes';
  /**
   * per_point: every point (or hole) is worth the stake, settled between every pair of sides.
   * per_segment: each segment's winner collects the stake from every other side.
   */
  payout: 'per_point' | 'per_segment';
  /**
   * per_man: a losing player pays the amount once, shared by the winning side ("$5 a man").
   * each_opponent: every losing player pays every winning player the amount (1-vs-field games).
   */
  money: 'per_man' | 'each_opponent';
  /** Net scores (handicap strokes) or gross. */
  net: boolean;
  /** Quota: each player's points are measured against 36 minus their handicap (scaled to holes). */
  quota: boolean;
}

export interface Transfer {
  from: string;
  to: string;
  amount: number;
}

export interface CustomHoleResult {
  hole: number;
  /** False when a score the game needs is missing; nothing is scored. */
  played: boolean;
  /** The sides on this hole (player ids) and the points each took. */
  sides: string[][];
  points: number[];
  /** Points rolling into the next hole from tied low_wins contests. */
  carried: number;
  multiplier: number;
}

export interface CustomSegmentResult {
  label: string;
  from: number;
  to: number;
  /** Points (or holes won) per player in this segment. */
  byPlayer: Record<string, number>;
  /** Player ids on the winning side, if the segment is decided and one side leads outright. */
  leaders: string[];
  complete: boolean;
}

export interface CustomGameResult {
  holes: CustomHoleResult[];
  /** Total points (or holes won) per player over the round. */
  byPlayer: Record<string, number>;
  segments: CustomSegmentResult[];
  holesPlayed: number;
}
