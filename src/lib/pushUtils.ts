import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from '@/integrations/supabase/client';
import { NotificationPreferences } from '@/hooks/useProfile';

const DENIAL_STORAGE_KEY = 'push_permission_denied_at';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export type NotificationType = keyof NotificationPreferences;

function isPushAvailable(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('PushNotifications');
}

export function shouldPromptForPush(): boolean {
  if (!isPushAvailable()) return false;
  const deniedAt = localStorage.getItem(DENIAL_STORAGE_KEY);
  if (!deniedAt) return true;
  return Date.now() - Number(deniedAt) > THIRTY_DAYS_MS;
}

export async function requestPushPermission(): Promise<boolean> {
  if (!isPushAvailable()) return false;
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

export async function checkPushPermission(): Promise<'granted' | 'denied' | 'prompt'> {
  if (!isPushAvailable()) return 'denied';
  try {
    const { receive } = await PushNotifications.checkPermissions();
    return receive as 'granted' | 'denied' | 'prompt';
  } catch {
    return 'denied';
  }
}

/**
 * Send push notifications to a list of profile IDs. Token + preference lookup
 * happens in the send-push edge function (service-role) — we only forward intent.
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
    await supabase.functions.invoke('send-push', {
      body: { profileIds, title, body, data: data ?? {}, type },
    });
  } catch {
    // Push is always non-critical
  }
}
