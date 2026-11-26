// plan-round: turns a spoken round setup into a RoundPlan.
//
// "Sonoma Golf Club from the blues with Jack, Jim and Tim, skins $5 a hole"
//   -> { course: { query: "Sonoma Golf Club", tee: "blues", ... }, players: [...], games: [...] }
//
// The model only extracts what was said. It never sees or returns database ids:
// the app matches names to friends, finds the course and validates every game
// (src/lib/roundPlan). Amounts the speaker didn't say are rejected client-side.
//
// The prompt, schema and game glossary live in ../_shared/planRoundPrompt.ts (shared
// with the eval suite); the glossary is built from ../_shared/golfGames.ts.
import { createClient } from "npm:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk@1.12.0";
import { z } from "npm:zod@3.25.76";
import { GAME_TYPES, METRICS, PLAN_SCHEMA, SYSTEM, TEAM_SCORING, userContent as buildUserContent, wireToPlan } from "../_shared/planRoundPrompt.ts";

const MODEL = "claude-opus-5-5";
const MAX_TEXT = 1000;
const MAX_FRIENDS = 300;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

// ── Per-user rate limit (warm instance) ──
const hits = new Map<string, number[]>();
function limited(userId: string): boolean {
  const now = Date.now();
  const recent = (hits.get(userId) ?? []).filter(t => now - t < 60_000);
  recent.push(now);
  hits.set(userId, recent);
  return recent.length > 20;
}

// Validation after the model, independent of the API's schema enforcement.
// Bounds keep a confused or adversarial plan from reaching the engine; the app's
// own validator (src/lib/games/custom/validate.ts) checks the rules themselves.
const Name = z.string().min(1).max(60);
const Hole = z.number().int().min(1).max(18);
const Teams = z.array(z.array(Name).min(1).max(4)).min(2).max(8);
const Holes = z.array(Hole).max(18);
const CustomZ = z.object({
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
  customGames: z.array(CustomZ).max(4),
  handicaps: z.object({ mode: z.enum(["full", "none", "percent"]), percent: z.number().nullable() }).nullable(),
  unsupported: z.array(z.string().max(120)).max(10),
});

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "unauthorized" }, 401);
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return json({ error: "unauthorized" }, 401);
  if (limited(user.id)) return json({ error: "rate_limited" }, 429);

  let body: { text?: unknown; friends?: unknown; capabilities?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  const text = typeof body.text === "string" ? body.text.trim().slice(0, MAX_TEXT) : "";
  if (text.length < 3) return json({ error: "empty" }, 400);
  const friends = Array.isArray(body.friends)
    ? body.friends.filter((f): f is string => typeof f === "string").map(f => f.slice(0, 60)).slice(0, MAX_FRIENDS)
    : [];

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json({ error: "not_configured" }, 503);
  const client = new Anthropic({ apiKey, timeout: 25_000, maxRetries: 1 });

  const userContent = buildUserContent(text, friends);
  const request: Anthropic.MessageCreateParamsNonStreaming = {
    model: MODEL,
    max_tokens: 4096,
    // The instructions and glossary are identical on every call: cache them.
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    output_config: { effort: "low", format: { type: "json_schema", schema: PLAN_SCHEMA as unknown as Record<string, unknown> } },
    messages: [{ role: "user", content: userContent }],
  };

  const started = Date.now();
  let message: { stop_reason: string | null; content: { type: string; text?: string }[] };
  try {
    // Server-side fallback reroutes a rare policy decline to another model inside the same call.
    message = await client.beta.messages.create({
      ...(request as Anthropic.Beta.MessageCreateParamsNonStreaming),
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });
  } catch (err) {
    if (err instanceof Anthropic.BadRequestError) {
      // If the fallback beta is ever rejected, the plain request still works.
      try {
        message = await client.messages.create(request);
      } catch (inner) {
        console.error("plan-round: model call failed", inner instanceof Anthropic.APIError ? inner.status : String(inner));
        return json({ error: "model_error" }, 502);
      }
    } else {
      console.error("plan-round: model call failed", err instanceof Anthropic.APIError ? err.status : String(err));
      return json({ error: "model_error" }, 502);
    }
  }

  const msg = message;
  if (msg.stop_reason === "refusal" || msg.stop_reason === "max_tokens") {
    console.error("plan-round: stop_reason", msg.stop_reason);
    return json({ error: "model_error" }, 502);
  }
  const out = msg.content.find(b => b.type === "text")?.text ?? "";
  let parsed: unknown;
  try {
    parsed = JSON.parse(out);
  } catch {
    console.error("plan-round: non-JSON output");
    return json({ error: "model_error" }, 502);
  }
  const plan = PlanZ.safeParse(parsed);
  if (!plan.success) {
    console.error("plan-round: schema mismatch", plan.error.issues.slice(0, 3));
    return json({ error: "model_error" }, 502);
  }
  // Apps from before custom games can't play them (and their planner doesn't know the
  // type): name the game as not set up instead.
  const caps = Array.isArray(body.capabilities) ? body.capabilities : [];
  // The model's customGames become ordinary games of type "custom" for the app.
  const result = wireToPlan(plan.data) as {
    games: { type: string; custom: { name?: string } | null }[];
    unsupported: string[];
  };
  if (!caps.includes("custom")) {
    for (const g of result.games.filter(g => g.type === "custom")) {
      result.unsupported.push(g.custom?.name ? `${g.custom.name} (update the app to play it)` : "a custom game (update the app)");
    }
    result.games = result.games.filter(g => g.type !== "custom");
  }
  console.log(`plan-round ok ${Date.now() - started}ms`);
  return json({ plan: result });
});
