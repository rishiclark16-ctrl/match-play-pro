/**
 * Join Round — Spectator Flow (Two-Account E2E Test)
 *
 * Creates a round via Supabase API as User A.
 * User B enters the join code in the UI → joins as spectator.
 * Verifies: RPC lookup bypasses RLS, spectator insert works, navigation succeeds.
 */
import { test, expect, Page } from '@playwright/test';

const SUPABASE_URL = 'https://puqgbsxabcyxrbwwoznn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1cWdic3hhYmN5eHJid3dvem5uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyNDA4NzAsImV4cCI6MjA4MzgxNjg3MH0.gr7BZFetWhyMTSHITVzg3wjhWWH8K5dzIVT74zJcUPw';
const STORAGE_KEY = 'sb-puqgbsxabcyxrbwwoznn-auth-token';

const USER_A = { email: 'e2e-test@matchgolf.dev', password: 'TestMatch2026!' };
const USER_B = { email: 'e2e-test2@matchgolf.dev', password: 'TestMatch2026!' };

/** Sign in and inject session into page localStorage */
async function loginAs(page: Page, user: { email: string; password: string }) {
  return page.evaluate(
    async ({ url, key, email, password, sk }) => {
      const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: key },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new Error(`Login failed: ${await res.text()}`);
      const session = await res.json();
      localStorage.setItem(sk, JSON.stringify(session));
      localStorage.setItem('ai_builder_tutorial_seen_v1', '1');
      localStorage.setItem('app_tutorial_seen', '1');
      localStorage.setItem('scorecard_tutorial_seen', '1');
      return { userId: session.user.id as string, token: session.access_token as string };
    },
    { url: SUPABASE_URL, key: SUPABASE_KEY, email: user.email, password: user.password, sk: STORAGE_KEY },
  );
}

function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

async function waitForAppReady(page: Page) {
  await page.waitForFunction(
    () => !document.querySelector('[data-testid="page-skeleton"]'),
    { timeout: 15_000 },
  ).catch(() => {});
  await page.waitForTimeout(500);
}

