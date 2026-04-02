-- ============================================================
-- Social V2: round_reactions, round_messages, upcoming rounds
-- ============================================================

-- 1. round_reactions table
-- ============================================================
CREATE TABLE IF NOT EXISTS round_reactions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id      uuid NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reaction_type text NOT NULL CHECK (reaction_type IN ('pay_up', 'cold_blooded', 'robbery', 'press_that', 'respect', 'fraud')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(round_id, user_id, reaction_type)
);

CREATE INDEX IF NOT EXISTS idx_round_reactions_round_id ON round_reactions(round_id);

ALTER TABLE round_reactions ENABLE ROW LEVEL SECURITY;

-- SELECT: anyone can see reactions on complete rounds
CREATE POLICY "rr_select" ON round_reactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM rounds r WHERE r.id = round_id AND r.status = 'complete'
    )
  );

-- INSERT: authenticated users can add their own reactions
CREATE POLICY "rr_insert" ON round_reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- DELETE: users can remove their own reactions
CREATE POLICY "rr_delete" ON round_reactions
  FOR DELETE USING (auth.uid() = user_id);

-- 2. round_messages table
-- ============================================================
CREATE TABLE IF NOT EXISTS round_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id    uuid NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  author_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body        text NOT NULL CHECK (char_length(body) >= 1 AND char_length(body) <= 500),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_round_messages_round_id_created ON round_messages(round_id, created_at DESC);

ALTER TABLE round_messages ENABLE ROW LEVEL SECURITY;

-- SELECT: round participants or creator can read messages
CREATE POLICY "rm_select" ON round_messages
  FOR SELECT USING (
    is_round_participant(round_id, auth.uid())
    OR EXISTS (
      SELECT 1 FROM rounds r WHERE r.id = round_id AND r.created_by = auth.uid()
    )
  );

-- INSERT: round participants can insert their own messages
CREATE POLICY "rm_insert" ON round_messages
  FOR INSERT WITH CHECK (
    auth.uid() = author_id
    AND (
      is_round_participant(round_id, auth.uid())
      OR EXISTS (
        SELECT 1 FROM rounds r WHERE r.id = round_id AND r.created_by = auth.uid()
      )
    )
  );

-- DELETE: author can delete own messages
CREATE POLICY "rm_delete" ON round_messages
  FOR DELETE USING (auth.uid() = author_id);

-- 3. Add columns to rounds table
-- ============================================================
ALTER TABLE rounds ADD COLUMN IF NOT EXISTS tee_time timestamptz;
ALTER TABLE rounds ADD COLUMN IF NOT EXISTS invited_player_ids uuid[] DEFAULT '{}';

