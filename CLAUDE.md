# MATCH Golf — Claude Code Context

## ⚠️ Documentation Discipline (read before starting any task)

**Before** starting any task in this repo, the assistant MUST:
1. Read this file (`CLAUDE.md`) end-to-end.
2. Read the relevant section(s) for the area being touched (e.g., game logic → `Core Features` + audit history; security/DB → `Production Audit` + `supabase/migrations/`).
3. Skim recent changes in any file it intends to edit so it doesn't undo prior work.

**After** finishing any task, the assistant MUST:
1. Update `CLAUDE.md` to reflect what changed — test baselines, file-size violations, new migrations, new audit entries, feature status.
2. Update any other docs touched by the change (`README.md`, ADRs, etc.).
3. End the response with the literal line:
   `claude md and documentation updated`

Do **not** update the Notion "MATCH — Documentation" site; the user has opted out (the workspace is at its free block limit). `CLAUDE.md` is the record.

If a task does not require any doc change, still print the confirmation line so it's clear the doc check happened.

---

## What This App Is
MATCH Golf is a mobile-first React + Capacitor iOS app for real-time golf scoring with multiplayer support, betting games, voice scoring, and handicap calculations. It targets iOS primarily (with Android support). Users can score rounds, track multiple betting games simultaneously, manage settlements, and play with friends in real-time.

---

## Tech Stack
- **Frontend:** React 18, TypeScript 5.8, Vite 5, React Router 6
- **UI:** TailwindCSS 3, shadcn/ui (Radix primitives), Framer Motion, Lucide icons
- **Backend:** Supabase (PostgreSQL, Auth, Real-time, Edge Functions)
- **Mobile:** Capacitor 6 (iOS + Android)
- **State:** React Query (server state), React Hook Form (forms), custom hooks (domain logic)
- **Payments:** RevenueCat (native iOS in-app purchases)
- **Error tracking:** Sentry
- **Package manager:** Bun
- **Testing:** Vitest (unit), Playwright (e2e)

---

## Project Structure

```
src/
├── pages/          # Route pages (all lazy-loaded)
├── components/
│   ├── golf/       # 50+ golf-specific components
│   ├── friends/    # Friend management
│   ├── groups/     # Golf group management
│   ├── profile/    # Profile components
│   ├── subscription/ # Paywall, feature gating
│   ├── layout/     # AppLayout
│   └── ui/         # shadcn/ui primitives + custom UI
├── hooks/          # 39+ custom hooks (domain logic)
├── lib/
│   ├── games/      # Pure function game calculators (all tested)
│   ├── voiceParser.ts  # Voice scoring NLP
│   ├── offlineDb.ts    # IndexedDB offline storage
│   ├── handicapUtils.ts
│   ├── validation.ts   # Zod schemas
│   └── constants.ts
├── types/          # golf.ts, betting.ts
├── integrations/supabase/  # client.ts + auto-generated types.ts
├── contexts/       # OfflineContext
└── services/       # purchases.ts (RevenueCat)

ios/
├── App/
│   ├── App.xcworkspace     # ← Always open THIS (not .xcodeproj)
│   ├── App/
│   │   ├── Info.plist
│   │   ├── RevenueCatManager.swift
│   │   └── RevenueCatPlugin.swift
│   └── Podfile
└── fastlane/

supabase/
├── functions/      # Edge functions (delete-account, subscription-webhook, etc.)
└── migrations/     # 18 migration files
```

---

## Routes
```
/                       Home (round list)
/auth                   Sign in/up (public)
/play                   Say-it-and-play round builder (3.1 core workflow)
/new-round              Create round by hand (course → players → games)
/join                   Join by code
/round/:id              Scorecard (main scoring view)
/round/:id/leaderboard  Live leaderboard
/round/:id/complete     Final results + settlements
/profile                User profile + settings
/friends                Friend management
/groups                 Golf groups
/stats                  Player stats
/privacy-policy, /terms-of-service, /support  (public)
```
All routes except `/auth` and legal pages require auth via `<AuthGuard>`.

---

## Core Features

### Betting Games
All game logic lives in `src/lib/games/` as pure functions with extensive tests:
- **Nassau** (27 tests) — front/back/overall with auto-press; full 9-hole support via `holesInRound` param
- **Skins** (24 tests) — individual hole wins, optional carryover; auto-adapts to any hole count including 9
- **Match Play** (31 tests) — 2-player head-to-head, net scoring
- **Wolf** (58 tests) — 3-4 player rotating wolf, blind wolf, catch-up mechanic on holes 17-18
- **Stableford** (42 tests) — points-based, standard + modified
- **Best Ball** (30 tests) — team format, best score per team per hole
- **Vegas** — 2v2 paired scores, 10+ rule, birdie flip, eagle flip+double, carryover ties (4 players)
- **Nines/5-3-1** — 9 points split per hole: best=5, mid=3, worst=1, ties redistribute (exactly 3 players)
- **Defender** — rotating 1-vs-field: defend wins +3, ties +1, attackers win +1/+2 each (3-4 players)
- **Sixes/Round Robin** — 3 six-hole segments with rotating 2v2 partners, best ball per team (exactly 4 players)
- **Quota/Chicago** (22 tests) — target-based with correct point table (birdie=4, eagle=8, par=2, bogey=1)
- **Rabbit** — chase the rabbit with optional "set free" mechanic
- **Prop Bets** — CTP, greenie, sandie, barkie, snake, custom bets
- **Settlement** (18 tests) — aggregates money owed across all games including new game types

### Voice Scoring
- `src/lib/voiceParser.ts` — 114 tests, pure NLP (no ML/server calls)
- Fuzzy name matching (Levenshtein < 2), nickname support
- Golf terms: "birdie" = par-1, "bogey" = par+1, "eagle" = par-2
- Phonetic variations: "tree"=3, "ate"=8, "fore"=4, "won"=1, "to"=2
- Returns confidence (high/medium/low) → `VoiceConfirmationModal`
- Uses native Web Speech API (no API key needed)

### Real-time Sync
- `useSupabaseRound` hook subscribes to Postgres changes on `scores`, `players`, `rounds`
- Optimistic UI update → Supabase write in background → real-time confirms or rolls back

### Offline Support
- IndexedDB (`src/lib/offlineDb.ts`) stores pending scores
- Offline queue syncs on reconnect
- `OfflineContext` tracks network status (`isOnline`, `pendingCount`, `isSyncing`)
- `OfflineBanner` (`src/components/ui/OfflineBanner.tsx`) — fixed top banner with Framer Motion slide-in; shows "No connection · X scores queued" when offline, "Back online · Syncing…" on reconnect, auto-dismisses after sync

### Handicap
- `src/lib/handicapUtils.ts`
- Formula: `playingHandicap = handicapIndex × (slope / 113) × (holes / 18)`
- Supports `auto` (from Supabase course data) and `manual` modes

---

## Authentication
- **Apple Sign-In** (native iOS) — `@capacitor-community/apple-sign-in` + Supabase `signInWithIdToken()`
- **Email/Password** — Supabase Auth
- Custom patch applied: `patches/@capacitor-community+apple-sign-in+6.0.0.patch` (fixes iPad presentation)
- Rate limited: 10 attempts / 15 min (`src/lib/rateLimiter.ts`)
- `useAuth()` hook manages all auth state

---

## Key Supabase Tables
```
profiles          — user profiles (extends auth.users)
rounds            — golf rounds (games stored as JSONB array)
players           — participants in a round
scores            — individual hole scores
presses           — Nassau auto-presses
prop_bets         — side bets
bet_settlements   — money owed between players
friendships       — friend requests/accepted
golf_groups       — golf groups
group_members     — group membership
round_spectators  — read-only round viewers
round_shares      — result sharing tracking
```

RLS policies use helper functions: `is_round_participant()`, `is_scorekeeper()`, `is_round_creator()`

---

## Native iOS
- **Bundle ID:** `dev.matchgolf.app`
- **Min iOS:** 15.0
- **RevenueCat API key:** hardcoded in Xcode build settings (`REVENUECAT_API_KEY = appl_xWFDfdKOsXHuszaTSfFxLzPiJGt`)
- **Subscriptions:** Monthly ($3.99), Yearly ($24.99), entitlement: `"Pro"`
- **Permissions required:** Camera (QR), Contacts, Microphone, Speech Recognition

