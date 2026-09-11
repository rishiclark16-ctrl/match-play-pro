# MATCH Golf - Component Inventory

---

## Overview

The MATCH Golf app contains **130+ React components** organized into domain-specific directories. This document catalogs every component, its location, and its purpose.

---

## 1. TOP-LEVEL COMPONENTS

| Component | File | Purpose |
|-----------|------|---------|
| `AuthGuard` | `components/AuthGuard.tsx` | Route protection -- redirects unauthenticated users to `/auth` |
| `BottomNav` | `components/BottomNav.tsx` | Fixed bottom tab bar (Home, Social, New Round, Stats, Profile) |
| `ErrorBoundary` | `components/ErrorBoundary.tsx` | App-level error boundary with fallback UI |
| `NavLink` | `components/NavLink.tsx` | Styled navigation link |
| `OfflineIndicator` | `components/OfflineIndicator.tsx` | Inline offline status indicator |

---

## 2. GOLF COMPONENTS (`components/golf/`)

### 2.1 Round Creation

| Component | Purpose |
|-----------|---------|
| `CourseStep` | Course selection/search step in new round wizard |
| `CourseSearch` | Golf course search with autocomplete |
| `PlayersStep` | Player addition step with friend search and handicap entry |
| `PlayerInput` | Individual player input row |
| `PlayerCard` | Player display card in round setup |
| `FormatStep` | Game format selection step |
| `TeeSelector` | Tee box color/set picker |
| `MixedTeesSheet` | Bottom sheet for configuring mixed tees per player |

### 2.2 Scorecard

| Component | Purpose |
|-----------|---------|
| `ScorecardHeader` | Top bar during scoring (course name, hole info) |
| `ScorecardBottomBar` | Bottom action bar during scoring |
| `ScoreInputSheet` | Bottom sheet for entering scores |
| `QuickScoreButtons` | Tap-to-score buttons (par-2 through par+4) |
| `HoleNavigator` | Swipe/tap navigation between holes |
| `HoleSummary` | Hole info display (par, yardage, handicap) |
| `ScorecardModals` | Collection of scorecard-related modals |
| `ScorecardTutorial` | First-time scorecard usage tutorial overlay |
| `ConnectionStatus` | Real-time connection status indicator |
| `HandicapStrokesSheet` | Shows handicap stroke allocation per hole |

### 2.3 Voice Scoring

| Component | Purpose |
|-----------|---------|
| `VoiceButton` | Microphone button for voice input |
| `VoiceConfirmationModal` | Confirm/reject voice-parsed scores |
| `AIBuilderTutorial` | Tutorial for AI game builder voice input |

### 2.4 Dashboard (In-Round)

| Component | Purpose |
|-----------|---------|
| `DashboardTabBar` | Tab navigation within round dashboard |
| `DashboardScorecard` | Full scorecard grid view |
| `DashboardGames` | Live game results panel |
| `DashboardMoney` | Live money tracker |
| `DashboardStats` | In-round statistics |
| `DashboardHighlights` | Notable moments feed |
| `DashboardNassauCard` | Nassau game status card |
| `DashboardSkinsCard` | Skins game status card |
| `DashboardMatchPlayCard` | Match play status card |
| `DashboardWolfCard` | Wolf game status card |
| `DashboardHouseGameCard` | House game status card |

### 2.5 Game Sections (Results Display)

| Component | Purpose |
|-----------|---------|
| `GamesSection` | Container for all game result sections |
| `NassauSection` | Nassau results display |
| `NassauSectionWithScores` | Nassau with hole-by-hole score breakdown |
| `SkinsSection` | Skins results display |
| `MatchPlaySection` | Match play results display |
| `WolfSection` | Wolf results display |
| `StablefordSection` | Stableford results display |
| `BestBallSection` | Best ball results display |
| `StrokePlaySection` | Stroke play results display |
| `HouseGameSection` | House game results display |
| `PropBetsSection` | Prop bet results display |
| `shared.tsx` | Shared game section utilities |

### 2.6 Betting & Money

