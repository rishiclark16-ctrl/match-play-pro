# MATCH Golf - User Flows & Screen Map

---

## 1. COMPLETE ROUTE MAP

| Route | Page | Auth Required | Lazy Loaded | Skeleton Variant |
|-------|------|---------------|-------------|------------------|
| `/` | Home | Yes | Yes | default |
| `/auth` | Auth (Sign In/Up) | No | Yes | default |
| `/new-round` | New Round Wizard | Yes | Yes | default |
| `/join` | Join Round | Yes | Yes | default |
| `/round/:id` | Scorecard | Yes | Yes | scorecard |
| `/round/:id/leaderboard` | Live Leaderboard | Yes | Yes | list |
| `/round/:id/dashboard` | Round Dashboard | Yes | Yes | default |
| `/round/:id/complete` | Round Complete | Yes | Yes | default |
| `/profile` | Profile & Settings | Yes | Yes | default |
| `/profile/:profileId` | Public Profile | Yes | Yes | default |
| `/friends` | Friend Management | Yes | Yes | list |
| `/social` | Social Feed | Yes | Yes | list |
| `/groups` | Golf Groups | Yes | Yes | list |
| `/stats` | Player Statistics | Yes | Yes | default |
| `/onboarding` | New User Onboarding | Yes | Yes | default |
| `/groups/:groupId/house-game/new` | House Game Builder | Yes | Yes | default |
| `/groups/:groupId/house-game/confirm` | House Game Confirm | Yes | Yes | default |
| `/groups/:groupId/house-game/edit` | House Game Edit | Yes | Yes | default |
| `/my-formats` | My Game Formats | Yes | Yes | default |
| `/my-formats/new` | New Personal Format | Yes | Yes | default |
| `/my-formats/confirm` | Confirm Format | Yes | Yes | default |
| `/my-formats/:formatId/edit` | Edit Format | Yes | Yes | default |
| `/privacy-policy` | Privacy Policy | No | Yes | default |
| `/terms-of-service` | Terms of Service | No | Yes | default |
| `/support` | Support | No | Yes | default |
| `*` | 404 Not Found | No | No | -- |

---

## 2. NAVIGATION STRUCTURE

### Bottom Tab Bar (5 tabs)
Always visible except on: `/new-round`, `/auth`, `/onboarding`, `/my-formats/confirm`, any `/round/*` page, any `*/house-game/confirm` page.

| Tab | Icon | Route | Label |
|-----|------|-------|-------|
| Home | House | `/` | HOME |
| Social | Users | `/social` | SOCIAL |
| New Round | Plus (center, gold circle) | `/new-round` | -- |
| Stats | BarChart | `/stats` | STATS |
| Profile | User | `/profile` | PROFILE |

---

## 3. KEY USER FLOWS

### 3.1 First-Time User Flow

```
App Launch
    |
    v
Splash Screen (animated, auto-dismiss)
    |
    v
/auth (Sign In/Up)
    |
    ├── Apple Sign-In (native)
    └── Email + Password
            |
            v
/onboarding (4 steps)
    |
    ├── 1. Upload Profile Photo
    ├── 2. Enter Handicap Index
    ├── 3. Select Preferred Tees
    └── 4. Search Home Course
            |
            v
/ (Home) + App Tutorial Overlay
```

### 3.2 Create & Play a Round

```
/ (Home) → Tap "+" center button
    |
    v
/new-round (Step 1: Course)
    ├── Search course by name
    ├── Select from results
    └── Or create custom course
            |
            v
/new-round (Step 2: Players)
    ├── Add from friends list
    ├── Add by name (non-app player)
    ├── Add ghost player
    ├── Set handicaps (auto or manual)
    └── Configure mixed tees (optional)
            |
            v
/new-round (Step 3: Format & Games)
    ├── Toggle stroke play / match play
    ├── Add betting games (Nassau, Skins, Wolf, etc.)
    ├── Set stakes for each game
    ├── Use house game format (from group or personal)
    └── AI game builder (voice or text)
            |
            v
Round Created → Share Join Code
    ├── Share via link/QR/SMS
    └── Send push notification to players
            |
            v
/round/:id (Scorecard)
    ├── Enter scores (tap or voice)
    ├── Navigate holes (swipe or tap)
    ├── View live game status
    ├── Award prop bets
    ├── View dashboard (money, stats, highlights)
    └── Auto-advance after 20s
            |
            v
Finish Round → /round/:id/complete
    ├── Final standings
    ├── Game results breakdown
    ├── Settlement summary
    ├── Share results (image/SMS/email)
    └── Mark settlements as paid/forgiven
```

### 3.3 Voice Scoring Flow

