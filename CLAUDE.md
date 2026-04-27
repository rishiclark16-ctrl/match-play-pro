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
├── functions/      # Edge functions (delete-account, validate-revenucat-webhook, etc.)
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
- **Edge functions:** delete-account, validate-revenucat-webhook (+ others)
- **Migrations:** 20 files in `supabase/migrations/`
- **Edge functions:** delete-account, send-push, subscription-webhook, sync-subscription, parse-house-game, golf-course-lookup

## Test Baseline
**1140 pass, 0 fail** (1140 tests across 44 files). All tests pass. Run with `bun run test:run`.

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
- **CI workflow added:** `.github/workflows/ci.yml` runs lint (src only), `bun run test:run`, and `bun run build:dev` on PRs and main pushes. Requires `VITE_SUPABASE_PUBLISHABLE_KEY` GitHub secret.
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

Open items (Phase P2+):
- **Supabase security advisors** (66 WARN, run via MCP `get_advisors`):
  - 54x SECURITY DEFINER functions callable by `anon`/`authenticated` via `/rest/v1/rpc/*` (e.g., `are_friends`, `is_round_owner`). Most enforce auth.uid() internally, but each should be reviewed; revoke EXECUTE from anon for any not meant to be client-callable.
  - 9x function_search_path_mutable — defense-in-depth: add `SET search_path = public` to remaining functions.
  - 1x storage bucket `avatars` allows listing — tighten policy so only object URL access works.
  - 1x leaked-password protection disabled in Auth settings (dashboard toggle).
  - 1x extension `pg_net` in public schema (low-risk, cosmetic).
- File-size violators (>500 lines): `FormatStep.tsx` 1224, `Scorecard.tsx` 1123, `NewRound.tsx` 1100, `RoundComplete.tsx` 976, `Stats.tsx` 833, `Profile.tsx` 831, `Home.tsx` 699.
- Component/page test coverage is essentially zero — only game logic + a few hooks tested.
- Bundle: main `index.js = 515kB`, `vendor-qr = 334kB`. Profile what's eager-loaded in `index.js`.
- 19 remaining `useEffect` dep warnings (non-critical paths — review opportunistically).
- **GitHub secret `VITE_SUPABASE_PUBLISHABLE_KEY`** still needs to be added to the repo's Actions secrets so CI builds succeed. (Repo Settings → Secrets and variables → Actions → New repository secret.) The publishable key is the same anon key used in `.env`.

---

## V2 Feature Status
| Feature | Status | Notes |
|---------|--------|-------|
| Onboarding flow (photo/handicap/tees/course) | ✅ Done | `has_onboarded` col, `/onboarding` route, `OnboardingRedirect` in App.tsx |
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
