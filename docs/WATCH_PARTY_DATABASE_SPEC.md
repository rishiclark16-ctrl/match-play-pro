# Watch Party — Database & Notification Specification

**Version:** 1.0 (V1)
**Date:** 2026-04-06

---

## 1. New Tables

### 1.1 `watch_party_members`

Tracks who has opted into watching a round. Created when a user taps the notification or "Watch" button.

```sql
CREATE TABLE watch_party_members (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id    uuid NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  profile_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at   timestamptz NOT NULL DEFAULT now(),
  left_at     timestamptz,  -- NULL = still watching; set on leave
  UNIQUE(round_id, profile_id)
);

CREATE INDEX idx_wpm_round_id ON watch_party_members(round_id);
CREATE INDEX idx_wpm_profile_id ON watch_party_members(profile_id);
```

**Notes:**
- `left_at` is nullable. If set, the user has left. They can re-join by setting `left_at = NULL`.
- The UNIQUE constraint on `(round_id, profile_id)` prevents duplicate memberships.
- ON DELETE CASCADE ensures cleanup when a round is deleted.

### 1.2 `watch_party_messages`

Chat messages from spectators. Separate from `round_messages` to enforce visibility rules via RLS.

```sql
CREATE TABLE watch_party_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id    uuid NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  author_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body        text NOT NULL CHECK (char_length(body) >= 1 AND char_length(body) <= 500),
  created_at  timestamptz NOT NULL DEFAULT now(),
  is_post_reveal boolean NOT NULL DEFAULT false
);

CREATE INDEX idx_wpm_msgs_round_created ON watch_party_messages(round_id, created_at);
```

**Notes:**
- `is_post_reveal` distinguishes messages sent after the round completed. This enables the UI divider between "during the round" and "after the round" messages.
- Same 500-char limit as existing `round_messages` and `round_comments`.
- No `updated_at` — messages are immutable (delete-only, no edits in V1).

### 1.3 `watch_party_notifications`

Tracks which rounds have already had their spectator broadcast sent (prevents double-sends).

```sql
CREATE TABLE watch_party_notifications (
  round_id    uuid PRIMARY KEY REFERENCES rounds(id) ON DELETE CASCADE,
  sent_at     timestamptz NOT NULL DEFAULT now(),
  recipient_count integer NOT NULL DEFAULT 0
);
```

---

## 2. Helper Functions

### 2.1 `is_watch_party_member()`

```sql
CREATE OR REPLACE FUNCTION is_watch_party_member(p_round_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM watch_party_members
    WHERE round_id = p_round_id
      AND profile_id = p_user_id
      AND left_at IS NULL
  );
$$;
```

### 2.2 `is_friend_of_any_player()`

```sql
CREATE OR REPLACE FUNCTION is_friend_of_any_player(p_round_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM players pl
    JOIN friendships f ON f.status = 'accepted'
      AND (
        (f.user_id = p_user_id AND f.friend_id = pl.profile_id)
        OR (f.friend_id = p_user_id AND f.user_id = pl.profile_id)
      )
    WHERE pl.round_id = p_round_id
      AND pl.profile_id IS NOT NULL
  );
$$;
```

### 2.3 `is_round_complete()`

```sql
CREATE OR REPLACE FUNCTION is_round_complete(p_round_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM rounds WHERE id = p_round_id AND status = 'complete'
  );
$$;
```

---

## 3. RLS Policies

### 3.1 `watch_party_members`

```sql
ALTER TABLE watch_party_members ENABLE ROW LEVEL SECURITY;

-- SELECT: you can see your own membership, or all members if you're a member yourself
CREATE POLICY "wpm_select" ON watch_party_members
  FOR SELECT USING (
    profile_id = auth.uid()
    OR is_watch_party_member(round_id, auth.uid())
    OR (is_round_complete(round_id) AND is_round_participant(round_id, auth.uid()))
  );

-- INSERT: must be authenticated, inserting own row, must be friend of a player, must NOT be a player
CREATE POLICY "wpm_insert" ON watch_party_members
  FOR INSERT WITH CHECK (
    auth.uid() = profile_id
    AND is_friend_of_any_player(round_id, auth.uid())
    AND NOT is_round_participant(round_id, auth.uid())
  );

-- UPDATE: only own row (for setting left_at)
CREATE POLICY "wpm_update" ON watch_party_members
  FOR UPDATE USING (auth.uid() = profile_id);

-- DELETE: only own row
CREATE POLICY "wpm_delete" ON watch_party_members
  FOR DELETE USING (auth.uid() = profile_id);
```