CocoaPods dependencies: Capacitor, Apple Sign-In, Contacts, Keep Awake, App, Haptics, SplashScreen, StatusBar, RevenueCat (~5.0)

---

## Environment Variables
```env
# Required
VITE_SUPABASE_PROJECT_ID=puqgbsxabcyxrbwwoznn
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...
VITE_SUPABASE_URL=https://puqgbsxabcyxrbwwoznn.supabase.co

# Optional (production only)
VITE_SENTRY_DSN=
SENTRY_AUTH_TOKEN=    # build-time only (no VITE_ prefix)
SENTRY_ORG=
SENTRY_PROJECT=

# Set via Supabase CLI secrets, not .env
REVENUECAT_WEBHOOK_AUTH=

# Set in Xcode build settings, not .env
REVENUECAT_API_KEY=
```

---

## Dev Commands
```bash
bun install           # Install JS deps
bun run dev           # Start dev server
bun run build         # Production build
bun test              # Run unit tests (Vitest)
npx cap sync ios      # Sync web build to iOS
npx cap open ios      # Open in Xcode
```

**iOS build:** Always open `ios/App/App.xcworkspace` (not `.xcodeproj`).

After installing Xcode, run:
```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
```

---

## Code Conventions
- `cn()` for conditional Tailwind classes (clsx + tailwind-merge)
- Hooks always prefixed with `use`
- Game calculators are pure functions — no side effects, always return results
- Tests co-located with source: `feature.ts` + `feature.test.ts`
- Never throw from hooks/utilities — return `{ success, error }` objects
- Toast notifications for user-facing errors, Sentry for production logging
- All pages are `React.lazy()` loaded with `<PageSkeleton>` Suspense fallbacks
- Zod schemas in `src/lib/validation.ts` for all user input
- Logger: `src/lib/logger.ts` (wraps console + Sentry)

---

## Key Architecture Decisions
| Decision | Why |
|----------|-----|
| Capacitor over React Native | Share web codebase, easier Supabase integration |
| Supabase over Firebase | PostgreSQL power, real-time, edge functions |
| Pure function game logic | 100% testable, deterministic |
| Voice parser (no ML) | Fast, deterministic, no server calls |
| Games as JSONB array in rounds | Flexible schema, easy to add new games |
| Optimistic updates + real-time | Instant UI feedback with eventual consistency |
| Patch-package for Apple Sign-In | Only fix for iPad presentation without forking |
| React Query not Redux | Simpler for API data, built-in sync + caching |

---

## Supabase Project
- **Project ID:** `puqgbsxabcyxrbwwoznn`
- **URL:** `https://puqgbsxabcyxrbwwoznn.supabase.co`
- **Edge functions:** delete-account, subscription-webhook, sync-subscription, send-push, parse-house-game, plan-round, golf-course-lookup, redeem-promo, sentry-webhook, speech-to-text, weekly-recap
- **Migrations:** 22 files in `supabase/migrations/`
- **Edge functions:** delete-account, send-push, subscription-webhook, sync-subscription, parse-house-game, golf-course-lookup

## Test Baseline
**1310 pass, 0 fail** (1307 across 65 files + 3 page tests). All tests pass. Run with `bun test`. CI splits into two invocations:
- `bun test src/hooks src/lib src/engine src/components` (1307 tests)
- `bun test src/pages` (3 tests — page smoke tests)

