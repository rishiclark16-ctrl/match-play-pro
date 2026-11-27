# Round-plan evals

Checks that "say it and play" understands golf the way golfers say it.

## Pieces

| File | What it is |
|---|---|
| `supabase/functions/_shared/golfGames.ts` | Grounding catalogue: ~60 games and bets with aliases, rules, money and whether the app plays them (`yes`, `as` an equivalent, `builder`, `side`, `no`). The AI prompt's glossary is generated from it. |
| `supabase/functions/_shared/planRoundPrompt.ts` | The plan-round prompt and JSON schema, shared by the edge function and this eval. |
| `cases.ts` | 92 sentences golfers say, each with what must be understood (`expect`), what the app must set up (`engine`, including money on a short card) and whether only the AI can do it (`aiOnly`). |
| `supabase/functions/_shared/customExamples.ts` | Worked custom-game examples shown to the AI; each must resolve and validate (`customExamples.test.ts`). |
| `score.ts` | Compares a plan with a case and lists every mismatch in plain words. |
| `run.ts` | Runs the cases through the real model (or the offline parser) and writes a report. |
| `src/lib/roundPlan/evals.test.ts` | The part that runs on every PR (below). |

## On every PR (free, deterministic)

`bun test src/lib` runs `evals.test.ts`:

- **Engine**: each case's expected plan resolves into the right games (team scoring, payout, stakes). A model that understands perfectly is useless if the engine can't play it.
- **Coverage**: every catalogue game has a case; every game the app can't play has a case checking it is flagged, never forced into another game.
- **Offline parser**: the no-signal fallback must keep passing every case it can set up (`LOCAL_BASELINE`; `aiOnly` cases are skipped).
- **Held-out cases** (`novel-*`, at the end of `cases.ts`): custom games built from blocks the prompt's worked examples never show (par 3s double, a three-point game, team medal, worst ball, switching partners at the turn, two medals in one sentence, messy speech). Add new ones here *without* adding them to the prompt, so they keep measuring whether the planner composes rules on its own. Run them with `--repeat=3`: a case that passes once can still be flaky.
- **Custom games** (`src/lib/games/custom`): their own tests compare the engine with the dedicated calculators on random scorecards and check money is zero-sum.

## On demand (live model, costs money)

```bash
ANTHROPIC_API_KEY=... bun evals/round-plan/run.ts            # all cases, ~$1–2
ANTHROPIC_API_KEY=... bun evals/round-plan/run.ts --grep=low  # some cases
ANTHROPIC_API_KEY=... bun evals/round-plan/run.ts --repeat=3  # consistency
bun evals/round-plan/run.ts --local                           # offline parser, free
bun evals/round-plan/run.ts --model=claude-haiku-5-5 --effort=low   # another model
```

**Without a key here, through the app's key:** the `plan-round-eval` edge function runs the
same request as `plan-round` (same prompt, schema and `plan-round/validate.ts` checks) with
the project's `ANTHROPIC_API_KEY`, and returns the plan the app would get. It is locked by a
one-off token: generate one, put its SHA-256 in `TOKEN_SHA256` in
`supabase/functions/plan-round-eval/index.ts`, redeploy, then:

```bash
EVAL_ENDPOINT=https://puqgbsxabcyxrbwwoznn.supabase.co/functions/v1/plan-round-eval \
EVAL_TOKEN=<token> EVAL_APIKEY=<anon key> bun evals/round-plan/run.ts --model=claude-opus-5-5
```

Run it after any change to the prompt, the schema or the catalogue, before deploying `plan-round`.
A schema the API refuses fails every case with a 400 (that is how the "compiled grammar is too
large" outage was found). Reports land in `evals/round-plan/results/` (gitignored).

## Adding a game

1. Add it to `golfGames.ts` with its aliases and an honest `support.status`.
2. Add cases to `cases.ts` (the coverage test fails until you do).
3. If it is decided by the strokes on the card, it is usually a custom game: write it as a preset (`src/lib/games/custom/presets.ts`), add a test with hand-computed money, and (if it has a fixed name) an offline preset in `OFFLINE_PRESETS`. Otherwise: engine support, `PLAN_SCHEMA` fields, resolver.
4. Run the live eval before deploying `plan-round`.
