# Watch Party — UI/UX Specification

**Version:** 1.0 (V1)
**Date:** 2026-04-06
**Design System:** TailwindCSS 3 + shadcn/ui + Framer Motion + Lucide icons

---

## 1. Design Principles

1. **Invisible to players** — Zero UI leakage. Players never see a badge, count, or hint.
2. **Effortless entry** — One tap from notification to Watch Party. No onboarding flow.
3. **Chat-first** — The chat IS the feature. Scores provide context; chat provides connection.
4. **Reveal is the payoff** — The moment players discover the chat should feel like unwrapping a gift.
5. **Consistent with existing app** — Uses the same dark/light patterns, spring animations, and component library.

---

## 2. Color Palette (Watch Party-specific)

| Element | Color | Hex | Usage |
|---------|-------|-----|-------|
| Watch Party accent | Electric Purple | `#8B5CF6` | Primary CTA, badges, header accent |
| Watch Party bg tint | Soft Violet | `#F5F3FF` | Banner backgrounds, chat bubble bg |
| Live indicator | Pulse Green | `#22C55E` | "LIVE" dot, active status |
| Recency text | Muted gray | `#9CA3AF` | "Updated 38s ago" timestamps |
| Chat bubble (self) | Violet-600 | `#7C3AED` | Your messages |
| Chat bubble (others) | Gray-100 | `#F3F4F6` | Others' messages |
| Reveal glow | Gold | `#F59E0B` | Post-round reveal animation |

---

## 3. Screen Flow

```
Push Notification
    │
    ▼
┌─────────────────────┐
│  Watch Party View    │  ◄── Main spectator screen
│  ┌───────────────┐   │
│  │ Score Header   │   │  ◄── Live scores + match headline
│  ├───────────────┤   │
│  │ Chat Messages  │   │  ◄── Scrollable chat area (80% of screen)
│  ├───────────────┤   │
│  │ Message Input  │   │  ◄── Text input + send button
│  └───────────────┘   │
└─────────────────────┘
          │
          │ Round Completes
          ▼
┌─────────────────────┐
│  Round Complete Page │
│  ┌───────────────┐   │
│  │ Results        │   │  ◄── Existing round complete UI
│  ├───────────────┤   │
│  │ Watch Party    │   │  ◄── NEW: "Watch Party" card (revealed)
│  │ Reveal Card    │   │
│  └───────────────┘   │
└─────────────────────┘
          │
          ▼
┌─────────────────────┐
│  Unified Chat View   │  ◄── Full chat history, players can now participate
└─────────────────────┘
```

---

## 4. Screen-by-Screen Design

### 4.1 Push Notification

**iOS Lock Screen / Banner:**
```
┌──────────────────────────────────┐
│ 🏌️ MATCH Golf                    │
│ Alex, Rishi, Luc & Jim just teed │
│ off at Pebble Beach              │
│ Tap to watch live                │
└──────────────────────────────────┘
```

**Notification payload:**
```json
{
  "title": "Your friends are playing!",
  "body": "Alex, Rishi, Luc & Jim just teed off at Pebble Beach",
  "data": {
    "route": "/watch/{roundId}",
    "roundId": "{roundId}",
    "type": "watch_party"
  }
}
```

### 4.2 Home Page — Friend Activity Card (Enhanced)

The existing `useFriendActivity` live round cards on Home get a new "Watch" button.

```
┌────────────────────────────────────────────┐
│  🟢 LIVE                                    │
│                                             │
│  Alex, Rishi, Luc & Jim                     │
│  Pebble Beach GC · Hole 7 of 18            │
│                                             │
│  ┌─────────┐  ┌──────────────────┐          │
│  │  Join    │  │ 👁 Watch Party   │          │
│  └─────────┘  └──────────────────┘          │
└────────────────────────────────────────────┘
```

**"Watch Party" button:**
- Icon: `Eye` (Lucide)
- Color: `#8B5CF6` (electric purple) text + outline
- Navigates to `/watch/{roundId}`
- Only visible if user is NOT a player in that round

### 4.3 Watch Party View — Main Screen

**Route:** `/watch/:roundId`

This is the primary spectator experience. It's a single screen split into two zones: a collapsible score header and the chat.

#### Header (Score Zone)

