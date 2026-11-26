// Worked custom-game examples for the plan-round prompt: what a golfer says and the
// custom block the planner should write. Pure data (loaded by Deno and bun).
// src/lib/roundPlan/customExamples.test.ts resolves every example through the app's
// resolver and validator, so the model is only ever shown rules the engine can score.

const SIDES_NONE = { teams: null, rotations: null, order: null, loneWeight: null, fieldMetric: null };
const C = { points: null, table: null, ties: null, parTable: null };
const BASE = { ties: "halve", multipliers: [], segments: [], scoring: "points", payout: "per_point", money: null, net: null, quota: false };
const STABLEFORD = { albatross: 5, eagle: 4, birdie: 3, par: 2, bogey: 1, double: 0, worse: 0 };

export interface CustomExample {
  said: string;
  /** The other players named in `said`, in order (the speaker is "me"). */
  players: string[];
  custom: Record<string, unknown>;
}

export const CUSTOM_EXAMPLES: CustomExample[] = [
  {
    said: "Daytona, me and Jack vs Jim and Tim, a quarter a point",
    players: ["Jack", "Jim", "Tim"],
    custom: { name: "Daytona", sides: { ...SIDES_NONE, kind: "teams", teams: [["me", "Jack"], ["Jim", "Tim"]] },
      contests: [{ ...C, kind: "diff", metric: "daytona" }], ...BASE },
  },
  {
    said: "Me and Jack vs Jim and Tim, a point for low ball and a point for high ball, a buck a point",
    players: ["Jack", "Jim", "Tim"],
    custom: { name: "High-low", sides: { ...SIDES_NONE, kind: "teams", teams: [["me", "Jack"], ["Jim", "Tim"]] },
      contests: [{ ...C, kind: "low_wins", metric: "best", points: 1 }, { ...C, kind: "low_wins", metric: "worst", points: 1 }], ...BASE },
  },
  {
    said: "Split sixes with Jack and Jim, a dollar a point",
    players: ["Jack", "Jim"],
    custom: { name: "Split Sixes", sides: { ...SIDES_NONE, kind: "individual" },
      contests: [{ ...C, kind: "rank", metric: "score", table: [4, 2, 0], ties: "share" }], ...BASE },
  },
  {
    said: "Acey deucey with Jack, Jim and Tim, a dollar",
    players: ["Jack", "Jim", "Tim"],
    custom: { name: "Acey Deucey", sides: { ...SIDES_NONE, kind: "individual" },
      contests: [{ ...C, kind: "rank", metric: "score", table: [1, 0, 0, -1], ties: "void" }], ...BASE },
  },
  {
    said: "A dollar a stroke with Jack, gross",
    players: ["Jack"],
    custom: { name: "Dollar a stroke", sides: { ...SIDES_NONE, kind: "individual" },
      contests: [{ ...C, kind: "diff", metric: "score" }], ...BASE, net: false },
  },
  {
    said: "Low net takes $20 from everyone, with Jack and Jim",
    players: ["Jack", "Jim"],
    custom: { name: "Low net", sides: { ...SIDES_NONE, kind: "individual" },
      contests: [{ ...C, kind: "diff", metric: "score" }], ...BASE, payout: "per_segment", net: true },
  },
  {
    said: "Skins with Jack, Jim and Tim, ties carry, birdies count double and 18 is double",
    players: ["Jack", "Jim", "Tim"],
    custom: { name: "Skins", sides: { ...SIDES_NONE, kind: "individual" },
      contests: [{ ...C, kind: "low_wins", metric: "score", points: 1 }], ...BASE, ties: "carry",
      multipliers: [{ when: "winner_birdie", holes: null, factor: 2 }, { when: "holes", holes: [18], factor: 2 }] },
  },
  {
    said: "Wolfman with Jack and Jim",
    players: ["Jack", "Jim"],
    custom: { name: "Wolfman", sides: { ...SIDES_NONE, kind: "one_vs_field", order: ["me", "Jack", "Jim"], loneWeight: 2, fieldMetric: "total" },
      contests: [{ ...C, kind: "low_wins", metric: "score", points: 1 }], ...BASE, money: "each_opponent" },
  },
  {
    said: "The quota game with Jack and Tim",
    players: ["Jack", "Tim"],
    custom: { name: "Quota", sides: { ...SIDES_NONE, kind: "individual" },
      contests: [{ ...C, kind: "vs_par", metric: "score", parTable: { albatross: 8, eagle: 8, birdie: 4, par: 2, bogey: 1, double: 0, worse: 0 } }],
      ...BASE, net: false, quota: true },
  },
  {
    said: "Team stableford, me and Jack vs Jim and Tim, both scores count, $1 a point",
    players: ["Jack", "Jim", "Tim"],
    custom: { name: "Team Stableford", sides: { ...SIDES_NONE, kind: "teams", teams: [["me", "Jack"], ["Jim", "Tim"]] },
      contests: [{ ...C, kind: "vs_par", metric: "total", parTable: STABLEFORD }], ...BASE },
  },
  {
    said: "Me, Jack, Jim and Tim, switch partners every six, low total wins the hole, $5 a man per six",
    players: ["Jack", "Jim", "Tim"],
    custom: { name: "Low total sixes",
      sides: { ...SIDES_NONE, kind: "rotating_teams", rotations: [
        { from: 1, to: 6, teams: [["me", "Jack"], ["Jim", "Tim"]] },
        { from: 7, to: 12, teams: [["me", "Jim"], ["Jack", "Tim"]] },
        { from: 13, to: 18, teams: [["me", "Tim"], ["Jack", "Jim"]] },
      ] },
      contests: [{ ...C, kind: "low_wins", metric: "total", points: 1 }], ...BASE,
      scoring: "holes", payout: "per_segment", money: "per_man",
      segments: [{ from: 1, to: 6, label: "Holes 1–6" }, { from: 7, to: 12, label: "Holes 7–12" }, { from: 13, to: 18, label: "Holes 13–18" }] },
  },
  {
    said: "Nassau with Jack but 18 counts double, $10",
    players: ["Jack"],
    custom: { name: "Nassau", sides: { ...SIDES_NONE, kind: "individual" },
      contests: [{ ...C, kind: "low_wins", metric: "score", points: 1 }], ...BASE,
      multipliers: [{ when: "holes", holes: [18], factor: 2 }], scoring: "holes", payout: "per_segment",
      segments: [{ from: 1, to: 9, label: "Front" }, { from: 10, to: 18, label: "Back" }, { from: 1, to: 18, label: "Total" }] },
  },
];
