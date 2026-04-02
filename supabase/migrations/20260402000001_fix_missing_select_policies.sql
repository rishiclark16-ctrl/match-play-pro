-- ============================================================
-- Fix missing SELECT policies for prop_bets and bet_settlements
-- Both tables had INSERT/UPDATE/DELETE but no SELECT policy,
-- meaning users could create data but never read it back.
-- ============================================================

-- Fix #1: Add missing SELECT policy for prop_bets
CREATE POLICY "Users can view prop bets in accessible rounds"
  ON public.prop_bets
  FOR SELECT
  TO public
  USING (has_round_access(round_id, auth.uid()));

-- Fix #2: Add missing SELECT policy for bet_settlements
CREATE POLICY "Users can view settlements in accessible rounds"
  ON public.bet_settlements
  FOR SELECT
  TO public
  USING (has_round_access(round_id, auth.uid()));

-- Fix #3: Drop duplicate indexes (identical to existing ones)
-- idx_players_profile_id duplicates idx_players_profile
-- idx_subscriptions_user_id duplicates idx_subscriptions_user
-- idx_subscription_transactions_sub_id duplicates idx_subscription_transactions_sub
DROP INDEX IF EXISTS public.idx_players_profile_id;
DROP INDEX IF EXISTS public.idx_subscriptions_user_id;
DROP INDEX IF EXISTS public.idx_subscription_transactions_sub_id;