```
┌────────────────────────────────────────────┐
│ ← Back          Watch Party       Leave ✕  │
│                                             │
│ Pebble Beach GC · Match Play               │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │  Rishi & Luc          Alex & Jim        │ │
│ │      2 UP          thru 7               │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌──────────┬──────────┬──────────┬────────┐ │
│ │ 👤 Alex  │ 👤 Rishi │ 👤 Luc  │ 👤 Jim │ │
│ │ +3 (39)  │ +1 (37)  │ E (36)  │ +2(38) │ │
│ │ 38s ago  │ 38s ago  │ 1m ago  │ 38s ago│ │
│ └──────────┴──────────┴──────────┴────────┘ │
│                                             │
│ 👁 5 watching · LIVE 🟢                     │
└────────────────────────────────────────────┘
```

**Design details:**
- **Back button**: navigates to Home
- **"Leave" button**: removes user from Watch Party, navigates to Home
- **Match headline**: uses existing `generateMatchPlayHeadline()` from `matchPlay.ts`
- **Player score cards**: horizontal scroll if >4 players
  - Avatar (32px), first name, score vs par, total strokes in parens
  - Recency badge below: light gray text, updates every 15s
  - Recency format: `"Xs ago"` (<60s), `"Xm ago"` (1-59m), `"Xh ago"` (1h+)
- **Spectator count**: `"👁 5 watching"` — shown to spectators only, NEVER to players
- **LIVE indicator**: pulsing green dot with `animate-pulse` tailwind class
- **Collapsible**: tap the score zone to collapse it (shows only match headline), giving more room for chat

#### Chat Zone

```
┌────────────────────────────────────────────┐
│                                             │
│   Jake                           2:34 PM   │
│   ┌─────────────────────────────┐           │
│   │ Luc is about to go off 😂   │           │
│   └─────────────────────────────┘           │
│                                             │
│                          Jimmy   2:35 PM    │
│          ┌─────────────────────────────┐    │
│          │ Alex always chokes the back │    │
│          │ nine let's be real           │    │
│          └─────────────────────────────┘    │
│                                             │
│   Jordan                         2:36 PM   │
│   ┌─────────────────────────────┐           │
│   │ Rishi just drained a 30ft   │           │
│   │ putt I can feel it           │           │
│   └─────────────────────────────┘           │
│                                             │
│                          Timmy   2:37 PM    │
│          ┌─────────────────────────────┐    │
│          │ 🔥🔥🔥                      │    │
│          └─────────────────────────────┘    │
│                                             │
├────────────────────────────────────────────┤
│  ┌──────────────────────────────┐  ┌────┐  │
│  │ Say something...             │  │ ➤  │  │
│  └──────────────────────────────┘  └────┘  │
└────────────────────────────────────────────┘
```

**Chat design details:**
- **Message bubbles**: 
  - Others: `bg-gray-100` with `text-gray-900`, left-aligned
  - Self: `bg-violet-600` with `text-white`, right-aligned
  - Border radius: `rounded-2xl` with directional corner (like iMessage)
- **Sender name**: shown above each message group (consecutive messages from same sender grouped)
- **Timestamp**: `text-xs text-gray-400`, shown on first message of each time group (>5min gap)
- **Avatar**: 24px circle, shown next to sender name
- **Auto-scroll**: scroll to bottom on new message (unless user has scrolled up)
- **Scroll-to-bottom FAB**: appears when user scrolls up, shows unread count badge
- **Input bar**: 
  - Fixed at bottom, keyboard-aware (moves up with keyboard)
  - Placeholder: `"Say something..."`
  - Send button: `bg-violet-600` circle with `SendHorizonal` (Lucide) icon
  - Disabled when empty
  - Max 500 chars, no visible counter (subtle red border at limit)
- **Empty state**: `"You're in! Chat about the round — players can't see this until it's over."` with a 🤫 emoji

#### Animations
- **Screen entry**: `motion.div` slide-up from bottom (like a sheet)
- **New message**: `motion.div` with `initial={{ opacity: 0, y: 10 }}` → `animate={{ opacity: 1, y: 0 }}`
- **Score update**: player card pulses briefly (`scale: [1, 1.02, 1]`) when their score changes
- **LIVE dot**: CSS `animate-pulse` (standard Tailwind)

### 4.4 Round Complete Page — Watch Party Reveal Card

