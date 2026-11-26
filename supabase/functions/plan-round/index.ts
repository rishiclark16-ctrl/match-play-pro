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
import { PLAN_SCHEMA, SYSTEM, userContent as buildUserContent } from "../_shared/planRoundPrompt.ts";
import { finalizePlan } from "./validate.ts";

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
        console.error("plan-round: model call failed", inner instanceof Anthropic.APIError ? `${inner.status} ${inner.message.slice(0, 300)}` : String(inner));
        return json({ error: "model_error" }, 502);
      }
    } else {
      console.error("plan-round: model call failed", err instanceof Anthropic.APIError ? `${err.status} ${err.message.slice(0, 300)}` : String(err));
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
  const caps = Array.isArray(body.capabilities) ? body.capabilities : [];
  const final = finalizePlan(parsed, caps);
  if (!final.ok) {
    console.error("plan-round: schema mismatch", final.reason);
    return json({ error: "model_error" }, 502);
  }
  console.log(`plan-round ok ${Date.now() - started}ms`);
  return json({ plan: final.plan });
});
