-- Allow decimal handicaps in players table
-- Users can enter exact handicaps (e.g., 5.3) which get rounded when calculating strokes

ALTER TABLE public.players
  ALTER COLUMN handicap TYPE numeric USING handicap::numeric;

-- Add comment explaining the column
COMMENT ON COLUMN public.players.handicap IS 'Player handicap index (can be decimal, e.g., 5.3). Rounded to nearest whole number when calculating strokes received.';