After the round is submitted, the existing `RoundComplete.tsx` page gets a new section.

```
┌────────────────────────────────────────────┐
│                                             │
│  [Existing: Winner Card, Standings, etc.]   │
│                                             │
│  ┌─────────────────────────────────────────┐│
│  │  🎙  Watch Party                        ││
│  │                                         ││
│  │  5 friends watched · 24 messages        ││
│  │                                         ││
│  │  "Alex always chokes the back nine..."  ││
│  │  — Jimmy                                ││
│  │                                         ││
│  │  ┌─────────────────────────────────┐    ││
│  │  │       Read the full chat →      │    ││
│  │  └─────────────────────────────────┘    ││
│  └─────────────────────────────────────────┘│
│                                             │
│  [Existing: Settlements, Game Results]      │
│                                             │
└────────────────────────────────────────────┘
```

**Reveal Card design:**
- **Placement**: between Winner/Standings and Settlements sections
- **Only shown if** the round had ≥1 Watch Party message
- **Header**: `🎙 Watch Party` with `text-violet-600` accent
- **Stats line**: `"X friends watched · Y messages"` in `text-gray-500`
- **Preview message**: shows the first or most-reacted message as a teaser quote
- **CTA button**: `"Read the full chat →"` — navigates to `/watch/:roundId` (now in post-round mode)
- **Animation on first view**: card fades in with a subtle golden glow border (`ring-2 ring-amber-400/50`) that fades after 2 seconds — the "reveal" moment

### 4.5 Post-Round Chat View

**Route:** `/watch/:roundId` (same route, different mode based on round status)

When the round is complete, the Watch Party view transforms:

```
┌────────────────────────────────────────────┐
│ ← Back        Watch Party Chat             │
│                                             │
│ Pebble Beach GC · Final Scores             │
│ Rishi & Luc def. Alex & Jim, 2 & 1         │
│                                             │
│ ── During the round ──────────────────────  │
│                                             │
│   [All spectator messages from during       │
│    the round, with timestamps]              │
│                                             │
│ ── After the round ───────────────────────  │
│                                             │
│   Alex                           3:45 PM   │
│   ┌─────────────────────────────┐           │
│   │ Jimmy you're a hater 😂     │           │
│   └─────────────────────────────┘           │
│                                             │
│   [Continued conversation, both             │
│    players and spectators]                  │
│                                             │
├────────────────────────────────────────────┤
│  ┌──────────────────────────────┐  ┌────┐  │
│  │ Say something...             │  │ ➤  │  │
│  └──────────────────────────────┘  └────┘  │
└────────────────────────────────────────────┘
```

**Post-round changes:**
- **Header**: "Watch Party Chat" (no "Leave" button since round is over)
- **Score zone**: shows final scores, not live updating
- **Divider**: `"── During the round ──"` separating pre-completion from post-completion messages
- **Player messages**: now appear in chat, marked with a small `"🏌️"` icon next to their name to distinguish from spectators
- **No LIVE dot**: replaced with final result summary
- **"Leave" → gone**: anyone can now freely close and reopen

### 4.6 Feed Card — Watch Party Indicator

On the social feed, completed rounds with a Watch Party show an extra line:

```
┌────────────────────────────────────────────┐
│  Alex's Round at Pebble Beach              │
│  Final: Rishi 72, Alex 75, Luc 74, Jim 76 │
│  Nassau · Match Play · Skins               │
│                                             │
│  🎙 Watch Party (24 messages)    💬 3       │
│                                             │
│  🥶 3  💰 2  🔥 1                           │
└────────────────────────────────────────────┘
```

**Design:**
- Below games row, above reactions row
- `🎙` microphone emoji + `"Watch Party"` in `text-violet-600 font-medium`
- `"(24 messages)"` in `text-gray-500`
- Tappable — navigates to `/watch/:roundId` (post-round view)
- Only shown if round has ≥1 Watch Party message

---

## 5. Interaction Patterns

### 5.1 Joining the Watch Party
```
User taps notification → App opens → /watch/:roundId
  OR
User taps "Watch Party" on Home friend activity card → /watch/:roundId

On mount:
1. Check friendship with any player (client query or server RPC)
2. Insert row into watch_party_members (if not exists)
3. Subscribe to real-time channels (scores + chat)
4. Fetch full chat history
5. Render score header + chat
```

