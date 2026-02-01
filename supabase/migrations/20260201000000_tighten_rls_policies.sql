-- ============================================================
-- Tighten RLS Policies for Scoring Tables
-- This migration ensures proper authentication-based access
-- while allowing round participants to score
-- ============================================================

-- First, drop policies that depend on is_round_participant so we can recreate the function
DROP POLICY IF EXISTS "Round participants can insert presses" ON public.presses;
DROP POLICY IF EXISTS "Round participants can update presses" ON public.presses;
DROP POLICY IF EXISTS "Round participants can create prop bets" ON public.prop_bets;
DROP POLICY IF EXISTS "Round participants can create settlements" ON public.bet_settlements;
DROP POLICY IF EXISTS "Settlement participants can update" ON public.bet_settlements;

-- Drop existing functions that may have different parameter names
DROP FUNCTION IF EXISTS public.is_round_owner(uuid, uuid);
DROP FUNCTION IF EXISTS public.is_round_participant(uuid, uuid);
DROP FUNCTION IF EXISTS public.can_edit_round(uuid, uuid);
DROP FUNCTION IF EXISTS public.has_round_access(uuid, uuid) CASCADE;

-- Function to check if user is the round creator
CREATE OR REPLACE FUNCTION public.is_round_owner(check_round_id uuid, check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.rounds
    WHERE id = check_round_id AND created_by = check_user_id
  );
$$;

-- Function to check if user is a participant in the round (has a player entry with their profile_id)
CREATE OR REPLACE FUNCTION public.is_round_participant(check_round_id uuid, check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.players
    WHERE round_id = check_round_id AND profile_id = check_user_id
  );
$$;

