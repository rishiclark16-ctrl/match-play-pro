# Watch Party — Product Specification

**Version:** 1.0 (V1)
**Date:** 2026-04-06
**Author:** MATCH Golf Engineering
**Status:** Draft

---

## 1. Executive Summary

Watch Party lets friends spectate live rounds with a hidden group chat that players can't see. When the round completes, the chat is revealed — players discover what everyone was saying while they played. It's a watch party for golf.

### V1 Scope
- Spectator push notifications (friends-of-any-player)
- Live score view with per-player recency timestamps
- Hidden spectator-only chat during the round
- Post-round chat reveal when scorecard is submitted
- Feed integration with chat history

### Parked (V2)
- Spectator betting on match outcomes
- Spectator polls / predictions
- Live hole-by-hole highlight clips

---

## 2. Glossary

| Term | Definition |
|------|-----------|
| **Player** | A user who is a participant in the round (has a `players` row) |
| **Spectator** | A user who has opted into the Watch Party for a round (tapped the notification or navigated to the watch view) |
| **Watch Party** | The collective group of spectators for a given round |
| **Hidden Chat** | Messages sent by spectators during an active round; invisible to players until round completion |
| **Reveal** | The moment (round completion) when the hidden chat becomes visible to players |
| **Round Complete** | The round's `status` transitions to `'complete'` (same trigger as settlement) |

---

## 3. User Stories

### 3.1 Spectator Notification
**As** a friend of any player in a round,
**I want** to receive a push notification when the round starts,
**So that** I know my friends are playing and can watch live.

**Acceptance criteria:**
- Notification is sent when a round transitions to `'active'` status (first score entered or explicit start)
- Recipient pool = all accepted friends of all players in the round, deduplicated, minus the players themselves
- Notification text: `"Alex, Rishi, Luc & Jim just teed off at Pebble Beach"`
- If >4 players: `"Alex, Rishi & 2 others just teed off at Pebble Beach"`
- Tapping the notification opens the Watch Party view for that round
- Users who don't tap are NOT added as spectators (no phantom spectators)
- Respects existing `notification_preferences` — specifically a new `watch_party` preference key

### 3.2 Live Score View
**As** a spectator,
**I want** to see real-time scores and know how recent they are,
**So that** I can follow the round as it happens.

**Acceptance criteria:**
- Scores update in real-time via Supabase Postgres Changes subscription
- Each player row shows: name, avatar, total score, score vs par, current hole
- Per-player recency badge: `"Updated 38s ago"`, `"Updated 2m ago"`, `"Updated 12m ago"`
- Recency updates every 15 seconds (client-side interval, not server poll)
- Match score headline shown at top (e.g., "Rishi & Luc 2 UP thru 7")
- Game type badges visible (Nassau, Match Play, Skins, etc.)
- Course name and hole count displayed in header

### 3.3 Hidden Spectator Chat
**As** a spectator,
**I want** to chat with other spectators about the round without the players knowing,
**So that** we can react and trash-talk freely without affecting the match.

**Acceptance criteria:**
- Chat is visible only to opted-in spectators during the round
- Players have ZERO indication a Watch Party exists (no badge, no count, no UI element)
- Messages limited to 500 characters (consistent with existing `round_messages`)
- Real-time message delivery via Supabase subscription
- Full chat history available regardless of when spectator joins (join at hole 14, see messages from hole 1)
- Spectator can leave and return freely; chat history persists
- Spectator avatars and names shown on messages
- Message input at bottom of chat, keyboard-aware
- Auto-scroll to newest message on arrival and on new message

### 3.4 Post-Round Reveal
**As** a player who just completed a round,
**I want** to discover the Watch Party chat after submitting my scorecard,
**So that** I can see what my friends were saying while I played.

**Acceptance criteria:**
- Reveal trigger = round `status` changes to `'complete'` (same as settlement)
- After reveal, players can read the full spectator chat history
- After reveal, players can reply and continue the conversation
- After reveal, the chat becomes a unified thread (spectators + players together)
- Reveal is indicated on the Round Complete page: `"Watch Party — 12 messages during the round"`
- Tapping opens the full chat, scrolled to the beginning of the spectator messages
- If no Watch Party existed (0 spectators joined), no Watch Party section appears

### 3.5 Feed Integration
**As** any user viewing the social feed,
**I want** to see that a completed round had a Watch Party,
**So that** I can tap in and read the conversation.

**Acceptance criteria:**
- Feed card shows Watch Party indicator: `"🎙 Watch Party (12 messages)"` below the round summary
- Only shown if the round had ≥1 spectator message
- Tapping the indicator navigates to the round's chat (post-reveal, fully open)
- Spectator count not shown publicly — only message count

### 3.6 Spectator Join/Leave
**As** a spectator,
**I want** to freely join and leave the Watch Party,
**So that** I can dip in and out without commitment.

**Acceptance criteria:**
- Joining: tap push notification, or tap "Watch" button on friend activity card (Home page)
- Leaving: tap "Leave Watch Party" in the spectator view header
- Re-joining: navigate back to the round's watch view (via Home friend activity or deep link)
- Leaving does NOT delete your messages from the chat
- Joining does NOT retroactively create spectator records — only on explicit opt-in

---

## 4. Business Rules

### 4.1 Eligibility
| Rule | Detail |
|------|--------|
| Who receives the notification? | All users with an accepted friendship with any player in the round |
| Who can join the Watch Party? | Any user who is friends with at least one player AND is not a player themselves |
| Can a player also be a spectator? | No. If you're in the `players` table for this round, you cannot join the Watch Party |
| What about ghost players? | Ghost players (no `profile_id`) have no friends — they generate no spectator notifications |
| Can non-friends spectate? | No. You must have an accepted friendship with at least one player |

