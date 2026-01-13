-- Add friend_code column to profiles with unique constraint
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS friend_code text UNIQUE;

-- Generate friend codes for existing users (6-character alphanumeric)
UPDATE public.profiles SET friend_code = UPPER(SUBSTRING(MD5(id::text) FROM 1 FOR 6))
WHERE friend_code IS NULL;

-- Make friend_code NOT NULL with default for new users
ALTER TABLE public.profiles ALTER COLUMN friend_code SET DEFAULT UPPER(SUBSTRING(MD5(gen_random_uuid()::text) FROM 1 FOR 6));

-- Add profile_id to players table to link players to user profiles
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Create friendships table
CREATE TABLE public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  friend_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at timestamptz DEFAULT now(),
  accepted_at timestamptz,
  UNIQUE(user_id, friend_id)
);

-- Enable RLS on friendships
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- Users can view friendships they're part of
CREATE POLICY "Users can view own friendships"
ON public.friendships FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Users can create friend requests (they must be the sender)
CREATE POLICY "Users can create friend requests"
ON public.friendships FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update friendships they're part of (for accepting/blocking)
CREATE POLICY "Users can update own friendships"
ON public.friendships FOR UPDATE
USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Users can delete friendships they're part of
CREATE POLICY "Users can delete own friendships"
ON public.friendships FOR DELETE
USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Create round_shares table for automatic score sharing
CREATE TABLE public.round_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid NOT NULL REFERENCES public.rounds(id) ON DELETE CASCADE,
  shared_with_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  shared_by_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  seen_at timestamptz,
  UNIQUE(round_id, shared_with_id)
);

-- Enable RLS on round_shares
ALTER TABLE public.round_shares ENABLE ROW LEVEL SECURITY;

-- Users can view rounds shared with them or by them
CREATE POLICY "Users can view shared rounds"
ON public.round_shares FOR SELECT
USING (auth.uid() = shared_with_id OR auth.uid() = shared_by_id);

-- Users can share their rounds
CREATE POLICY "Users can share rounds"
ON public.round_shares FOR INSERT
WITH CHECK (auth.uid() = shared_by_id);

-- Users can mark shares as seen
CREATE POLICY "Users can update shared rounds"
ON public.round_shares FOR UPDATE
USING (auth.uid() = shared_with_id);

-- Create security definer function to check if users are friends
CREATE OR REPLACE FUNCTION public.are_friends(user1_id uuid, user2_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friendships
    WHERE status = 'accepted'
    AND ((user_id = user1_id AND friend_id = user2_id)
      OR (friend_id = user1_id AND user_id = user2_id))
  )
$$;

-- Update profiles RLS to allow viewing friends' basic info
CREATE POLICY "Users can view friends profiles"
ON public.profiles FOR SELECT
USING (
  auth.uid() = id
  OR public.are_friends(auth.uid(), id)
);

-- Drop the old restrictive policy if it exists (we're replacing it)
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;

-- Enable realtime for friendships and round_shares
ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships;
ALTER PUBLICATION supabase_realtime ADD TABLE public.round_shares;