-- Comprehensive access check (owner, participant, or spectator)
CREATE OR REPLACE FUNCTION public.has_round_access(check_round_id uuid, check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- Is the round creator
    EXISTS (SELECT 1 FROM public.rounds WHERE id = check_round_id AND created_by = check_user_id)
    OR
    -- Is a player in the round
    EXISTS (SELECT 1 FROM public.players WHERE round_id = check_round_id AND profile_id = check_user_id)
    OR
    -- Is a spectator
    EXISTS (SELECT 1 FROM public.round_spectators WHERE round_id = check_round_id AND profile_id = check_user_id);
$$;

-- Function to check if user can edit scores (owner or participant)
CREATE OR REPLACE FUNCTION public.can_edit_round(check_round_id uuid, check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- Is the round creator
    EXISTS (SELECT 1 FROM public.rounds WHERE id = check_round_id AND created_by = check_user_id)
    OR
    -- Is a player in the round
    EXISTS (SELECT 1 FROM public.players WHERE round_id = check_round_id AND profile_id = check_user_id);
$$;

-- ============================================================
-- ROUNDS TABLE POLICIES
-- ============================================================

-- Drop any remaining public/permissive policies
DROP POLICY IF EXISTS "Public read rounds" ON public.rounds;
DROP POLICY IF EXISTS "Public insert rounds" ON public.rounds;
DROP POLICY IF EXISTS "Public update rounds" ON public.rounds;
DROP POLICY IF EXISTS "Public delete rounds" ON public.rounds;

-- Keep existing secure policies if they exist, otherwise create them
DROP POLICY IF EXISTS "Users can view rounds they have access to" ON public.rounds;
CREATE POLICY "Users can view rounds they have access to"
  ON public.rounds FOR SELECT
  USING (has_round_access(id, auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can create rounds" ON public.rounds;
CREATE POLICY "Authenticated users can create rounds"
  ON public.rounds FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Round creator can update" ON public.rounds;
CREATE POLICY "Round creator can update"
  ON public.rounds FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Round creator can delete" ON public.rounds;
CREATE POLICY "Round creator can delete"
  ON public.rounds FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- ============================================================
-- PLAYERS TABLE POLICIES
-- ============================================================

-- Drop any remaining public/permissive policies
DROP POLICY IF EXISTS "Public read players" ON public.players;
DROP POLICY IF EXISTS "Public insert players" ON public.players;
DROP POLICY IF EXISTS "Public update players" ON public.players;
DROP POLICY IF EXISTS "Public delete players" ON public.players;

DROP POLICY IF EXISTS "Users can view players in accessible rounds" ON public.players;
CREATE POLICY "Users can view players in accessible rounds"
  ON public.players FOR SELECT
  USING (has_round_access(round_id, auth.uid()));

DROP POLICY IF EXISTS "Users can add players to their rounds" ON public.players;
CREATE POLICY "Users can add players to their rounds"
  ON public.players FOR INSERT
  TO authenticated
  WITH CHECK (can_edit_round(round_id, auth.uid()));

DROP POLICY IF EXISTS "Round creator or self can update players" ON public.players;
DROP POLICY IF EXISTS "Editors can update players" ON public.players;
CREATE POLICY "Editors can update players"
  ON public.players FOR UPDATE
  TO authenticated
  USING (can_edit_round(round_id, auth.uid()));

DROP POLICY IF EXISTS "Round creator can delete players" ON public.players;
DROP POLICY IF EXISTS "Editors can delete players" ON public.players;
CREATE POLICY "Editors can delete players"
  ON public.players FOR DELETE
  TO authenticated
  USING (can_edit_round(round_id, auth.uid()));

-- ============================================================
-- SCORES TABLE POLICIES
-- ============================================================

-- Drop any remaining public/permissive policies
DROP POLICY IF EXISTS "Public read scores" ON public.scores;
DROP POLICY IF EXISTS "Public insert scores" ON public.scores;
DROP POLICY IF EXISTS "Public update scores" ON public.scores;
DROP POLICY IF EXISTS "Public delete scores" ON public.scores;

DROP POLICY IF EXISTS "Users can view scores in accessible rounds" ON public.scores;
CREATE POLICY "Users can view scores in accessible rounds"
  ON public.scores FOR SELECT
  USING (has_round_access(round_id, auth.uid()));

DROP POLICY IF EXISTS "Participants can insert scores" ON public.scores;
DROP POLICY IF EXISTS "Editors can insert scores" ON public.scores;
CREATE POLICY "Editors can insert scores"
  ON public.scores FOR INSERT
  TO authenticated
  WITH CHECK (can_edit_round(round_id, auth.uid()));

DROP POLICY IF EXISTS "Participants can update scores" ON public.scores;
DROP POLICY IF EXISTS "Editors can update scores" ON public.scores;
CREATE POLICY "Editors can update scores"
  ON public.scores FOR UPDATE
  TO authenticated
  USING (can_edit_round(round_id, auth.uid()));

DROP POLICY IF EXISTS "Round creator can delete scores" ON public.scores;
DROP POLICY IF EXISTS "Editors can delete scores" ON public.scores;
CREATE POLICY "Editors can delete scores"
  ON public.scores FOR DELETE
  TO authenticated
  USING (can_edit_round(round_id, auth.uid()));

-- ============================================================
-- PRESSES TABLE POLICIES
-- ============================================================

-- Drop any remaining public/permissive policies
DROP POLICY IF EXISTS "Public read presses" ON public.presses;
DROP POLICY IF EXISTS "Public insert presses" ON public.presses;
DROP POLICY IF EXISTS "Public update presses" ON public.presses;
DROP POLICY IF EXISTS "Public delete presses" ON public.presses;

DROP POLICY IF EXISTS "Users can view presses in accessible rounds" ON public.presses;
CREATE POLICY "Users can view presses in accessible rounds"
  ON public.presses FOR SELECT
  USING (has_round_access(round_id, auth.uid()));

DROP POLICY IF EXISTS "Participants can insert presses" ON public.presses;
DROP POLICY IF EXISTS "Editors can insert presses" ON public.presses;
CREATE POLICY "Editors can insert presses"
  ON public.presses FOR INSERT
  TO authenticated
  WITH CHECK (can_edit_round(round_id, auth.uid()));

DROP POLICY IF EXISTS "Participants can update presses" ON public.presses;
DROP POLICY IF EXISTS "Editors can update presses" ON public.presses;
CREATE POLICY "Editors can update presses"
  ON public.presses FOR UPDATE
  TO authenticated
  USING (can_edit_round(round_id, auth.uid()));

DROP POLICY IF EXISTS "Round creator can delete presses" ON public.presses;
DROP POLICY IF EXISTS "Editors can delete presses" ON public.presses;
CREATE POLICY "Editors can delete presses"
  ON public.presses FOR DELETE
  TO authenticated
  USING (can_edit_round(round_id, auth.uid()));

-- ============================================================
-- PROP BETS TABLE POLICIES (recreate dropped ones)
-- ============================================================

DROP POLICY IF EXISTS "Editors can create prop bets" ON public.prop_bets;
CREATE POLICY "Editors can create prop bets"
  ON public.prop_bets FOR INSERT
  TO authenticated
  WITH CHECK (can_edit_round(round_id, auth.uid()));

-- ============================================================
-- BET SETTLEMENTS TABLE POLICIES (recreate dropped ones)
-- ============================================================

DROP POLICY IF EXISTS "Editors can create settlements" ON public.bet_settlements;
CREATE POLICY "Editors can create settlements"
  ON public.bet_settlements FOR INSERT
  TO authenticated
  WITH CHECK (can_edit_round(round_id, auth.uid()));

DROP POLICY IF EXISTS "Editors can update settlements" ON public.bet_settlements;
CREATE POLICY "Editors can update settlements"
  ON public.bet_settlements FOR UPDATE
  TO authenticated
  USING (can_edit_round(round_id, auth.uid()));

-- ============================================================
-- Add indexes for RLS performance
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_rounds_created_by ON public.rounds(created_by);
CREATE INDEX IF NOT EXISTS idx_players_profile_id ON public.players(profile_id);
CREATE INDEX IF NOT EXISTS idx_players_round_profile ON public.players(round_id, profile_id);