### 4.2 Chat Visibility State Machine

```
Round Status: 'active'
├── Spectators: CAN read all messages, CAN write messages
├── Players: CANNOT see Watch Party exists, CANNOT read/write
└── Non-friends: CANNOT see Watch Party exists

Round Status: 'complete'
├── Spectators: CAN read all messages, CAN write messages
├── Players: CAN read all messages, CAN write messages (REVEALED)
└── Non-friends: CANNOT see chat (unless they see it via feed card, 
    which only shows message count, not content)
```

### 4.3 Notification Rules
- Notifications are sent ONCE per round (when round becomes active)
- Notification is NOT resent if a new player joins mid-round
- Notification type key: `watch_party` (added to `NotificationPreferences`)
- If a user has `watch_party: false` in their preferences, they don't receive it
- Rate limit: max 1 watch party notification per user per 5 minutes (prevent spam from multiple friends starting rounds simultaneously)

### 4.4 Data Retention
- Watch Party messages persist indefinitely (same as `round_messages` and `round_comments`)
- Watch Party membership records persist (for analytics: who watched what)
- No auto-deletion or TTL

---

## 5. Edge Cases

| Scenario | Behavior |
|----------|----------|
| Round has 0 spectators | No Watch Party UI appears anywhere. Round completes normally. |
| All spectators leave before round completes | Chat history persists. Reveal still shows messages on Round Complete page. |
| Player is added to round mid-game | They become a player, not eligible for Watch Party. If they were a spectator, they are removed from the Watch Party. |
| Friend request accepted DURING a round | The newly-friended user does NOT get a retroactive notification. They can only join if they discover the round via Home friend activity. |
| Round is deleted before completion | Watch Party data is cascade-deleted (FK to rounds). |
| Spectator sends a message, then unfriends all players | Message persists. They can no longer re-join if they leave. |
| Two separate groups of friends play the same round | All friends of all players get the notification. The Watch Party is one unified chat. |
| 9-hole round | Works identically. No special handling needed. |
| Round has 20+ eligible spectators | All receive notifications. Chat scales normally (Supabase real-time handles this). |
| Spectator is offline when notification fires | Standard APNs delivery — they'll see it when they open their phone. |

---

## 6. Analytics Events

| Event | Payload | When |
|-------|---------|------|
| `watch_party_notification_sent` | `{ roundId, recipientCount }` | After broadcast push |
| `watch_party_joined` | `{ roundId, userId, joinedAtHole }` | User opts into Watch Party |
| `watch_party_left` | `{ roundId, userId }` | User leaves Watch Party |
| `watch_party_message_sent` | `{ roundId, userId }` | Spectator sends a message |
| `watch_party_revealed` | `{ roundId, messageCount, spectatorCount }` | Round completes with Watch Party |
| `watch_party_chat_opened_post_round` | `{ roundId, userId, isPlayer }` | Any user opens revealed chat |

---

## 7. Performance Constraints

| Metric | Target |
|--------|--------|
| Notification delivery | <5s after round activation |
| Score update latency (spectator view) | <2s (Supabase real-time) |
| Chat message delivery | <1s (Supabase real-time) |
| Recency badge update | Every 15s (client-side) |
| Max spectators per round | Unlimited (practical limit ~50 for real-time channel) |
| Max messages per round | 1000 (soft limit, paginate if exceeded) |

---

## 8. Security & Privacy

| Concern | Mitigation |
|---------|-----------|
| Players must not see Watch Party during round | RLS policy: `watch_party_messages` SELECT requires `is_watch_party_member()` OR round is complete |
| Only friends can join | RLS + application-level check: verify friendship before inserting `watch_party_members` row |
| Message content safety | 500-char limit, same as existing chat. No image/media in V1. |
| Notification spam | Rate limit: 1 per user per 5 min. Respects `notification_preferences.watch_party` |
| Data cascade | All Watch Party data FK'd to `rounds(id) ON DELETE CASCADE` |

---

## 9. Dependencies on Existing Systems

| System | How It's Used | Existing? |
|--------|--------------|-----------|
| `friendships` table | Query friends-of-players for notification broadcast | Yes |
| `players` table | Determine who is in the round (exclude from spectating) | Yes |
| `send-push` edge function | Deliver APNs notifications | Yes |
| `pushUtils.sendPushToProfiles()` | Client-side push helper | Yes |
| `useSupabaseRound` hook | Real-time score subscription (reused for spectator view) | Yes |
| `useFriendActivity` hook | Shows live friend rounds on Home (add "Watch" button) | Yes |
| `round_spectators` table | Existing spectator tracking — will be extended or replaced | Yes |
| `round_messages` table | Existing round chat — Watch Party uses a separate table to enforce visibility rules | Yes |
| Supabase real-time | Postgres Changes subscriptions for chat + scores | Yes |
| `completeRound()` in `useSupabaseRound` | Trigger for reveal (round status → complete) | Yes |

---

## 10. Out of Scope (V1)

- Spectator betting / wagering on match outcomes
- Spectator polls or predictions
- Video/audio streaming of the round
- Spectator reactions (emoji reactions on individual scores)
- Public spectating (non-friends watching)
- Watch Party for completed rounds (retroactive)
- Push notifications for score milestones (e.g., "Alex just made eagle on 7!")
- Chat media (photos, GIFs)
