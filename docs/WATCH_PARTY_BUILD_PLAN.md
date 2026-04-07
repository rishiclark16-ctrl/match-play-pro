# Watch Party — Phased Build Plan

**Version:** 1.0 (V1)
**Date:** 2026-04-06

---

## Overview

5 phases, each independently testable. Each phase produces a working increment.

---

## Phase 1: Database Foundation
**Effort:** ~1 session | **Risk:** Low | **Testable:** Via Supabase SQL editor

### Deliverables
1. Migration file: `supabase/migrations/20260406000000_watch_party.sql`
   - `watch_party_members` table + indexes + RLS
   - `watch_party_messages` table + indexes + RLS
   - `watch_party_notifications` table + RLS
   - Helper functions: `is_watch_party_member()`, `is_friend_of_any_player()`, `is_round_complete()`
   - RPCs: `get_watch_party_recipients()`, `get_watch_party_stats()`, `get_watch_party_messages()`

2. TypeScript types update: `src/integrations/supabase/types.ts` (regenerate after migration)

### Verification
- Apply migration locally via `supabase db push` or in dashboard
- Test RPCs manually with known round IDs
- Verify RLS: spectator can read messages, player cannot (while round is active), player CAN read (after round is complete)

### Dependencies
- None (pure database work)

---

## Phase 2: Notification Broadcast
**Effort:** ~1 session | **Risk:** Medium (push infra) | **Testable:** Via real push on device

