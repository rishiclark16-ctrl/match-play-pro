-- Drop existing overly permissive policies on rounds table
DROP POLICY IF EXISTS "Anyone authenticated can insert rounds" ON public.rounds;
DROP POLICY IF EXISTS "Anyone authenticated can update rounds" ON public.rounds;
DROP POLICY IF EXISTS "Anyone authenticated can delete rounds" ON public.rounds;
DROP POLICY IF EXISTS "Anyone can read rounds" ON public.rounds;

-- Create a function to check if user is a round participant
CREATE OR REPLACE FUNCTION public.is_round_participant(round_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.players
    WHERE players.round_id = $1 AND players.profile_id = $2
  )
$$;

-- Create a function to check if user is round creator (first player with profile_id)
CREATE OR REPLACE FUNCTION public.is_round_creator(round_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.players
    WHERE players.round_id = $1 
    AND players.profile_id = $2
    AND players.order_index = 0
  )
$$;

-- Rounds: Anyone authenticated can read (for join code lookup)
CREATE POLICY "Anyone authenticated can read rounds"
ON public.rounds FOR SELECT
TO authenticated
USING (true);

-- Rounds: Any authenticated user can create rounds
CREATE POLICY "Authenticated users can create rounds"
ON public.rounds FOR INSERT
TO authenticated
WITH CHECK (true);

-- Rounds: Only round creator can update
CREATE POLICY "Round creator can update"
ON public.rounds FOR UPDATE
TO authenticated
USING (public.is_round_creator(id, auth.uid()));

-- Rounds: Only round creator can delete
CREATE POLICY "Round creator can delete"
ON public.rounds FOR DELETE
TO authenticated
USING (public.is_round_creator(id, auth.uid()));

-- Drop existing overly permissive policies on players table
DROP POLICY IF EXISTS "Anyone authenticated can insert players" ON public.players;
DROP POLICY IF EXISTS "Anyone authenticated can update players" ON public.players;
DROP POLICY IF EXISTS "Anyone authenticated can delete players" ON public.players;
DROP POLICY IF EXISTS "Anyone can read players" ON public.players;

-- Players: Anyone authenticated can read
CREATE POLICY "Anyone authenticated can read players"
ON public.players FOR SELECT
TO authenticated
USING (true);

-- Players: Any authenticated user can add players (joining a round)
CREATE POLICY "Authenticated users can add players"
ON public.players FOR INSERT
TO authenticated
WITH CHECK (true);

-- Players: Only round creator or the player themselves can update
CREATE POLICY "Round creator or self can update players"
ON public.players FOR UPDATE
TO authenticated
USING (
  public.is_round_creator(round_id, auth.uid()) 
  OR profile_id = auth.uid()
);

-- Players: Only round creator can delete players
CREATE POLICY "Round creator can delete players"
ON public.players FOR DELETE
TO authenticated
USING (public.is_round_creator(round_id, auth.uid()));

-- Drop existing overly permissive policies on scores table
DROP POLICY IF EXISTS "Anyone authenticated can insert scores" ON public.scores;
DROP POLICY IF EXISTS "Anyone authenticated can update scores" ON public.scores;
DROP POLICY IF EXISTS "Anyone authenticated can delete scores" ON public.scores;
DROP POLICY IF EXISTS "Anyone can read scores" ON public.scores;

-- Scores: Anyone authenticated can read
CREATE POLICY "Anyone authenticated can read scores"
ON public.scores FOR SELECT
TO authenticated
USING (true);

-- Scores: Round participants can insert scores
CREATE POLICY "Round participants can insert scores"
ON public.scores FOR INSERT
TO authenticated
WITH CHECK (public.is_round_participant(round_id, auth.uid()));

-- Scores: Round participants can update scores
CREATE POLICY "Round participants can update scores"
ON public.scores FOR UPDATE
TO authenticated
USING (public.is_round_participant(round_id, auth.uid()));

-- Scores: Round creator can delete scores
CREATE POLICY "Round creator can delete scores"
ON public.scores FOR DELETE
TO authenticated
USING (public.is_round_creator(round_id, auth.uid()));

-- Drop existing overly permissive policies on presses table
DROP POLICY IF EXISTS "Anyone authenticated can insert presses" ON public.presses;
DROP POLICY IF EXISTS "Anyone authenticated can update presses" ON public.presses;
DROP POLICY IF EXISTS "Anyone authenticated can delete presses" ON public.presses;
DROP POLICY IF EXISTS "Anyone can read presses" ON public.presses;

-- Presses: Anyone authenticated can read
CREATE POLICY "Anyone authenticated can read presses"
ON public.presses FOR SELECT
TO authenticated
USING (true);

-- Presses: Round participants can insert presses
CREATE POLICY "Round participants can insert presses"
ON public.presses FOR INSERT
TO authenticated
WITH CHECK (public.is_round_participant(round_id, auth.uid()));

-- Presses: Round participants can update presses
CREATE POLICY "Round participants can update presses"
ON public.presses FOR UPDATE
TO authenticated
USING (public.is_round_participant(round_id, auth.uid()));

-- Presses: Round creator can delete presses
CREATE POLICY "Round creator can delete presses"
ON public.presses FOR DELETE
TO authenticated
USING (public.is_round_creator(round_id, auth.uid()));