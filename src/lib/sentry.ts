import * as Sentry from '@sentry/react';
import { Capacitor } from '@capacitor/core';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const IS_PRODUCTION = import.meta.env.PROD;
const SENTRY_RELEASE = import.meta.env.VITE_SENTRY_RELEASE;

/**
 * Initialize Sentry error tracking.
 * Only initializes in production or if DSN is explicitly provided.
 */
export function initSentry() {
  if (!SENTRY_DSN) return;

  const platform = Capacitor.isNativePlatform()
    ? Capacitor.getPlatform() // 'ios' | 'android'
    : 'web';

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: IS_PRODUCTION ? 'production' : 'development',
    release: SENTRY_RELEASE,

    // Performance monitoring
    tracesSampleRate: IS_PRODUCTION ? 0.2 : 1.0,

    // Session replay — capture errored sessions at higher rate
    replaysSessionSampleRate: IS_PRODUCTION ? 0.01 : 0,
    replaysOnErrorSampleRate: IS_PRODUCTION ? 0.5 : 0,

    // Filter out noisy errors
    ignoreErrors: [
      'Failed to fetch',
      'NetworkError',
      'Load failed',
      'AbortError',
      /^chrome-extension:/,
      /^moz-extension:/,
      // Capacitor bridge noise
      'clobberProtocol',
      'CapacitorCookies',
    ],

    // PII scrubbing + noise filtering
    beforeSend(event) {
      // Drop non-fatal edge function auth errors (stale session on app resume)
      const exValue = event.exception?.values?.[0]?.value ?? '';
      if (exValue.includes('Edge Function returned a non-2xx status code')) {
        return null;
      }

      if (event.message) {
        event.message = event.message.replace(
          /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
          '[EMAIL]'
        );
      }
      return event;
    },

    // Integrations
    integrations: [
      Sentry.browserTracingIntegration({
        enableInp: true, // Interaction to Next Paint
      }),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
      Sentry.feedbackIntegration({
        colorScheme: 'system',
        showBranding: false,
        triggerLabel: 'Report a Bug',
        formTitle: 'Report a Bug',
        submitButtonLabel: 'Send Report',
        messagePlaceholder: 'What went wrong? What did you expect to happen?',
        successMessageText: 'Thanks! We\'ll look into it.',
        isNameRequired: false,
        isEmailRequired: false,
      }),
    ],

    // Global tags for filtering
    initialScope: {
      tags: {
        platform,
        app_version: SENTRY_RELEASE || 'unknown',
      },
    },
  });
}

/**
 * Set user context for error tracking
 */
export function setSentryUser(user: { id: string; email?: string } | null) {
  if (user) {
    Sentry.setUser({ id: user.id, email: user.email });
  } else {
    Sentry.setUser(null);
  }
}

/**
 * Set subscription tier tag for filtering errors by plan
 */
export function setSentrySubscription(isPro: boolean) {
  Sentry.setTag('subscription', isPro ? 'pro' : 'free');
}

/**
 * Set the current route for context
 */
export function setSentryRoute(route: string) {
  Sentry.setTag('route', route);
}

/**
 * Capture an exception with optional context
 */
export function captureException(
  error: Error,
  context?: Record<string, unknown>
) {
  Sentry.captureException(error, { extra: context });
}

/**
 * Capture a message with optional level
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info'
) {
  Sentry.captureMessage(message, level);
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  category: string,
  message: string,
  data?: Record<string, unknown>
) {
  Sentry.addBreadcrumb({ category, message, data, level: 'info' });
}

/**
 * Set custom tag for filtering
 */
export function setTag(key: string, value: string) {
  Sentry.setTag(key, value);
}

/**
 * Wrap an async operation with a performance span
 */
export async function withSpan<T>(
  name: string,
  op: string,
  fn: () => Promise<T>
): Promise<T> {
  return Sentry.startSpan({ name, op }, async () => {
    return fn();
  });
}

/**
 * Show the Sentry user feedback dialog
 */
export function showFeedbackDialog() {
  const feedback = Sentry.getFeedback();
  if (feedback) {
    feedback.createForm().then(form => form.appendToDom());
  }
}

// Export Sentry for advanced usage (ErrorBoundary, etc.)
export { Sentry };
