-- ============================================================
-- Pin auth.uid() inside SECURITY DEFINER predicate functions
-- ============================================================
-- These functions are used internally by RLS policies, but Supabase exposes
-- every SECURITY DEFINER function via /rest/v1/rpc/*. Without pinning, an
-- authenticated (or even anon) caller can probe predicates with arbitrary
-- user ids — e.g., "is user X the owner of round Y?".
--
-- We keep the parameter signatures unchanged for RLS-callsite compatibility,
-- but the bodies now use auth.uid() so RPC callers only get truthy results
-- scoped to themselves. RLS policies always pass auth.uid() as the user-id
-- argument, so behavior inside policies is preserved.
--
-- For are_friends(user1_id, user2_id) the caller must be one of the two
-- parties (you cannot probe whether other people are friends).
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_round_owner(check_round_id uuid, check_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM public.rounds
       WHERE id = check_round_id AND created_by = auth.uid()
     );
$$;

CREATE OR REPLACE FUNCTION public.is_round_participant(check_round_id uuid, check_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM public.players
       WHERE round_id = check_round_id AND profile_id = auth.uid()
     );
$$;

CREATE OR REPLACE FUNCTION public.has_round_access(check_round_id uuid, check_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND (
      EXISTS (SELECT 1 FROM public.rounds WHERE id = check_round_id AND created_by = auth.uid())
      OR EXISTS (SELECT 1 FROM public.players WHERE round_id = check_round_id AND profile_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.round_spectators WHERE round_id = check_round_id AND profile_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.watch_party_members WHERE round_id = check_round_id AND profile_id = auth.uid() AND left_at IS NULL)
      OR (is_round_complete(check_round_id) AND is_friend_of_any_player(check_round_id, auth.uid()))
    );
$$;

CREATE OR REPLACE FUNCTION public.can_edit_round(check_round_id uuid, check_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND (
      EXISTS (SELECT 1 FROM public.rounds WHERE id = check_round_id AND created_by = auth.uid())
      OR EXISTS (SELECT 1 FROM public.players WHERE round_id = check_round_id AND profile_id = auth.uid())
    );
$$;

CREATE OR REPLACE FUNCTION public.is_round_creator(p_round_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM public.rounds
       WHERE id = p_round_id AND created_by = auth.uid()
     );
$$;

CREATE OR REPLACE FUNCTION public.is_scorekeeper(p_round_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND (
      EXISTS (SELECT 1 FROM public.rounds WHERE id = p_round_id AND created_by = auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.rounds r
        WHERE r.id = p_round_id AND auth.uid() = ANY(r.scorekeeper_ids)
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.is_group_owner(p_group_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM public.golf_groups
       WHERE id = p_group_id AND owner_id = auth.uid()
     );
$$;

CREATE OR REPLACE FUNCTION public.is_group_member(p_group_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM public.group_members gm
       JOIN public.golf_groups g ON g.id = gm.group_id
       WHERE gm.group_id = p_group_id
         AND (gm.profile_id = auth.uid() OR g.owner_id = auth.uid())
     );
$$;

CREATE OR REPLACE FUNCTION public.is_watch_party_member(p_round_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM public.watch_party_members
       WHERE round_id = p_round_id
         AND profile_id = auth.uid()
         AND left_at IS NULL
     );
$$;

CREATE OR REPLACE FUNCTION public.is_pro_user(check_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE caller uuid := auth.uid();
BEGIN
  IF caller IS NULL THEN RETURN FALSE; END IF;
  IF EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = caller
      AND tier = 'pro'
      AND status IN ('active', 'grace_period')
      AND (expires_at IS NULL OR expires_at > NOW())
  ) THEN
    RETURN TRUE;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = caller AND grandfathered_at IS NOT NULL
  ) THEN
    RETURN TRUE;
  END IF;
  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.are_friends(user1_id uuid, user2_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND (auth.uid() = user1_id OR auth.uid() = user2_id)
    AND EXISTS (
      SELECT 1 FROM public.friendships
      WHERE status = 'accepted'
        AND ((user_id = user1_id AND friend_id = user2_id)
          OR (friend_id = user1_id AND user_id = user2_id))
    );
$$;

CREATE OR REPLACE FUNCTION public.get_friend_count(check_user_id uuid)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE caller uuid := auth.uid();
BEGIN
  IF caller IS NULL THEN RETURN 0; END IF;
  IF NOT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'friendships'
  ) THEN
    RETURN 0;
  END IF;
  RETURN (
    SELECT COUNT(*)::INTEGER FROM public.friendships
    WHERE (user_id = caller OR friend_id = caller)
      AND status = 'accepted'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_group_count(check_user_id uuid)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE caller uuid := auth.uid();
BEGIN
  IF caller IS NULL THEN RETURN 0; END IF;
  IF NOT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'golf_groups'
  ) THEN
    RETURN 0;
  END IF;
  RETURN (SELECT COUNT(*)::INTEGER FROM public.golf_groups WHERE owner_id = caller);
END;
$$;
