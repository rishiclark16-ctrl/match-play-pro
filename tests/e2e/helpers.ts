import { Page, Route, expect } from '@playwright/test';

/**
 * Mock Supabase auth so the app thinks we're logged in.
 * Injects a fake session into localStorage before navigating.
 */
export async function mockAuth(page: Page) {
  const fakeSession = {
    access_token: 'fake-access-token-e2e',
    refresh_token: 'fake-refresh-token-e2e',
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    expires_in: 3600,
    token_type: 'bearer',
    user: {
      id: 'e2e-user-id-00000000',
      email: 'e2e@matchgolf.test',
      app_metadata: { provider: 'email' },
      user_metadata: { full_name: 'E2E Tester' },
      aud: 'authenticated',
      role: 'authenticated',
      created_at: '2026-01-01T00:00:00.000Z',
    },
  };

  // Supabase stores auth in localStorage under sb-<projectId>-auth-token
  await page.addInitScript((session) => {
    const key = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
    const storageKey = key || 'sb-puqgbsxabcyxrbwwoznn-auth-token';
    localStorage.setItem(storageKey, JSON.stringify(session));
    // Dismiss AI Builder tutorial so it doesn't block tests
    localStorage.setItem('ai_builder_tutorial_seen_v1', '1');
  }, fakeSession);
}

/**
 * Mock Supabase auth API endpoints so session validation succeeds.
 */
export async function mockAuthApi(page: Page) {
  const fakeUser = {
    id: 'e2e-user-id-00000000',
    email: 'e2e@matchgolf.test',
    app_metadata: { provider: 'email' },
    user_metadata: { full_name: 'E2E Tester' },
    aud: 'authenticated',
    role: 'authenticated',
    created_at: '2026-01-01T00:00:00.000Z',
  };

  // Mock the auth session refresh/verify endpoint
  await page.route('**/auth/v1/token*', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'fake-access-token-e2e',
        refresh_token: 'fake-refresh-token-e2e',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        expires_in: 3600,
        token_type: 'bearer',
        user: fakeUser,
      }),
    });
  });

  // Mock the auth user endpoint
  await page.route('**/auth/v1/user*', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(fakeUser),
    });
  });
}

/**
 * Mock the Supabase profiles query so useProfile doesn't block.
 */
export async function mockProfileApi(page: Page) {
  await page.route('**/rest/v1/profiles*', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{
        id: 'e2e-user-id-00000000',
        full_name: 'E2E Tester',
        handicap_index: 12.5,
        has_onboarded: true,
        avatar_url: null,
        preferred_tees: 'white',
      }]),
    });
  });
}

/**
 * Mock personal_game_formats to return empty list (free tier, no existing formats).
 */
export async function mockFormatsEmpty(page: Page) {
  await page.route('**/rest/v1/personal_game_formats*', async (route: Route) => {
    const method = route.request().method();
    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    } else {
      // POST/PATCH — return a created format
      // .single() sends Accept: vnd.pgrst.object header, expects object not array
      const accept = route.request().headers()['accept'] ?? '';
      const wantsSingle = accept.includes('vnd.pgrst.object');
      const obj = {
        id: 'e2e-format-001',
        owner_id: 'e2e-user-id-00000000',
        name: 'Test Format',
        description: 'Test description',
        active_primitives: [],
        is_public: false,
        version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(wantsSingle ? obj : [obj]),
      });
    }
  });
}

/**
 * Mock the parse-house-game edge function to return a realistic parsed result.
 */
export async function mockParseSuccess(page: Page) {
  await page.route('**/functions/v1/parse-house-game', async (route: Route) => {
    // Simulate a 1.5s AI processing delay
    await new Promise(r => setTimeout(r, 1500));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        primitives: [
          { id: 'format_nassau', value: null, confidence: 'high' },
          { id: 'settlement_unit_value', value: 5, confidence: 'high' },
          { id: 'press_auto_x_down', value: 2, confidence: 'high' },
          { id: 'bonus_birdie_unit', value: null, confidence: 'medium' },
          { id: 'carryover_skins', value: null, confidence: 'low' },
          {
            id: 'custom_last_hole_double',
            custom: true,
            label: 'Last Hole Double',
            description: 'The 18th hole is worth double the normal unit value',
            value: null,
            confidence: 'medium',
          },
        ],
      }),
    });
  });
}

/**
 * Mock parse to return an error (simulates network failure).
 */
export async function mockParseError(page: Page) {
  await page.route('**/functions/v1/parse-house-game', async (route: Route) => {
    await route.fulfill({ status: 500, body: 'Internal Server Error' });
  });
}

/**
 * Mock parse to return zero primitives (AI couldn't identify anything).
 */
export async function mockParseEmpty(page: Page) {
  await page.route('**/functions/v1/parse-house-game', async (route: Route) => {
    await new Promise(r => setTimeout(r, 800));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ primitives: [] }),
    });
  });
}

/**
 * Mock subscription check — returns free tier by default.
 */
