// Checks the model's plan after the API, independent of its schema enforcement, and turns
// it into the app's RoundPlan. Shared by plan-round and plan-round-eval, so the eval runs
// exactly what production runs.
//
// Bounds keep a confused or adversarial plan from reaching the engine; the app's own
// validator (src/lib/games/custom/validate.ts) checks the rules themselves.
import { z } from "npm:zod@3.25.76";
import { GAME_TYPES, METRICS, TEAM_SCORING, wireToPlan } from "../_shared/planRoundPrompt.ts";

const Name = z.string().min(1).max(60);
const Hole = z.number().int().min(1).max(18);
const Teams = z.array(z.array(Name).min(1).max(4)).min(2).max(8);
const Holes = z.array(Hole).max(18);

/** One custom game, after JSON.parse of its customGames string. */
export const CustomZ = z.object({
  name: z.string().max(60),
  stake: z.number().nonnegative().max(100000),
  stakeSaid: z.boolean(),
  sides: z.object({
    kind: z.enum(["individual", "teams", "rotating_teams", "one_vs_field"]),
    teams: z.array(z.array(Name).min(1).max(4)).max(8),
    rotations: z.array(z.object({ from: Hole, to: Hole, teams: Teams })).max(18),
    order: z.array(Name).max(12),
    loneWeight: z.number().min(0.5).max(10),
    fieldMetric: z.enum(["best", "total"]),
  }),
  contests: z.array(z.object({
    kind: z.enum(["low_wins", "rank", "vs_par", "diff"]),
    metric: z.enum(METRICS),
    points: z.number().min(0).max(100),
    table: z.array(z.number().min(-100).max(100)).max(12),
    ties: z.enum(["share", "void"]),
    parTable: z.object({
      albatross: z.number(), eagle: z.number(), birdie: z.number(), par: z.number(),
      bogey: z.number(), double: z.number(), worse: z.number(),
    }),
  })).min(1).max(6),
  ties: z.enum(["halve", "carry"]),
  multipliers: z.array(z.object({
    when: z.enum(["winner_birdie", "any_birdie", "par3", "par5", "holes"]),
    holes: Holes,
    factor: z.number().min(0.5).max(10),
  })).max(6),
  segments: z.array(z.object({ from: Hole, to: Hole, label: z.string().max(30) })).max(6),
  scoring: z.enum(["points", "holes"]),
  payout: z.enum(["per_point", "per_segment"]),
  money: z.enum(["per_man", "each_opponent", "default"]),
  net: z.enum(["net", "gross", "unsaid"]),
  quota: z.boolean(),
});

const PlanZ = z.object({
  course: z.object({
    query: z.string().max(120).nullable(),
    tee: z.string().max(40).nullable(),
    holes: z.union([z.literal(9), z.literal(18)]).nullable(),
    nine: z.enum(["front", "back"]).nullable(),
  }),
  players: z.array(z.object({ name: z.string().min(1).max(60), handicap: z.number().min(-10).max(54).nullable() })).max(12),
  userPlaying: z.boolean(),
  userHandicap: z.number().min(-10).max(54).nullable(),
  games: z.array(z.object({
    type: z.enum(GAME_TYPES).refine(t => t !== "custom", "custom games go in customGames"),
    stake: z.number().nonnegative().max(100000).nullable(),
    carryover: z.boolean().nullable(),
    autoPress: z.boolean().nullable(),
    modified: z.boolean().nullable(),
    teams: z.array(z.array(z.string().max(60)).max(4)).max(2).nullable()
      .transform(t => (t ? [t[0] ?? [], t[1] ?? []] as [string[], string[]] : null)),
    teamScoring: z.enum(TEAM_SCORING).nullable(),
    perHole: z.boolean().nullable(),
  })).max(8),
  // Each custom game is a JSON string (see PLAN_SCHEMA), checked one by one below.
  customGames: z.array(z.string().max(8000)).max(4),
  handicaps: z.object({ mode: z.enum(["full", "none", "percent"]), percent: z.number().nullable() }).nullable(),
  unsupported: z.array(z.string().max(120)).max(10),
});

export type FinalPlan = {
  games: { type: string; custom: { name?: string } | null }[];
  unsupported: string[];
} & Record<string, unknown>;

/**
 * The model's parsed JSON -> the app's RoundPlan, or the reason it can't be used.
 * A custom game that doesn't parse or fails its bounds is named in `unsupported`
 * (never dropped silently); the rest of the plan still goes through.
 */
export function finalizePlan(parsed: unknown, capabilities: unknown[]): { ok: true; plan: FinalPlan } | { ok: false; reason: string } {
  const plan = PlanZ.safeParse(parsed);
  if (!plan.success) return { ok: false, reason: JSON.stringify(plan.error.issues.slice(0, 3)) };

  const unsupported = [...plan.data.unsupported];
  const custom: z.infer<typeof CustomZ>[] = [];
  for (const raw of plan.data.customGames) {
    let obj: unknown;
    try {
      obj = JSON.parse(raw);
    } catch {
      obj = null;
    }
    const c = CustomZ.safeParse(obj);
    if (c.success) {
      custom.push(c.data);
    } else {
      const name = obj && typeof obj === "object" && typeof (obj as { name?: unknown }).name === "string"
        ? (obj as { name: string }).name.slice(0, 60) : "a custom game";
      console.error("plan-round: custom game rejected", c.error.issues.slice(0, 3));
      unsupported.push(`${name} (couldn't set it up)`);
    }
  }

  // The model's customGames become ordinary games of type "custom" for the app.
  const result = wireToPlan({ ...plan.data, customGames: custom, unsupported }) as FinalPlan;
  // Apps from before custom games can't play them (and their planner doesn't know the
  // type): name the game as not set up instead.
  if (!capabilities.includes("custom")) {
    for (const g of result.games.filter(g => g.type === "custom")) {
      result.unsupported.push(g.custom?.name ? `${g.custom.name} (update the app to play it)` : "a custom game (update the app)");
    }
    result.games = result.games.filter(g => g.type !== "custom");
  }
  return { ok: true, plan: result };
}
