import posthog from 'posthog-js';
import { Capacitor } from '@capacitor/core';

const POSTHOG_KEY = 'phc_wGZn3jEzjNtV3iQVoKfcFXWvVTbDTpbdPr4RANf7xnha';
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';

/**
 * Initialize PostHog analytics.
 * Only initializes if the API key is provided.
 */
export function initPostHog() {
  if (!POSTHOG_KEY) return;

  const platform = Capacitor.isNativePlatform()
    ? Capacitor.getPlatform()
    : 'web';

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    // Capture pageviews automatically on route changes
    capture_pageview: true,
    // Capture pageleave events for session duration
    capture_pageleave: true,
    // Respect Do Not Track browser setting
    respect_dnt: true,
    // Disable session recording on native (webview limitations)
    disable_session_recording: Capacitor.isNativePlatform(),
    // Persist across sessions
    persistence: 'localStorage',
    // Bootstrap with platform info
    bootstrap: {
      distinctID: undefined, // Will be set on identify()
    },
    loaded: (ph) => {
      ph.register({ platform, app_type: Capacitor.isNativePlatform() ? 'native' : 'web' });
    },
  });
}

/**
 * Identify a user after authentication.
 * Links anonymous events to this user.
 */
export function identifyUser(userId: string, properties?: Record<string, unknown>) {
  if (!POSTHOG_KEY) return;
  posthog.identify(userId, properties);
}

/**
 * Reset identity on sign out.
 */
export function resetUser() {
  if (!POSTHOG_KEY) return;
  posthog.reset();
}

/**
 * Capture a custom event.
 */
export function capture(event: string, properties?: Record<string, unknown>) {
  if (!POSTHOG_KEY) return;
  posthog.capture(event, properties);
}

/**
 * Check if a feature flag is enabled.
 */
export function isFeatureEnabled(flag: string): boolean {
  if (!POSTHOG_KEY) return false;
  return posthog.isFeatureEnabled(flag) ?? false;
}

/**
 * Get a feature flag value (for multivariate flags).
 */
export function getFeatureFlag(flag: string): string | boolean | undefined {
  if (!POSTHOG_KEY) return undefined;
  return posthog.getFeatureFlag(flag);
}

/**
 * Register super properties (attached to all future events).
 */
export function registerSuperProperties(properties: Record<string, unknown>) {
  if (!POSTHOG_KEY) return;
  posthog.register(properties);
}

// Re-export for advanced usage
export { posthog };