```
Tap Microphone Button (or enable hands-free)
    |
    v
Web Speech API begins listening
    |
    v
User speaks: "Mike got a 4" or "Birdie for Dave"
    |
    v
voiceParser.ts processes speech
    ├── Fuzzy name matching (Levenshtein < 2)
    ├── Score resolution (number or golf term)
    ├── Phonetic variation handling
    └── Confidence scoring (high/medium/low)
            |
            v
VoiceConfirmationModal appears
    ├── Shows parsed result
    ├── Confidence indicator
    ├── Confirm → Score is saved
    └── Reject → Re-listen
```

### 3.4 Join a Round Flow

```
Option A: Join Code
    / → /join → Enter 6-char code → Added to round → /round/:id

Option B: Deep Link
    matchgolf.app/join?code=XXXXXX → App opens → /join auto-fills → /round/:id

Option C: Push Notification
    Notification tap → App opens → /round/:id

Option D: QR Code
    Friends page → Scan QR → Redirects to join flow
```

### 3.5 Friend Management Flow

```
/friends
    |
    ├── Pending Requests Tab
    │   ├── Accept → Friends
    │   └── Decline → Removed
    |
    ├── My Friends Tab
    │   ├── View friend list
    │   ├── Tap friend → Public Profile
    │   └── Remove friend
    |
    └── Add Friends
        ├── Share friend code (text, copy, share sheet)
        ├── Show QR code
        ├── Scan QR code
        ├── Quick add from contacts
        └── Contact sync (native)
```

### 3.6 Group & House Game Flow

```
/groups
    |
    ├── Create Group
    │   └── Name, description, invite members
    |
    ├── Group Detail
    │   ├── Members list
    │   ├── Group ledger (money tracking)
    │   ├── Settle up
    │   └── House game formats
    |
    └── House Game Builder
        ├── /groups/:id/house-game/new
        │   ├── Voice/text describe your game
        │   ├── AI parses into primitives
        │   ├── Review & configure 50+ rules
        │   └── Confirm → saved to group
        |
        └── Use in Round
            └── FormatStep → Pick group format → Applied to round
```

### 3.7 Subscription / Upgrade Flow

```
Free user taps locked feature
    |
    v
FeatureGate shows lock overlay
    |
    v
Tap → PaywallModal opens
    |
    ├── View Free vs Pro comparison
    ├── Toggle Monthly ($3.99) / Annual ($24.99)
    ├── "Continue with Annual" → Apple IAP flow
    │   ├── Success → Pro unlocked, modal closes
    │   └── Cancel → Back to paywall
    |
    └── "Restore Purchases" → Check RevenueCat
        ├── Found → Pro unlocked
        └── Not found → "No active subscription"
```

### 3.8 Social Feed Flow

```
/social
    |
    ├── Feed Tab
    │   ├── Friend round completions
    │   ├── Tap round → RoundDetailSheet
    │   │   └── Scorecard preview, stats, comments
    │   ├── React (emoji)
    │   └── Comment
    |
    └── Upcoming Tab
        ├── Friends' planned rounds
        ├── Tap → View details
        └── Create upcoming round
```

---

## 4. BOTTOM SHEET INVENTORY

The app makes heavy use of bottom sheets (vaul/Radix Sheet) for contextual actions:

| Sheet | Trigger | Content |
|-------|---------|---------|
| ScoreInputSheet | Tap player score cell | Score entry with quick buttons |
| BettingBreakdownSheet | Tap money tracker | Detailed betting breakdown |
| GameSettingsSheet | Tap game settings | Configure game parameters |
| PropBetSheet | Tap "Add Prop Bet" | Create/manage prop bets |
| JunkBetSheet | Tap "Junk Bets" | Side bet management |
| HandicapStrokesSheet | Tap handicap info | Per-hole stroke allocation |
| MixedTeesSheet | Tap "Mixed Tees" | Per-player tee set config |
| ManageScorekeepersSheet | Tap "Manage Scorekeepers" | Delegate scoring |
| ShareJoinCodeModal | Tap "Share Code" | Join code + QR + share options |
| ShareRoundResultsSheet | Tap "Share Results" | Image/SMS/email share |
| BingoBangoSheet | During Bingo Bango Bongo | Per-hole BBB scoring |
| FinishOptionsOverlay | Tap "Finish" | End round, pause, etc. |
| PaywallModal | Tap locked feature | Subscription purchase |
| ContactSyncSheet | Friends → Sync Contacts | Native contact import |
| CreateGroupSheet | Groups → Create Group | Group creation form |
| GroupFormatPickerSheet | Format step → Pick format | Select group game format |
| PlayerLedgerSheet | Group ledger → Player | Individual ledger detail |
| SettleUpSheet | Group → Settle Up | Mark debts as paid |
| RoundDetailSheet | Social feed → Round | Round detail preview |
| RoundChatSheet | Round → Chat | In-round messaging |
| CreateUpcomingSheet | Social → Create Upcoming | Schedule a round |
