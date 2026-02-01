-- Subscriptions table for tracking user subscription status
-- Note: user_id references auth.users since profiles may not exist for all users
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'free' CHECK (status IN ('free', 'active', 'expired', 'cancelled', 'grace_period')),
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro')),
  product_id TEXT,  -- Apple product ID: 'pro_monthly' or 'pro_annual'
  original_transaction_id TEXT UNIQUE,  -- Apple's original transaction ID for subscription
  latest_transaction_id TEXT,
  expires_at TIMESTAMPTZ,
  grace_period_expires_at TIMESTAMPTZ,
  cancellation_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT subscriptions_user_id_key UNIQUE(user_id)
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_expires_at ON public.subscriptions(expires_at);

-- Transaction audit log
CREATE TABLE IF NOT EXISTS public.subscription_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  transaction_id TEXT NOT NULL,
  original_transaction_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  purchase_date TIMESTAMPTZ NOT NULL,
  expires_date TIMESTAMPTZ,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN (
    'initial_purchase', 'renewal', 'cancellation', 'refund',
    'upgrade', 'downgrade', 'revoke', 'grace_period_start', 'grace_period_end'
  )),
  raw_receipt JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_transactions_sub_id ON public.subscription_transactions(subscription_id);

-- Add subscription columns to profiles for quick access (if profiles table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free';
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS grandfathered_at TIMESTAMPTZ;

    -- Add check constraint separately to avoid issues if column already exists
    BEGIN
      ALTER TABLE public.profiles ADD CONSTRAINT profiles_subscription_tier_check
        CHECK (subscription_tier IN ('free', 'pro'));
    EXCEPTION WHEN duplicate_object THEN
      NULL; -- Constraint already exists
    END;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscriptions
-- Users can only read their own subscription
CREATE POLICY "Users can view own subscription"
  ON public.subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can manage all subscriptions (for webhook)
CREATE POLICY "Service role manages subscriptions"
  ON public.subscriptions
  FOR ALL
  USING (auth.role() = 'service_role');

-- RLS Policies for subscription_transactions
-- Users can view their own transactions
CREATE POLICY "Users can view own transactions"
  ON public.subscription_transactions
  FOR SELECT
  USING (
    subscription_id IN (
      SELECT id FROM public.subscriptions WHERE user_id = auth.uid()
    )
  );

-- Service role can manage all transactions
CREATE POLICY "Service role manages transactions"
  ON public.subscription_transactions
  FOR ALL
  USING (auth.role() = 'service_role');

-- Helper function to check if user has Pro access
CREATE OR REPLACE FUNCTION public.is_pro_user(check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check for active subscription
  IF EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = check_user_id
    AND tier = 'pro'
    AND status IN ('active', 'grace_period')
    AND (expires_at IS NULL OR expires_at > NOW())
  ) THEN
    RETURN TRUE;
  END IF;

  -- Check for grandfathered users (only if profiles table exists with the column)
  IF EXISTS (SELECT FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'grandfathered_at') THEN
    IF EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = check_user_id
      AND grandfathered_at IS NOT NULL
    ) THEN
      RETURN TRUE;
    END IF;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get user's friend count
CREATE OR REPLACE FUNCTION public.get_friend_count(check_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  -- Check if friendships table exists
  IF NOT EXISTS (SELECT FROM information_schema.tables
                 WHERE table_schema = 'public' AND table_name = 'friendships') THEN
    RETURN 0;
  END IF;

  RETURN (
    SELECT COUNT(*)::INTEGER FROM public.friendships
    WHERE (user_id = check_user_id OR friend_id = check_user_id)
    AND status = 'accepted'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get user's owned group count
CREATE OR REPLACE FUNCTION public.get_group_count(check_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  -- Check if golf_groups table exists
  IF NOT EXISTS (SELECT FROM information_schema.tables
                 WHERE table_schema = 'public' AND table_name = 'golf_groups') THEN
    RETURN 0;
  END IF;

  RETURN (SELECT COUNT(*)::INTEGER FROM public.golf_groups WHERE owner_id = check_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update updated_at trigger for subscriptions
CREATE OR REPLACE FUNCTION public.update_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_subscription_updated_at();