-- 4. RPC: get_upcoming_rounds
-- ============================================================
CREATE OR REPLACE FUNCTION get_upcoming_rounds(viewer_id uuid)
RETURNS TABLE (
  round_id          uuid,
  course_name       text,
  tee_time          timestamptz,
  creator_id        uuid,
  creator_name      text,
  creator_avatar    text,
  invited_ids       uuid[],
  participant_ids   uuid[],
  participant_names text[],
  message_count     bigint,
  created_at        timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.id                           AS round_id,
    r.course_name                  AS course_name,
    r.tee_time                     AS tee_time,
    r.created_by                   AS creator_id,
    cp.full_name                   AS creator_name,
    cp.avatar_url                  AS creator_avatar,
    r.invited_player_ids           AS invited_ids,
    ARRAY_AGG(DISTINCT pl.profile_id) FILTER (WHERE pl.profile_id IS NOT NULL) AS participant_ids,
    ARRAY_AGG(DISTINCT pp.full_name)  FILTER (WHERE pp.full_name IS NOT NULL)  AS participant_names,
    COUNT(DISTINCT rm.id)          AS message_count,
    r.created_at                   AS created_at
  FROM rounds r
  JOIN profiles cp ON cp.id = r.created_by
  LEFT JOIN players pl ON pl.round_id = r.id AND pl.profile_id IS NOT NULL
  LEFT JOIN profiles pp ON pp.id = pl.profile_id
  LEFT JOIN round_messages rm ON rm.round_id = r.id
  WHERE r.status IN ('pending', 'active')
    AND r.tee_time IS NOT NULL
    AND (
      r.created_by = viewer_id
      OR EXISTS (
        SELECT 1 FROM players p2 WHERE p2.round_id = r.id AND p2.profile_id = viewer_id
      )
      OR viewer_id = ANY(r.invited_player_ids)
    )
  GROUP BY r.id, r.course_name, r.tee_time, r.created_by, cp.full_name, cp.avatar_url, r.invited_player_ids, r.created_at
  ORDER BY r.tee_time ASC
  LIMIT 20;
$$;

-- 5. RPC: get_round_reactions
-- ============================================================
CREATE OR REPLACE FUNCTION get_round_reactions(target_round_id uuid, viewer_id uuid)
RETURNS TABLE (
  reaction_type  text,
  count          bigint,
  viewer_reacted boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    rr.reaction_type,
    COUNT(*)::bigint                  AS count,
    BOOL_OR(rr.user_id = viewer_id)  AS viewer_reacted
  FROM round_reactions rr
  WHERE rr.round_id = target_round_id
  GROUP BY rr.reaction_type;
$$;

-- 6. Update get_social_feed_rounds to include games column
-- ============================================================
CREATE OR REPLACE FUNCTION get_social_feed_rounds(viewer_id uuid)
RETURNS TABLE (
  round_id          uuid,
  course_name       text,
  completed_at      timestamptz,
  creator_id        uuid,
  creator_name      text,
  creator_avatar    text,
  participant_ids   uuid[],
  participant_names text[],
  comment_count     bigint,
  games             jsonb
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.id                           AS round_id,
    r.course_name                  AS course_name,
    COALESCE(r.completed_at, r.updated_at) AS completed_at,
    r.created_by                   AS creator_id,
    cp.full_name                   AS creator_name,
    cp.avatar_url                  AS creator_avatar,
    ARRAY_AGG(DISTINCT pl.profile_id) FILTER (WHERE pl.profile_id IS NOT NULL) AS participant_ids,
    ARRAY_AGG(DISTINCT pp.full_name) FILTER (WHERE pp.full_name IS NOT NULL)   AS participant_names,
    COUNT(DISTINCT rc.id)          AS comment_count,
    r.games                        AS games
  FROM rounds r
  JOIN profiles cp ON cp.id = r.created_by
  LEFT JOIN players pl ON pl.round_id = r.id AND pl.profile_id IS NOT NULL
  LEFT JOIN profiles pp ON pp.id = pl.profile_id
  LEFT JOIN round_comments rc ON rc.round_id = r.id
  WHERE r.status = 'complete'
    AND (
      r.created_by = viewer_id
      OR EXISTS (
        SELECT 1 FROM players p2 WHERE p2.round_id = r.id AND p2.profile_id = viewer_id
      )
      OR EXISTS (
        SELECT 1 FROM friendships f
        WHERE f.status = 'accepted'
          AND (
            (f.user_id = viewer_id AND f.friend_id = r.created_by)
            OR (f.friend_id = viewer_id AND f.user_id = r.created_by)
          )
      )
      OR EXISTS (
        SELECT 1 FROM players p3
        JOIN friendships f2 ON f2.status = 'accepted'
          AND (
            (f2.user_id = viewer_id AND f2.friend_id = p3.profile_id)
            OR (f2.friend_id = viewer_id AND f2.user_id = p3.profile_id)
          )
        WHERE p3.round_id = r.id AND p3.profile_id IS NOT NULL
      )
    )
  GROUP BY r.id, r.course_name, r.completed_at, r.updated_at, r.created_by, cp.full_name, cp.avatar_url, r.games
  ORDER BY COALESCE(r.completed_at, r.updated_at) DESC
  LIMIT 50;
$$;
