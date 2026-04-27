-- ============================================================
-- Supabase advisor security hardening (Phase P2.1)
-- ============================================================
-- 1. Drop the broad public SELECT policy on the avatars bucket so
--    clients can no longer LIST/enumerate stored files. Public objects
--    remain accessible via getPublicUrl since the bucket is public.
-- 2. Pin auth.uid() inside SECURITY DEFINER RPCs that accept a
--    viewer_id-style parameter, so callers cannot impersonate other
--    users via /rest/v1/rpc/*.
-- 3. Membership-gate the watch_party RPCs (caller must be a player or
--    a watch-party member of the round).
-- 4. Add `SET search_path = public` to 8 trigger/utility functions
--    flagged as function_search_path_mutable.
-- ============================================================

-- (1) Avatars storage — drop public list policy
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;

-- (2a) get_round_reactions — caller's viewer_id is forced to auth.uid()
CREATE OR REPLACE FUNCTION public.get_round_reactions(target_round_id uuid, viewer_id uuid)
RETURNS TABLE(reaction_type text, count bigint, viewer_reacted boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE caller uuid := auth.uid();
BEGIN
  IF caller IS NULL THEN RETURN; END IF;
  IF viewer_id IS NOT NULL AND viewer_id <> caller THEN RETURN; END IF;
  RETURN QUERY
    SELECT
      rr.reaction_type,
      COUNT(*)::bigint,
      BOOL_OR(rr.user_id = caller)
    FROM round_reactions rr
    WHERE rr.round_id = target_round_id
    GROUP BY rr.reaction_type;
END;
$function$;

-- (2b) get_social_feed_rounds — pin viewer_id
CREATE OR REPLACE FUNCTION public.get_social_feed_rounds(viewer_id uuid)
RETURNS TABLE(round_id uuid, course_name text, completed_at timestamp with time zone, creator_id uuid, creator_name text, creator_avatar text, participant_ids uuid[], participant_names text[], comment_count bigint, games jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE caller uuid := auth.uid();
BEGIN
  IF caller IS NULL THEN RETURN; END IF;
  IF viewer_id IS NOT NULL AND viewer_id <> caller THEN RETURN; END IF;
  RETURN QUERY
    SELECT
      r.id, r.course_name,
      COALESCE(r.completed_at, r.updated_at),
      r.created_by, cp.full_name, cp.avatar_url,
      ARRAY_AGG(DISTINCT pl.profile_id) FILTER (WHERE pl.profile_id IS NOT NULL),
      ARRAY_AGG(DISTINCT pp.full_name) FILTER (WHERE pp.full_name IS NOT NULL),
      COUNT(DISTINCT rc.id),
      r.games
    FROM rounds r
    JOIN profiles cp ON cp.id = r.created_by
    LEFT JOIN players pl ON pl.round_id = r.id AND pl.profile_id IS NOT NULL
    LEFT JOIN profiles pp ON pp.id = pl.profile_id
    LEFT JOIN round_comments rc ON rc.round_id = r.id
    WHERE r.status = 'complete'
      AND (
        r.created_by = caller
        OR EXISTS (SELECT 1 FROM players p2 WHERE p2.round_id = r.id AND p2.profile_id = caller)
        OR EXISTS (
          SELECT 1 FROM friendships f
          WHERE f.status = 'accepted'
            AND ((f.user_id = caller AND f.friend_id = r.created_by)
              OR (f.friend_id = caller AND f.user_id = r.created_by))
        )
        OR EXISTS (
          SELECT 1 FROM players p3
          JOIN friendships f2 ON f2.status = 'accepted'
            AND ((f2.user_id = caller AND f2.friend_id = p3.profile_id)
              OR (f2.friend_id = caller AND f2.user_id = p3.profile_id))
          WHERE p3.round_id = r.id AND p3.profile_id IS NOT NULL
        )
      )
    GROUP BY r.id, r.course_name, r.completed_at, r.updated_at, r.created_by, cp.full_name, cp.avatar_url, r.games
    ORDER BY COALESCE(r.completed_at, r.updated_at) DESC
    LIMIT 50;
END;
$function$;

-- (2c) get_upcoming_rounds — pin viewer_id
CREATE OR REPLACE FUNCTION public.get_upcoming_rounds(viewer_id uuid)
RETURNS TABLE(round_id uuid, course_name text, tee_time timestamp with time zone, creator_id uuid, creator_name text, creator_avatar text, invited_ids uuid[], participant_ids uuid[], participant_names text[], message_count bigint, created_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE caller uuid := auth.uid();
BEGIN
  IF caller IS NULL THEN RETURN; END IF;
  IF viewer_id IS NOT NULL AND viewer_id <> caller THEN RETURN; END IF;
  RETURN QUERY
    SELECT
      r.id, r.course_name, r.tee_time, r.created_by,
      cp.full_name, cp.avatar_url, r.invited_player_ids,
      ARRAY_AGG(DISTINCT pl.profile_id) FILTER (WHERE pl.profile_id IS NOT NULL),
      ARRAY_AGG(DISTINCT pp.full_name) FILTER (WHERE pp.full_name IS NOT NULL),
      COUNT(DISTINCT rm.id), r.created_at
    FROM rounds r
    JOIN profiles cp ON cp.id = r.created_by
    LEFT JOIN players pl ON pl.round_id = r.id AND pl.profile_id IS NOT NULL
    LEFT JOIN profiles pp ON pp.id = pl.profile_id
    LEFT JOIN round_messages rm ON rm.round_id = r.id
    WHERE r.status IN ('pending', 'active')
      AND r.tee_time IS NOT NULL
      AND (
        r.created_by = caller
        OR EXISTS (SELECT 1 FROM players p2 WHERE p2.round_id = r.id AND p2.profile_id = caller)
        OR caller = ANY(r.invited_player_ids)
      )
    GROUP BY r.id, r.course_name, r.tee_time, r.created_by, cp.full_name, cp.avatar_url, r.invited_player_ids, r.created_at
    ORDER BY r.tee_time ASC
    LIMIT 20;
END;
$function$;

-- (2d) is_friend_of_any_player — pin p_user_id
CREATE OR REPLACE FUNCTION public.is_friend_of_any_player(p_round_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE caller uuid := auth.uid();
BEGIN
  IF caller IS NULL THEN RETURN FALSE; END IF;
  IF p_user_id IS NOT NULL AND p_user_id <> caller THEN RETURN FALSE; END IF;
  RETURN EXISTS (
    SELECT 1
    FROM players pl
    JOIN friendships f ON f.status = 'accepted'
      AND (
        (f.user_id = caller AND f.friend_id = pl.profile_id)
        OR (f.friend_id = caller AND f.user_id = pl.profile_id)
      )
    WHERE pl.round_id = p_round_id
      AND pl.profile_id IS NOT NULL
  );
END;
$function$;

-- (3) Watch-party RPCs — gate by membership (player or watch-party member)
CREATE OR REPLACE FUNCTION public.get_watch_party_messages(p_round_id uuid)
RETURNS TABLE(id uuid, author_id uuid, author_name text, author_avatar text, body text, is_post_reveal boolean, is_player boolean, created_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE caller uuid := auth.uid();
BEGIN
  IF caller IS NULL THEN RETURN; END IF;
  IF NOT (
    EXISTS (SELECT 1 FROM players p WHERE p.round_id = p_round_id AND p.profile_id = caller)
    OR EXISTS (SELECT 1 FROM watch_party_members m WHERE m.round_id = p_round_id AND m.profile_id = caller)
  ) THEN
    RETURN;
  END IF;
  RETURN QUERY
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
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_watch_party_recipients(p_round_id uuid)
RETURNS TABLE(profile_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE caller uuid := auth.uid();
BEGIN
  IF caller IS NULL THEN RETURN; END IF;
  -- Only round creator or scorekeeper should see the recipient list (used to
  -- pre-warm push targets). Players in the round qualify; spectators do not.
  IF NOT EXISTS (SELECT 1 FROM players p WHERE p.round_id = p_round_id AND p.profile_id = caller) THEN
    RETURN;
  END IF;
  RETURN QUERY
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
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_watch_party_stats(p_round_id uuid)
RETURNS TABLE(spectator_count bigint, message_count bigint, first_message_body text, first_message_author text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE caller uuid := auth.uid();
BEGIN
  IF caller IS NULL THEN RETURN; END IF;
  IF NOT (
    EXISTS (SELECT 1 FROM players p WHERE p.round_id = p_round_id AND p.profile_id = caller)
    OR EXISTS (SELECT 1 FROM watch_party_members m WHERE m.round_id = p_round_id AND m.profile_id = caller)
  ) THEN
    RETURN;
  END IF;
  RETURN QUERY
    SELECT
      (SELECT COUNT(DISTINCT m.profile_id) FROM watch_party_members m WHERE m.round_id = p_round_id) AS spectator_count,
      (SELECT COUNT(*) FROM watch_party_messages wm WHERE wm.round_id = p_round_id AND NOT wm.is_post_reveal) AS message_count,
      (SELECT wm.body FROM watch_party_messages wm WHERE wm.round_id = p_round_id AND NOT wm.is_post_reveal ORDER BY wm.created_at LIMIT 1) AS first_message_body,
      (SELECT p.full_name FROM watch_party_messages wm JOIN profiles p ON p.id = wm.author_id WHERE wm.round_id = p_round_id AND NOT wm.is_post_reveal ORDER BY wm.created_at LIMIT 1) AS first_message_author;
END;
$function$;

-- (4) Add SET search_path = public to 8 mutable functions
ALTER FUNCTION public.update_house_games_updated_at() SET search_path = public;
ALTER FUNCTION public.update_personal_game_formats_updated_at() SET search_path = public;
ALTER FUNCTION public.update_rounds_updated_at() SET search_path = public;
ALTER FUNCTION public.update_subscription_updated_at() SET search_path = public;
ALTER FUNCTION public.update_round_comments_updated_at() SET search_path = public;
ALTER FUNCTION public.get_friend_count(uuid) SET search_path = public;
ALTER FUNCTION public.get_group_count(uuid) SET search_path = public;
ALTER FUNCTION public.is_pro_user(uuid) SET search_path = public;
ALTER FUNCTION public.has_round_access(uuid, uuid) SET search_path = public;
