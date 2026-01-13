-- Prop bets table for custom side bets
CREATE TABLE public.prop_bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES public.rounds(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'ctp', 'longest_drive', 'custom'
  hole_number INTEGER NOT NULL,
  stakes NUMERIC NOT NULL DEFAULT 1,
  description TEXT,
  winner_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.players(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prop_bets ENABLE ROW LEVEL SECURITY;

-- RLS policies for prop_bets
CREATE POLICY "Anyone can read prop bets"
  ON public.prop_bets FOR SELECT
  USING (true);

CREATE POLICY "Round participants can create prop bets"
  ON public.prop_bets FOR INSERT
  WITH CHECK (is_round_participant(round_id, auth.uid()));

CREATE POLICY "Round participants can update prop bets"
  ON public.prop_bets FOR UPDATE
  USING (is_round_participant(round_id, auth.uid()));

CREATE POLICY "Round creator can delete prop bets"
  ON public.prop_bets FOR DELETE
  USING (is_round_creator(round_id, auth.uid()));

-- Settlement tracking table
CREATE TABLE public.bet_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES public.rounds(id) ON DELETE CASCADE,
  from_player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  to_player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'forgiven'
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bet_settlements ENABLE ROW LEVEL SECURITY;

-- RLS policies for bet_settlements
CREATE POLICY "Anyone can read settlements"
  ON public.bet_settlements FOR SELECT
  USING (true);

CREATE POLICY "Round participants can create settlements"
  ON public.bet_settlements FOR INSERT
  WITH CHECK (is_round_participant(round_id, auth.uid()));

CREATE POLICY "Settlement participants can update"
  ON public.bet_settlements FOR UPDATE
  USING (is_round_participant(round_id, auth.uid()));

-- Add payment info to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS venmo_username TEXT,
ADD COLUMN IF NOT EXISTS paypal_email TEXT;

-- Enable realtime for prop_bets and bet_settlements
ALTER PUBLICATION supabase_realtime ADD TABLE public.prop_bets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bet_settlements;