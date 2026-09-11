# MATCH Golf - Feature List & Product Specifications

---

## Feature Overview

MATCH Golf is organized around four core experiences: **Scoring**, **Betting Games**, **Social**, and **Profile/Stats**. Below is every feature in the application, categorized and detailed.

---

## 1. ROUND CREATION & SETUP

### 1.1 New Round Wizard (`/new-round`)
A multi-step flow to configure a round:

| Step | Component | Description |
|------|-----------|-------------|
| **Course** | `CourseStep` | Search for a golf course or create a custom one. Course data includes hole-by-hole par, handicap index, yardage, slope, and rating. |
| **Players** | `PlayersStep` | Add 2-8 players. Search friends, add by name, or invite via join code. Set handicaps (auto from profile or manual entry). Ghost player support. |
| **Format** | `FormatStep` | Choose scoring format (stroke play, match play) and configure betting games. AI-powered house game builder available. |

### 1.2 Join Round (`/join`)
- Enter a 6-character alphanumeric join code
- Deep link support: `matchgolf.app/join?code=XXXXXX`
- Push notification invites with direct join

### 1.3 Course Search
- Powered by Supabase edge function (`golf-course-lookup`)
- Returns course name, location, hole data, tee sets, slope/rating
- Supports custom course creation for courses not in database

### 1.4 Mixed Tees
- Players can play from different tee boxes in the same round
- Per-player tee set assignment
- Handicap adjustments calculated per tee set (slope/rating)

### 1.5 Ghost Players
- Virtual player that receives net-par scores automatically
- No real account needed
- Useful for 3-player games that need a 4th or handicap comparison

---

## 2. SCORING

### 2.1 Digital Scorecard (`/round/:id`)
- **Hole-by-hole scoring** for all players
- **Score input sheet** -- bottom sheet with quick score buttons
- **Quick score buttons** -- tap par-2 through par+4 for fast entry
- **Hole navigator** -- swipe or tap to move between holes
- **Auto-advance** -- moves to next hole after 20 seconds of inactivity (configurable)
- **Hole summary** -- shows par, yardage, handicap index for current hole

### 2.2 Score Types & Visual Indicators

| Score | Label | Color |
|-------|-------|-------|
| Hole-in-one | Ace! | Green |
| 3 under | Albatross | Green |
| 2 under | Eagle | Green |
| 1 under | Birdie | Green |
| Even | Par | Default |
| 1 over | Bogey | Amber |
| 2 over | Double | Red |
| 3 over | Triple | Red |
| 4+ over | +N | Red |

### 2.3 Voice Scoring
- **Natural language input** via Web Speech API (no API key needed)
- Powered by pure NLP parser (`voiceParser.ts` -- 114 unit tests)
- **Fuzzy name matching** -- Levenshtein distance < 2, nickname support
- **Golf term recognition** -- "birdie" = par-1, "bogey" = par+1, "eagle" = par-2
- **Phonetic variations** -- "tree"=3, "ate"=8, "fore"=4, "won"=1, "to"=2
- **Confidence scoring** -- high/medium/low with confirmation modal
- **Hands-free mode** -- continuous dictation without button presses
- **Voice commands** -- "next hole", "go back", "undo"

### 2.4 Real-Time Multiplayer
- Supabase real-time subscriptions on `scores`, `players`, `rounds` tables
- Optimistic UI updates -- score appears instantly, confirmed/rolled back via real-time
- All players see score changes in real time
- Connection status indicator

### 2.5 Offline Support
- IndexedDB storage for pending scores
- Automatic sync on reconnect
- Visual indicator showing pending count and sync status
- Offline banner with animation (slide-in from top)

### 2.6 Scorekeeper Management
- Round creator is default scorekeeper
- Can delegate scorekeeper role to other players
- Scorekeepers can enter scores for all players

### 2.7 Spectator Mode
- Read-only access to a round
- No scoring permissions
- Banner indicates spectator status

---

## 3. BETTING GAMES

All game logic is implemented as **pure functions** in `src/lib/games/` with extensive test suites.

### 3.1 Nassau (27 tests)
- **Format:** Front 9, Back 9, and Overall -- three separate bets
- **Stakes:** Per-bet dollar amount
- **Auto-press:** When a player is 2 down, automatic press (new sub-match) starts
- **Manual press:** Players can initiate presses
- **Press rules:** Cannot press on last hole
- **9-hole support:** Full support via `holesInRound` parameter
- **Net scoring:** Handicap strokes applied per-hole

### 3.2 Skins (24 tests)
- **Format:** Lowest score on a hole wins the "skin" (pot for that hole)
- **Carryover:** Ties carry the pot to the next hole (optional, Pro feature)
- **Per-player contribution:** Based on holes actually scored, not total round holes
- **Adapts to any hole count** including 9-hole rounds
- **Net scoring:** Handicap-adjusted

