import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { setSentryRoute, setSentrySubscription } from '@/lib/sentry';
import { useSubscription } from '@/hooks/useSubscription';

/**
 * Syncs current route and subscription tier to Sentry tags.
 * Mount once inside the router (e.g. in AppContent).
 */
export function useSentryContext() {
  const location = useLocation();
  const { isPro } = useSubscription();

  // Track route changes
  useEffect(() => {
    // Normalize dynamic segments: /round/abc123 → /round/:id
    const normalized = location.pathname
      .replace(/\/round\/[^/]+/, '/round/:id')
      .replace(/\/groups\/[^/]+/, '/groups/:groupId')
      .replace(/\/profile\/[^/]+/, '/profile/:id')
      .replace(/\/watch\/[^/]+/, '/watch/:id')
      .replace(/\/my-formats\/[^/]+/, '/my-formats/:id');
    setSentryRoute(normalized);
  }, [location.pathname]);

  // Track subscription tier
  useEffect(() => {
    setSentrySubscription(isPro);
  }, [isPro]);
}
