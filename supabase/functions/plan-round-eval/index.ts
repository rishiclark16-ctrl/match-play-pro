// plan-round-eval: runs the plan-round prompt for the eval suite (evals/round-plan/run.ts
// with --endpoint), using the project's ANTHROPIC_API_KEY so the key never leaves Supabase.
//
// Not called by the app. Locked by a one-off token: the caller sends it in x-eval-token and
// only its SHA-256 lives here. To run a new eval, generate a token, put its hash below and
// redeploy. Only the models in MODELS are allowed, with the production prompt and schema.
import Anthropic from "npm:@anthropic-ai/sdk@1.12.0";
import { PLAN_SCHEMA, SYSTEM, userContent } from "../_shared/planRoundPrompt.ts";
import { finalizePlan } from "../plan-round/validate.ts";

const TOKEN_SHA256 = "13d39e4662afd4082343559ca1046352f3c9b915de5dab74b7ffd13475a1a40a";
const MODELS = ["claude-opus-5-5", "claude-sonnet-5-5", "claude-haiku-5-5"];
const EFFORTS = ["low", "medium", "high"];
// Server-side fallback is not offered on Haiku.
const FALLBACK = new Set(["claude-opus-5-5", "claude-sonnet-5-5"]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const token = req.headers.get("x-eval-token") ?? "";
  if (!token || (await sha256(token)) !== TOKEN_SHA256) return json({ error: "unauthorized" }, 401);

  let body: { model?: unknown; effort?: unknown; text?: unknown; friends?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  const model = String(body.model ?? "");
  const effort = String(body.effort ?? "low");
  const text = typeof body.text === "string" ? body.text.slice(0, 1000) : "";
  const friends = Array.isArray(body.friends) ? body.friends.filter((f): f is string => typeof f === "string").slice(0, 300) : [];
  if (!MODELS.includes(model) || !EFFORTS.includes(effort) || text.length < 3) return json({ error: "bad_request" }, 400);

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json({ error: "not_configured" }, 503);
  const client = new Anthropic({ apiKey, timeout: 90_000, maxRetries: 2 });

  const request: Anthropic.MessageCreateParamsNonStreaming = {
    model,
    max_tokens: 4096,
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    output_config: { effort, format: { type: "json_schema", schema: PLAN_SCHEMA as unknown as Record<string, unknown> } },
    messages: [{ role: "user", content: userContent(text, friends) }],
  } as Anthropic.MessageCreateParamsNonStreaming;

  const started = Date.now();
  try {
    const msg = FALLBACK.has(model)
      ? await client.beta.messages.create({
          ...(request as Anthropic.Beta.MessageCreateParamsNonStreaming),
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
        })
      : await client.messages.create(request);
    const out = (msg.content.find(b => b.type === "text") as { text?: string } | undefined)?.text ?? "";
    // The same checks and conversion plan-round applies, for an app that plays custom games.
    let plan: unknown = null;
    let finalError: string | null = null;
    try {
      const final = finalizePlan(JSON.parse(out), ["teamScoring", "custom"]);
      if (final.ok) plan = final.plan;
      else finalError = final.reason;
    } catch (e) {
      finalError = `non-JSON output: ${String(e).slice(0, 200)}`;
    }
    return json({ model: msg.model, stop_reason: msg.stop_reason, text: out, plan, finalError, usage: msg.usage, ms: Date.now() - started });
  } catch (err) {
    const status = err instanceof Anthropic.APIError ? err.status : 0;
    const message = err instanceof Anthropic.APIError ? err.message : String(err);
    return json({ error: "model_error", status, message: message.slice(0, 500) }, 502);
  }
});