### 5.2 Leaving the Watch Party
```
User taps "Leave ✕" in header
1. Unsubscribe from real-time channels
2. Optionally: delete watch_party_members row (or keep for analytics)
3. Navigate to Home
4. User can re-join anytime by navigating back
```

### 5.3 Round Completion (Spectator's perspective)
```
Round status → 'complete' (via real-time subscription)
1. Score header shows "FINAL" instead of "LIVE"
2. Toast: "Round complete! Players can now see the chat 👀"
3. Chat divider inserted: "── After the round ──"
4. Chat continues as unified thread
```

### 5.4 Round Completion (Player's perspective)
```
Player submits scorecard → navigates to /round/:id/complete
1. Round Complete page renders normally
2. IF watch_party_messages exist for this round:
   a. Watch Party Reveal Card fades in with golden glow
   b. Player taps "Read the full chat →"
   c. Navigates to /watch/:roundId (post-round mode)
   d. Player sees all spectator messages + can reply
```

---

## 6. Component Architecture

### New Components
| Component | Path | Description |
|-----------|------|-------------|
| `WatchPartyView` | `src/pages/WatchParty.tsx` | Main page component (lazy-loaded) |
| `WatchPartyScoreHeader` | `src/components/golf/WatchPartyScoreHeader.tsx` | Collapsible live score zone |
| `WatchPartyChat` | `src/components/golf/WatchPartyChat.tsx` | Chat message list + input |
| `WatchPartyChatBubble` | `src/components/golf/WatchPartyChatBubble.tsx` | Individual message bubble |
| `WatchPartyRevealCard` | `src/components/golf/WatchPartyRevealCard.tsx` | Reveal card on Round Complete |
| `WatchPartyFeedBadge` | `src/components/golf/WatchPartyFeedBadge.tsx` | Feed card indicator |
| `WatchPartyEmptyState` | `src/components/golf/WatchPartyEmptyState.tsx` | Empty chat state with 🤫 |
| `RecencyBadge` | `src/components/golf/RecencyBadge.tsx` | "Updated Xs ago" component |

### New Hooks
| Hook | Path | Description |
|------|------|-------------|
| `useWatchParty` | `src/hooks/useWatchParty.ts` | Main hook: join/leave, member list, state |
| `useWatchPartyChat` | `src/hooks/useWatchPartyChat.ts` | Chat messages, send, real-time subscription |
| `useWatchPartyScores` | `src/hooks/useWatchPartyScores.ts` | Score subscription + recency tracking |
| `useWatchPartyNotification` | `src/hooks/useWatchPartyNotification.ts` | Broadcast push on round start |

### Modified Components
| Component | Change |
|-----------|--------|
| `Home.tsx` | Add "Watch Party" button to friend activity cards |
| `RoundComplete.tsx` | Add `WatchPartyRevealCard` section |
| `SocialFeedCard` (in `useSocialFeed`) | Add Watch Party message count + badge |
| `usePushNotifications.ts` | Handle `watch_party` notification type routing |
| `useCreateSupabaseRound.ts` | Trigger Watch Party notification broadcast on round activation |
| `App.tsx` | Add `/watch/:roundId` route |

---

## 7. Responsive & Platform Notes

- **iOS Safe Areas**: Chat input must respect `safe-area-inset-bottom` for notched devices
- **Keyboard avoidance**: Use Capacitor Keyboard plugin listener to push chat input above keyboard
- **Haptics**: Light haptic on message send (`hapticLight()`), medium on reveal card appearance
- **Screen wake**: NOT kept awake for spectators (only for players via `useKeepAwake`)
- **Dark mode**: Not in V1 scope (app doesn't have dark mode yet), but color choices work on dark bg
- **iPad**: Standard responsive — chat fills available width, max 600px for readability

---

## 8. Accessibility

- All interactive elements have `aria-label`
- Chat messages use `role="log"` with `aria-live="polite"` for screen reader announcements
- Send button: `aria-label="Send message"`
- Leave button: `aria-label="Leave watch party"`
- Score cards: each has `aria-label="[Name], [score] through [hole]"`
- Color contrast: all text meets WCAG 2.1 AA (4.5:1 minimum)
- Focus management: message input auto-focuses on mount, returns focus after send
