-- Allow watch party members and post-reveal friends to access round/player/score data
CREATE OR REPLACE FUNCTION has_round_access(check_round_id uuid, check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    -- Is the round creator
    EXISTS (SELECT 1 FROM public.rounds WHERE id = check_round_id AND created_by = check_user_id)
    OR
    -- Is a player in the round
    EXISTS (SELECT 1 FROM public.players WHERE round_id = check_round_id AND profile_id = check_user_id)
    OR
    -- Is a spectator
    EXISTS (SELECT 1 FROM public.round_spectators WHERE round_id = check_round_id AND profile_id = check_user_id)
    OR
    -- Is a watch party member (active, not left)
    EXISTS (SELECT 1 FROM public.watch_party_members WHERE round_id = check_round_id AND profile_id = check_user_id AND left_at IS NULL)
    OR
    -- Is a friend of any player and the round is complete (post-reveal access)
    (is_round_complete(check_round_id) AND is_friend_of_any_player(check_round_id, check_user_id));
$$;

-- Enable real-time for watch party tables
ALTER PUBLICATION supabase_realtime ADD TABLE watch_party_messages, watch_party_members;