export async function mockSubscription(page: Page, isPro = false) {
  // RevenueCat / subscription checks go through the Capacitor plugin
  // In web context, useSubscription likely checks profiles or a flag
  // We mock the profiles response to include subscription info
  await page.route('**/rest/v1/rpc/check_subscription*', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ is_pro: isPro }),
    });
  });
}

/**
 * Common mock for Supabase realtime/websocket to prevent connection errors.
 */
export async function mockRealtimeQuiet(page: Page) {
  await page.route('**/realtime/**', async (route: Route) => {
    await route.abort('connectionrefused');
  });
}

/**
 * Block all external requests (fonts, analytics, etc.) to speed up tests.
 */
export async function blockExternalRequests(page: Page) {
  await page.route(/(fonts\.googleapis|fonts\.gstatic|sentry\.io|analytics)/, async (route: Route) => {
    await route.abort();
  });
}

/**
 * Dismiss the AIBuilderTutorial overlay if it appears.
 * The tutorial is a multi-step bottom sheet with "Next" and "Skip tutorial" buttons.
 */
export async function dismissTutorial(page: Page) {
  try {
    const skipBtn = page.getByText(/Skip tutorial/i);
    await skipBtn.waitFor({ state: 'visible', timeout: 3000 });
    await skipBtn.click();
    // Wait for animation to complete
    await page.waitForTimeout(500);
  } catch {
    // Tutorial didn't appear — that's fine
  }
}

/**
 * Set up all common mocks for the AI Game Builder tests.
 * Uses real auth (test user) + mocked parse/format APIs for deterministic behavior.
 */
export async function setupBuilderMocks(page: Page, opts: { parseMode?: 'success' | 'error' | 'empty'; isPro?: boolean } = {}) {
  // Use real auth — navigate to origin and log in with the test user
  await setupAuthenticatedTest(page);

  // Mock realtime to prevent WebSocket noise
  await mockRealtimeQuiet(page);

  // Mock formats API (free tier, no existing formats)
  await mockFormatsEmpty(page);

  // Set up parse mock based on mode
  if (opts.parseMode === 'error') {
    await mockParseError(page);
  } else if (opts.parseMode === 'empty') {
    await mockParseEmpty(page);
  } else {
    await mockParseSuccess(page);
  }
}

// ─── Test User Credentials ─────────────────────────────────────────────────────

export const TEST_USER = {
  id: 'd2067fae-137e-4050-960e-8a67d7f8e9a2',
  email: 'e2e-test@matchgolf.dev',
  password: 'TestMatch2026!',
  name: 'E2E Test Player',
  handicap: 12.5,
  friendCode: 'E2ETST',
};

/**
 * Log in with the real test user via the Supabase JS client.
 * Injects the session into localStorage so the app picks it up on next navigation.
 */
export async function loginWithTestUser(page: Page) {
  const supabaseUrl = 'https://puqgbsxabcyxrbwwoznn.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1cWdic3hhYmN5eHJid3dvem5uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyNDA4NzAsImV4cCI6MjA4MzgxNjg3MH0.gr7BZFetWhyMTSHITVzg3wjhWWH8K5dzIVT74zJcUPw';

  // Call Supabase auth from the page context so the session lands in the right localStorage
  const result = await page.evaluate(async ({ url, key, email, password }) => {
    const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': key,
      },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) return { error: await res.text() };
    const session = await res.json();
    // Store in the Supabase localStorage key
    const storageKey = `sb-puqgbsxabcyxrbwwoznn-auth-token`;
    localStorage.setItem(storageKey, JSON.stringify(session));
    return { success: true, userId: session.user?.id };
  }, { url: supabaseUrl, key: supabaseKey, email: TEST_USER.email, password: TEST_USER.password });

  if ('error' in result) {
    throw new Error(`Login failed: ${result.error}`);
  }
  return result;
}

/**
 * Full setup for authenticated E2E tests:
 * 1. Navigate to a blank page on the app origin (so localStorage works)
 * 2. Log in with the real test user
 * 3. Block noisy external requests
 */
export async function setupAuthenticatedTest(page: Page) {
  // Navigate to origin first so we can set localStorage
  await page.goto('/auth', { waitUntil: 'domcontentloaded' });
  await loginWithTestUser(page);
  // Set tutorial flags to avoid overlays blocking tests
  await page.evaluate(() => {
    localStorage.setItem('ai_builder_tutorial_seen_v1', '1');
    localStorage.setItem('app_tutorial_seen', '1');
    localStorage.setItem('scorecard_tutorial_seen', '1');
  });
  await blockExternalRequests(page);
}

/**
 * Wait for the app to be fully loaded (not showing loading spinner).
 */
export async function waitForAppReady(page: Page) {
  // Wait for the main app content to be visible (no skeleton/spinner)
  await page.waitForFunction(() => {
    const loader = document.querySelector('[data-testid="page-skeleton"]');
    return !loader;
  }, { timeout: 15_000 }).catch(() => {
    // Skeleton might not exist — that's fine
  });
  // Small buffer for React hydration
  await page.waitForTimeout(500);
}
