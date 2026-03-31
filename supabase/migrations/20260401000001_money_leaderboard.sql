-- Money leaderboard RPCs
-- get_season_leaderboard: net standings between viewer and accepted friends for current calendar year
-- get_head_to_head: W/L/push record and net amount between two players across all time

-- ---------------------------------------------------------------------------
-- RPC 1: get_season_leaderboard
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_season_leaderboard(viewer_id uuid)
RETURNS TABLE (
  friend_profile_id uuid,
  friend_name       text,
  friend_avatar     text,
  net_amount        numeric,
  round_count       bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH raw AS (
    SELECT
      CASE WHEN fp.profile_id = viewer_id THEN tp.profile_id
           ELSE fp.profile_id END                                      AS friend_pid,
      CASE WHEN tp.profile_id = viewer_id THEN bs.amount
           ELSE -bs.amount END                                         AS net,
      bs.round_id
    FROM bet_settlements bs
    JOIN players fp ON fp.id = bs.from_player_id
    JOIN players tp ON tp.id = bs.to_player_id
    WHERE (fp.profile_id = viewer_id OR tp.profile_id = viewer_id)
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
        (f.user_id = viewer_id AND f.friend_id = r.friend_pid)
        OR (f.friend_id = viewer_id AND f.user_id = r.friend_pid)
      )
  )
  GROUP BY r.friend_pid, p.full_name, p.avatar_url
  ORDER BY SUM(r.net) DESC;
$$;

-- ---------------------------------------------------------------------------
-- RPC 2: get_head_to_head
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_head_to_head(viewer_id uuid, other_id uuid)
RETURNS TABLE (
  wins        integer,
  losses      integer,
  pushes      integer,
  net_amount  numeric,
  round_count integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH round_nets AS (
    SELECT
      bs.round_id,
      SUM(
        CASE WHEN tp.profile_id = viewer_id THEN bs.amount
             ELSE -bs.amount END
      ) AS net
    FROM bet_settlements bs
    JOIN players fp ON fp.id = bs.from_player_id
    JOIN players tp ON tp.id = bs.to_player_id
    WHERE (
        (fp.profile_id = viewer_id AND tp.profile_id = other_id)
        OR (tp.profile_id = viewer_id AND fp.profile_id = other_id)
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
$$;
