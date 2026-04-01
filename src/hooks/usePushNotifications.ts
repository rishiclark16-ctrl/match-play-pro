import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

/**
 * Registers for push notifications on native and handles:
 *  - APNs token registration → stored in profiles.push_token
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

    // Token received → persist to profiles
    const regListener = PushNotifications.addListener('registration', async (token) => {
      try {
        await supabase
          .from('profiles')
          .update({ push_token: token.value })
          .eq('id', user.id);
      } catch {
        // Non-critical
      }
    });

    // Registration error — log only
    const errListener = PushNotifications.addListener('registrationError', (err) => {
      console.warn('[PushNotifications] registration error:', err.error);
    });

    // Notification tap while app in background/closed → navigate
    const actionListener = PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (action) => {
        const data = action.notification.data as Record<string, string> | undefined;
        if (!data) return;
        if (data.roundId) {
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
