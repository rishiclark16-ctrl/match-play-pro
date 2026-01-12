-- Add DELETE policies for rounds, players, scores, and presses tables
-- to allow users to delete rounds

CREATE POLICY "Public delete rounds"
ON public.rounds
FOR DELETE
USING (true);

CREATE POLICY "Public delete players"
ON public.players
FOR DELETE
USING (true);

CREATE POLICY "Public delete scores"
ON public.scores
FOR DELETE
USING (true);

CREATE POLICY "Public delete presses"
ON public.presses
FOR DELETE
USING (true);