### 3.3 Match Play (31 tests)
- **Format:** 2-player head-to-head, hole-by-hole
- **Scoring:** Holes won/lost/halved, reported as "2 up" or "3 & 2"
- **Net scoring:** Handicap strokes applied
- **Early close:** Match can end early (e.g., 5 & 4)

### 3.4 Wolf (55 tests)
- **Format:** 4-player rotating "wolf" picks a partner (or goes alone)
- **Blind Wolf:** Declare before anyone tees off (3x multiplier)
- **Lone Wolf:** Play alone against the field (2x multiplier)
- **Points system:** Accumulated per hole, final settlement
- **3-5 player support** (extended beyond standard 4)

### 3.5 Stableford (42 tests)
- **Standard scoring:** Albatross=5, Eagle=4, Birdie=3, Par=2, Bogey=1, Double+=0
- **Modified scoring:** Albatross=8, Eagle=5, Birdie=2, Par=0, Bogey=-1, Double+=-3
- **Points formatting:** +N pts / 0 pts / -N pts
- **Net scoring:** Handicap-adjusted

### 3.6 Best Ball (30 tests)
- **Format:** Team-based, best score from each team counts per hole
- **Teams:** 2+ teams with configurable player assignments
- **Team colors:** Visual distinction between teams
- **Hole-by-hole results:** Winning team per hole

### 3.7 House Games (Custom Format Builder)
- **AI-powered builder** -- describe your game in natural language
- **50+ configurable primitives** across 8 categories:
  - Press rules (auto-press, birdie press, eagle press, etc.)
  - Scoring formats (Nassau, Skins, Match, Stableford, Wolf, Vegas, etc.)
  - Bonus points (par 5 double, last hole double, etc.)
  - Carryover rules
  - Handicap rules
  - Casual rules (gimmes, mulligans, breakfast ball, etc.)
  - Settlement rules (pay per hole, end of round, max loss cap, etc.)
  - Group rules (min players, sub-in rules, etc.)
- **Voice input** -- dictate your house game rules
- **Save & reuse** -- personal game formats or group formats
- **Bingo Bango Bongo** -- supported as a house game sub-format

### 3.8 Additional Game Types
- **Vegas** (with tests) -- team-based scoring using combined scores
- **Rabbit** (with tests) -- possession-based hole-by-hole game
- **Quota** (with tests) -- target score based on handicap

### 3.9 Settlement System (18 tests)
- Aggregates money owed across ALL active games in a round
- Net settlements between players (A owes B $5, not A owes B $8 and B owes A $3)
- Rounding to cents with `toFixed(2)`
- Status tracking: pending, paid, forgiven
- Group ledger integration for cross-round tracking

---

## 4. PROP BETS & SIDE GAMES

### 4.1 Standard Prop Bets

| Type | Label | Description |
|------|-------|-------------|
| `ctp` | Closest to Pin | Closest tee shot to pin on par 3s |
| `longest_drive` | Longest Drive | Longest drive on designated holes |
| `greenie` | Greenie | Hit green on par 3, closest to pin, and 1-putt |

### 4.2 Junk / Save Bets (Pro)

| Type | Label | Description |
|------|-------|-------------|
| `sandie` | Sandie | Up and down from a bunker |
| `barkie` | Barkie | Hit a tree, still make par or better |
| `oozle` | Oozle | Miss green on par 3, still make par |
| `chippy` | Chippy | Chip in from off the green for par or better |
| `polie` | Polie | 3-putt or worse but still make par |
| `arnie` | Arnie | Par or better after hitting a tree |
| `ferret` | Ferret | Hole out from off the green |

### 4.3 Negative Bets

| Type | Label | Description |
|------|-------|-------------|
| `snake` | Snake | 3-putt penalty (loser pays) |

### 4.4 Custom Bets
- Create any custom side bet with name, description, and stakes
- Per-hole or per-round assignment

---

## 5. ROUND DASHBOARD (`/round/:id/dashboard`)

A comprehensive live view during the round with tabbed navigation:

| Tab | Component | Shows |
|-----|-----------|-------|
| Scorecard | `DashboardScorecard` | Full scorecard grid |
| Games | `DashboardGames` | Live game results (Nassau, Skins, Match, Wolf, etc.) |
| Money | `DashboardMoney` | Live money tracker -- who's up, who's down |
| Stats | `DashboardStats` | In-round statistics |
| Highlights | `DashboardHighlights` | Notable moments (eagles, aces, big wins) |

---

## 6. ROUND COMPLETION (`/round/:id/complete`)

### 6.1 Final Standings
- Stroke play leaderboard (gross and net)
- Game-by-game results breakdown
- Winner cards with animations

### 6.2 Settlement Summary
- Full money ledger: who owes whom, how much
- One-tap "mark as paid" or "forgive"
- Running totals across all games

### 6.3 Share Results
- Canvas-rendered scorecard image
- Native share sheet (iOS)
- SMS and email sharing options
- Social media ready formatting

