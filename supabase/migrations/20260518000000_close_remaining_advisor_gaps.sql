-- Close remaining advisor gaps found in the 2026-05-18 security audit
-- (docs/supabase-advisors.md). Three SECURITY DEFINER functions in public
-- were not covered by the prior hardening migrations:
--
--   1) handle_new_user() is an auth.users trigger and must never be
--      reachable via PostgREST. We revoke EXECUTE from anon, authenticated,
--      and PUBLIC; the trigger continues to fire on auth.users INSERTs
--      because triggers bypass GRANTs.
--
--   2) check_push_rate_limit(p_user_id, ...) accepts an arbitrary user_id
--      and INSERTs / UPDATEs push_rate_limits for that id. An attacker
--      could exhaust another user's push notification quota or thrash the
--      table. It is only intended to be called server-side from the
--      send-push edge function (which uses service_role and is therefore
--      unaffected by the REVOKE). Revoke EXECUTE from anon, authenticated,
--      and PUBLIC.
--
--   3) get_social_feed_round_ids(viewer_id) was missed by the
--      20260427100000 hardening pass. Pin viewer_id to auth.uid() so the
--      function can only ever return the caller's own feed, matching its
--      sibling get_social_feed_rounds. The viewer_id parameter is kept in
--      the signature for client compatibility but its value is ignored.

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.check_push_rate_limit(uuid, integer, integer)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_social_feed_round_ids(viewer_id uuid)
RETURNS TABLE(round_id uuid)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  -- viewer_id parameter is ignored; auth.uid() is used to prevent
  -- a caller from querying another user's social feed.
  SELECT r.id AS round_id
  FROM rounds r
  WHERE r.status = 'complete'
    AND (
      r.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM players p
        WHERE p.round_id = r.id AND p.profile_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM friendships f
        WHERE f.status = 'accepted'
          AND (
            (f.user_id = auth.uid() AND f.friend_id = r.created_by)
            OR (f.friend_id = auth.uid() AND f.user_id = r.created_by)
          )
      )
      OR EXISTS (
        SELECT 1
        FROM players p
        JOIN friendships f ON f.status = 'accepted'
          AND (
            (f.user_id = auth.uid() AND f.friend_id = p.profile_id)
            OR (f.friend_id = auth.uid() AND f.user_id = p.profile_id)
          )
        WHERE p.round_id = r.id AND p.profile_id IS NOT NULL
      )
    )
  ORDER BY COALESCE(r.completed_at, r.updated_at) DESC
  LIMIT 50;
$function$;
