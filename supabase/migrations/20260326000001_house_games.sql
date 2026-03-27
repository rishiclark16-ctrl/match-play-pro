-- House Games: one custom betting format per group (Pro feature)
CREATE TABLE house_games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES golf_groups(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Our House Game',
  description text NOT NULL DEFAULT '',
  active_primitives jsonb NOT NULL DEFAULT '[]',
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(group_id)
);

CREATE INDEX idx_house_games_group_id ON house_games(group_id);
CREATE INDEX idx_house_games_owner_id ON house_games(owner_id);

ALTER TABLE house_games ENABLE ROW LEVEL SECURITY;

-- Anyone in the group can read
CREATE POLICY "house_games_select" ON house_games
  FOR SELECT USING (
    auth.uid() = owner_id
    OR is_group_member(group_id, auth.uid())
  );

-- Only group owner can insert/update
CREATE POLICY "house_games_insert" ON house_games
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "house_games_update" ON house_games
  FOR UPDATE USING (auth.uid() = owner_id);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_house_games_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER house_games_updated_at
  BEFORE UPDATE ON house_games
  FOR EACH ROW EXECUTE FUNCTION update_house_games_updated_at();
