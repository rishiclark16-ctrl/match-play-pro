/**
 * Round-plan eval, the model half: sends every case through the real plan-round
 * prompt and schema (the same module the edge function imports) and scores the plan.
 *
 *   bun evals/round-plan/run.ts                  # all cases, live (needs ANTHROPIC_API_KEY)
 *   bun evals/round-plan/run.ts --grep=low-total  # cases whose id matches
 *   bun evals/round-plan/run.ts --repeat=3        # each case 3 times (consistency)
 *   bun evals/round-plan/run.ts --local           # the offline parser instead (free)
 *   bun evals/round-plan/run.ts --model=claude-haiku-5-5 --effort=low
 *   EVAL_ENDPOINT=https://<project>.supabase.co/functions/v1/plan-round-eval EVAL_TOKEN=... EVAL_APIKEY=<anon key> \
 *     bun evals/round-plan/run.ts                 # through the plan-round-eval edge function (the app's key)
 *
 * Writes evals/round-plan/results/<timestamp>.json and prints failures as bug reports.
 * A full live run is ~85 requests at effort low: roughly $1–2 on Claude Opus 5.5.
 */
import Anthropic from '@anthropic-ai/sdk';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CASES, FRIENDS, type EvalCase } from './cases';
import { scoreCase, type CaseScore } from './score';
import { PLAN_SCHEMA, SYSTEM, userContent, wireToPlan } from '../../supabase/functions/_shared/planRoundPrompt';
import { localParse } from '../../src/lib/roundPlan/localParse';
import type { RoundPlan } from '../../src/lib/roundPlan/types';

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v ?? 'true'];
}));
const local = args.local === 'true';
// Default: the production model (keep in step with supabase/functions/plan-round/index.ts).
const MODEL = args.model ?? 'claude-opus-5-5';
const EFFORT = args.effort ?? 'low';
const ENDPOINT = process.env.EVAL_ENDPOINT;
// $ per 1M tokens: input, output. Cache reads are 5% of input, cache writes 125%.
const PRICES: Record<string, [number, number]> = {
  'claude-opus-5-5': [4, 20], 'claude-sonnet-5-5': [2, 10], 'claude-haiku-5-5': [0.1, 0.5],
};
const repeat = Math.max(1, Number(args.repeat ?? 1));
const grep = args.grep ? new RegExp(args.grep, 'i') : null;
// The offline parser is only scored on what it can set up without the AI.
const cases = CASES.filter(c => (!grep || grep.test(c.id)) && !(local && c.aiOnly));

const client = local || ENDPOINT ? null : new Anthropic({ timeout: 60_000, maxRetries: 2 });
let inputTokens = 0;
let outputTokens = 0;
let cacheRead = 0;
let cacheWrite = 0;
function addUsage(u: { input_tokens?: number; output_tokens?: number; cache_read_input_tokens?: number | null; cache_creation_input_tokens?: number | null }) {
  inputTokens += u.input_tokens ?? 0;
  outputTokens += u.output_tokens ?? 0;
  cacheRead += u.cache_read_input_tokens ?? 0;
  cacheWrite += u.cache_creation_input_tokens ?? 0;
}

/** Same request, run by the plan-round-eval edge function with the project's key. */
async function planWithEndpoint(c: EvalCase): Promise<{ plan: RoundPlan | null; error?: string; ms: number }> {
  const started = Date.now();
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(ENDPOINT!, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-eval-token': process.env.EVAL_TOKEN ?? '',
          authorization: `Bearer ${process.env.EVAL_APIKEY ?? ''}`,
          apikey: process.env.EVAL_APIKEY ?? '',
        },
        body: JSON.stringify({ model: MODEL, effort: EFFORT, text: c.text, friends: c.friends ?? FRIENDS }),
      });
      const body = await res.json() as { text?: string; plan?: RoundPlan | null; finalError?: string | null; stop_reason?: string; usage?: Parameters<typeof addUsage>[0]; error?: string; status?: number; message?: string };
      if (!res.ok) {
        if (attempt < 2 && (res.status >= 500 || res.status === 429)) { await new Promise(r => setTimeout(r, 3000 * (attempt + 1))); continue; }
        return { plan: null, error: `${res.status} ${body.error ?? ''} ${body.status ?? ''} ${body.message ?? ''}`.trim(), ms: Date.now() - started };
      }
      if (body.usage) addUsage(body.usage);
      if (body.stop_reason === 'refusal' || body.stop_reason === 'max_tokens') {
        return { plan: null, error: `stop_reason ${body.stop_reason}`, ms: Date.now() - started };
      }
      // The server ran plan-round's own checks (validate.ts): score what the app would get.
      if (!body.plan) return { plan: null, error: `rejected by plan-round checks: ${body.finalError}`, ms: Date.now() - started };
      return { plan: body.plan, ms: Date.now() - started };
    } catch (err) {
      if (attempt < 2) continue;
      return { plan: null, error: String(err), ms: Date.now() - started };
    }
  }
}