### 3.2 `watch_party_messages`

This is the critical policy — it enforces the hidden-then-revealed behavior.

```sql
ALTER TABLE watch_party_messages ENABLE ROW LEVEL SECURITY;

-- SELECT: spectators can always see. Players can ONLY see after round is complete.
CREATE POLICY "wpmsg_select" ON watch_party_messages
  FOR SELECT USING (
    -- Active watch party members can always see
    is_watch_party_member(round_id, auth.uid())
    -- Players can see only after round is complete
    OR (
      is_round_complete(round_id)
      AND (
        is_round_participant(round_id, auth.uid())
        OR EXISTS (SELECT 1 FROM rounds r WHERE r.id = round_id AND r.created_by = auth.uid())
      )
    )
  );

-- INSERT: must be a watch party member (active or post-reveal participant)
CREATE POLICY "wpmsg_insert" ON watch_party_messages
  FOR INSERT WITH CHECK (
    auth.uid() = author_id
    AND (
      -- Spectators can always post
      is_watch_party_member(round_id, auth.uid())
      -- Players can post only after round is complete
      OR (
        is_round_complete(round_id)
        AND is_round_participant(round_id, auth.uid())
      )
    )
  );

-- DELETE: author only
CREATE POLICY "wpmsg_delete" ON watch_party_messages
  FOR DELETE USING (auth.uid() = author_id);
```

### 3.3 `watch_party_notifications`

```sql
ALTER TABLE watch_party_notifications ENABLE ROW LEVEL SECURITY;

-- Only service role (edge functions) needs access; no client reads needed
-- But allow round creator to SELECT (for debugging)
CREATE POLICY "wpn_select" ON watch_party_notifications
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM rounds r WHERE r.id = round_id AND r.created_by = auth.uid())
  );
```

---

## 4. RPCs (Server Functions)

### 4.1 `get_watch_party_recipients()`

Returns the profile IDs that should receive the Watch Party notification for a given round.

```sql
CREATE OR REPLACE FUNCTION get_watch_party_recipients(p_round_id uuid)
RETURNS TABLE (profile_id uuid)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  -- All friends of all players in the round, excluding the players themselves
  SELECT DISTINCT
    CASE
      WHEN f.user_id = pl.profile_id THEN f.friend_id
      ELSE f.user_id
    END AS profile_id
  FROM players pl
  JOIN friendships f ON f.status = 'accepted'
    AND (f.user_id = pl.profile_id OR f.friend_id = pl.profile_id)
  WHERE pl.round_id = p_round_id
    AND pl.profile_id IS NOT NULL
    -- Exclude players in this round
    AND CASE
      WHEN f.user_id = pl.profile_id THEN f.friend_id
      ELSE f.user_id
    END NOT IN (
      SELECT p2.profile_id FROM players p2
      WHERE p2.round_id = p_round_id AND p2.profile_id IS NOT NULL
    );
$$;
```

### 4.2 `get_watch_party_stats()`

Returns Watch Party stats for a round (used on Round Complete page and Feed).

```sql
CREATE OR REPLACE FUNCTION get_watch_party_stats(p_round_id uuid)
RETURNS TABLE (
  spectator_count bigint,
  message_count bigint,
  first_message_body text,
  first_message_author text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT COUNT(DISTINCT profile_id) FROM watch_party_members WHERE round_id = p_round_id) AS spectator_count,
    (SELECT COUNT(*) FROM watch_party_messages WHERE round_id = p_round_id AND NOT is_post_reveal) AS message_count,
    (SELECT wm.body FROM watch_party_messages wm WHERE wm.round_id = p_round_id AND NOT wm.is_post_reveal ORDER BY wm.created_at LIMIT 1) AS first_message_body,
    (SELECT p.full_name FROM watch_party_messages wm JOIN profiles p ON p.id = wm.author_id WHERE wm.round_id = p_round_id AND NOT wm.is_post_reveal ORDER BY wm.created_at LIMIT 1) AS first_message_author
  ;
$$;
```

