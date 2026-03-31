-- Adds is_ghost flag to players table for Ghost Player house game primitive.
-- Ghost players receive net-par scores automatically and don't have real accounts.

ALTER TABLE players ADD COLUMN IF NOT EXISTS is_ghost boolean NOT NULL DEFAULT false;

-- Index for quick ghost player lookups within a round
CREATE INDEX IF NOT EXISTS idx_players_is_ghost ON players(round_id, is_ghost) WHERE is_ghost = true;
