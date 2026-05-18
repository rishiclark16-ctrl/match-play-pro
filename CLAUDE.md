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
/new-round              Create round (course → players → games)
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
- **Edge functions:** delete-account, subscription-webhook, sync-subscription, send-push, parse-house-game, golf-course-lookup, redeem-promo, sentry-webhook, speech-to-text, weekly-recap
- **Migrations:** 22 files in `supabase/migrations/`
- **Edge functions:** delete-account, send-push, subscription-webhook, sync-subscription, parse-house-game, golf-course-lookup

## Test Baseline
**1204 pass, 0 fail** (1204 tests across 52 files). All tests pass. Run with `bun test`. CI splits into two invocations:
- `bun test src/hooks src/lib src/engine src/components` (1201 tests)
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
