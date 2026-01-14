-- Add created_by column to rounds table
ALTER TABLE public.rounds 
ADD COLUMN created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Backfill existing rounds: assign to first player's profile_id
UPDATE public.rounds r
SET created_by = (
  SELECT p.profile_id 
  FROM public.players p 
  WHERE p.round_id = r.id 
  AND p.order_index = 0 
  AND p.profile_id IS NOT NULL
  LIMIT 1
);

-- Create helper function for round access checks (avoids recursive RLS)
CREATE OR REPLACE FUNCTION public.has_round_access(round_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.rounds WHERE id = round_id AND created_by = user_id
  ) OR EXISTS (
    SELECT 1 FROM public.players WHERE players.round_id = $1 AND profile_id = user_id
  ) OR EXISTS (
    SELECT 1 FROM public.round_spectators WHERE round_spectators.round_id = $1 AND round_spectators.profile_id = user_id
  );
$$;

-- Drop ALL overly permissive policies on rounds
DROP POLICY IF EXISTS "Public read rounds" ON public.rounds;
DROP POLICY IF EXISTS "Public insert rounds" ON public.rounds;
DROP POLICY IF EXISTS "Public update rounds" ON public.rounds;
DROP POLICY IF EXISTS "Public delete rounds" ON public.rounds;
DROP POLICY IF EXISTS "Anyone authenticated can read rounds" ON public.rounds;
DROP POLICY IF EXISTS "Authenticated users can create rounds" ON public.rounds;
DROP POLICY IF EXISTS "Round creator can update" ON public.rounds;
DROP POLICY IF EXISTS "Round creator can delete" ON public.rounds;

-- Create secure RLS policies for rounds
CREATE POLICY "Users can view rounds they have access to"
  ON public.rounds FOR SELECT
  USING (has_round_access(id, auth.uid()));

CREATE POLICY "Authenticated users can create rounds"
  ON public.rounds FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Round creator can update"
  ON public.rounds FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Round creator can delete"
  ON public.rounds FOR DELETE
  USING (auth.uid() = created_by);

-- Drop overly permissive policies on players
DROP POLICY IF EXISTS "Public read players" ON public.players;
DROP POLICY IF EXISTS "Public insert players" ON public.players;
DROP POLICY IF EXISTS "Public update players" ON public.players;
DROP POLICY IF EXISTS "Public delete players" ON public.players;

-- Create secure RLS policies for players
CREATE POLICY "Users can view players in accessible rounds"
  ON public.players FOR SELECT
  USING (has_round_access(round_id, auth.uid()));

CREATE POLICY "Users can add players to their rounds"
  ON public.players FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.rounds WHERE id = round_id AND created_by = auth.uid())
  );

-- Drop overly permissive policies on scores
DROP POLICY IF EXISTS "Public read scores" ON public.scores;
DROP POLICY IF EXISTS "Public insert scores" ON public.scores;
DROP POLICY IF EXISTS "Public update scores" ON public.scores;
DROP POLICY IF EXISTS "Public delete scores" ON public.scores;

-- Create secure RLS policies for scores
CREATE POLICY "Users can view scores in accessible rounds"
  ON public.scores FOR SELECT
  USING (has_round_access(round_id, auth.uid()));

-- Drop overly permissive policies on presses
DROP POLICY IF EXISTS "Public read presses" ON public.presses;
DROP POLICY IF EXISTS "Public insert presses" ON public.presses;
DROP POLICY IF EXISTS "Public update presses" ON public.presses;
DROP POLICY IF EXISTS "Public delete presses" ON public.presses;