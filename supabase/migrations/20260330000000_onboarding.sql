-- Add onboarding flag to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS has_onboarded boolean NOT NULL DEFAULT false;

-- All existing users are already onboarded — only new sign-ups get false
UPDATE profiles SET has_onboarded = true;