### 4.3 `get_watch_party_messages()`

Returns all messages for the Watch Party chat, with author info.

```sql
CREATE OR REPLACE FUNCTION get_watch_party_messages(p_round_id uuid)
RETURNS TABLE (
  id uuid,
  author_id uuid,
  author_name text,
  author_avatar text,
  body text,
  is_post_reveal boolean,
  is_player boolean,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    wm.id,
    wm.author_id,
    p.full_name AS author_name,
    p.avatar_url AS author_avatar,
    wm.body,
    wm.is_post_reveal,
    EXISTS (
      SELECT 1 FROM players pl
      WHERE pl.round_id = p_round_id AND pl.profile_id = wm.author_id
    ) AS is_player,
    wm.created_at
  FROM watch_party_messages wm
  JOIN profiles p ON p.id = wm.author_id
  WHERE wm.round_id = p_round_id
  ORDER BY wm.created_at ASC;
$$;
```

---

## 5. Notification System

### 5.1 Broadcast Trigger

The Watch Party notification is triggered when the **first score is entered** for a round. This is detected client-side in the scorecard.

**Client-side logic (in `useCreateSupabaseRound` or Scorecard):**

```typescript
// After first score is saved successfully:
async function broadcastWatchPartyNotification(roundId: string, courseName: string, playerNames: string[]) {
  // 1. Check if notification already sent
  const { data: existing } = await supabase
    .from('watch_party_notifications')
    .select('round_id')
    .eq('round_id', roundId)
    .maybeSingle();
  
  if (existing) return; // Already sent

  // 2. Get recipient profile IDs via RPC
  const { data: recipients } = await supabase
    .rpc('get_watch_party_recipients', { p_round_id: roundId });
  
  if (!recipients?.length) return;

  const profileIds = recipients.map(r => r.profile_id);
  
  // 3. Format notification body
  const nameList = playerNames.length <= 4
    ? playerNames.join(', ').replace(/, ([^,]*)$/, ' & $1')
    : `${playerNames.slice(0, 2).join(', ')} & ${playerNames.length - 2} others`;
  
  // 4. Send push notification
  await sendPushToProfiles({
    profileIds,
    title: "Your friends are playing!",
    body: `${nameList} just teed off at ${courseName}`,
    data: { roundId, route: `/watch/${roundId}`, type: 'watch_party' },
    type: 'watch_party',
  });

  // 5. Record that notification was sent
  await supabase
    .from('watch_party_notifications')
    .insert({ round_id: roundId, recipient_count: profileIds.length });
}
```

### 5.2 Notification Preferences

Add `watch_party` to the `NotificationPreferences` type:

```typescript
// In src/hooks/useProfile.ts
export interface NotificationPreferences {
  round_invites: boolean;
  friend_requests: boolean;
  score_updates: boolean;
  watch_party: boolean;  // NEW
}
```

The existing `sendPushToProfiles()` already filters by preference — it checks `prefs[type] !== false`. Since `type: 'watch_party'` is passed, users who have set `watch_party: false` will be excluded automatically.

### 5.3 Push Notification Routing

Update `usePushNotifications.ts` to handle the new notification type:

```typescript
// In the pushNotificationActionPerformed listener:
if (data.type === 'watch_party' && data.roundId) {
  navigate(`/watch/${data.roundId}`);
}
```

---

## 6. Real-Time Subscriptions

### 6.1 Score Updates (Spectator)

Reuse the existing `useSupabaseRound` pattern but in read-only mode:

```typescript
// Subscribe to score changes
supabase
  .channel(`watch_party_scores:${roundId}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'scores',
    filter: `round_id=eq.${roundId}`
  }, handleScoreChange)
  .subscribe();
```

Also track `last_score_update_at` per player (client-side map) for recency badges:

```typescript
const [lastUpdateMap, setLastUpdateMap] = useState<Map<string, Date>>(new Map());

