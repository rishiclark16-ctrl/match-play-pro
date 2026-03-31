-- Personal game formats: multiple custom betting formats per user (Pro feature)
-- Distinct from house_games which are group-scoped (1 per group)
CREATE TABLE personal_game_formats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'My Format',
  description text NOT NULL DEFAULT '',
  active_primitives jsonb NOT NULL DEFAULT '[]',
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_personal_game_formats_owner_id ON personal_game_formats(owner_id);
CREATE INDEX idx_personal_game_formats_created_at ON personal_game_formats(created_at DESC);

ALTER TABLE personal_game_formats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pgf_select" ON personal_game_formats
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "pgf_insert" ON personal_game_formats
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "pgf_update" ON personal_game_formats
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "pgf_delete" ON personal_game_formats
  FOR DELETE USING (auth.uid() = owner_id);

CREATE OR REPLACE FUNCTION update_personal_game_formats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER personal_game_formats_updated_at
  BEFORE UPDATE ON personal_game_formats
  FOR EACH ROW EXECUTE FUNCTION update_personal_game_formats_updated_at();
