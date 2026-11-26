# Round-plan evals

Checks that "say it and play" understands golf the way golfers say it.

## Pieces

| File | What it is |
|---|---|
| `supabase/functions/_shared/golfGames.ts` | Grounding catalogue: ~60 games and bets with aliases, rules, money and whether the app plays them (`yes`, `as` an equivalent, `builder`, `side`, `no`). The AI prompt's glossary is generated from it. |
| `supabase/functions/_shared/planRoundPrompt.ts` | The plan-round prompt and JSON schema, shared by the edge function and this eval. |
| `cases.ts` | 87 sentences golfers say, each with what must be understood (`expect`) and what the app must set up (`engine`). |
| `score.ts` | Compares a plan with a case and lists every mismatch in plain words. |
| `run.ts` | Runs the cases through the real model (or the offline parser) and writes a report. |
| `src/lib/roundPlan/evals.test.ts` | The part that runs on every PR (below). |

## On every PR (free, deterministic)

`bun test src/lib` runs `evals.test.ts`:

- **Engine**: each case's expected plan resolves into the right games (team scoring, payout, stakes). A model that understands perfectly is useless if the engine can't play it.
- **Coverage**: every catalogue game has a case; every game the app can't play has a case checking it is flagged, never forced into another game.
- **Offline parser**: the no-signal fallback must keep passing all cases (`LOCAL_BASELINE`).

## On demand (live model, costs money)

```bash
ANTHROPIC_API_KEY=... bun evals/round-plan/run.ts            # all cases, ~$1–2
ANTHROPIC_API_KEY=... bun evals/round-plan/run.ts --grep=low  # some cases
ANTHROPIC_API_KEY=... bun evals/round-plan/run.ts --repeat=3  # consistency
bun evals/round-plan/run.ts --local                           # offline parser, free
```

Run it after any change to the prompt, the schema or the catalogue, before deploying `plan-round`.
Reports land in `evals/round-plan/results/` (gitignored).

## Adding a game

1. Add it to `golfGames.ts` with its aliases and an honest `support.status`.
2. Add cases to `cases.ts` (the coverage test fails until you do).
3. If the app should play it: engine support, `PLAN_SCHEMA` fields if needed, resolver, then the live run.