/** The edge function's exact request, minus auth and rate limiting. */
async function planWithModel(c: EvalCase): Promise<{ plan: RoundPlan | null; error?: string; ms: number }> {
  const started = Date.now();
  const request: Anthropic.MessageCreateParamsNonStreaming = {
    model: MODEL,
    max_tokens: 4096,
    // The instructions and glossary are identical on every call: cache them.
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    output_config: { effort: EFFORT as 'low', format: { type: 'json_schema', schema: PLAN_SCHEMA as unknown as Record<string, unknown> } },
    messages: [{ role: 'user', content: userContent(c.text, c.friends ?? FRIENDS) }],
  };
  try {
    const msg = await client!.beta.messages.create({
      ...(request as Anthropic.Beta.MessageCreateParamsNonStreaming),
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
    });
    addUsage(msg.usage);
    if (msg.stop_reason === 'refusal' || msg.stop_reason === 'max_tokens') {
      return { plan: null, error: `stop_reason ${msg.stop_reason}`, ms: Date.now() - started };
    }
    const text = msg.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')?.text ?? '';
    return { plan: wireToPlan(JSON.parse(text)) as unknown as RoundPlan, ms: Date.now() - started };
  } catch (err) {
    const why = err instanceof Anthropic.APIError ? `API ${err.status}: ${err.message}` : String(err);
    return { plan: null, error: why, ms: Date.now() - started };
  }
}

async function runOne(c: EvalCase): Promise<CaseScore & { ms: number; plan: RoundPlan | null }> {
  if (local) {
    const plan = localParse(c.text);
    return { ...scoreCase(c, plan), ms: 0, plan };
  }
  const { plan, error, ms } = ENDPOINT ? await planWithEndpoint(c) : await planWithModel(c);
  if (!plan) return { id: c.id, pass: false, failures: [`no plan (${error})`], ms, plan };
  return { ...scoreCase(c, plan), ms, plan };
}

async function pool<T, R>(items: T[], size: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  }));
  return out;
}

if (!local && !ENDPOINT && !process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
  console.error('Set ANTHROPIC_API_KEY for a live run, or pass --local for the offline parser.');
  process.exit(2);
}

const jobs = cases.flatMap(c => Array.from({ length: repeat }, () => c));
console.log(`${local ? 'offline parser' : `${MODEL} (effort ${EFFORT})${ENDPOINT ? ' via plan-round-eval' : ''}`}: ${cases.length} cases × ${repeat}`);
const results = await pool(jobs, local ? 1 : 4, runOne);

const byCase = new Map<string, typeof results>();
for (const r of results) byCase.set(r.id, [...(byCase.get(r.id) ?? []), r]);
let passed = 0;
for (const [id, runs] of byCase) {
  const ok = runs.filter(r => r.pass).length;
  if (ok === runs.length) passed++;
  else for (const r of runs.filter(x => !x.pass)) console.log(`  ✗ ${id}: ${r.failures.join('; ')}`);
}
const ms = results.filter(r => r.ms).map(r => r.ms).sort((a, b) => a - b);
const p50 = ms.length ? ms[Math.floor(ms.length / 2)] : 0;
const [pin, pout] = PRICES[MODEL] ?? [4, 20];
const cost = (inputTokens * pin + cacheRead * pin * 0.05 + cacheWrite * pin * 1.25 + outputTokens * pout) / 1_000_000;
console.log(`\n${passed}/${byCase.size} cases passed every run` +
  (local ? '' : ` · p50 ${(p50 / 1000).toFixed(1)}s · ${inputTokens} in + ${cacheRead} cached / ${outputTokens} out · ~$${cost.toFixed(3)}`));

const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, 'results');
mkdirSync(dir, { recursive: true });
const file = join(dir, `${new Date().toISOString().replace(/[:.]/g, '-')}-${local ? 'local' : `${MODEL}-${EFFORT}`}.json`);
writeFileSync(file, JSON.stringify({ model: local ? 'local' : MODEL, effort: EFFORT, passed, total: byCase.size, repeat, p50, inputTokens, cacheRead, cacheWrite, outputTokens, cost, results }, null, 2));
console.log(`report: ${file}`);
process.exit(passed === byCase.size ? 0 : 1);
