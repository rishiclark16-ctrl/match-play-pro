import * as Sentry from '@sentry/react';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const IS_PRODUCTION = import.meta.env.PROD;

/**
 * Initialize Sentry error tracking
 * Only initializes in production or if DSN is explicitly provided
 */
export function initSentry() {
  if (!SENTRY_DSN) {
    // Sentry DSN not configured - error tracking disabled
    // Set VITE_SENTRY_DSN in .env to enable
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: IS_PRODUCTION ? 'production' : 'development',

    // Performance monitoring
    tracesSampleRate: IS_PRODUCTION ? 0.1 : 1.0, // 10% in prod, 100% in dev

    // Session replay (optional, can be enabled later)
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: IS_PRODUCTION ? 0.1 : 0,

    // Filter out noisy errors
    ignoreErrors: [
      // Network errors that are expected
      'Failed to fetch',
      'NetworkError',
      'Load failed',
      // User-initiated actions
      'AbortError',
      // Browser extensions
      /^chrome-extension:/,
      /^moz-extension:/,
    ],

    // Before sending, clean up sensitive data
    beforeSend(event) {
      // Remove any potential PII from error messages
      if (event.message) {
        event.message = event.message.replace(
          /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
          '[EMAIL]'
        );
      }
      return event;
    },

    // Integration configuration
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
  });
}

/**
 * Set user context for error tracking
 */
export function setSentryUser(user: { id: string; email?: string } | null) {
  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
    });
  } else {
    Sentry.setUser(null);
  }
}

/**
 * Capture an exception with optional context
 */
export function captureException(
  error: Error,
  context?: Record<string, unknown>
) {
  Sentry.captureException(error, {
    extra: context,
  });
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
  Sentry.addBreadcrumb({
    category,
    message,
    data,
    level: 'info',
  });
}

/**
 * Set custom tag for filtering
 */
export function setTag(key: string, value: string) {
  Sentry.setTag(key, value);
}

// Export Sentry for advanced usage
export { Sentry };
