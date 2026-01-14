-- Add handicap mode to rounds table
ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS handicap_mode text DEFAULT 'auto';

-- Add manual strokes to players table
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS manual_strokes integer DEFAULT 0;