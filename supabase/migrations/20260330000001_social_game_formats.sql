-- Extend personal_game_formats with public flag
ALTER TABLE personal_game_formats
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_personal_game_formats_is_public
  ON personal_game_formats(is_public)
  WHERE is_public = true;

-- Replace single SELECT policy with two (own + public)
DROP POLICY IF EXISTS "pgf_select" ON personal_game_formats;

CREATE POLICY "pgf_select_own" ON personal_game_formats
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "pgf_select_public" ON personal_game_formats
  FOR SELECT USING (is_public = true);

-- Group format assignment table (one format per group)
CREATE TABLE IF NOT EXISTS group_format_assignments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id     uuid NOT NULL REFERENCES golf_groups(id) ON DELETE CASCADE,
  format_id    uuid NOT NULL REFERENCES personal_game_formats(id) ON DELETE CASCADE,
  assigned_by  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(group_id)
);

CREATE INDEX IF NOT EXISTS idx_gfa_group_id  ON group_format_assignments(group_id);
CREATE INDEX IF NOT EXISTS idx_gfa_format_id ON group_format_assignments(format_id);

ALTER TABLE group_format_assignments ENABLE ROW LEVEL SECURITY;

-- Group members can read assignments (uses existing is_group_member helper)
CREATE POLICY "gfa_select" ON group_format_assignments
  FOR SELECT USING (
    public.is_group_member(group_id, auth.uid())
    OR
    public.is_group_owner(group_id, auth.uid())
  );

-- Only group owner can assign/remove
CREATE POLICY "gfa_insert" ON group_format_assignments
  FOR INSERT WITH CHECK (public.is_group_owner(group_id, auth.uid()));

CREATE POLICY "gfa_update" ON group_format_assignments
  FOR UPDATE USING (public.is_group_owner(group_id, auth.uid()));

CREATE POLICY "gfa_delete" ON group_format_assignments
  FOR DELETE USING (public.is_group_owner(group_id, auth.uid()));
