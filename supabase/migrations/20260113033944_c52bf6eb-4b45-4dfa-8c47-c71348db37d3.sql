-- Add scorekeeper_ids column to rounds table
ALTER TABLE rounds ADD COLUMN scorekeeper_ids UUID[] DEFAULT '{}';

-- Create spectators table for tracking who's watching
CREATE TABLE round_spectators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(round_id, profile_id)
);

-- Enable RLS on spectators table
ALTER TABLE round_spectators ENABLE ROW LEVEL SECURITY;

-- Anyone can view spectators of a round
CREATE POLICY "Anyone can view round spectators"
ON round_spectators FOR SELECT
USING (true);

-- Authenticated users can add themselves as spectators
CREATE POLICY "Users can add themselves as spectators"
ON round_spectators FOR INSERT
WITH CHECK (auth.uid() = profile_id);

-- Users can remove themselves as spectators
CREATE POLICY "Users can remove themselves as spectators"
ON round_spectators FOR DELETE
USING (auth.uid() = profile_id);

-- Create function to check if user is a scorekeeper
CREATE OR REPLACE FUNCTION public.is_scorekeeper(round_id UUID, user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Round creator is always a scorekeeper
    is_round_creator(round_id, user_id)
    OR
    -- Or explicitly in scorekeeper_ids array
    EXISTS (
      SELECT 1 FROM rounds r
      WHERE r.id = round_id
      AND user_id = ANY(r.scorekeeper_ids)
    )
$$;

-- Update scores policies to only allow scorekeepers to insert/update
DROP POLICY IF EXISTS "Round participants can insert scores" ON scores;
DROP POLICY IF EXISTS "Round participants can update scores" ON scores;

CREATE POLICY "Scorekeepers can insert scores"
ON scores FOR INSERT
WITH CHECK (is_scorekeeper(round_id, auth.uid()));

CREATE POLICY "Scorekeepers can update scores"
ON scores FOR UPDATE
USING (is_scorekeeper(round_id, auth.uid()));

-- Update prop_bets policy for selecting winners (only scorekeepers)
DROP POLICY IF EXISTS "Round participants can update prop bets" ON prop_bets;

CREATE POLICY "Scorekeepers can update prop bets"
ON prop_bets FOR UPDATE
USING (is_scorekeeper(round_id, auth.uid()));