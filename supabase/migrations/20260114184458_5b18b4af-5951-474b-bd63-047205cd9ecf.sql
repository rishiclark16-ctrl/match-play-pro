-- Drop remaining overly permissive policies

-- Players: Drop old permissive SELECT and INSERT policies
DROP POLICY IF EXISTS "Anyone authenticated can read players" ON public.players;
DROP POLICY IF EXISTS "Authenticated users can add players" ON public.players;

-- Presses: Fix SELECT policy
DROP POLICY IF EXISTS "Anyone authenticated can read presses" ON public.presses;
CREATE POLICY "Users can view presses in accessible rounds"
  ON public.presses FOR SELECT
  USING (has_round_access(round_id, auth.uid()));

-- Scores: Drop old permissive SELECT policy  
DROP POLICY IF EXISTS "Anyone authenticated can read scores" ON public.scores;

-- Bet Settlements: Fix SELECT policy to only show in accessible rounds
DROP POLICY IF EXISTS "Anyone can read settlements" ON public.bet_settlements;
CREATE POLICY "Users can view settlements in accessible rounds"
  ON public.bet_settlements FOR SELECT
  USING (has_round_access(round_id, auth.uid()));

-- Round Spectators: Fix SELECT policy to only show spectators in accessible rounds
DROP POLICY IF EXISTS "Anyone can view round spectators" ON public.round_spectators;
CREATE POLICY "Users can view spectators in accessible rounds"
  ON public.round_spectators FOR SELECT
  USING (has_round_access(round_id, auth.uid()));