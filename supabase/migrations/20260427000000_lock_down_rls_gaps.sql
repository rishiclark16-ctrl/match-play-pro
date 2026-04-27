-- ============================================================
-- Lock down RLS gaps surfaced by 2026-04-27 production audit
-- ============================================================
-- 1. promo_codes: drop "for select using (true)" — leaks all codes to any
--    authenticated user. The redeem-promo edge function uses the service
--    role and bypasses RLS, so client-facing read access is unnecessary.
--
-- 2. get_season_leaderboard / get_head_to_head: SECURITY DEFINER RPCs that
--    accept viewer_id as a parameter without verifying it matches
--    auth.uid(). Any authenticated user could query another user's
--    head-to-head record or season standings. We keep the parameter for
--    backward compatibility but enforce viewer_id = auth.uid() inside.
-- ============================================================

-- (1) Lock down promo_codes
DROP POLICY IF EXISTS "Anyone can read promo codes" ON public.promo_codes;
-- No client-side select policy; only service_role (edge function) can read.

-- (2a) Re-define get_season_leaderboard with viewer_id pinned to auth.uid()
CREATE OR REPLACE FUNCTION public.get_season_leaderboard(viewer_id uuid)
RETURNS TABLE (
  friend_profile_id uuid,
  friend_name       text,
  friend_avatar     text,
  net_amount        numeric,
  round_count       bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
BEGIN
  -- Enforce: callers can only query their own leaderboard.
  IF caller IS NULL OR (viewer_id IS NOT NULL AND viewer_id <> caller) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH raw AS (
    SELECT
      CASE WHEN fp.profile_id = caller THEN tp.profile_id
           ELSE fp.profile_id END                                      AS friend_pid,
      CASE WHEN tp.profile_id = caller THEN bs.amount
           ELSE -bs.amount END                                         AS net,
      bs.round_id
    FROM bet_settlements bs
    JOIN players fp ON fp.id = bs.from_player_id
    JOIN players tp ON tp.id = bs.to_player_id
    WHERE (fp.profile_id = caller OR tp.profile_id = caller)
      AND fp.profile_id IS NOT NULL
      AND tp.profile_id IS NOT NULL
      AND fp.profile_id <> tp.profile_id
      AND date_part('year', bs.created_at) = date_part('year', now())
  )
  SELECT
    r.friend_pid                                   AS friend_profile_id,
    p.full_name                                    AS friend_name,
    p.avatar_url                                   AS friend_avatar,
    SUM(r.net)                                     AS net_amount,
    COUNT(DISTINCT r.round_id)                     AS round_count
  FROM raw r
  JOIN profiles p ON p.id = r.friend_pid
  WHERE EXISTS (
    SELECT 1 FROM friendships f
    WHERE f.status = 'accepted'
      AND (
        (f.user_id = caller AND f.friend_id = r.friend_pid)
        OR (f.friend_id = caller AND f.user_id = r.friend_pid)
      )
  )
  GROUP BY r.friend_pid, p.full_name, p.avatar_url
  ORDER BY SUM(r.net) DESC;
END;
$$;

-- (2b) Re-define get_head_to_head with viewer_id pinned to auth.uid()
CREATE OR REPLACE FUNCTION public.get_head_to_head(viewer_id uuid, other_id uuid)
RETURNS TABLE (
  wins        integer,
  losses      integer,
  pushes      integer,
  net_amount  numeric,
  round_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
BEGIN
  IF caller IS NULL OR (viewer_id IS NOT NULL AND viewer_id <> caller) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH round_nets AS (
    SELECT
      bs.round_id,
      SUM(
        CASE WHEN tp.profile_id = caller THEN bs.amount
             ELSE -bs.amount END
      ) AS net
    FROM bet_settlements bs
    JOIN players fp ON fp.id = bs.from_player_id
    JOIN players tp ON tp.id = bs.to_player_id
    WHERE (
        (fp.profile_id = caller AND tp.profile_id = other_id)
        OR (tp.profile_id = caller AND fp.profile_id = other_id)
      )
      AND fp.profile_id IS NOT NULL
      AND tp.profile_id IS NOT NULL
    GROUP BY bs.round_id
  )
  SELECT
    COUNT(CASE WHEN net > 0 THEN 1 END)::integer  AS wins,
    COUNT(CASE WHEN net < 0 THEN 1 END)::integer  AS losses,
    COUNT(CASE WHEN net = 0 THEN 1 END)::integer  AS pushes,
    COALESCE(SUM(net), 0)                          AS net_amount,
    COUNT(*)::integer                              AS round_count
  FROM round_nets;
END;
$$;
