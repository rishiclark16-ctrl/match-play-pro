import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from '@/integrations/supabase/client';
import { NotificationPreferences } from '@/hooks/useProfile';

const DENIAL_STORAGE_KEY = 'push_permission_denied_at';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export type NotificationType = keyof NotificationPreferences;

/**
 * Returns true if we should show the contextual push prompt.
 * False if user denied within the last 30 days.
 */
export function shouldPromptForPush(): boolean {
  if (!Capacitor.isNativePlatform()) return false;
  const deniedAt = localStorage.getItem(DENIAL_STORAGE_KEY);
  if (!deniedAt) return true;
  return Date.now() - Number(deniedAt) > THIRTY_DAYS_MS;
}

/**
 * Request OS push permission. Returns true if granted.
 * Records denial timestamp to enforce 30-day cooldown.
 */
export async function requestPushPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const { receive } = await PushNotifications.requestPermissions();
    if (receive === 'granted') {
      localStorage.removeItem(DENIAL_STORAGE_KEY);
      await PushNotifications.register();
      return true;
    } else {
      localStorage.setItem(DENIAL_STORAGE_KEY, String(Date.now()));
      return false;
    }
  } catch {
    return false;
  }
}

/**
 * Check current push permission status without prompting.
 */
export async function checkPushPermission(): Promise<'granted' | 'denied' | 'prompt'> {
  if (!Capacitor.isNativePlatform()) return 'denied';
  try {
    const { receive } = await PushNotifications.checkPermissions();
    return receive as 'granted' | 'denied' | 'prompt';
  } catch {
    return 'denied';
  }
}

/**
 * Send push notifications to a list of profile IDs, filtered by their preferences.
 * Non-critical — never throws.
 */
export async function sendPushToProfiles({
  profileIds,
  title,
  body,
  data,
  type,
}: {
  profileIds: string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
  type: NotificationType;
}): Promise<void> {
  if (profileIds.length === 0) return;

  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('push_token, notification_preferences')
      .in('id', profileIds)
      .not('push_token', 'is', null);

    if (error || !profiles?.length) return;

    const tokens = profiles
      .filter((p) => {
        const prefs = p.notification_preferences as Record<string, boolean> | null;
        // Default to enabled when no preferences recorded yet
        return prefs === null || prefs[type] !== false;
      })
      .map((p) => p.push_token as string)
      .filter(Boolean);

    if (tokens.length === 0) return;

    await supabase.functions.invoke('send-push', {
      body: { tokens, title, body, data: data ?? {} },
    });
  } catch {
    // Push is always non-critical
  }
}
