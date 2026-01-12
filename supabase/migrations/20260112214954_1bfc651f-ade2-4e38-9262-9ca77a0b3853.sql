-- Rounds table
CREATE TABLE rounds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  join_code TEXT UNIQUE NOT NULL,
  course_name TEXT NOT NULL,
  course_id TEXT,
  holes INTEGER NOT NULL DEFAULT 18,
  stroke_play BOOLEAN DEFAULT true,
  match_play BOOLEAN DEFAULT false,
  stableford BOOLEAN DEFAULT false,
  modified_stableford BOOLEAN DEFAULT false,
  stakes NUMERIC,
  slope INTEGER,
  rating NUMERIC,
  status TEXT DEFAULT 'active',
  games JSONB DEFAULT '[]',
  teams JSONB,
  hole_info JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Players table
CREATE TABLE players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  round_id UUID REFERENCES rounds(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  handicap INTEGER,
  team_id TEXT,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scores table
CREATE TABLE scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  round_id UUID REFERENCES rounds(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  hole_number INTEGER NOT NULL,
  strokes INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(player_id, hole_number)
);

-- Presses table (for Nassau)
CREATE TABLE presses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  round_id UUID REFERENCES rounds(id) ON DELETE CASCADE,
  initiated_by UUID REFERENCES players(id),
  start_hole INTEGER NOT NULL,
  stakes NUMERIC NOT NULL,
  status TEXT DEFAULT 'active',
  winner_id UUID REFERENCES players(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE presses ENABLE ROW LEVEL SECURITY;

-- Allow public read/write (no auth for MVP)
CREATE POLICY "Public read rounds" ON rounds FOR SELECT USING (true);
CREATE POLICY "Public insert rounds" ON rounds FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update rounds" ON rounds FOR UPDATE USING (true);

CREATE POLICY "Public read players" ON players FOR SELECT USING (true);
CREATE POLICY "Public insert players" ON players FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update players" ON players FOR UPDATE USING (true);

CREATE POLICY "Public read scores" ON scores FOR SELECT USING (true);
CREATE POLICY "Public insert scores" ON scores FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update scores" ON scores FOR UPDATE USING (true);

CREATE POLICY "Public read presses" ON presses FOR SELECT USING (true);
CREATE POLICY "Public insert presses" ON presses FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update presses" ON presses FOR UPDATE USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE rounds;
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE scores;
ALTER PUBLICATION supabase_realtime ADD TABLE presses;

-- Indexes for performance
CREATE INDEX idx_players_round ON players(round_id);
CREATE INDEX idx_scores_round ON scores(round_id);
CREATE INDEX idx_scores_player ON scores(player_id);
CREATE INDEX idx_rounds_join_code ON rounds(join_code);