// On score change:
setLastUpdateMap(prev => new Map(prev).set(playerId, new Date()));
```

### 6.2 Chat Messages

```typescript
supabase
  .channel(`watch_party_chat:${roundId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'watch_party_messages',
    filter: `round_id=eq.${roundId}`
  }, handleNewMessage)
  .subscribe();
```

### 6.3 Round Status (Completion Detection)

```typescript
supabase
  .channel(`watch_party_round:${roundId}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'rounds',
    filter: `id=eq.${roundId}`
  }, (payload) => {
    if (payload.new.status === 'complete') {
      handleRoundComplete();
    }
  })
  .subscribe();
```

---

## 7. Migration File

The complete migration to be created at:
`supabase/migrations/20260406000000_watch_party.sql`

This will contain:
1. `watch_party_members` table + indexes
2. `watch_party_messages` table + indexes
3. `watch_party_notifications` table
4. Helper functions: `is_watch_party_member()`, `is_friend_of_any_player()`, `is_round_complete()`
5. RLS policies for all three tables
6. RPCs: `get_watch_party_recipients()`, `get_watch_party_stats()`, `get_watch_party_messages()`

---

## 8. Data Flow Diagrams

### 8.1 Round Start → Notification Broadcast
```
Player enters first score
  → saveScore() in useSupabaseRound
  → broadcastWatchPartyNotification()
    → supabase.rpc('get_watch_party_recipients')
      → Returns all friends of all players, minus players
    → sendPushToProfiles({ profileIds, ... type: 'watch_party' })
      → send-push edge function → APNs
    → supabase.from('watch_party_notifications').insert(...)
```

### 8.2 Spectator Joins
```
User taps notification → navigate('/watch/:roundId')
  → WatchParty page mounts
  → useWatchParty hook:
    → Verify friendship (is_friend_of_any_player)
    → Insert watch_party_members row
    → Subscribe to scores, chat, round status channels
    → Fetch existing chat history via get_watch_party_messages()
  → Render score header + chat
```

### 8.3 Round Completion → Reveal
```
Player submits scorecard
  → completeRound() → rounds.status = 'complete'
  → Real-time fires to all subscribers
  → Spectator's WatchParty view:
    → Show "FINAL" instead of "LIVE"
    → Toast: "Players can now see the chat"
    → Insert divider
  → Player's RoundComplete page:
    → Fetch get_watch_party_stats()
    → If message_count > 0, render WatchPartyRevealCard
    → Player taps "Read the full chat"
    → Navigate to /watch/:roundId (post-reveal mode)
    → RLS now allows player to read watch_party_messages
```

---

## 9. Existing Table Modifications

### 9.1 `profiles` — Notification Preferences

No schema change needed. The `notification_preferences` JSONB column already supports arbitrary keys. The `watch_party` key will default to `true` (enabled) when absent, matching the existing behavior in `sendPushToProfiles()`.

### 9.2 `rounds` — No Changes

The `status` column (`'active'` → `'complete'`) already drives the reveal logic. No new columns needed on `rounds`.

### 9.3 `round_spectators` — Deprecation Plan

The existing `round_spectators` table serves a different purpose (tracking who viewed a round via join code). It will remain as-is. Watch Party uses `watch_party_members` as a separate concept.

---

## 10. Query Performance Notes

| Query | Expected Cost | Index Coverage |
|-------|--------------|----------------|
| `get_watch_party_recipients()` | ~5ms (JOIN players → friendships) | `players(round_id)`, `friendships(user_id, friend_id)` |
| `get_watch_party_stats()` | ~2ms (COUNT queries on indexed columns) | `watch_party_members(round_id)`, `watch_party_messages(round_id)` |
| `get_watch_party_messages()` | ~3ms (index scan + JOIN profiles) | `watch_party_messages(round_id, created_at)` |
| `is_watch_party_member()` | ~1ms (unique index lookup) | `watch_party_members(round_id, profile_id)` |
| `is_friend_of_any_player()` | ~3ms (JOIN players → friendships) | Existing indexes |
| RLS policy evaluation on INSERT | ~2ms | Compound of above |