### 6.4 Playoff Mode
- Sudden-death playoff for ties
- Playoff hole scoring
- Winner declaration modal with celebration animation

---

## 7. SOCIAL FEATURES

### 7.1 Friends (`/friends`)
- Send/accept friend requests
- QR code sharing (lazy-loaded `qrcode.react`)
- QR code scanning (`html5-qrcode`)
- Contact sync (native contacts via Capacitor)
- Share friend code via native share sheet
- Quick-add from contacts

### 7.2 Groups (`/groups`)
- Create and manage golf groups
- Group-specific house game formats
- Group ledger -- persistent money tracking across rounds
- Settle up within groups
- Group format picker

### 7.3 Social Feed (`/social`)
- Activity feed of friends' rounds
- Round detail sheets with scorecard preview
- Reactions (like, fire, clap, etc.)
- Comments on rounds
- Round chat (in-round messaging)
- Upcoming rounds tab -- see and join friends' planned rounds

### 7.4 Season Leaderboard
- Cross-round money leaderboard
- Season-based tracking
- Group-scoped or friends-scoped

### 7.5 Public Profiles (`/profile/:profileId`)
- View other users' profiles
- Head-to-head record
- Stats comparison

---

## 8. PROFILE & SETTINGS (`/profile`)

### 8.1 Profile Management
- Display name, avatar photo upload
- Handicap index (auto or manual)
- Home course selection
- Friend code display

### 8.2 Account Settings
- Email/password management
- Apple Sign-In linked status
- Push notification preferences
- Delete account (with Supabase edge function cleanup)

### 8.3 Subscription Management
- Current plan display
- Upgrade/downgrade
- Manage via App Store
- Restore purchases

---

## 9. STATS (`/stats`)

### 9.1 Scoring Statistics
- Average score
- Scoring trend (requires 10+ rounds, shows up/down badge)
- Best round ever
- Rounds played count
- Scoring distribution (eagles, birdies, pars, bogeys, etc.)

### 9.2 Money Statistics
- Total winnings/losses
- Best payout
- Most skins won
- Game-by-game win/loss record

### 9.3 All-Time Records
- Best round
- Best payout
- Most skins in a round

---

## 10. ONBOARDING

### 10.1 New User Onboarding (`/onboarding`)
- Profile photo upload
- Handicap index entry
- Preferred tees selection
- Home course search
- Sets `has_onboarded` flag in profile

### 10.2 App Tutorial
- Overlay tutorial triggered on first visit to home
- Step-by-step walkthrough of main features
- Triggered via `location.state.showTutorial`

### 10.3 Scorecard Tutorial
- In-context tutorial for first-time scorecard use
- Highlights key interactions

---

## 11. HANDICAP SYSTEM

### 11.1 Calculation
- Formula: `playingHandicap = handicapIndex x (slope / 113) x (holes / 18)`
- Standard slope rating: 113
- 9-hole approximation supported

### 11.2 Modes
- **Auto:** Uses handicap index from profile + course slope/rating
- **Manual:** Direct entry of strokes received per player

### 11.3 Stroke Distribution
- Strokes distributed by hole handicap index
- Handicap strokes sheet shows per-hole allocation
- Mixed tees: adjustments per player's tee set

---

## 12. PUSH NOTIFICATIONS

- Registered via Capacitor Push Notifications plugin
- Notification types:
  - Round invites
  - Score updates (when not in round)
  - Friend requests
- Sent via Supabase edge function (`send-push`)
- Presentation: badge, sound, alert

---

## 13. SUBSCRIPTION TIERS (Free vs. Pro)

| Feature | Free | Pro |
|---------|------|-----|
| Players per round | 4 max | 8 max |
| Friends | 4 max | Unlimited |
| Groups | Limited | Unlimited |
| Stroke Play | Yes | Yes |
| Match Play | Yes | Yes |
| Nassau | No | Yes |
| Skins | No carryover | Full (with carryover) |
| Wolf | No | Yes |
| Best Ball | No | Yes |
| Stableford | No | Yes |
| CTP / Longest Drive | Yes | Yes |
| Junk bets (Sandie, Barkie, etc.) | No | Yes |
| Custom prop bets | No | Yes |
| Full stats | No | Yes |
| Settlement tracking | No | Yes |
| Round export | No | Yes |

---

## 14. MONETIZATION FEATURES

### 14.1 Feature Gating
- `FeatureGate` component wraps Pro features
- Lock overlay with blur effect on gated content
- Tap-to-upgrade flow
- `useFeatureGate` hook for programmatic gating

### 14.2 Paywall Modal
- Bottom sheet with plan selection (monthly/annual)
- Feature comparison list
- Real-time pricing from RevenueCat
- Purchase, restore, and manage flows
- Context-aware: shows which feature triggered the paywall

### 14.3 Pro Badge
- Small chartreuse "PRO" badge on gated features
- Crown icon for upgrade prompts
