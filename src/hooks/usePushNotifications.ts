import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

const DEVICE_TOKEN_STORAGE_KEY = 'device_push_token';

/**
 * Registers for push notifications on native and handles:
 *  - APNs token registration → upserted into device_tokens (multi-device)
 *  - Notification tap → deep link navigation
 *
 * Call this once from AppContent (alongside useDeepLinks).
 * Permission prompting is handled separately via pushUtils.ts.
 */
export function usePushNotifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const listenersRef = useRef(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable('PushNotifications') || !user || listenersRef.current) return;
    listenersRef.current = true;

    // Token received → upsert into device_tokens (keyed on unique token column).
    // If the same device previously belonged to another user, this reassigns it.
    const regListener = PushNotifications.addListener('registration', async (token) => {
      try {
        await supabase
          .from('device_tokens')
          .upsert(
            {
              profile_id: user.id,
              token: token.value,
              platform: 'ios',
              last_seen_at: new Date().toISOString(),
            },
            { onConflict: 'token' },
          );
        localStorage.setItem(DEVICE_TOKEN_STORAGE_KEY, token.value);
      } catch {
        // Non-critical
      }
    });

    const errListener = PushNotifications.addListener('registrationError', (err) => {
      console.warn('[PushNotifications] registration error:', err.error);
    });

    // Notification tap while app in background/closed → navigate
    const actionListener = PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (action) => {
        const data = action.notification.data as Record<string, string> | undefined;
        if (!data) return;
        if (data.type === 'watch_party' && data.roundId) {
          navigate(`/watch/${data.roundId}`);
        } else if (data.roundId) {
          navigate(`/round/${data.roundId}`);
        } else if (data.route) {
          navigate(data.route);
        }
      },
    );

    // Auto-register if permission is already granted (e.g., returning user)
    PushNotifications.checkPermissions().then(({ receive }) => {
      if (receive === 'granted') {
        PushNotifications.register().catch(() => {});
      }
    }).catch(() => {});

    return () => {
      regListener.then((l) => l.remove());
      errListener.then((l) => l.remove());
      actionListener.then((l) => l.remove());
      listenersRef.current = false;
    };
  }, [user, navigate]);
}
