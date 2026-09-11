# MATCH Golf - Technical Architecture & Stack

---

## 1. Architecture Overview

MATCH Golf is a **mobile-first web application** wrapped in a native iOS shell using Capacitor. The architecture follows a client-heavy pattern where most logic runs in the browser/WebView, with Supabase providing backend services (auth, database, real-time, edge functions).

```
+-------------------+     +-------------------+     +-------------------+
|                   |     |                   |     |                   |
|   iOS App Shell   |---->|   React WebView   |---->|     Supabase      |
|   (Capacitor 6)   |     |   (Vite + React)  |     |   (PostgreSQL)    |
|                   |     |                   |     |                   |
+-------------------+     +-------------------+     +-------------------+
        |                         |                         |
   Native Plugins           Pure Functions            Edge Functions
   - Apple Sign-In          - Game calculators        - delete-account
   - RevenueCat             - Voice parser            - send-push
   - Contacts               - Handicap calc           - golf-course-lookup
   - Push Notifications     - Settlement engine       - sync-subscription
   - Haptics                - Stat calculations       - parse-house-game
   - Keep Awake                                       - subscription-webhook
   - Status Bar
   - Splash Screen
```

---

## 2. Technology Stack

### 2.1 Frontend

| Technology | Version | Purpose |
|-----------|---------|---------|
| **React** | 18.3.1 | UI framework |
| **TypeScript** | 5.8.3 | Type safety |
| **Vite** | 5.4.19 | Build tool & dev server |
| **React Router** | 6.30.1 | Client-side routing |
| **TailwindCSS** | 3.4.17 | Utility-first CSS |
| **shadcn/ui** | Latest | Component library (Radix primitives) |
| **Framer Motion** | 12.26.1 | Animations & micro-interactions |
| **Lucide React** | 0.462.0 | Icon library |
| **Recharts** | 2.15.4 | Charts and data visualization |
| **React Hook Form** | 7.61.1 | Form management |
| **Zod** | 3.25.76 | Schema validation |
| **React Query** | 5.83.0 | Server state management & caching |
| **date-fns** | 3.6.0 | Date formatting |
| **clsx + tailwind-merge** | 2.1.1 / 2.6.0 | Conditional class composition (`cn()`) |
| **Sonner** | 1.7.4 | Toast notifications |
| **Vaul** | 0.9.9 | Drawer/sheet component |
| **cmdk** | 1.1.1 | Command menu |

### 2.2 Backend (Supabase)

| Service | Usage |
|---------|-------|
| **PostgreSQL** | Primary database (all tables, RLS policies) |
| **Auth** | Email/password + Apple Sign-In (via ID token) |
| **Real-time** | Live score sync via Postgres changes |
| **Edge Functions** | Server-side logic (Deno runtime) |
| **Storage** | Avatar uploads (via profiles) |
| **Row Level Security** | Per-table security policies |

### 2.3 Mobile (Capacitor)

| Plugin | Version | Purpose |
|--------|---------|---------|
| **@capacitor/core** | 6.2.1 | Core Capacitor runtime |
| **@capacitor/ios** | 6.2.1 | iOS platform |
| **@capacitor/android** | 6.2.1 | Android platform |
| **@capacitor/app** | 6.0.3 | App lifecycle events |
| **@capacitor/haptics** | 6.0.3 | Haptic feedback |
| **@capacitor/splash-screen** | 6.0.4 | Native splash screen |
| **@capacitor/status-bar** | 6.0.3 | Status bar styling |
| **@capacitor/push-notifications** | 6 | Push notification support |
| **@capacitor-community/apple-sign-in** | 6.0.0 | Native Apple Sign-In |
| **@capacitor-community/contacts** | 6.0.0 | Native contacts access |
| **@capacitor-community/keep-awake** | 5.0.1 | Prevent screen sleep during rounds |

### 2.4 Payments

| Technology | Purpose |
|-----------|---------|
| **RevenueCat** | Subscription management SDK |
| **Apple In-App Purchase** | Native iOS payment processing |
| **Custom Capacitor Plugin** | Swift bridge for RevenueCat SDK |

### 2.5 Error Tracking

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Sentry** | 10.34.0 | Production error tracking |
| **@sentry/vite-plugin** | 4.9.0 | Source map uploads |

### 2.6 Development Tools

