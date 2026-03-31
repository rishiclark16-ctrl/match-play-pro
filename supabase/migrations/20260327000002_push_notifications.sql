-- Push notification support: device tokens and user preferences
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_token TEXT DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_permission_denied_at TIMESTAMPTZ DEFAULT NULL;