### Deliverables
1. `src/lib/watchPartyNotification.ts` — broadcast function
   - `broadcastWatchPartyNotification(roundId, courseName, playerNames)`
   - Calls `get_watch_party_recipients()` RPC
   - Calls `sendPushToProfiles()` with type `'watch_party'`
   - Records send in `watch_party_notifications` table
   - Deduplication check (don't send twice)

2. Update `src/hooks/useProfile.ts` — add `watch_party` to `NotificationPreferences`

3. Update notification routing in `src/hooks/usePushNotifications.ts`
   - Handle `type: 'watch_party'` → navigate to `/watch/:roundId`

4. Integration: call `broadcastWatchPartyNotification()` on first score save
   - In Scorecard.tsx or a new `useWatchPartyBroadcast` hook
   - Trigger once per round, guarded by `watch_party_notifications` table

### Verification
- Start a round with 2+ players who have friends
- Verify friends receive push notification
- Verify players do NOT receive notification
- Verify tapping notification navigates correctly (to blank page for now)
- Verify notification not sent twice

### Dependencies
- Phase 1 (database tables + RPCs must exist)

---

## Phase 3: Watch Party View — Scores + Chat
**Effort:** ~2 sessions | **Risk:** Low | **Testable:** In browser + simulator

### Deliverables

#### Hooks
1. `src/hooks/useWatchParty.ts`
   - Join/leave logic (insert/update `watch_party_members`)
   - Friendship verification
   - Member list + count
   - Round status tracking (active vs complete)

2. `src/hooks/useWatchPartyChat.ts`
   - Fetch messages via `get_watch_party_messages()` RPC
   - Real-time subscription on `watch_party_messages`
   - Send message (insert with `is_post_reveal` based on round status)
   - Delete own message

3. `src/hooks/useWatchPartyScores.ts`
   - Wraps `useSupabaseRound` in read-only mode
   - Adds per-player `lastUpdatedAt` tracking
   - 15-second interval for recency badge refresh

#### Components
4. `src/pages/WatchParty.tsx` — main page (lazy-loaded)
   - Route: `/watch/:roundId`
   - Orchestrates score header + chat
   - Handles join-on-mount, leave-on-button
   - Shows empty state if no messages yet

5. `src/components/golf/WatchPartyScoreHeader.tsx`
   - Collapsible score zone
   - Player cards with avatars, scores, recency badges
   - Match headline (reuses `generateMatchPlayHeadline()`)
   - LIVE indicator + spectator count
   - Course name + game type badges

6. `src/components/golf/WatchPartyChat.tsx`
   - Message list with auto-scroll
   - Message grouping (consecutive same-sender)
   - Time group separators (>5min gap)
   - Scroll-to-bottom FAB
   - Message input bar (keyboard-aware)

7. `src/components/golf/WatchPartyChatBubble.tsx`
   - Left/right alignment (others/self)
   - Sender name + avatar
   - Timestamp
   - Player badge (post-reveal)

8. `src/components/golf/WatchPartyEmptyState.tsx`
   - "You're in!" message with 🤫

9. `src/components/golf/RecencyBadge.tsx`
   - "Updated Xs ago" / "Xm ago" / "Xh ago"
   - Accepts a `Date` prop, re-renders on 15s interval

#### Routing
10. Update `src/App.tsx` — add lazy route for `/watch/:roundId`

### Verification
- Navigate to `/watch/:roundId` for an active round
- Verify scores load and update in real-time
- Verify recency badges update
- Send messages between two spectator accounts
- Verify messages appear in real-time
- Verify a player account CANNOT see messages (RLS enforcement)
- Test join and leave flow

### Dependencies
- Phase 1 (database)
- Phase 2 (notification routing, so tapping notification works)

---

## Phase 4: Home Page Integration + Post-Round Reveal
**Effort:** ~1 session | **Risk:** Low | **Testable:** End-to-end flow

### Deliverables

#### Home Page
1. Update `src/pages/Home.tsx`
   - Add "Watch Party" button to friend activity cards (from `useFriendActivity`)
   - Button only shown if user is not a player in that round
   - Navigates to `/watch/:roundId`

#### Round Complete — Reveal
2. `src/components/golf/WatchPartyRevealCard.tsx`
   - Fetches `get_watch_party_stats()` for the round
   - Renders only if `message_count > 0`
   - Shows spectator count, message count, preview quote
   - "Read the full chat →" CTA
   - Golden glow entrance animation

3. Update `src/pages/RoundComplete.tsx`
   - Import and render `WatchPartyRevealCard` between standings and settlements
   - Pass `roundId` prop

#### Post-Round Chat Mode
4. Update `src/pages/WatchParty.tsx`
   - Detect round status: if `'complete'`, render in post-round mode
   - Show final scores instead of live scores
   - Show "During the round" / "After the round" dividers
   - Allow players to read and post messages
   - Mark new messages with `is_post_reveal: true`

#### Round Completion Handling (Spectator)
5. Update `useWatchParty` hook
   - When round status changes to `'complete'` via real-time:
     - Show toast: "Round complete! Players can now see the chat"
     - Update UI to post-round mode
     - Switch LIVE → FINAL

### Verification
- Full end-to-end: start round → friends get notification → tap to watch → chat → round completes → spectator sees transition → player sees reveal card → player reads chat → player replies
- Verify "Watch Party" button on Home friend activity cards
- Verify reveal card only shows when messages exist
- Verify post-round chat allows both players and spectators

### Dependencies
- Phase 3 (Watch Party view must exist)

---

## Phase 5: Feed Integration + Polish
**Effort:** ~1 session | **Risk:** Low | **Testable:** Visual + functional

### Deliverables

#### Feed
1. `src/components/golf/WatchPartyFeedBadge.tsx`
   - Shows `"🎙 Watch Party (X messages)"` on feed cards
   - Tappable → navigates to `/watch/:roundId`

2. Update `useSocialFeed.ts`
   - Fetch Watch Party message count per round (batch query)
   - Include in `FeedRoundItem` type

3. Update feed card rendering (in Home or wherever feed cards are rendered)
   - Conditionally show `WatchPartyFeedBadge`

#### Polish
4. Animations
   - Message send: slide-up with fade
   - Score update: brief pulse on player card
   - Reveal card: golden glow border that fades
   - Screen transitions: slide-up from bottom

5. Haptics
   - `hapticLight()` on message send
   - `hapticSuccess()` on reveal card tap

6. Error states
   - Network error: "Couldn't load the Watch Party. Pull to retry."
   - Not friends: "You need to be friends with a player to watch."
   - Round not found: standard 404

7. Settings integration
   - Add "Watch Party notifications" toggle in profile notification preferences
   - Maps to `watch_party` key in `notification_preferences`

### Verification
- Complete feed shows Watch Party badge on rounds that had spectators
- Tapping badge opens post-round chat
- All animations smooth on device
- Settings toggle works
- Error states display correctly

### Dependencies
- Phase 4 (reveal + post-round must work)

---

## Build Order Summary

```
Phase 1: Database ──────────────────────┐
                                        ├── Phase 3: Watch Party View
Phase 2: Notifications ─────────────────┘         │
                                                   ├── Phase 4: Integration + Reveal
                                                   │         │
                                                   │         └── Phase 5: Feed + Polish
                                                   │
                                        Phases 1+2 can be built in parallel
```

---

## File Inventory (All New Files)

| File | Phase | Type |
|------|-------|------|
| `supabase/migrations/20260406000000_watch_party.sql` | 1 | Migration |
| `src/lib/watchPartyNotification.ts` | 2 | Utility |
| `src/hooks/useWatchParty.ts` | 3 | Hook |
| `src/hooks/useWatchPartyChat.ts` | 3 | Hook |
| `src/hooks/useWatchPartyScores.ts` | 3 | Hook |
| `src/pages/WatchParty.tsx` | 3 | Page |
| `src/components/golf/WatchPartyScoreHeader.tsx` | 3 | Component |
| `src/components/golf/WatchPartyChat.tsx` | 3 | Component |
| `src/components/golf/WatchPartyChatBubble.tsx` | 3 | Component |
| `src/components/golf/WatchPartyEmptyState.tsx` | 3 | Component |
| `src/components/golf/RecencyBadge.tsx` | 3 | Component |
| `src/components/golf/WatchPartyRevealCard.tsx` | 4 | Component |
| `src/components/golf/WatchPartyFeedBadge.tsx` | 5 | Component |

### Modified Files
| File | Phase | Change |
|------|-------|--------|
| `src/hooks/useProfile.ts` | 2 | Add `watch_party` to NotificationPreferences |
| `src/hooks/usePushNotifications.ts` | 2 | Handle `watch_party` notification routing |
| `src/App.tsx` | 3 | Add `/watch/:roundId` route |
| `src/pages/Home.tsx` | 4 | Add Watch Party button to friend activity cards |
| `src/pages/RoundComplete.tsx` | 4 | Add WatchPartyRevealCard section |
| `src/hooks/useSocialFeed.ts` | 5 | Fetch Watch Party message counts |