| Tool | Version | Purpose |
|------|---------|---------|
| **Bun** | 1.3.9 | Package manager & runtime |
| **Vitest** | 4.0.17 | Unit testing |
| **Playwright** | 1.59.1 | E2E testing |
| **Testing Library** | 16.3.1 | React component testing |
| **ESLint** | 9.32.0 | Linting |
| **PostCSS** | 8.5.6 | CSS processing |
| **Autoprefixer** | 10.4.21 | CSS vendor prefixes |
| **patch-package** | 8.0.1 | Dependency patching |
| **jsdom** | 27.4.0 | Test environment |
| **fake-indexeddb** | 6.2.5 | Test IndexedDB mock |
| **Remotion** | 4.0.445 | Video generation (promo/launch) |

---

## 3. Application Architecture Patterns

### 3.1 State Management

| State Type | Solution | Usage |
|-----------|---------|-------|
| **Server state** | React Query | All Supabase data fetching, caching, background refetch |
| **Form state** | React Hook Form | All forms (round creation, profile, settings) |
| **Domain logic** | Custom hooks | 50+ hooks for business logic |
| **Global context** | React Context | Offline status only (`OfflineContext`) |
| **Local UI state** | useState | Component-level state |
| **Persistent local** | IndexedDB | Offline score queue |
| **Persistent local** | localStorage | Settings, preferences |

### 3.2 Data Flow

```
User Action
    |
    v
Custom Hook (domain logic)
    |
    ├── Optimistic UI Update (immediate)
    |
    ├── Supabase Write (background)
    |       |
    |       v
    |   PostgreSQL (source of truth)
    |       |
    |       v
    └── Real-time Subscription (confirms/rolls back)
            |
            v
        React Query Cache Update
            |
            v
        UI Re-render
```

### 3.3 Code Organization

| Directory | Responsibility | Pattern |
|-----------|---------------|---------|
| `src/pages/` | Route-level components | Lazy-loaded, Suspense boundaries |
| `src/components/` | Reusable UI components | Domain-grouped (golf/, friends/, groups/, etc.) |
| `src/hooks/` | Domain logic | Custom hooks, `use` prefix |
| `src/lib/` | Pure utilities | No side effects, no React imports |
| `src/lib/games/` | Game calculators | Pure functions with co-located tests |
| `src/types/` | TypeScript interfaces | Domain-grouped (golf.ts, betting.ts, houseGame.ts) |
| `src/services/` | External service integrations | RevenueCat |
| `src/contexts/` | React contexts | Minimal (Offline only) |
| `src/integrations/` | Auto-generated code | Supabase client + types |

### 3.4 Routing Architecture

All routes use **lazy loading** with `React.lazy()` and `<Suspense>` fallbacks:
- `<PageSkeleton variant="default">` for most pages
- `<PageSkeleton variant="scorecard">` for the scorecard
- `<PageSkeleton variant="list">` for list pages

Protected routes wrapped in `<AuthGuard>` which redirects to `/auth` if not authenticated.

### 3.5 Error Handling
- **Hooks/utilities:** Never throw -- return `{ success, error }` objects
- **User-facing errors:** Toast notifications via Sonner
- **Production logging:** Sentry integration
- **Boundary:** `<ErrorBoundary>` at app root

---

## 4. Database Schema

### 4.1 Core Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `profiles` | User profiles | id, display_name, handicap_index, avatar_url, has_onboarded |
| `rounds` | Golf rounds | id, course_name, holes, status, games (JSONB), join_code, slope, rating |
| `players` | Round participants | id, round_id, name, handicap, order_index, profile_id, is_ghost, tee_set_id |
| `scores` | Hole scores | id, round_id, player_id, hole_number, strokes |
| `presses` | Nassau presses | id, round_id, start_hole, stakes, status |

### 4.2 Betting Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `prop_bets` | Side bets | id, round_id, type, hole_number, stakes, winner_id |
| `bet_settlements` | Settlement tracking | id, round_id, from_player_id, to_player_id, amount, status |

### 4.3 Social Tables

| Table | Purpose |
|-------|---------|
| `friendships` | Friend requests and accepted connections |
| `golf_groups` | Golf groups |
| `group_members` | Group membership |
| `round_spectators` | Read-only round viewers |
| `round_shares` | Result sharing tracking |

### 4.4 Subscription Tables

