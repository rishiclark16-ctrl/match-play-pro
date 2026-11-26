/**
 * "Say it and play" round builder (3.1).
 *
 * A golfer says something like "Sonoma Golf Club from the blues with Jack, Jim and
 * Tim, skins $5 a hole". That sentence becomes a RoundPlan (what was said), which
 * the resolver turns into a RoundDraft (real course, tee, players and games), which
 * becomes a round.
 *
 * Trust boundary: the plan may come from an AI model, so it carries only words
 * (names, course text, numbers). It never carries database ids. Every id in a
 * draft comes from deterministic matching against the user's own data.
 */

export const PLAN_GAME_TYPES = [
  'skins', 'nassau', 'match', 'stableford', 'bestball',
  'wolf', 'vegas', 'nines', 'defender', 'sixes', 'custom',
] as const;
export type PlanGameType = typeof PLAN_GAME_TYPES[number];

export interface PlanPlayer {
  /** The name as said ("Jack", "Big Mike", "Tim S"). */
  name: string;
  /** Handicap stated in the sentence, if any ("Jim's an 8"). */
  handicap: number | null;
}

export interface PlanGame {
  type: PlanGameType;
  /**
   * Dollars in the game's natural unit: per skin (skins), per side (nassau),
   * on the match (match play), per point (wolf, vegas, nines, defender, sixes).
   * Null when no amount was said.
   */
  stake: number | null;
  carryover: boolean | null;
  autoPress: boolean | null;
  /** Stableford: modified (negative points) scoring. */
  modified: boolean | null;
  /** Two teams of player names, for match play fourball / best ball. */
  teams: [string[], string[]] | null;
  /**
   * Team match only: how a team's hole score is formed. 'best' = better ball,
   * 'aggregate' = partners' scores added ("low total"), 'best_and_aggregate' =
   * a point for each ("low ball, low total"). Null when not said.
   */
  teamScoring: 'best' | 'aggregate' | 'best_and_aggregate' | null;
  /** Match only: the stake is per hole (or point) up rather than on the match. */
  perHole: boolean | null;
  /** type 'custom' only: the rules, composed from the custom game building blocks. */
  custom: PlanCustomSpec | null;
}

/**
 * A custom game as the planner writes it: the GameSpec building blocks
 * (src/lib/games/custom/types.ts) with players named as said ("me", "Jack"),
 * flattened so every field is always present. The resolver maps names to players
 * and validates the result before anyone can tee off.
 */
export interface PlanCustomSpec {
  name: string;
  sides: {
    kind: 'individual' | 'teams' | 'rotating_teams' | 'one_vs_field';
    teams: string[][] | null;
    rotations: { from: number; to: number; teams: string[][] }[] | null;
    order: string[] | null;
    loneWeight: number | null;
    fieldMetric: 'best' | 'total' | null;
  };
  contests: {
    kind: 'low_wins' | 'rank' | 'vs_par' | 'diff';
    metric: 'score' | 'best' | 'worst' | 'total' | 'vegas' | 'daytona';
    points: number | null;
    table: number[] | null;
    ties: 'share' | 'void' | null;
    parTable: { albatross: number; eagle: number; birdie: number; par: number; bogey: number; double: number; worse: number } | null;
  }[];
  ties: 'halve' | 'carry';
  multipliers: { when: 'winner_birdie' | 'any_birdie' | 'par3' | 'par5' | 'holes'; holes: number[] | null; factor: number }[];
  segments: { from: number; to: number; label: string }[];
  scoring: 'points' | 'holes';
  payout: 'per_point' | 'per_segment';
  money: 'per_man' | 'each_opponent' | null;
  net: boolean | null;
  quota: boolean;
}

export interface RoundPlan {
  course: {
    /** Course as said ("Sonoma Golf Club", "the muni", "Pebble"). */
    query: string | null;
    /** Tee as said ("blues", "tips", "whites", "II"). */
    tee: string | null;
    holes: 9 | 18 | null;
    /** For a 9-hole round: which nine. */
    nine: 'front' | 'back' | null;
  };
  /** Other players, never including the speaker. */
  players: PlanPlayer[];
  /** False only when the speaker says they are not playing (keeping score for others). */
  userPlaying: boolean;
  /** The speaker's own handicap if they said it. */
  userHandicap: number | null;
  games: PlanGame[];
  /** 'full' (default), 'none' (gross / scratch), or a percentage of full handicap. */
  handicaps: { mode: 'full' | 'none' | 'percent'; percent: number | null } | null;
  /** Things the speaker asked for that MATCH cannot set up. Shown, never dropped silently. */
  unsupported: string[];
}

export type PlanSource = 'ai' | 'local';

// ── Draft: the resolved, reviewable round ───────────────────────────────────

export type DraftPlayerKind = 'you' | 'friend' | 'guest';

export interface DraftPlayer {
  /** Local id, stable within the draft (teams reference it). */
  key: string;
  name: string;
  kind: DraftPlayerKind;
  profileId: string | null;
  handicap: number | null;
  /** Name as said, when it differs from the matched friend's name. */
  saidAs: string | null;
  /** Exactly what was said for this player ("" for the user). Key for review overrides. */
  spoken: string;
  /** Other friends this name could have meant; the user can switch. */
  alternatives: { profileId: string; name: string; handicap: number | null }[];
}

/** Something the resolver decided on the user's behalf. Shown as a tappable chip. */
export interface DraftAssumption {
  field: 'course' | 'tee' | 'holes' | 'players' | 'games' | 'handicaps';
  message: string;
}

/** Something that must be fixed before the round can start. */
export interface DraftIssue {
  field: 'course' | 'tee' | 'players' | 'games';
  message: string;
}
