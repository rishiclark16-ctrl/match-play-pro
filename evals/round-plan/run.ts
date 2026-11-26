/**
 * Round-plan eval, the model half: sends every case through the real plan-round
 * prompt and schema (the same module the edge function imports) and scores the plan.
 *
 *   bun evals/round-plan/run.ts                  # all cases, live (needs ANTHROPIC_API_KEY)
 *   bun evals/round-plan/run.ts --grep=low-total  # cases whose id matches
 *   bun evals/round-plan/run.ts --repeat=3        # each case 3 times (consistency)
 *   bun evals/round-plan/run.ts --local           # the offline parser instead (free)
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
import { PLAN_SCHEMA, SYSTEM, userContent } from '../../supabase/functions/_shared/planRoundPrompt';
import { localParse } from '../../src/lib/roundPlan/localParse';
import type { RoundPlan } from '../../src/lib/roundPlan/types';

const MODEL = 'claude-opus-5-5'; // keep in step with supabase/functions/plan-round/index.ts
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v ?? 'true'];
}));
const local = args.local === 'true';
const repeat = Math.max(1, Number(args.repeat ?? 1));
const grep = args.grep ? new RegExp(args.grep, 'i') : null;
// The offline parser is only scored on what it can set up without the AI.
const cases = CASES.filter(c => (!grep || grep.test(c.id)) && !(local && c.aiOnly));

const client = local ? null : new Anthropic({ timeout: 60_000, maxRetries: 2 });
let inputTokens = 0;
let outputTokens = 0;

/** The edge function's exact request, minus auth and rate limiting. */
async function planWithModel(c: EvalCase): Promise<{ plan: RoundPlan | null; error?: string; ms: number }> {
  const started = Date.now();
  const request: Anthropic.MessageCreateParamsNonStreaming = {
    model: MODEL,
    max_tokens: 4096,
    // The instructions and glossary are identical on every call: cache them.
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    output_config: { effort: 'low', format: { type: 'json_schema', schema: PLAN_SCHEMA as unknown as Record<string, unknown> } },
    messages: [{ role: 'user', content: userContent(c.text, c.friends ?? FRIENDS) }],
  };
  try {
    const msg = await client!.beta.messages.create({
      ...(request as Anthropic.Beta.MessageCreateParamsNonStreaming),
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
    });
    inputTokens += msg.usage.input_tokens;
    outputTokens += msg.usage.output_tokens;
    if (msg.stop_reason === 'refusal' || msg.stop_reason === 'max_tokens') {
      return { plan: null, error: `stop_reason ${msg.stop_reason}`, ms: Date.now() - started };
    }
    const text = msg.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')?.text ?? '';
    return { plan: JSON.parse(text) as RoundPlan, ms: Date.now() - started };
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
  const { plan, error, ms } = await planWithModel(c);
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

if (!local && !process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
  console.error('Set ANTHROPIC_API_KEY for a live run, or pass --local for the offline parser.');
  process.exit(2);
}

const jobs = cases.flatMap(c => Array.from({ length: repeat }, () => c));
console.log(`${local ? 'offline parser' : MODEL}: ${cases.length} cases × ${repeat}`);
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
const cost = (inputTokens * 4 + outputTokens * 20) / 1_000_000;
console.log(`\n${passed}/${byCase.size} cases passed every run` +
  (local ? '' : ` · p50 ${(p50 / 1000).toFixed(1)}s · ${inputTokens} in / ${outputTokens} out · ~$${cost.toFixed(2)}`));

const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, 'results');
mkdirSync(dir, { recursive: true });
const file = join(dir, `${new Date().toISOString().replace(/[:.]/g, '-')}${local ? '-local' : ''}.json`);
writeFileSync(file, JSON.stringify({ model: local ? 'local' : MODEL, passed, total: byCase.size, repeat, inputTokens, outputTokens, results }, null, 2));
console.log(`report: ${file}`);
process.exit(passed === byCase.size ? 0 : 1);