**Why split:** module mocks (`vi.mock` and bun's `mock.module`) leak into downstream files when bun's CI scheduler reuses workers. Running pages in their own `bun test` invocation gives them a fresh process and keeps hook/lib tests pristine. Page-test factories must include every named export the page tree imports at module load (e.g., `TIER_LIMITS` from `useSubscription` is read by `PlayersStep`).

Test infrastructure notes:
- `bunfig.toml` preloads `src/test/setup.ts` which polyfills jsdom, localStorage, sessionStorage, and indexedDB for all test files
- `useVoiceScoring.test.ts` uses `vi.spyOn` (not `vi.mock`) for voiceParser to avoid mock contamination across files under bun's test runner
- `vi.mocked()` is not available in bun's vitest shim — use type casts `(fn as ReturnType<typeof vi.fn>)` instead

---

## Audit Fix History (2026-03-31)
Full audit performed and all critical/high/medium/low bugs fixed across:
- `settlement.ts` — rounding fix (C-2), Wolf 3-5 player support (C-3), prop bet guard (M-3), ledger decrement guard (M-4), `toFixed(2)` cents display (M-8)
- `skins.ts` — per-player contribution uses scored holes not round holes (C-4), carryover logic deduplication (M-7)
- `nassau.ts` — safe `players.find()` with null guard instead of non-null assertion (C-5), auto-press blocked on last hole (M-2)
- `stableford.ts` — `formatStablefordPoints` three distinct branches: `+N pts` / `0 pts` / `-N pts` (H-1), `holesScored` filters through valid hole refs (H-4)
- `wolf.ts` — accumulate whole points, divide by 3 once at end to eliminate float drift (H-5)
- `handicapUtils.ts` — null/undefined type guard (L-1), empty `holeInfo` infinite loop guard (L-7), 9-hole approximation comment (L-8)
- `useCreateSupabaseRound.ts` — delete-on-failure cleanup pattern for atomicity (H-3), explicit error check before ghost score generation (M-5)
- `useAuth.tsx` — per-device rate limit key using `navigator.userAgent|screen.width|screen.height` (M-1)
- `Home.tsx` — stable React key for game tags (L-2), console.error in spectator catch (L-5)
- New tests added: settlement rounding, Wolf multi-player, skins per-player contribution, nassau/wolf edge cases (20 new tests, all pass)
- Test baseline after audit + voice fix: **661 pass, 0 fail** (661 total)

## Scoring Correctness Audit (2026-04-06)
Full scoring audit against golf betting reference document. Fixes + new games:
- `quota.ts` — replaced Stableford points with correct Quota table (birdie=4, eagle=8, par=2, bogey=1)
- `vegas.ts` — complete rewrite: 10+ rule (high digit first), unconditional birdie flip, eagle flip+2x, carryover ties
- `handicapUtils.ts` — plus handicap (negative HI) now distributes penalty strokes from easiest holes (SI 18 down)
- `wolf.ts` — 3-player support, catch-up mechanic on holes 17-18 (lowest-point player becomes wolf)
- `rabbit.ts` — added "set free" mechanic toggle (`directTransfer` param)
- New calculators: `nines.ts` (5-3-1), `defender.ts` (1-vs-field), `sixes.ts` (round robin 2v2)
- New UI sections: `VegasSection`, `NinesSection`, `DefenderSection`, `SixesSection`
- `FormatStep.tsx` — player count validation: Vegas/Sixes (4), Nines (3), Defender/Wolf (3-4)
- `GamesSection.tsx`, `moneyTracker.ts`, `settlement.ts`, `useGameResults.ts` — wired all new games
- `houseGame.ts` — integrated Nines/Defender/Sixes into house game engine, removed from stubs
- `HouseGameEngine.ts` — removed stub warnings for Vegas/Rabbit/Quota/Defender/Sixes/Nines
- `primitives.ts` — added `format_nines`, set implemented=true for all new/fixed games
- Wolf tests updated for 3-player, Quota tests updated for correct point table
- Test baseline after scoring audit: **865 pass, 0 fail** (865 total)

---

## Production Audit (2026-04-27, Phase P0)
Phase 0 (ship-blockers) complete:
- **Failing test fixed:** `useGroups.test.ts:545` — mock for `group_members` was missing `.select().eq()` shape used by `updateMembers` to snapshot existing members. Now 1140/1140 pass across 44 files.
- **CI workflow added + verified green:** `.github/workflows/ci.yml` runs `bunx eslint src` (max 50 warnings), `bun test` (1140), and `bun run build:dev` on PRs and main pushes. Secret `VITE_SUPABASE_PUBLISHABLE_KEY` is configured. First successful run on commit `f36a55c` (~38s end-to-end).
  - `src/test/setup.ts` mirrors `process.env.VITE_*` onto `import.meta.env` for runners that don't auto-load `.env`, and uses `bun:test` `mock.module()` to stub `@capacitor/core` + `@capacitor/app` so the CJS plugin registration in `@capacitor/app/dist/plugin.cjs.js` doesn't crash on Linux runners.
- **RLS gaps closed:** `supabase/migrations/20260427000000_lock_down_rls_gaps.sql`
  - Dropped `promo_codes "Anyone can read"` policy — was leaking unredeemed codes (edge fn uses service-role anyway).
  - `get_season_leaderboard` and `get_head_to_head` now pin `viewer_id` to `auth.uid()` server-side. Previously any authenticated user could query another user's standings by passing a different uuid.
  - **Migration applied to production** on 2026-04-27 via Supabase MCP (`apply_migration` name `lock_down_rls_gaps`). `supabase db push` will be a no-op since the local file matches the applied state.

Phase P1 (robustness) complete:
- **Lint error fixed:** `remotion/LaunchVideoV2.tsx:139` — replaced `as any` with proper `React.CSSProperties['textAlign']` cast. Repo lint: 0 errors, 19 warnings.
- **Per-route ErrorBoundary added:** `src/components/RouteErrorBoundary.tsx` wraps the entire `<Routes>` block in `App.tsx`. Auto-resets when `useLocation().pathname` changes, so navigating away from a crashed page recovers without an app reload. Reports route name to Sentry breadcrumbs. Root `ErrorBoundary` is still the catch-all.
- **4 critical useEffect deps reviewed:**
  - `Auth.tsx:114` — intentional mount-only (videoRefs array identity changes each render); `eslint-disable-next-line` with intent comment.
  - `JoinRound.tsx:29` — intentional one-shot auto-join; same treatment.
  - `Social.tsx:153` — **real bug fixed**: added `atFriendLimit` to deps. Previously the deep-link friend-add path could bypass the paywall if the user crossed the friend limit between mount and the 500ms `setTimeout`.
  - `HouseGameConfirm.tsx:29` — wrapped `parsedPrimitives` in `useMemo` so identity is stable across renders (was invalidating downstream `configWarnings` memo every render).

Phase P2.1 (Supabase advisor hardening) complete:
- Migration `20260427100000_advisor_security_hardening` (applied to prod):
  - Dropped `Anyone can view avatars` SELECT policy on `storage.objects` so the public bucket no longer allows file enumeration. `getPublicUrl`/uploads still work.
  - Pinned `auth.uid()` in 4 client-called RPCs that took a viewer_id parameter: `get_round_reactions`, `get_social_feed_rounds`, `get_upcoming_rounds`, `is_friend_of_any_player`. Callers can now only query their own scope.
  - Membership-gated 3 watch-party RPCs (`get_watch_party_messages`, `get_watch_party_recipients`, `get_watch_party_stats`) — caller must be a player or watch-party member.
  - Added `SET search_path = public` to 9 trigger/utility functions (8 in main migration + `has_round_access` in followup).
- Advisor count: 66 → 57 WARN (9 fixed). Remaining 57 documented below.

Open items (Phase P2+):
- **Supabase security advisors** (now documented in `docs/supabase-advisors.md`):
  - 54x SECURITY DEFINER predicate functions internally use `auth.uid()` (migrations 20260427100000 + 20260428000000 + 20260518000000) — advisor still flags them but they're not exploitable.
  - 1x leaked-password protection — Supabase dashboard toggle (Auth → Settings → Auth Providers → Email).
  - 1x extension `pg_net` in public schema — cosmetic, low risk.
  - 2x INFO: `promo_codes` + `push_rate_limits` have RLS enabled with no policies (intentional deny-all; service role bypasses).
- File-size violators (>500 lines): `Scorecard.tsx` 732 (was 1123), `RoundComplete.tsx` 639 (was 976), `Profile.tsx` 709 (was 831), `Stats.tsx` 520 (was 833), `Home.tsx` 509 (was 699). Many P2.x splits already shipped — see phases below.
- Component/page test coverage is bootstrapping — Scorecard + NewRound have early-return smoke tests; rest of pages still untested.
- 14 lint warnings (all `react-refresh/only-export-components` HMR cosmetic, no functional impact).
- 19 lingering `useEffect` dep warnings (non-critical paths — review opportunistically).
- **Untracked working-tree decisions still pending**: `remotion/` (marketing video code in limbo), `brand/`, `Match Golf Documentation/`, `content/`, `public/audio/`, `public/screens/`, `out/` (rendered video output, NOT a build artifact). User must decide commit-or-gitignore for each.
- **29 historical RC webhook deliveries** in the dashboard still show Failure. Resend in the RC dashboard to backfill any test transactions / renewal events (David's INITIAL_PURCHASE on 2026-05-15 already resent and recovered).
- **PostHog free tier caps**: 2 alerts max + no scheduled subscriptions. Exception-anomaly alert and weekly Slack digest both blocked by paywall (dashboard itself exists at PostHog dashboard 1597463).

Phase P2.11 (subscription observability) — 2026-05-18:
- **First paying user identified:** David Hooper (auth user `ade8435c-233a-4c33-bdd7-eee2d29e443f`, Apple relay `gskvthf467@privaterelay.appleid.com`). Signed up 2026-05-15 12:54 UTC, fired `subscription_started` 14 min later at 13:08 UTC after `response.success === true` from RevenueCat. Profile still shows `subscription_tier: free` because the Supabase write path is broken at two points (see below).
- **Root cause of subscription pipeline outage:** `subscription-webhook` was deployed with Supabase's default `verify_jwt = true`. RevenueCat sends `Authorization: Bearer <REVENUECAT_WEBHOOK_AUTH>` (a random shared secret, not a Supabase JWT), so Supabase's API gateway rejected every webhook with 401 *before the function code ran* — that's why edge function logs were empty and `subscription_transactions` was empty across all time. Every RC webhook delivery since 2026-02-26 (~30 deliveries) shows Failure in the RC dashboard for the same reason. Fixed in `supabase/config.toml` by adding `[functions.subscription-webhook] verify_jwt = false`. The function still validates the `REVENUECAT_WEBHOOK_AUTH` bearer at line 300, so disabling the platform-level JWT check does not weaken auth. **Requires `supabase functions deploy subscription-webhook` to take effect in prod.** After deploy, retry the failed deliveries from the RC dashboard (or wait for the next renewal) to auto-recover David's row via the webhook's `INITIAL_PURCHASE` upsert path.
- **Silent failure in `syncSubscriptionToSupabase`** (`src/services/purchases.ts`): previously all three failure paths used `logger.warn`, which does not report to Sentry unless `report: true` is passed (see `src/lib/logger.ts:53-60`). All three branches now use `logger.error`, which auto-reports in production. Call site in `purchasePackage` now escalates to `logger.error` when `response.success === true` but `synced === false` (Apple charged, Supabase didn't record).
- Pending: (1) recover David's `subscriptions` row once `original_transaction_id`/`product_id`/`expires_at` are pulled from the RevenueCat dashboard, (2) verify and re-configure the RevenueCat webhook endpoint + auth header.
- **Resolved 2026-05-18 (later same day):** David's row recovered with full RC data via webhook retry. `subscriptions.product_id=dev.matchgolf.pro_annual`, `original_transaction_id=200003362012807`, `expires_at=2027-05-15 13:08:33+00`. First `subscription_transactions` row in DB ever. Pipeline fully functional going forward.

Phase P2.12 (cleanup sweep + analytics) — 2026-05-18:
- **Sentry webhook unblocked**: same JWT-gateway bug as `subscription-webhook`. Added `[functions.sentry-webhook] verify_jwt = false` to `supabase/config.toml`, redeployed via MCP (v9). `redeem-promo` audited and intentionally left as `verify_jwt = true` (uses Supabase `auth.getUser()`). Smoke-tested both with bogus bearer.
- **Security migration `20260518000000_close_remaining_advisor_gaps`** (applied to prod): closed 2 real exploits found by the audit — `handle_new_user()` and `check_push_rate_limit(p_user_id, ...)` are now revoked from `anon`, `authenticated`, `PUBLIC`. `get_social_feed_round_ids(viewer_id)` rewritten to pin `auth.uid()` internally (matches sibling `get_social_feed_rounds` from migration `20260427100000`). 3 lower-priority items (`is_round_complete`, `lookup_round_by_join_code` — intentional, `get_social_feed_round_ids` variant) are documented in `docs/supabase-advisors.md`.
- **`.gitignore` hygiene**: 4 entries added (`.claude-flow/`, `.agents/`, `.playwright-mcp/`, `ios/App/.claude-flow/`). 67 untracked files → ~50 (the remaining ~50 are marketing/asset directories pending user decision).
- **iOS CI added**: new GHA job `ios-sync-check` on `macos-latest` (~25 min, Pods cached by Podfile.lock hash). Runs `bun install` + `bun run build` + `bunx cap sync ios` + `pod install`. Catches Capacitor/CocoaPods drift before App Store submission.
- **Three file splits** (P2.x continuation):
  - `formatStepSections.tsx` 785 → 12 (barrel) + 10 files under `src/components/golf/formatSections/`.
  - `GroupLedgerView.tsx` 716 → 391 + 6 files under `src/components/groups/ledger/`.
  - `houseGame/primitives.ts` 742 → 48 (barrel) + 8 files under `src/lib/houseGame/primitives/`.
- **PostHog ↔ Slack** (Match Golf workspace, integration id 172350):
  - Layer 1 (real-time → `#match-events`, channel `C0B4H4G6EM7`): 4 destinations on `subscription_started` / `user_signed_up` / `subscription_restored` / `Application installed`.
  - Layer 2 (alerts → `#match-alerts`, channel `C0B4BT8UR7F`): insights `SYo55j3o` + `Me67c7Jz` paired with alerts that fire when value < 1 on the trailing 7d / 24h windows. Internal destinations route firing events. **3rd alert (exception anomaly) blocked by 2-alert free-tier cap** — use Sentry → Slack instead for error spikes.
  - Layer 3 (weekly digest → `#match-weekly`, channel `C0B4D7AL8QN`): dashboard 1597463 ("MATCH Golf — Weekly Health") with 5 tiles (signups, paying customers, rounds completed, DAU, exceptions). **Scheduled subscription blocked by free-tier paywall** — dashboard is built and pinned-ready, user has to either upgrade PostHog or wire a Supabase cron → PostHog query → Slack webhook as a workaround.

Phase P2.13 (friend search — every user has a searchable name) — 2026-05-18:
- **Symptom:** paying user David Hooper (and 8 others) could not be found in the "by name" friend search. Root cause: Apple Sign-In delivers the user's name in the native credential, **not** in the identity-token JWT. `handle_new_user()` fires on the `auth.users` INSERT during `signInWithIdToken()` — before the name is available — so `profiles.full_name` was created `NULL`. The app then calls `supabase.auth.updateUser()` which writes the name into `auth.users` metadata, but nothing propagated it to `public.profiles`. `searchByName` runs `full_name ILIKE '%q%'`, which never matches `NULL`. 9 of 58 profiles (all Apple sign-ins) were affected.
- **Migration `20260518100000_sync_user_name_to_profile`** (applied to prod): (1) backfilled all 9 null `profiles.full_name` from `auth.users.raw_user_meta_data->>'full_name'` (all 9 had a name stranded in metadata); (2) `handle_new_user()` now trims the name and normalises empty→NULL on INSERT; (3) new `sync_user_name_to_profile()` + `on_auth_user_updated_sync_name` trigger — `AFTER UPDATE ON auth.users` (guarded by `WHEN old.raw_user_meta_data IS DISTINCT FROM new.raw_user_meta_data`) copies the metadata name into `profiles.full_name` whenever the profile name is still empty. This auto-catches the post-sign-in `updateUser()` call. Only fills NULL/empty, so a user's manual profile edit is never clobbered. The new trigger function is `REVOKE`d from `anon/authenticated/public` (CVE hygiene; PG doesn't check EXECUTE on trigger functions so the trigger still fires).
- **`src/hooks/useAuth.tsx`** — `signInWithAppleAuth` now writes the Apple name directly to `profiles` (`.update({ full_name }).eq('id', …).is('full_name', null)`) in addition to `updateUser()`, so the name is searchable immediately without waiting on the trigger.
- **`src/pages/Onboarding.tsx`** — added a required "What's your name?" step as **step 1 of 6** (was 5 steps). Pre-filled from the existing profile; `validatePlayerName` enforced; Continue disabled + Skip hidden when empty. Guarantees users whose name Apple never returned (e.g. re-install) still get one. Step counter is now dynamic (`Step {n} of {STEPS.length}`).
- Test baseline unchanged: **1204 pass + 3 page tests**. Build + lint clean.

Phase P2.13b (profile contact-field normalization — search reliability) — 2026-05-18:
- **Audit of the onboarding → profiles → friend-search pipeline.** Current data was clean (0 uppercase emails, 0 untrimmed names, all 5 stored phones digit-only) but the pipeline had **latent** bugs that would corrupt search the moment a user entered a formatted phone or mixed-case email:
  - Phone was stored as typed. `searchByName`/`sendFriendRequestByPhone` strip formatting to digits for the query — so a phone stored `(555) 123-4567` would never match an `ILIKE %5551234567%`.
  - `sendFriendRequestByEmail` uses exact match (`.eq`); a mixed-case stored email would miss a lowercased query.
  - `searchByName`/`searchByCode` did not trim the input query — a search with stray spaces failed the `ILIKE`/`.eq`.
- **Migration `20260518110000_normalize_profile_contact_fields`** (applied to prod): new `normalize_profile_fields()` + `normalize_profile_fields_trigger` (`BEFORE INSERT OR UPDATE ON public.profiles`) canonicalises every write regardless of caller — `full_name` trimmed, `email` lowercased+trimmed, `phone` reduced to digits only (empty→NULL). Existing rows backfilled. Verified live: writing `(515) 249-6053` / `GsKvThF467@PrivateRelay.AppleID.com` stored as `5152496053` / `gskvthf467@privaterelay.appleid.com`. Function `REVOKE`d from `anon/authenticated/public`.
- **App-side** (single canonical form, matches the trigger): new `normalizePhone()` helper in `src/lib/validation.ts` (digits only). `useFriends.ts` — `searchByName`/`searchByCode` now trim the query; all phone normalization routed through `normalizePhone`. `Profile.tsx` — `canonicalPhone` uses `normalizePhone` so autosave change-detection settles (no infinite save loop now that the DB stores digits-only). `Onboarding.tsx` — phone normalized to digits before save. `useProfile.ts` — `updateProfile` now syncs local state from the DB-returned row (`.select().single()`) so server-side normalization is reflected without a refetch.
- **RLS note:** the `profiles` SELECT policy `Authenticated users can view any profile for discovery` (`auth.uid() IS NOT NULL`) makes every profile searchable to any authenticated user — search is not RLS-gated. The narrower `Users can search profiles` policy is effectively superseded by it. Intentional for friend discovery; flagged here for awareness.
- **Not done (product decision):** onboarding still does not collect a discovery email — Apple users keep their `@privaterelay.appleid.com` address until they set a real one in Profile. They remain findable by name, friend code, and phone.
- Test baseline unchanged: **1204 pass + 3 page tests**. Build + lint clean.

Phase P2.3 (Scorecard split) — multi-wave:
- Extracted `sendRoundCompletionNotifications` (73 lines) → `src/lib/roundCompletionNotifier.ts`.
- Extracted `fireScoreSideEffects` (47 lines) → `src/lib/scoreSideEffects.ts` (hole-in-one / eagle / score-entered-for-you push notifications).
- Extracted Nassau auto-press effect (53 lines) → `src/hooks/useNassauAutoPress.ts`.
- Extracted house-game birdie-press effect (32 lines) → `src/hooks/useBirdiePress.ts`.
- Extracted loading + "round not found" UI (~80 lines) → `src/components/golf/ScorecardEmptyStates.tsx` exporting `<ScorecardLoading />` and `<ScorecardNotFound />`.
- Extracted `handleFinishRound` + `handleFinishWithWinner` (~28 lines) → `src/hooks/useFinishRound.ts`.
- Result: `Scorecard.tsx` 1123 → 844 lines (−25%). Still over the 500-line target. P2.3 queued: remaining handler hooks (`handleSaveScore`, `handleQuickScore`, `handleScoreSelect`, `handlePickup`) + render-subtree extractions (header bar / banner stack / hole nav).

Phase P2.10 (Home split) — first wave:
- Extracted 3 sub-components from inline definitions → `src/components/home/HomeRoundCard.tsx`:
  - `HomeRoundCard` (was `B_RoundCard`, ~163 lines): the dual-mode round card (dark for live with progress bar / white for completed) with delete button + Solo pill.
  - `HomeSectionLabel`, `NapkinMark`: small layout primitives.
- Result: `Home.tsx` 699 → 509 lines (−27%, just 9 over target). Remaining body is page-level data wiring + a long render tree.

Phase P2.9 (Profile split) — first wave:
- Extracted 4 layout primitives (`RowLabel`, `Row`, `SectionLabel`, `Card`) → `src/components/profile/ProfileRowPrimitives.tsx`. Reusable across any future settings-style screen.
- Extracted notifications section (~88 lines) → `src/components/profile/NotificationSettings.tsx`. Native-only (returns null on web). Owns toggle row UX; parent owns persistent state.
- Result: `Profile.tsx` 831 → 709 lines (−15%).

Phase P2.8 (Stats split) — first wave:
- Extracted 3 animation primitives (`CountUp`, `RingProgress`, `StatBar` ~95 lines) → `src/components/stats/StatsAnimations.tsx`. Reusable across the stats page and any future stat surfaces.
- Extracted `fetchStats` (~205 lines of supabase aggregation) → `src/lib/computeUserStats.ts`. Pure async helper that takes `(userId, supabaseClient)` and returns a typed `GolfStats`. Caller owns loading state and error UI. The `GolfStats` + `ScoreDistribution` types now live in the lib (re-imported as a type-only import from the page).
- Result: `Stats.tsx` 833 → 520 lines (−38%). Just over the 500-line target; the remaining body is mostly the JSX render tree, broken further only by extracting visual sections.

Phase P2.1b (predicate hardening) complete:
- Migration `20260428000000_pin_auth_uid_in_predicates` (applied to prod): 13 SECURITY DEFINER predicate functions now ignore their `_user_id` parameter and use `auth.uid()` internally. RLS policies still pass `auth.uid()` through the param so behavior inside policies is unchanged. Functions: `is_round_owner`, `is_round_participant`, `has_round_access`, `can_edit_round`, `is_round_creator`, `is_scorekeeper`, `is_group_owner`, `is_group_member`, `is_watch_party_member`, `is_pro_user`, `are_friends` (caller must be one of the two parties), `get_friend_count`, `get_group_count`.
- The advisor still flags these because it does a static check (SECURITY DEFINER + REST-callable). The actual exploitability is closed. Verified: calling each predicate from an admin/null-auth context returns `false`/`0` for unrelated ids.

Phase P2.7 (RoundComplete split) — multi-wave:
- Extracted big-settlement notification effect (~42 lines) → `src/hooks/useBigSettlementNotifier.ts`. One-shot push when any profiled player crosses ±$threshold for the round; only the scorekeeper triggers it. Threshold defaults to $20 and is now configurable.
- Extracted house-game share text builder (~25 lines) → `src/lib/shareHouseGameText.ts` (pure, 8 unit tests). Matches existing string format including the `$-N` quirk (preserves the `$` before negatives by design — documented in tests).
- **P2.7b sweep:** Extracted derived state into two hooks in `src/hooks/useRoundCompleteState.ts`:
  - `useRoundCompletePlayers({ round, rawPlayers, rawScores, useNetScoring })` returns `playersWithScores`, `strokesPerHoleMap`, `matchPlayResult`, `sortedPlayers`, `winner`, `hasTie`, `ghostPlayerIds`. Has no game-results dependency so it runs before `useGameResults`.
  - `useRoundCompleteSettlements({ round, rawPlayers, rawScores, playersWithScores, matchPlayResult, ghostPlayerIds, gameResults, propBets })` returns `settlements`, `ghostPotEntries`, `ghostPotAmount`, `nonGhostSettlements`, `houseGameConfig`, `houseGameSettlements`, `isRainShortened`, `wonJunkBets`, `junkSummary`. Runs after `useGameResults`.
- Extracted "Add to Group Tab" handler + state (~55 lines) → `src/hooks/useAddToTab.ts`. Owns `addingToTab`, `addedToGroupId`, `showGroupPicker`, and the `handleAddToTab(groupId)` handler that builds per-player ledger entries from settlements, calls `syncRoundToLedger`, and pushes to profiles that owe money.
- Extracted image/text share handlers (~52 lines) → `src/hooks/useRoundShareHandlers.ts`. Owns `isSharing`, `shareMode`, and the `handleShareImage`/`handleShareText` handlers (image falls back to text on failure).
- Result: `RoundComplete.tsx` 931 → 639 lines (−31%). Still over 500-line target; remaining mass is the JSX render tree (Ghost Pot card, House Game settlement card, Custom Rules section, Junk Bets section, Add to Group Tab modal stack — ~250 lines combined). Each is a candidate for a `src/components/golf/*` extraction in a follow-up wave.

Phase P2.6 (NewRound split) — multi-wave:
- Extracted format-active sync effect (~37 lines) → `src/hooks/useFormatActiveSync.ts`. When a saved format becomes active the hook saves all 11 toggle values, disables them, and restores them on deselect.
- Extracted `games[]` array construction (~128 lines) → `src/lib/buildGamesFromToggles.ts`. Pure function with a typed input surface and a `(generateId)` injection seam for testability. Encapsulates all the player-count gates and the house-game/personal-format inclusion rules. **20 unit tests** cover every gate and ordering rule.
- Extracted solo-round flow (~41 lines) → `src/lib/createSoloRound.ts`. Pure async helper returning a discriminated `{ ok, ...}` outcome. Page owns isCreating + toast presentation.
- Extracted API course selection flow (~80 lines: 5 useStates + 3 handlers + finalize helper) → `src/hooks/useApiCourseSelection.ts`. Encapsulates the search → tee dialog → finalize sequence; page reads exposed state for prop wiring.
- Result: `NewRound.tsx` 1100 → 892 lines (−19%).

Phase P2.5 (FormatStep split) complete:
- Extracted saved-formats picker UI (~150 lines) → `src/components/golf/SavedFormatsPicker.tsx`.
- Lifted shared style constants (`gameCardBase`, `gameCardSelected`, `iconBoxClass`, `iconClass`, `springTransition`, `sectionLabel`) to `src/components/golf/formatStepStyles.ts`.
- Extracted Match Play section (~145 lines) → `src/components/golf/MatchPlaySection.tsx`.
- **P2.5b sweep:** Extracted all 8 remaining game-toggle sections (Skins, Nassau, Stableford, Best Ball, Wolf, Vegas, Nines, Defender, Sixes) plus the shared `<ProLabel>` component → single barrel file `src/components/golf/formatStepSections.tsx`. Each section is a typed component that accepts only the state + handlers it needs and an `onProFeatureBlock(label)` callback so the parent owns paywall presentation.
- **Result: `FormatStep.tsx` 1224 → 365 lines (−70%, now under the 500-line target).** Only Stroke Play (~22 lines, trivial) remains inline alongside section orchestration and the `PaywallModal`.

Phase P2.4 (page smoke tests) — partial / rolled back:
- Page tests for Scorecard + NewRound were authored but reverted because `vi.mock`-style hook stubs leaked into downstream test files in CI's shared-worker model (broke 75+ unrelated tests). Approach to revisit: dynamic `await import` + `mock.module` per-test to keep mocks scoped, or run page tests as a separate `bun test` invocation.
- **Test-infra improvements retained** in `src/test/setup.ts`:
  - Idempotent `customElements.define` stub (number-flow registers a custom element at import time).
  - `mock.module()` stubs for `@capacitor/core`, `@capacitor/app`, `@capacitor/status-bar`, `@capacitor/haptics`, `@capacitor/push-notifications`, `@capacitor/splash-screen`, `@capacitor-community/keep-awake`, `@capacitor-community/apple-sign-in`, `@capacitor-community/contacts`. Required because `@capacitor/*/dist/plugin.cjs.js` calls `require('@capacitor/core').registerPlugin(...)` at module init, which `vi.mock`'s ESM-only interception cannot stub on Linux.
  - `import.meta.env` mirroring from `process.env` so `import.meta.env.VITE_*` resolves in the test runner where bun does not auto-load `.env` (e.g., CI).
Phase P2.2 + P2.2b (bundle profiling + on-demand QR) complete:
- Added `vendor-sentry` (262 kB), `vendor-posthog` (184 kB), `vendor-capacitor` (12 kB) to `manualChunks` in `vite.config.ts`. Removed `vendor-qr` grouping.
- `QRCodeScanner.tsx` switched to dynamic `await import('html5-qrcode')` inside the effect — `Html5Qrcode` is type-only at the module level. Result: 334 kB QR library now ships in its own lazy chunk loaded only when the scanner opens.
- Result: **main `index.js` 515 kB → 58.7 kB (−89%)**, gzip 170 kB → 19.5 kB. JoinRound chunk dropped from 88 kB → 4 kB. Initial app load no longer pays for QR scanning, error tracking SDK, analytics SDK, or Capacitor wrappers up front; each is a separate parallel-cacheable chunk.
- **GitHub secret `VITE_SUPABASE_PUBLISHABLE_KEY`** still needs to be added to the repo's Actions secrets so CI builds succeed. (Repo Settings → Secrets and variables → Actions → New repository secret.) The publishable key is the same anon key used in `.env`.

---

Phase P3.1 (v2.5 polish, in progress) — 2026-11-21:
- `index.html` CSP `connect-src` now allows `https://us-assets.i.posthog.com` — PostHog's remote config fetch was being blocked on every page load.
- New `src/lib/houseGame/suggestFormatName.ts` (7 tests): AI Game Builder confirm screen pre-fills a name built from the detected formats (e.g. `$5 Nassau + Presses`) instead of a truncated description.
- `HouseGameConfirm.tsx` header now reads `N of M selected` (low-confidence rules start unchecked), so it no longer looks like it contradicts "Found M rules".
- Local screenshot harness: `vite --host 127.0.0.1` (the `::` host in `vite.config.ts` fails in IPv4-only containers) plus a `.env.local` (gitignored) holding the Supabase URL and publishable key.
- **Money defects M1–M11 (Notion 09.2) all fixed** — see Phase P3.2 below.
- **Paywall** (`PaywallModal.tsx` + new `paywallCopy.ts`, 5 tests): plan cards with price now sit in the sticky footer beside the CTA (price/features were previously hidden behind the footer, an App Review 3.1.2 risk). Feature list leads with the AI Game Builder and is test-checked against `TIER_LIMITS`. Savings computed and rounded down (47%, was a hardcoded 48%). Headline adapts to the triggering feature.
- **App Store review prompt**: `@capacitor-community/in-app-review@6.0.0`; policy in `src/lib/reviewPrompt.ts` (3+ completed rounds on this device, finished up money, not solo, 120-day cooldown); `useReviewPrompt` on RoundComplete. Mocked in `src/test/setup.ts`. **Requires `npx cap sync ios` + `pod install` on the Mac before archiving.**
- **Invite your group** row on Home (`components/home/InviteFriendsRow.tsx`, `lib/inviteFriends.ts`): shares App Store link (`id6758272932`) + friend code; PostHog event `invite_shared`.
- **Version bumped to 2.5 (7)** in `project.pbxproj`.
- **Domain inconsistency (open):** universal-link docs in `useDeepLinks.ts` say `matchgolf.app`, iOS entitlement allows only `matchgolf.dev`, legal links use `matchgolf.info`. Invites therefore use the App Store link, not an https deep link. Pick one canonical domain before relying on universal links.
- **Supabase outage found 2026-11-21:** project `Fairways` was paused (INACTIVE), so the live app's backend was down. Restored after pausing `Loudcall US` (user's choice) to stay within the free plan's 2-active-project limit. Free projects re-pause after ~1 week idle; upgrading the org to Pro prevents this.
- **`parse-house-game` deployed (v23)** with `format_nines` (M10). Deployed from the *live* source plus that one line, NOT the repo file: the repo version differs from prod (CORS allowlist, required Bearer header) and that drift was not deployed. Verified live: a Nines description returns `format_nines`. A prompt hint explaining Nines scoring is in the repo but not yet deployed.
- **Version is now 3.0 (8)** (P3.5).

Phase P3.2 (money calculation defects, Notion "09.2 Money Calculation Defects") — 2026-11-21:
- **M1** Nines/Defender/Sixes paid $0: 9 call sites passed `HoleInfo[]` as `holesPlayed`. Now `holeInfo.length` in `GamesSection.tsx`, `useGameResults.ts`, `moneyTracker.ts`, `games/houseGame.ts`.
- **M2** Vegas scored ≤1 hole: carryover boolean was passed as `holesPlayed`. Net strokes + carryover flag now passed in the right positions.
- **M3** Live tracker halved Vegas. `teamXEarnings` is $ per player; tracker no longer divides by 2.
- **M4** Match play = **flat stake on the match** (product decision). Live tracker credits the current leader once; `useRoundCompleteState` uses the match game's own `stakes` (same source as the preview).
- **M5** `useSettlementPreview` now calls `useGameResults` and passes Wolf/Vegas/Nines/Defender/Sixes/house game to `calculateSettlement`. Return type fixed to `NetSettlement[]`.
- **M6** Wolf zero-sum: largest-remainder split of lone-wolf hunter shares; 3-player partnered (2-v-1) holes charge the lone hunter both winners' share.
- **M7** Skins: players pay only for skins awarded; unresolved carryover/ties are **refunded** (product decision). Old C-4 tests asserted the leak and were updated.
- **M8** New `src/lib/buildLedgerEntries.ts`: guest balances go to the **round host** (`rounds.created_by` → new `Round.createdBy`); refused with a named error if the host isn't playing.
- **M9** New `isPenaltyPropBet()` in `types/betting.ts`; snake debits the recorded player in `settlement.ts` and `moneyTracker.ts`. `PropBetSheet` says "Who 3-putted?" / "X pays $N each".
- **M10** `format_nines` added to `parse-house-game` VALID_IDS + prompt. `parserParity.test.ts` fails if any catalogue primitive is missing from either list. **Edge function must be redeployed for this to take effect.**
- **M11** `useOfflineSync` upserts on `player_id,hole_number`; no false "synced" toast; failures → `logger.error` (Sentry).
- **Typecheck ratchet:** `scripts/typecheck-ratchet.sh` runs in CI (baseline **157** `tsc` errors (was 220 → 204 → 197 → 196 → 167 → 161 → 157)). Lower `TS_BASELINE` as errors are fixed; never raise it.
- New regression tests call the calculators the way the app does (`moneyTracker.callsites.test.ts`) plus randomised zero-sum invariants for Wolf and Skins.

Phase P3.3 (design system v5 "Fairway Day") — 2026-11-21/22, **complete**:
- User picked direction 08 "Fairway Day" from 10 light-mode directions (design canvas artifact "MATCH Design Directions"). Rationale: golfers use the app in full sun, so light mode with dark accents, big numerals, 44px+ targets.
- **Spec: `docs/design/fairway-day.md`** (source of truth for app AND marketing site). Forest `#14532D` primary, lime `#BEF264` highlight (in the `--gold` token slot), ink `#0F1F17`, ground `#FAFAF7`, Sora font, 20px radius. Money: won = Forest, owed = `#B42318`.
- Foundation commit `e5064d3`: tokens in `src/index.css`, Sora in `index.html` + `tailwind.config.ts`, brand hex literals swapped 1:1 in 105 files (#F0EE3A→#BEF264, #0A0A0A→#0F1F17, #F8F8F6/#F5F5F0→#FAFAF7; arbitrary hex kept so `/opacity` modifiers work).
- `scripts/design-screens.cjs`: Playwright harness with a mocked Supabase backend + realistic in-progress round (`BASE` env for port; run vite with `--host 127.0.0.1`; needs `.env.local`).
- 5 agents redesign by area (scoring, round setup + AI builder, results + stats, home + social, shell + account + ui primitives) in separate worktrees; lead merges.
- The website session (matchgolf.info redesign) was sent the full spec.
- **All 5 areas merged** into `claude/matchplay-golf-app-2hb6ib` (merge commits 032adab results/stats, 4e19d47 shell/primitives/account, 8ceee3a scoring, fca0036 home/social/groups, 4157077 setup/AI builder). Agents' worktrees were created from old `main`; each fast-forwarded to `fb6aaa3` first.
- New shared pieces: `src/components/golf/setupUi.tsx` + `setupStyles.ts` (hero card, chips, primary button), `src/components/golf/scorecard/` (ScoreMark, LeaderboardParts), `src/components/golf/results/`, `src/components/stats/` sections, `components/home/HomeHero|HomeActionRow|HomeSections|JoinRoundModal`, `components/profile/ProfileHeader|ProfilePlanCard|TeePreferencePicker|DeleteAccountDialog`, `components/onboarding/OnboardingParts.tsx`, `components/auth/AuthFields.tsx`, `layout/PageHeader.tsx` + `LegalPageLayout.tsx`, `games/money.ts` (`signedMoney()`).
- New tokens: `loss` (#B42318), `on-forest-muted` (#CFE3D6); `--destructive` = loss red. `.data-label`/`.label-sm` are now sentence case.
- Bugs fixed during redesign: tee-sheet close crash (NewRound called nonexistent setters); group-tab ledger rendered under the list (z-10→z-20); "Add to group tab" hidden behind results footer; `$-28` money formatting + missing minus signs in Defender/Nines/Sixes/Vegas; share push used nonexistent `round.course_name`; finish overlay said "All 18 holes" on 9-hole rounds; plus-handicap shown for normal handicaps on friend cards; AI builder/edit Save buttons under the bottom nav (BottomNav now hides on `/my-formats/new`, `/my-formats/:id/edit`, `/groups/:id/house-game/new|edit`).
- e2e selectors updated: `money-tracker.spec.ts` → `getByTestId('money-tracker')`; `ai-game-builder.spec.ts` → `rule-toggle` test id + `data-state`. Still stale (not run in CI): phase02 2.13 `.grid-cols-3 .rounded-2xl p.text-[28px]`, and 2.2 expects Active/Watching/Rounds on a brand-new account (now hidden until the user has rounds).
- File sizes after: Scorecard 631 (still >500: what remains is prop-wiring to already-extracted components; accepted exception), Auth 442; RoundComplete 397, Profile 493, Stats 167, Home 293, NewRound 493, HouseGameConfirm 401, Leaderboard 434.
- Done (P3.5): ScoreMark unified in `ui/score-mark.tsx`, CollapsibleSection deleted, live-money mismatch fixed. Open follow-ups: RoundDashboard, WatchParty, dashboard cards and rarer sheets only got colour/label passes; `pull-to-refresh.tsx` scrollTop check on pages where `main` scrolls.
- **Screenshot harness gotcha:** never run two vite dev servers against the same `node_modules` (e.g. a symlinked worktree): they share `node_modules/.vite` and corrupt each other's deps cache ("Invalid hook call"/duplicate React, every screen shows the error boundary). Clear `node_modules/.vite` and run one server.
- Before/after comparison page: artifact "Fairway Day Redesign" (https://claude.ai/artifact/4FxF3oXEPreUVEWH8qM2hm).

Phase P3.4 (TestFlight CI) — 2026-11-21:
- New `.github/workflows/testflight.yml` (macos-15): on push to `main` (docs/md changes ignored) and manual dispatch → JS deps → unit tests gate → `bun run build` → `npx cap sync ios` → `pod install` → `bundle exec fastlane ci_beta`. Concurrency group `testflight` prevents parallel uploads. Skips with a warning until signing secrets exist. IPA + dSYMs kept 14 days as an artifact.
- New `ci_beta` lane in `ios/App/fastlane/Fastfile`: `setup_ci` temp keychain, App Store Connect **API key** auth (no Apple ID/2FA), imports the Apple Distribution .p12, `get_provisioning_profile`, switches the App target to manual signing for Release **only on the runner** (committed project stays Automatic), build number = max(latest TestFlight build for this version, project build) + 1, `upload_to_testflight`. `TEAM_ID = YPMSN56J9D`.
- **P3.4b (no-Mac releases, 2026-11-23):** `ci_beta` now uses **cloud-managed signing** by default: automatic signing, plus `-allowProvisioningUpdates -authenticationKeyPath/ID/IssuerID` passed to the archive via `xcargs` (do NOT also pass `export_xcargs`: gym 2.242 adds the key to `-exportArchive` itself, and xcodebuild exits 64 with "'-authenticationKeyPath' may only be provided once"), with `export_options: { signingStyle: automatic }`. No `.p12` is needed. The manual `.p12` path is kept as a fallback when `IOS_DIST_CERT_P12_BASE64` is set. Optional App Store submission: `SUBMIT_FOR_REVIEW=true` makes the lane wait for processing, then run `upload_to_app_store` with `skip_binary_upload`, `skip_screenshots`, "What's New" = `RELEASE_NOTES`, `submit_for_review`, `automatic_release` (default true) and precheck off. The workflow_dispatch inputs are `changelog`, `submit_for_review`, `release_notes` and `automatic_release`, so Claude can trigger a TestFlight build or a full review submission with `mcp__github__actions_run_trigger` (workflow `testflight.yml`, ref `main`).
- **Secrets the user must add once** (browser-only guide: `docs/testflight-ci.md`): `ASC_KEY_ID`, `ASC_ISSUER_ID`, and `ASC_KEY_P8` (the .p8 text pasted as-is; `ASC_KEY_P8_BASE64` is also accepted). The API key **must have the Admin role**, for cloud-managed certs. `VITE_SUPABASE_PUBLISHABLE_KEY` already exists. Not yet run end-to-end: needs those secrets. Each release still needs a `MARKETING_VERSION` bump, and App Store metadata/screenshots must already be in App Store Connect (CI only sets "What's New").
- **v3.0 merged to `main`** on 2026-11-23 (PR #3, merge commit `3909868`). The first TestFlight workflow run on `main` skips until the three ASC secrets are added.
- **TestFlight build fix (2026-11-23):** Vite lets an *exported empty* `VITE_*` variable override `.env.production`, so passing missing secrets as `''` would have built an app with no Supabase key (reproduced: bundle had no anon key). The build step now unsets empty `VITE_*` vars and fails if the Supabase URL or key is missing from `dist/assets`. `VITE_SUPABASE_PUBLISHABLE_KEY` is no longer a required secret for TestFlight, because the public anon key is committed in `.env.production`. The three ASC secrets were added by the user on 2026-11-23; the key ID is `H6T3JCJUZZ`.
- **First CI build (run 3) found two more release blockers, both fixed:** (1) `Info.plist` hardcoded `CFBundleShortVersionString` 2.4 / `CFBundleVersion` 6, which overrides the project's `MARKETING_VERSION`/`CURRENT_PROJECT_VERSION`, so even a local Xcode archive would have shipped as 2.4. Both now read `$(MARKETING_VERSION)` / `$(CURRENT_PROJECT_VERSION)`. (2) `App/Config.xcconfig` is gitignored but referenced as the project's base config. The workflow writes an empty placeholder, since `REVENUECAT_API_KEY` is in the App target build settings. The ASC API key auth was verified working in that run (it read TestFlight build 6 of 2.4).
- **First successful Mac-free TestFlight upload: 3.0 (9)** on 2026-11-23 (run 5, `45164729342`, branch head `f3e135e`, about 10 min end to end). Cloud-managed signing, export, upload, Apple processing, changelog and internal-tester distribution all succeeded. **These CI fixes (`9f0f00b`, `8f1b79b`, `f3e135e`) are on `claude/matchplay-golf-app-2hb6ib`, not yet on `main`**, so a push to `main` still runs the old workflow until they are merged. The next build number will be 10.

Phase P3.5 (v3.0 release hardening) — 2026-11-22/23:
- **Version 3.0 (8)** in `project.pbxproj` (was 2.5 (7)); the Fairway Day redesign is a major version.
- **Scorecard resumes on the current hole**: it always opened on hole 1. New `lib/scorecardProgress.ts` (`resumeHole`, `lastScoredHole`, `liveMoneyThroughHole`, 8 tests) + `hooks/useResumeHole.ts` (moves once per round after data loads).
- **Live money consistency**: `MoneyTracker` computed only up to the *viewed* hole ("All even" on hole 1 while games showed +$14). Now computes through max(viewed, latest scored hole).
- **Match-result notifications never fired**: `roundCompletionNotifier` searched for game type `'match_play'`; rounds store `'match'`. Its tests used the same wrong literal. Fixed code + tests.
- **AI Game Builder voice input never worked**: it passed `onTranscript`/`continuous` options that `useVoiceRecognition` doesn't accept. Now reads the hook's `transcript` and appends each phrase once.
- **Notifications "Open Settings" did nothing**: `@capacitor/app` has no `openUrl`. Added **`@capacitor/app-launcher@6.0.4`** (native: needs `npx cap sync ios` + `pod install`), mocked in `src/test/setup.ts`.
- House-game share text printed "Invalid Date" (`round.date` → `round.createdAt`); `calculateMatchPlay` early return now includes `format`.
- These four bugs were found by triaging TypeScript errors (TS2367 impossible comparison, TS2339 missing property, TS2353 unknown option). Keep doing this as the baseline falls.
- Refactors: `ui/score-mark.tsx` (`ScoreMarkShape` + `ScoreMark`) with helpers in `lib/scoreMarks.ts`; `golf/scorecard/ScorecardBody.tsx` (Scorecard 714 → 631); `components/auth/GolfCanvas.tsx` (Auth 547 → 442); `CollapsibleSection.tsx` deleted.
- **`parse-house-game` v24 deployed** = previous live source + Nines disambiguation hint. Verified live: a Nines description returns only `format_nines`, unit $2, full handicaps (no invented front/back-nine rule). **Repo/prod drift remains by design**: the repo file additionally has a CORS allowlist and a required Bearer check that were never deployed or device-tested. Test on a TestFlight build before deploying the repo version.
- **e2e (Playwright) fixes**: round helpers in phase06/09/10/20/22 tap "With others" first (mode step; broken before the redesign); `mockAuth` dismisses the scorecard voice tutorial (`match-golf-settings`), whose overlay blocked clicks; phase02 2.2/2.13 no longer assume the shared e2e account is empty. Verified: phase02 14/14, money-tracker 2/2, phase09, ai-game-builder + phase06 + phase10 39/39 (game-name tests use `#format-name`, hole nav uses the `Next hole`/`Previous hole` labels, dashboard test waits for the round name). Not run: `ai-builder-comprehensive`/`ai-builder-scoring` (they call the real AI parser on prod and bill the Anthropic key) and the remaining phase specs.
- **e2e note**: several e2e specs create real rounds in the **production** Supabase project under a shared test account (e.g. the leftover "Double Click Test" live round). Consider pointing e2e at a Supabase branch.
- Running e2e locally: the repo's Playwright expects a browser build that isn't installed in cloud containers; use a temporary config with `launchOptions.executablePath: '/opt/pw-browsers/chromium'`, `webServer: undefined`, `baseURL: http://127.0.0.1:8080` and start vite yourself with `--host 127.0.0.1`.

Phase P3.6 (3.1 "say it and play" AI round builder) — 2026-11-23, in progress on `claude/matchplay-golf-app-2hb6ib`:
- **Bug fixed: Start round after building an AI game did nothing.** `HouseGameConfirm` → `/new-round` with `preSelectFormatId` jumped to the format step with no course; `useStartRound` returned silently without a course. Now starts at the course step with the format selected, and `useStartRound` toasts "Pick a course first".
- **Bug fixed: fourball match / best ball teams never matched players.** Teams were built from setup-screen ids; `players` rows got DB-generated ids. `useCreateSupabaseRound` now generates player ids client-side and remaps team `playerIds` (`src/lib/remapTeamIds.ts`, tested). Callers pass `localId` per player.
- **Core workflow is now `/play` (`src/pages/QuickRound.tsx`)**: say/type the round -> review -> Tee off -> `/round/:id`. Home hero is `HomeComposer` (compact variant under a live round); the centre tab is a mic to `/play`; "Set up by hand" still goes to `/new-round`.
- **Engine `src/lib/roundPlan/`** (pure, 55 tests in `roundPlan.test.ts`, `describeRound.test.ts`, `planParity.test.ts`): `types.ts` (RoundPlan: words only, never ids), `names.ts` (friend matching: exact > first name > nickname table > 1 typo; ambiguous = ask), `courseMatch.ts` (query variants + ranking; the course API is literal: "Sonoma Golf Club" finds nothing, "sonoma" finds "Sonoma Gc"), `teeMatch.ts` (tee by name, else colour mapped by length with a note: Sonoma GC tees are I–IV), `games.ts` (player-count gates mirror FormatStep, free = match + skins, max stake $500, teams, Vegas seat order), `localParse.ts` (offline parser + `unsaidAmounts`: an AI amount not in the sentence blocks tee-off), `buildDraft.ts` (draft with `assumptions` and blocking `issues`, review `overrides`), `describeRound.ts` ("Same as last time").
- **Edge function `plan-round` (deployed v1, verify_jwt on, per-user rate limit 20/min)**: Anthropic SDK 1.12.0, `claude-opus-5-5`, effort low, structured output (`PLAN_SCHEMA`), server-side fallback beta with a plain retry, zod validation. Live check 2026-11-23: 12/12 sentences correct at 2–4 s, including nicknames, "a buck a hole", "I'm a 12", 80% handicaps, junk flagged as unsupported and an ignored prompt injection. Client falls back to `localParse` after 15 s or on any error and says so.
- **Not supported yet (shown as issues/assumptions, never silent):** scorekeeper not playing (seat 1 is always the creator), junk/prop bets and custom house rules from the sentence, back nine is renumbered 1–9.
- `useRoundBuilder` loads every friend itself (useFriends pages 20 at a time). Analytics: `ai_round_drafted`, `ai_round_started`.
- Harness used for screenshots: a mocked-backend Playwright script (scratchpad, not committed) covering Home -> compose -> thinking -> review -> tee sheet -> Tee off (verified the inserted round + players payload).
- **Money bug fixed: fourball (2v2) team matches never paid.** Settlement, the live tracker and the in-round preview only handled 2-player match play. `fourballTransfers()` in `games/matchPlay.ts` (each loser pays the stake split across winners: +$20/-$20 a man) feeds all three (`fourballMoney.test.ts`). `calculateSettlement` takes it as a new trailing param.
- **Fourball card overflow fixed** (`LiveLeaderboard.tsx`): team columns lacked `min-w-0`, so long names pushed team B off a phone screen. Players now stack one per line with team initials.
- **`/play` composer** hides the "Try saying" examples once you start typing.
- **App Store screenshots 3.1:** `scripts/appstore-capture.cjs` captures real screens (fictional foursome, embargo-safe money: $20 team match + $2 Sixes) against a mocked backend that honours PostgREST eq./in. filters; framed by `matchplay-marketing/appstore/build.mjs` (tokens read from `src/index.css`). Run vite on 127.0.0.1:8080 and pass `CHROMIUM=/opt/pw-browsers/chromium` (the repo pins its own Playwright).

## V2 Feature Status
| Feature | Status | Notes |
|---------|--------|-------|
| Onboarding flow (name/photo/handicap/tees/course) | ✅ Done | `has_onboarded` col, `/onboarding` route, `OnboardingRedirect` in App.tsx; name step is required (P2.13) |
| App tutorial overlay | ✅ Done | `AppTutorial` component, triggered via `location.state.showTutorial` |
| Personal game formats | ✅ Done | `personal_game_formats` table, `usePersonalGameFormats`, `/my-formats/*` routes |
| Push notifications — round invites | ✅ Done | `useCreateSupabaseRound` → `sendPushToProfiles` → `send-push` edge fn |
| Share round results | ✅ Done | Canvas image + native share + SMS/email in `RoundComplete.tsx` |
| 9-hole scoring | ✅ Done | Nassau has `holesInRound` param; Skins auto-adapts; both tested |
| Score conflict resolution | ✅ Done | Last-write-wins upsert on `(player_id, hole_number)`; optimistic + real-time confirm |
| QR lazy loading | ✅ Done | `qrcode.react` lazy-loaded in `FriendCodeQR` and `ShareJoinCodeModal` |
| Offline indicator UX | ✅ Done | `OfflineBanner` in `App.tsx`; shows pending count, syncing state |
| Stats — all-time records | ✅ Done | Best round, best payout, most skins cards in Stats page |
| Stats — scoring trend | ✅ Done | ▲/▼ trend badge on avg score (requires 10+ rounds) |
