-- ============================================================
-- Fix #1: Add updated_at auto-trigger for rounds table
-- Matches the pattern used by house_games, personal_game_formats, etc.
-- ============================================================
CREATE OR REPLACE FUNCTION update_rounds_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER rounds_updated_at
  BEFORE UPDATE ON public.rounds
  FOR EACH ROW
  EXECUTE FUNCTION update_rounds_updated_at();

-- ============================================================
-- Fix #2: Add missing DELETE policy for bet_settlements
-- Allows round editors (creator or participants) to delete settlements
-- ============================================================
CREATE POLICY "Editors can delete settlements"
  ON public.bet_settlements
  FOR DELETE
  TO authenticated
  USING (can_edit_round(round_id, auth.uid()));