| Component | Purpose |
|-----------|---------|
| `MoneyTracker` | Live money balance display |
| `SettlementsSection` | Final settlement summary |
| `BettingBreakdownSheet` | Detailed betting breakdown bottom sheet |
| `GameSettingsSheet` | Game configuration bottom sheet |
| `PropBetSheet` | Prop bet creation/management sheet |
| `JunkBetSheet` | Junk/side bet management |
| `PropBetCelebration` | Animation when prop bet is won |

### 2.7 Wolf Game

| Component | Purpose |
|-----------|---------|
| `WolfSelection` | Wolf partner selection UI |

### 2.8 House Game

| Component | Purpose |
|-----------|---------|
| `HouseGamePrimitives` | Configurable rule primitives for house games |
| `BingoBangoSheet` | Bingo Bango Bongo scoring sheet |
| `UseThisGameButton` | Quick-apply a house game format |

### 2.9 Round Completion

| Component | Purpose |
|-----------|---------|
| `RoundCompleteHeader` | Header for round completion page |
| `RoundCompleteActions` | Action buttons (share, new round, etc.) |
| `FinalStandings` | Final leaderboard standings |
| `GameResultsSection` | Comprehensive game results |
| `HighlightsSection` | Round highlights summary |
| `WinnerCard` | Winner display with animation |
| `ShareRoundResultsSheet` | Share results via image/SMS/email |
| `ShareJoinCodeModal` | Share round join code |

### 2.10 Round Management

| Component | Purpose |
|-----------|---------|
| `RoundCard` | Round summary card on home page |
| `SpectatorRoundCard` | Read-only round card for spectators |
| `SpectatorBanner` | Banner indicating spectator mode |
| `LiveLeaderboard` | Real-time leaderboard during round |
| `FinishOptionsOverlay` | End-round options (finish, pause, etc.) |
| `ManageScorekeepersSheet` | Scorekeeper delegation |
| `CollapsibleSection` | Expandable/collapsible content section |
| `SwingAnimation` | Decorative swing animation |

### 2.11 Playoff

| Component | Purpose |
|-----------|---------|
| `PlayoffMode` | Sudden-death playoff scoring |
| `PlayoffWinnerModal` | Winner announcement with celebration |

---

## 3. FRIEND COMPONENTS (`components/friends/`)

| Component | Purpose |
|-----------|---------|
| `FriendCard` | Individual friend display card |
| `FriendRequestCard` | Pending friend request card |
| `FriendCodeQR` | QR code displaying user's friend code |
| `QRCodeScanner` | Camera-based QR code scanner |
| `ShareFriendCode` | Share friend code via native share |
| `QuickAddFriends` | Quick friend discovery/add interface |
| `ContactSyncSheet` | Native contact sync bottom sheet |

---

## 4. GROUP COMPONENTS (`components/groups/`)

| Component | Purpose |
|-----------|---------|
| `CreateGroupSheet` | Create new golf group |
| `GroupSelector` | Select active group |
| `GroupFormatPickerSheet` | Pick a group's house game format |
| `GroupLedgerView` | Cross-round money ledger for the group |
| `PlayerLedgerSheet` | Individual player ledger within group |
| `SettleUpSheet` | Mark debts as paid within group |

---

## 5. SOCIAL COMPONENTS (`components/social/`)

| Component | Purpose |
|-----------|---------|
| `SocialFeedTab` | Main social activity feed |
| `FeedItem` | Individual feed post (round result) |
| `FeedItemSkeleton` | Loading skeleton for feed items |
| `RoundDetailSheet` | Expanded round detail bottom sheet |
| `ScorecardGrid` | Compact scorecard display in feed |
| `ReactionBar` | Emoji reaction bar for posts |
| `CommentsSection` | Comments on a round |
| `RoundChatSheet` | In-round chat messaging |
| `MoneyBadge` | Winning/losing money indicator badge |
| `AvatarStack` | Overlapping avatar group display |
| `SeasonLeaderboard` | Season-long money leaderboard |
| `UpcomingRoundsTab` | Planned/upcoming rounds feed |
| `UpcomingRoundCard` | Individual upcoming round card |
| `CreateUpcomingSheet` | Schedule an upcoming round |

---

## 6. PROFILE COMPONENTS (`components/profile/`)

