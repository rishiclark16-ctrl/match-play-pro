-- Mixed tees support: per-player tee assignment and round-level tee configuration
ALTER TABLE players ADD COLUMN IF NOT EXISTS tee_set_id TEXT DEFAULT NULL;
ALTER TABLE rounds ADD COLUMN IF NOT EXISTS tee_sets JSONB DEFAULT NULL;
ALTER TABLE rounds ADD COLUMN IF NOT EXISTS mixed_tees BOOLEAN NOT NULL DEFAULT false;
