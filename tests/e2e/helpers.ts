import { Page, Route } from '@playwright/test';

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
 */
export async function setupBuilderMocks(page: Page, opts: { parseMode?: 'success' | 'error' | 'empty'; isPro?: boolean } = {}) {
  await blockExternalRequests(page);
  await mockRealtimeQuiet(page);
  await mockAuth(page);
  await mockAuthApi(page);
  await mockProfileApi(page);
  await mockFormatsEmpty(page);

  if (opts.parseMode === 'error') {
    await mockParseError(page);
  } else if (opts.parseMode === 'empty') {
    await mockParseEmpty(page);
  } else {
    await mockParseSuccess(page);
  }
}