| Table | Purpose |
|-------|---------|
| `subscriptions` | Subscription status synced from RevenueCat |

### 4.5 House Game Tables

| Table | Purpose |
|-------|---------|
| `house_games` | Group house game formats |
| `personal_game_formats` | User's saved game formats |

### 4.6 Row Level Security (RLS)

Helper functions:
- `is_round_participant(round_id)` -- user is a player in the round
- `is_scorekeeper(round_id)` -- user can enter scores
- `is_round_creator(round_id)` -- user created the round

All tables have RLS policies enforcing that users can only read/write data they're authorized to access.

---

## 5. Edge Functions

| Function | Trigger | Purpose |
|----------|---------|---------|
| `delete-account` | User action | Cascade delete all user data |
| `send-push` | Round creation / invite | Send push notifications to players |
| `golf-course-lookup` | Course search | Fetch course data from external API |
| `sync-subscription` | After purchase | Sync RevenueCat status to Supabase |
| `subscription-webhook` | RevenueCat webhook | Handle subscription lifecycle events |
| `parse-house-game` | AI game builder | Parse natural language game descriptions |

---

## 6. Native iOS Architecture

### 6.1 Project Structure
- Xcode workspace: `ios/App/App.xcworkspace`
- Bundle ID: `dev.matchgolf.app`
- Minimum iOS: 15.0
- CocoaPods for dependency management

### 6.2 Custom Native Plugins (Swift)
- `RevenueCatManager.swift` -- Singleton manager for RevenueCat SDK
- `RevenueCatPlugin.swift` -- Capacitor plugin bridge exposing RevenueCat to JS

### 6.3 Native Permissions Required
| Permission | Usage |
|-----------|-------|
| Camera | QR code scanning |
| Contacts | Friend discovery |
| Microphone | Voice scoring |
| Speech Recognition | Voice-to-text |

### 6.4 CocoaPods Dependencies
- Capacitor core pods
- Apple Sign-In pod
- Contacts pod
- Keep Awake pod
- RevenueCat (~5.0)

---

## 7. Build & Deployment Pipeline

### 7.1 Build Modes

| Mode | Command | Env | Purpose |
|------|---------|-----|---------|
| Development | `bun run dev` | .env.development | Local dev server |
| Staging | `bun run dev:staging` | .env.staging | Staging environment |
| Production | `bun run build` | .env.production | Production build |

### 7.2 iOS Build Flow
```
bun install          # Install JS dependencies
bun run build        # Build web assets to /dist
npx cap sync ios     # Copy dist + sync native plugins
# Open ios/App/App.xcworkspace in Xcode
# Build & archive from Xcode
```

### 7.3 Dependency Patching
- `patch-package` runs on `postinstall`
- Active patch: `@capacitor-community+apple-sign-in+6.0.0.patch`
  - Fixes iPad presentation style for Apple Sign-In

---

## 8. Security Architecture

### 8.1 Authentication
- **Apple Sign-In:** Native iOS flow -> ID token -> Supabase `signInWithIdToken()`
- **Email/Password:** Standard Supabase Auth
- **Rate limiting:** 10 attempts per 15 minutes per device
- **Device fingerprint:** `navigator.userAgent|screen.width|screen.height`

### 8.2 Data Security
- All database access through Supabase RLS policies
- No direct database connections from client
- Edge functions for sensitive operations (account deletion, subscription sync)
- Input validation via Zod schemas at all system boundaries
- File path sanitization for directory traversal prevention

### 8.3 Secrets Management
- Supabase URL/key: environment variables (VITE_ prefix for client)
- RevenueCat API key: Xcode build settings (not in source)
- Webhook auth: Supabase CLI secrets (not in .env)
- Sentry tokens: Build-time only (no VITE_ prefix)

---

## 9. Performance Optimizations

| Optimization | Implementation |
|-------------|---------------|
| Code splitting | React.lazy() for all pages |
| Tree shaking | Vite production build |
| Lazy QR loading | qrcode.react loaded on demand |
| Optimistic updates | UI updates before server confirmation |
| React Query caching | Stale-while-revalidate pattern |
| Pure function game logic | No unnecessary re-renders |
| Minimal dependencies | No Redux, no CSS-in-JS |
| System fonts | No web font downloads |
| PWA support | vite-plugin-pwa for caching |