test.describe('Join Round — Spectator Flow', () => {
  let roundId: string;
  let joinCode: string;
  let userAToken: string;

  test.beforeAll(async ({ browser }) => {
    // Create a round as User A directly via Supabase REST API
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto('about:blank');

    // Sign in as User A to get a token
    const loginResult = await page.evaluate(
      async ({ url, key, email, password }) => {
        const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: key },
          body: JSON.stringify({ email, password }),
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        return { userId: data.user.id as string, token: data.access_token as string };
      },
      { url: SUPABASE_URL, key: SUPABASE_KEY, email: USER_A.email, password: USER_A.password },
    );

    userAToken = loginResult.token;
    joinCode = generateJoinCode();
    roundId = crypto.randomUUID();

    // Insert round
    const insertResult = await page.evaluate(
      async ({ url, key, token, roundId, joinCode, userId }) => {
        const res = await fetch(`${url}/rest/v1/rounds`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: key,
            Authorization: `Bearer ${token}`,
            Prefer: 'return=representation',
          },
          body: JSON.stringify({
            id: roundId,
            created_by: userId,
            course_name: 'E2E Spectator Test Course',
            join_code: joinCode,
            status: 'active',
            holes: 18,
            games: [],
          }),
        });
        if (!res.ok) return { error: await res.text() };
        const rows = await res.json();
        return { success: true, round: rows[0] };
      },
      { url: SUPABASE_URL, key: SUPABASE_KEY, token: userAToken, roundId, joinCode, userId: loginResult.userId },
    );

    if ('error' in insertResult) throw new Error(`Round creation failed: ${insertResult.error}`);

    // Add User A as a player
    await page.evaluate(
      async ({ url, key, token, roundId, userId }) => {
        const res = await fetch(`${url}/rest/v1/players`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: key,
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            round_id: roundId,
            profile_id: userId,
            name: 'E2E Test Player',
            handicap: 12.5,
            order_index: 0,
          }),
        });
        if (!res.ok) throw new Error(await res.text());
      },
      { url: SUPABASE_URL, key: SUPABASE_KEY, token: userAToken, roundId, userId: loginResult.userId },
    );

    await ctx.close();
  });

  test.afterAll(async ({ browser }) => {
    // Cleanup: delete round and related data
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto('about:blank');

    await page.evaluate(
      async ({ url, key, token, roundId }) => {
        const headers = { apikey: key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
        // Delete spectators, players, then round
        await fetch(`${url}/rest/v1/round_spectators?round_id=eq.${roundId}`, { method: 'DELETE', headers });
        await fetch(`${url}/rest/v1/scores?round_id=eq.${roundId}`, { method: 'DELETE', headers });
        await fetch(`${url}/rest/v1/players?round_id=eq.${roundId}`, { method: 'DELETE', headers });
        await fetch(`${url}/rest/v1/rounds?id=eq.${roundId}`, { method: 'DELETE', headers });
      },
      { url: SUPABASE_URL, key: SUPABASE_KEY, token: userAToken, roundId },
    );

    await ctx.close();
  });

  test('User B can join the round as spectator via join code', async ({ page }) => {
    // Navigate and log in as User B
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await loginAs(page, USER_B);

    // Go to join page
    await page.goto('/join', { waitUntil: 'networkidle' });
    await waitForAppReady(page);

    // Should see the join page
    await expect(page.getByText('Watch a Round')).toBeVisible();

    // Enter the join code
    await page.getByPlaceholder('XXXXXX').fill(joinCode);

    // Click "Watch Live"
    const watchBtn = page.getByRole('button', { name: /watch live/i });
    await expect(watchBtn).toBeEnabled();
    await watchBtn.click();

    // Should navigate to the round scorecard as spectator
    await page.waitForURL(/\/round\/.*spectator=true/, { timeout: 15_000 });
    expect(page.url()).toContain(roundId);
    expect(page.url()).toContain('spectator=true');

    await waitForAppReady(page);
  });

  test('Spectator row was created in the database', async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    const { userId, token } = await loginAs(page, USER_B);

    const result = await page.evaluate(
      async ({ url, key, token, roundId, userId }) => {
        const res = await fetch(
          `${url}/rest/v1/round_spectators?round_id=eq.${roundId}&profile_id=eq.${userId}`,
          { headers: { apikey: key, Authorization: `Bearer ${token}` } },
        );
        if (!res.ok) return { error: await res.text() };
        return { rows: await res.json() };
      },
      { url: SUPABASE_URL, key: SUPABASE_KEY, token, roundId, userId },
    );

    expect('rows' in result).toBe(true);
    if ('rows' in result) {
      expect(result.rows.length).toBe(1);
    }
  });

  test('User B can now access the round scorecard directly', async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await loginAs(page, USER_B);

    // Navigate directly to the round — should work now that spectator row exists
    await page.goto(`/round/${roundId}`, { waitUntil: 'networkidle' });
    await waitForAppReady(page);

    // Should see scorecard content, not an error
    expect(page.url()).toContain(`/round/${roundId}`);
    // Verify some content loaded (course name or player info)
    const pageContent = await page.textContent('body');
    expect(pageContent).toContain('E2E');
  });

  test('Invalid join code shows error', async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await loginAs(page, USER_B);

    await page.goto('/join', { waitUntil: 'networkidle' });
    await waitForAppReady(page);

    // Enter a bogus code
    await page.getByPlaceholder('XXXXXX').fill('ZZZZZZ');
    await page.getByRole('button', { name: /watch live/i }).click();

    // Should show error, not navigate
    await expect(page.getByText(/not found/i)).toBeVisible({ timeout: 10_000 });
    expect(page.url()).toContain('/join');
  });
});
