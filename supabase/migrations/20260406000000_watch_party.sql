-- ============================================================
-- Watch Party: spectator chat with hidden-then-revealed visibility
-- ============================================================

-- 1. watch_party_members — who has opted into watching a round
-- ============================================================
CREATE TABLE IF NOT EXISTS watch_party_members (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id    uuid NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  profile_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at   timestamptz NOT NULL DEFAULT now(),
  left_at     timestamptz,
  UNIQUE(round_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_wpm_round_id ON watch_party_members(round_id);
CREATE INDEX IF NOT EXISTS idx_wpm_profile_id ON watch_party_members(profile_id);

ALTER TABLE watch_party_members ENABLE ROW LEVEL SECURITY;

-- 2. watch_party_messages — spectator chat messages
-- ============================================================
CREATE TABLE IF NOT EXISTS watch_party_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id        uuid NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  author_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body            text NOT NULL CHECK (char_length(body) >= 1 AND char_length(body) <= 500),
  is_post_reveal  boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wpmsg_round_created ON watch_party_messages(round_id, created_at);

ALTER TABLE watch_party_messages ENABLE ROW LEVEL SECURITY;

-- 3. watch_party_notifications — dedup for broadcast pushes
-- ============================================================
CREATE TABLE IF NOT EXISTS watch_party_notifications (
  round_id        uuid PRIMARY KEY REFERENCES rounds(id) ON DELETE CASCADE,
  sent_at         timestamptz NOT NULL DEFAULT now(),
  recipient_count integer NOT NULL DEFAULT 0
);

ALTER TABLE watch_party_notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Helper functions
-- ============================================================

-- 4. is_watch_party_member()
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

-- 5. is_friend_of_any_player()
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

-- 6. is_round_complete()
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

-- ============================================================
-- RLS Policies
-- ============================================================

-- 7. watch_party_members policies
-- SELECT: own membership, or other members if you're a member, or players after round complete
CREATE POLICY "wpm_select" ON watch_party_members
  FOR SELECT USING (
    profile_id = auth.uid()
    OR is_watch_party_member(round_id, auth.uid())
    OR (is_round_complete(round_id) AND is_round_participant(round_id, auth.uid()))
  );

-- INSERT: must be self, must be friend of a player, must NOT be a player
CREATE POLICY "wpm_insert" ON watch_party_members
  FOR INSERT WITH CHECK (
    auth.uid() = profile_id
    AND is_friend_of_any_player(round_id, auth.uid())
    AND NOT is_round_participant(round_id, auth.uid())
  );

-- UPDATE: own row only (for setting left_at)
CREATE POLICY "wpm_update" ON watch_party_members
  FOR UPDATE USING (auth.uid() = profile_id);

-- DELETE: own row only
CREATE POLICY "wpm_delete" ON watch_party_members
  FOR DELETE USING (auth.uid() = profile_id);

-- 8. watch_party_messages policies
-- SELECT: spectators can always see; players only after round complete
CREATE POLICY "wpmsg_select" ON watch_party_messages
  FOR SELECT USING (
    is_watch_party_member(round_id, auth.uid())
    OR (
      is_round_complete(round_id)
      AND (
        is_round_participant(round_id, auth.uid())
        OR EXISTS (SELECT 1 FROM rounds r WHERE r.id = round_id AND r.created_by = auth.uid())
      )
    )
  );

-- INSERT: spectators can always post; players only after round complete
CREATE POLICY "wpmsg_insert" ON watch_party_messages
  FOR INSERT WITH CHECK (
    auth.uid() = author_id
    AND (
      is_watch_party_member(round_id, auth.uid())
      OR (
        is_round_complete(round_id)
        AND is_round_participant(round_id, auth.uid())
      )
    )
  );

-- DELETE: author only
CREATE POLICY "wpmsg_delete" ON watch_party_messages
  FOR DELETE USING (auth.uid() = author_id);

-- 9. watch_party_notifications policies
CREATE POLICY "wpn_select" ON watch_party_notifications
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM rounds r WHERE r.id = round_id AND r.created_by = auth.uid())
  );

-- INSERT: any authenticated user (the broadcaster)
CREATE POLICY "wpn_insert" ON watch_party_notifications
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- RPCs
-- ============================================================

-- 10. get_watch_party_recipients — friends of players, minus the players
CREATE OR REPLACE FUNCTION get_watch_party_recipients(p_round_id uuid)
RETURNS TABLE (profile_id uuid)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
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
    AND CASE
      WHEN f.user_id = pl.profile_id THEN f.friend_id
      ELSE f.user_id
    END NOT IN (
      SELECT p2.profile_id FROM players p2
      WHERE p2.round_id = p_round_id AND p2.profile_id IS NOT NULL
    );
$$;

-- 11. get_watch_party_stats — for reveal card + feed
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

-- 12. get_watch_party_messages — full chat with author info
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