| Component | Purpose |
|-----------|---------|
| `AvatarUpload` | Profile photo upload with camera/gallery |
| `HomeCourseSelector` | Search and set home course |

---

## 7. SUBSCRIPTION COMPONENTS (`components/subscription/`)

| Component | Purpose |
|-----------|---------|
| `PaywallModal` | Full-screen subscription paywall |
| `FeatureGate` | Wrapper that locks Pro content for free users |
| `UpgradePrompt` | Inline upgrade CTA card |
| `useFeatureGate` | Hook for programmatic feature gating |
| `SubscriptionCard` | Subscription plan display card |
| `ProBadge` | Small "PRO" badge indicator |

---

## 8. ONBOARDING COMPONENTS (`components/onboarding/`)

| Component | Purpose |
|-----------|---------|
| `AppTutorial` | Full-app tutorial overlay for new users |

---

## 9. LAYOUT COMPONENTS (`components/layout/`)

| Component | Purpose |
|-----------|---------|
| `AppLayout` | Main app layout wrapper |

---

## 10. UI PRIMITIVES (`components/ui/`)

These are base UI components from shadcn/ui (Radix) plus custom components:

### shadcn/ui Components (Radix-based)
| Component | Description |
|-----------|-------------|
| `accordion` | Expandable content sections |
| `alert-dialog` | Confirmation dialogs |
| `alert` | Alert banners |
| `aspect-ratio` | Fixed aspect ratio container |
| `avatar` | User avatar display |
| `badge` | Status/label badges |
| `breadcrumb` | Navigation breadcrumbs |
| `button` | Primary button component |
| `calendar` | Date picker calendar |
| `card` | Card container |
| `carousel` | Image/content carousel |
| `chart` | Chart wrapper |
| `checkbox` | Checkbox input |
| `collapsible` | Collapsible content |
| `command` | Command palette (cmdk) |
| `context-menu` | Right-click context menu |
| `dialog` | Modal dialog |
| `drawer` | Bottom drawer (vaul) |
| `dropdown-menu` | Dropdown menu |
| `form` | Form wrapper with validation |
| `hover-card` | Hover tooltip card |
| `input-otp` | OTP/code input |
| `input` | Text input |
| `label` | Form label |
| `menubar` | Menu bar |
| `navigation-menu` | Navigation menu |
| `pagination` | Page pagination |
| `popover` | Popover tooltip |
| `progress` | Progress bar |
| `radio-group` | Radio button group |
| `resizable` | Resizable panels |
| `scroll-area` | Custom scrollbar area |
| `select` | Select dropdown |
| `separator` | Visual separator line |
| `sheet` | Bottom/side sheet |
| `sidebar` | Sidebar navigation |
| `skeleton` | Loading skeleton |
| `slider` | Range slider |
| `sonner` | Toast notification provider |
| `switch` | Toggle switch |
| `table` | Data table |
| `tabs` | Tab navigation |
| `textarea` | Multi-line text input |
| `toast` | Toast notification |
| `toaster` | Toast container |
| `toggle-group` | Toggle button group |
| `toggle` | Toggle button |
| `tooltip` | Hover tooltip |

### Custom UI Components
| Component | Description |
|-----------|-------------|
| `animated-number` | Animated number transitions |
| `app-background` | App-level background styling |
| `geometric-background` | Decorative geometric pattern |
| `glass-card` | Frosted glass card effect |
| `OfflineBanner` | Offline status banner with animation |
| `page-skeleton` | Page-level loading skeleton (default, scorecard, list variants) |
| `pull-to-refresh` | Pull-to-refresh gesture handler |
| `round-list-skeleton` | Round list loading skeleton |
| `splash-screen` | Animated app splash screen |
| `tech-card` | Technology showcase card |

---

## Component Count Summary

| Category | Count |
|----------|-------|
| Golf components | 55 |
| UI primitives (shadcn) | 44 |
| Custom UI components | 10 |
| Social components | 14 |
| Friend components | 7 |
| Group components | 6 |
| Subscription components | 5 |
| Profile components | 2 |
| Onboarding components | 1 |
| Layout components | 1 |
| Top-level components | 5 |
| **TOTAL** | **~150** |
