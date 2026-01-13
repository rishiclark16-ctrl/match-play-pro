-- Add email and phone fields to profiles for friend discovery
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS phone text;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles (phone) WHERE phone IS NOT NULL;

-- Update RLS policy to allow searching profiles by email/phone for authenticated users
-- Drop existing policy first
DROP POLICY IF EXISTS "Users can search profiles by email or phone" ON public.profiles;

-- Create policy allowing authenticated users to find profiles by email/phone/friend_code
CREATE POLICY "Users can search profiles by email or phone" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND (email IS NOT NULL OR phone IS NOT NULL OR friend_code IS NOT NULL)
);