-- ============================================================
-- Social Feed: round_comments table + RLS + RPCs
-- ============================================================

-- 0. Add completed_at column to rounds if not present
-- (rounds uses status = 'complete'; we track when it happened via updated_at,
--  but we add a dedicated completed_at for feed ordering)
ALTER TABLE rounds
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- Backfill: for already-complete rounds, use updated_at as a proxy
UPDATE rounds
SET completed_at = updated_at
WHERE status = 'complete' AND completed_at IS NULL;

-- 1. round_comments table
-- ============================================================
CREATE TABLE IF NOT EXISTS round_comments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id     uuid NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  author_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body         text NOT NULL CHECK (char_length(body) >= 1 AND char_length(body) <= 500),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_round_comments_round_id  ON round_comments(round_id);
CREATE INDEX IF NOT EXISTS idx_round_comments_created_at ON round_comments(created_at DESC);

ALTER TABLE round_comments ENABLE ROW LEVEL SECURITY;

-- 2. RLS policies for round_comments
-- ============================================================

-- SELECT: own comments OR any complete round
CREATE POLICY "rc_select" ON round_comments
  FOR SELECT USING (
    auth.uid() = author_id
    OR EXISTS (
      SELECT 1 FROM rounds r WHERE r.id = round_id AND r.status = 'complete'
    )
  );

-- INSERT: authenticated user inserts their own comments
CREATE POLICY "rc_insert" ON round_comments
  FOR INSERT WITH CHECK (auth.uid() = author_id);

-- UPDATE: author only
CREATE POLICY "rc_update" ON round_comments
  FOR UPDATE USING (auth.uid() = author_id);

-- DELETE: author only
CREATE POLICY "rc_delete" ON round_comments
  FOR DELETE USING (auth.uid() = author_id);

-- 3. updated_at trigger for round_comments
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_round_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS round_comments_updated_at ON public.round_comments;
CREATE TRIGGER round_comments_updated_at
  BEFORE UPDATE ON public.round_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_round_comments_updated_at();

-- 4. RPC: get_social_feed_rounds
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
  comment_count     bigint
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
    COUNT(DISTINCT rc.id)          AS comment_count
  FROM rounds r
  JOIN profiles cp ON cp.id = r.created_by
  LEFT JOIN players pl ON pl.round_id = r.id AND pl.profile_id IS NOT NULL
  LEFT JOIN profiles pp ON pp.id = pl.profile_id
  LEFT JOIN round_comments rc ON rc.round_id = r.id
  WHERE r.status = 'complete'
    AND (
      -- viewer's own rounds
      r.created_by = viewer_id
      OR
      -- viewer participated
      EXISTS (
        SELECT 1 FROM players p2 WHERE p2.round_id = r.id AND p2.profile_id = viewer_id
      )
      OR
      -- created by a friend
      EXISTS (
        SELECT 1 FROM friendships f
        WHERE f.status = 'accepted'
          AND (
            (f.user_id = viewer_id AND f.friend_id = r.created_by)
            OR
            (f.friend_id = viewer_id AND f.user_id = r.created_by)
          )
      )
      OR
      -- a friend participated
      EXISTS (
        SELECT 1 FROM players p3
        JOIN friendships f2 ON f2.status = 'accepted'
          AND (
            (f2.user_id = viewer_id AND f2.friend_id = p3.profile_id)
            OR
            (f2.friend_id = viewer_id AND f2.user_id = p3.profile_id)
          )
        WHERE p3.round_id = r.id AND p3.profile_id IS NOT NULL
      )
    )
  GROUP BY r.id, r.course_name, r.completed_at, r.updated_at, r.created_by, cp.full_name, cp.avatar_url
  ORDER BY COALESCE(r.completed_at, r.updated_at) DESC
  LIMIT 50;
$$;

-- 5. RPC: get_social_feed_round_ids (lightweight, for cache invalidation)
-- ============================================================
CREATE OR REPLACE FUNCTION get_social_feed_round_ids(viewer_id uuid)
RETURNS TABLE (round_id uuid)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id AS round_id
  FROM rounds r
  WHERE r.status = 'complete'
    AND (
      r.created_by = viewer_id
      OR EXISTS (SELECT 1 FROM players p WHERE p.round_id = r.id AND p.profile_id = viewer_id)
      OR EXISTS (
        SELECT 1 FROM friendships f WHERE f.status = 'accepted'
          AND ((f.user_id = viewer_id AND f.friend_id = r.created_by)
               OR (f.friend_id = viewer_id AND f.user_id = r.created_by))
      )
      OR EXISTS (
        SELECT 1 FROM players p JOIN friendships f ON f.status = 'accepted'
          AND ((f.user_id = viewer_id AND f.friend_id = p.profile_id)
               OR (f.friend_id = viewer_id AND f.user_id = p.profile_id))
        WHERE p.round_id = r.id AND p.profile_id IS NOT NULL
      )
    )
  ORDER BY COALESCE(r.completed_at, r.updated_at) DESC
  LIMIT 50;
$$;
