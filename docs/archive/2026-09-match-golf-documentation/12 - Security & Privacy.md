# MATCH Golf - Security & Privacy

---

## 1. AUTHENTICATION

### Methods
| Method | Provider | Platform |
|--------|----------|----------|
| Apple Sign-In | Native iOS SDK + Supabase | iOS only |
| Email / Password | Supabase Auth | All platforms |

### Apple Sign-In Flow
1. Native iOS Apple Sign-In sheet presented
2. User authenticates (Face ID / Touch ID / password)
3. ID token returned to app
4. Token sent to Supabase: `signInWithIdToken({ provider: 'apple', token })`
5. Supabase validates token with Apple servers
6. User created or matched in `auth.users`

### Rate Limiting
- **Limit:** 10 authentication attempts per 15 minutes
- **Scope:** Per-device (fingerprinted via `navigator.userAgent|screen.width|screen.height`)
- **Implementation:** `src/lib/rateLimiter.ts`

---

## 2. AUTHORIZATION

### Row Level Security (RLS)
Every Supabase table has RLS enabled. Policies ensure users can only access data they're authorized to see.

### Helper Functions
```sql
-- Returns true if user is a player in the round
is_round_participant(round_id UUID) -> BOOLEAN

-- Returns true if user can enter scores
is_scorekeeper(round_id UUID) -> BOOLEAN

-- Returns true if user created the round
is_round_creator(round_id UUID) -> BOOLEAN
```

### Access Matrix

| Resource | Read | Write | Delete |
|----------|------|-------|--------|
| Own profile | Yes | Yes | Via edge function |
| Friend's profile | Basic fields only | No | No |
| Round (participant) | Full | Scores only (if scorekeeper) | Creator only |
| Round (spectator) | Full | No | No |
| Round (outsider) | No | No | No |
| Scores | Round participants | Scorekeepers | Scorekeepers |
| Prop bets | Round participants | Round participants | Creator |
| Settlements | Involved parties | System | No |
| Friendships | Involved parties | Either party | Either party |
| Groups | Members | Admin | Admin |

---

## 3. DATA PROTECTION

### Secrets Management

| Secret | Location | Access |
|--------|----------|--------|
| Supabase URL | `.env` (VITE_ prefix) | Client-side (public) |
| Supabase Anon Key | `.env` (VITE_ prefix) | Client-side (public, scoped by RLS) |
| RevenueCat API Key | Xcode build settings | Native code only |
| RevenueCat Webhook Auth | Supabase CLI secrets | Server-side only |
| Sentry Auth Token | CI/build env | Build-time only |
| Sentry DSN | `.env` (VITE_ prefix) | Client-side (public, by design) |

### What's Never Stored in Code
- Database passwords
- Service role keys
- User credentials
- Payment card data (handled by Apple)
- Personal health data

### Environment File Handling
- `.env` files are in `.gitignore`
- No secrets committed to git
- Separate env files per environment: `.env.development`, `.env.staging`, `.env.production`

---

## 4. INPUT VALIDATION

### Client-Side Validation
- **Zod schemas** (`src/lib/validation.ts`) validate all user input
- Validation at system boundaries (form submission, API calls)
- File path sanitization for directory traversal prevention

### Server-Side Validation
- Supabase RLS policies enforce authorization
- Edge functions validate request bodies
- Webhook authentication verified before processing

### Score Validation
| Rule | Value |
|------|-------|
| Minimum hole score | 1 |
| Maximum hole score | 15 |
| Maximum voice score | 12 |
| Hole number range | 1-18 |

---

## 5. PAYMENT SECURITY

### Architecture
- **No payment data touches our servers**
- All purchases processed by Apple In-App Purchase system
- RevenueCat acts as a middleware layer
- Subscription status synced to Supabase via edge function

### Payment Flow Security
1. User initiates purchase in app
2. RevenueCat SDK communicates with App Store
3. Apple handles payment authorization (Face ID / Touch ID)
4. RevenueCat receives receipt
5. App receives customer info
6. Sync to Supabase via authenticated edge function

### Webhook Security
- RevenueCat webhooks authenticated via shared secret
- Secret stored in Supabase CLI secrets (not in code)
- Edge function validates auth header before processing

---

## 6. PRIVACY

### Data Collected

| Data Type | Purpose | Stored Where |
|-----------|---------|-------------|
| Email address | Authentication | Supabase Auth |
| Display name | Profile | Supabase |
| Profile photo | Avatar | Supabase Storage |
| Handicap index | Scoring calculations | Supabase |
| Golf scores | Core functionality | Supabase |
| Friend connections | Social features | Supabase |
| Device push token | Notifications | Supabase |
| Subscription status | Feature gating | Supabase + RevenueCat |
| Device fingerprint | Rate limiting | Local (not transmitted) |

### Data NOT Collected
- Location/GPS data
- Health data
- Browsing history
- Advertising identifiers
- Analytics beyond Sentry error tracking
- Contact data (accessed on-device only, not uploaded)

### Data Deletion
- Users can delete their account via Profile > Settings
- Triggers `delete-account` edge function
- Cascade deletes all user data across all tables
- RevenueCat customer record not deleted (Apple requirement)

### Legal Pages
- Privacy Policy: `/privacy-policy` (also at matchgolf.info/privacy)
- Terms of Service: `/terms-of-service` (also at matchgolf.info/terms)
- Support: `/support`

---

## 7. NETWORK SECURITY

### HTTPS
- All Supabase communications over HTTPS
- No HTTP fallback
- Certificate pinning not implemented (WebView limitation)

### Real-Time Connections
- WebSocket connections to Supabase for real-time scoring
- Authenticated via user JWT
- Channel-scoped to specific round IDs

### Offline Data
- Pending scores stored in IndexedDB (local only)
- Automatically synced when connection restored
- No sensitive data in offline storage

---

## 8. ERROR TRACKING (Sentry)

### What's Tracked
- JavaScript errors and stack traces
- Source maps uploaded at build time
- User context (anonymized user ID)
- Error frequency and impact

### What's NOT Tracked
- User input content
- Score data
- Personal information
- Network request bodies
- Payment information

### Configuration
- Production only (no Sentry in development)
- DSN configured via environment variable
- Auth token used only at build time for source map upload

---

## 9. SECURITY AUDIT HISTORY

### 2026-03-31 Audit
Comprehensive security and quality audit performed:
- Fixed null assertion vulnerabilities in Nassau calculator
- Added input validation guards in settlement engine
- Rate limiter improved with per-device scoping
- Delete-on-failure cleanup pattern for atomic round creation
- All fixes verified with new tests (20 tests added)

### Ongoing Practices
- RLS policies on all tables
- Input validation at all system boundaries
- No direct database access from client
- Secrets never in source code
- Dependency patches managed via patch-package
