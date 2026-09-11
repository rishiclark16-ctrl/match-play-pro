# MATCH Golf - Testing & Quality Assurance

---

## 1. TEST INFRASTRUCTURE

| Tool | Version | Purpose |
|------|---------|---------|
| **Vitest** | 4.0.17 | Unit test runner |
| **Playwright** | 1.59.1 | End-to-end testing |
| **Testing Library (React)** | 16.3.1 | Component testing |
| **Testing Library (DOM)** | 10.4.1 | DOM testing utilities |
| **jest-dom** | 6.9.1 | Custom DOM matchers |
| **jsdom** | 27.4.0 | Browser environment simulation |
| **fake-indexeddb** | 6.2.5 | IndexedDB mock for tests |

### Test Setup
- `bunfig.toml` preloads `src/test/setup.ts`
- Setup file polyfills: jsdom, localStorage, sessionStorage, indexedDB
- `vi.spyOn` preferred over `vi.mock` to avoid mock contamination in Bun's test runner
- `vi.mocked()` not available in Bun's vitest shim -- use type casts instead

### Commands
```bash
bun test              # Run all tests (watch mode)
bun run test:run      # Run all tests (single run)
bun run test:coverage # Run with code coverage
bun run test:e2e      # Run Playwright e2e tests
bun run test:e2e:ui   # Playwright with interactive UI
bun run test:e2e:headed # Playwright in headed browser
```

---

## 2. TEST BASELINE

**661 tests passing, 0 failures** across 18 test files.

---

## 3. TEST INVENTORY BY FILE

### Game Calculator Tests

| File | Tests | Description |
|------|-------|-------------|
| `lib/games/nassau.test.ts` | 27 | Nassau front/back/overall, auto-press, 9-hole, net scoring |
| `lib/games/skins.test.ts` | 24 | Skins carryover, per-player contribution, multi-hole count |
| `lib/games/matchPlay.test.ts` | 31 | Match play hole-by-hole, net scoring, early close |
| `lib/games/wolf.test.ts` | 55 | Wolf rotation, blind wolf, lone wolf, 3-5 player, points |
| `lib/games/stableford.test.ts` | 42 | Standard + modified scoring, formatting, edge cases |
| `lib/games/bestball.test.ts` | 30 | Team best ball, hole results, multiple teams |
| `lib/games/settlement.test.ts` | 18 | Cross-game settlement, rounding, net-out, multi-player |
| `lib/games/moneyTracker.test.ts` | -- | Live money balance calculations |
| `lib/games/vegas.test.ts` | -- | Vegas team scoring |
| `lib/games/rabbit.test.ts` | -- | Rabbit possession tracking |
| `lib/games/quota.test.ts` | -- | Quota target scoring |

### Voice & NLP Tests

| File | Tests | Description |
|------|-------|-------------|
| `lib/voiceParser.test.ts` | 114 | Voice-to-score parsing, fuzzy matching, phonetic variations, golf terms, confidence scoring |
| `lib/voiceCommands.test.ts` | -- | Voice command recognition (next hole, go back, undo) |
| `lib/voiceFeedback.test.ts` | -- | Voice response text generation |
| `lib/phoneticMatch.test.ts` | -- | Phonetic name matching algorithms |

### Hook Tests

| File | Tests | Description |
|------|-------|-------------|
| `hooks/useVoiceScoring.test.ts` | -- | Voice scoring integration (recognition -> parse -> confirm -> save) |
| `hooks/useFriends.test.ts` | -- | Friend list, requests, add/remove |
| `hooks/useGroups.test.ts` | -- | Group CRUD, membership |
| `hooks/useSubscription.test.ts` | -- | Subscription status, feature gating |

### Infrastructure Tests

| File | Tests | Description |
|------|-------|-------------|
| `lib/offlineDb.test.ts` | -- | IndexedDB offline score queue operations |
| `lib/statCalculations.test.ts` | -- | Statistical computation accuracy |
| `lib/rls-policies.test.ts` | -- | Row Level Security policy validation |

### House Game Tests

| File | Tests | Description |
|------|-------|-------------|
| `lib/houseGame/engine.test.ts` | -- | House game scoring engine |
| `lib/houseGame/primitives.test.ts` | -- | Primitive rule definitions and validation |

---

## 4. TEST CATEGORIES

### Pure Function Tests (Highest Coverage)
Game calculators and the voice parser are pure functions with no side effects, making them ideal for unit testing. These represent the majority of the test suite and cover:
- Normal gameplay scenarios
- Edge cases (ties, carryovers, early finish)
- Rounding and currency precision
- Multi-player variations (3-5 players for Wolf)
- 9-hole and 18-hole variations
- Net scoring with handicap adjustments
- Input validation and error handling

### Hook Tests (Integration Level)
Hook tests verify the integration between:
- React state management
- Supabase data fetching (mocked)
- Business logic orchestration
- Subscription feature gating

### RLS Policy Tests
Validate that Supabase Row Level Security policies correctly:
- Allow authorized reads/writes
- Block unauthorized access
- Handle edge cases (spectators, ghost players)

---

## 5. TEST PATTERNS & CONVENTIONS

### Co-located Tests
Tests live alongside source files:
```
feature.ts          # Source code
feature.test.ts     # Tests
```

### Pure Function Pattern
```typescript
describe('calculateNassau', () => {
  it('should calculate front 9 winner', () => {
    const players = [/* ... */];
    const scores = [/* ... */];
    const result = calculateNassau(players, scores, { stakes: 5 });
    expect(result.front.winner).toBe('player1');
    expect(result.front.amount).toBe(5);
  });
});
```

### Bun-Specific Notes
- Use `vi.spyOn` instead of `vi.mock` for voiceParser tests
- Use `(fn as ReturnType<typeof vi.fn>)` instead of `vi.mocked(fn)`
- `bunfig.toml` configures preloads, not vitest.config.ts

---

## 6. QUALITY ASSURANCE CHECKLIST

### Before Every Release
- [ ] All 661 tests pass (`bun run test:run`)
- [ ] Production build succeeds (`bun run build`)
- [ ] No TypeScript errors
- [ ] No ESLint errors (`bun run lint`)
- [ ] Capacitor sync succeeds (`npx cap sync ios`)
- [ ] Manual smoke test on iOS device/simulator

### Regression Areas to Watch
Based on audit history, these areas have had bugs and should get extra attention:

| Area | Risk | What to Test |
|------|------|-------------|
| Settlement rounding | Currency precision | Verify `toFixed(2)` on all money displays |
| Wolf multi-player | Off-by-one | Test with 3, 4, and 5 players |
| Nassau auto-press | Last hole edge | Verify press blocked on final hole |
| Skins per-player | Hole count | Verify contribution uses scored holes, not round holes |
| Stableford formatting | Display | Verify +N / 0 / -N formatting |
| Voice parser | Name matching | Test with similar names, nicknames |
| Offline sync | Queue | Test score entry offline → reconnect → sync |
| Handicap calc | Null safety | Test with missing slope/rating data |

---

## 7. AUDIT HISTORY

### Full Audit (2026-03-31)
All critical/high/medium/low bugs fixed:

| Severity | Count | Area |
|----------|-------|------|
| Critical | 5 | Settlement, Skins, Nassau, Wolf |
| High | 5 | Stableford, Wolf, Round creation |
| Medium | 8 | Auth, Nassau, Round creation, Settlement |
| Low | 8 | Home page, Handicap, UI |

20 new tests added during audit. All pass.

### Post-Audit Baseline
661 tests, 0 failures.
