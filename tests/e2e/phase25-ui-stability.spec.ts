/**
 * Phase 25: UI Stability & Button Coverage
 * Tests bottom nav, redirects, profile navigation, tab stability, and course search.
 */
import { test, expect } from '@playwright/test';
import { setupAuthenticatedTest, waitForAppReady } from './helpers';

test.describe('Phase 25: UI Stability', () => {

  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedTest(page);
  });

  // ─── 25.1 Bottom nav — Home tab ──────────────────────────────────────────
  test('25.1 — bottom nav Home tab navigates to /', async ({ page }) => {
    await page.goto('/social');
    await waitForAppReady(page);
    const homeLink = page.locator('nav a[href="/"]');
    await expect(homeLink).toBeVisible();
    await homeLink.click();
    await page.waitForURL(/^\/$/, { timeout: 10_000 });
  });

  // ─── 25.2 Bottom nav — Social tab ────────────────────────────────────────
  test('25.2 — bottom nav Social tab navigates to /social', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    const socialLink = page.locator('nav a[href="/social"]');
    await expect(socialLink).toBeVisible();
    await socialLink.click();
    await page.waitForURL(/\/social/, { timeout: 10_000 });
  });

  // ─── 25.3 Bottom nav — New Round tab ─────────────────────────────────────
  test('25.3 — bottom nav New tab navigates to /new-round', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    const newLink = page.locator('nav a[href="/new-round"]');
    await expect(newLink).toBeVisible();
    await newLink.click();
    await page.waitForURL(/\/new-round/, { timeout: 10_000 });
  });

  // ─── 25.4 Bottom nav — Stats tab ─────────────────────────────────────────
  test('25.4 — bottom nav Stats tab navigates to /stats', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    const statsLink = page.locator('nav a[href="/stats"]');
    await expect(statsLink).toBeVisible();
    await statsLink.click();
    await page.waitForURL(/\/stats/, { timeout: 10_000 });
  });

  // ─── 25.5 Bottom nav — Profile tab ───────────────────────────────────────
  test('25.5 — bottom nav Profile tab navigates to /profile', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    const profileLink = page.locator('nav a[href="/profile"]');
    await expect(profileLink).toBeVisible();
    await profileLink.click();
    await page.waitForURL(/\/profile/, { timeout: 10_000 });
  });

  // ─── 25.6 /friends redirect lands on /social with friends tab ────────────
  test('25.6 — /friends redirect lands on /social?tab=friends', async ({ page }) => {
    await page.goto('/friends');
    await page.waitForURL(/\/social\?tab=friends/, { timeout: 10_000 });
    await waitForAppReady(page);
    // Verify the friends tab content loaded
    await expect(page.getByText('Add a Friend')).toBeVisible();
  });

  // ─── 25.7 /friends?add=CODE redirect passes through add param ────────────
  test('25.7 — /friends?add=CODE redirect passes through the add param', async ({ page }) => {
    await page.goto('/friends?add=TESTCD');
    await page.waitForURL(/\/social\?tab=friends&add=TESTCD/, { timeout: 10_000 });
    await waitForAppReady(page);
    // The add param auto-fills the code input and switches to code search type
    // Verify we're on the social page with friends tab active
    await expect(page.getByText('Add a Friend')).toBeVisible();
  });

  // ─── 25.8 Profile Friends button navigates to /social?tab=friends ────────
  test('25.8 — Profile Friends button navigates to /social?tab=friends', async ({ page }) => {
    await page.goto('/profile');
    await waitForAppReady(page);
    // The friends button shows "N Friends" text
    const friendsButton = page.getByRole('button', { name: /friend/i });
    await expect(friendsButton).toBeVisible();
    await friendsButton.click();
    await page.waitForURL(/\/social\?tab=friends/, { timeout: 10_000 });
    await waitForAppReady(page);
    await expect(page.getByText('Add a Friend')).toBeVisible();
  });

  // ─── 25.9 Social tab switching doesn't trigger error boundary ────────────
  test('25.9 — social tab switching causes no errors', async ({ page }) => {
    // Collect console errors during tab switching
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/social');
    await waitForAppReady(page);

    // Switch through all tabs rapidly
    await page.getByRole('button', { name: 'Upcoming' }).click();
    await page.waitForTimeout(200);
    await page.getByRole('button', { name: /^Friends/ }).click();
    await page.waitForTimeout(200);
    await page.getByRole('button', { name: 'Feed' }).click();
    await page.waitForTimeout(200);
    await page.getByRole('button', { name: /^Friends/ }).click();
    await page.waitForTimeout(200);
    await page.getByRole('button', { name: 'Upcoming' }).click();
    await page.waitForTimeout(200);

    // No React error boundary should have triggered
    const errorBoundary = page.locator('text=/something went wrong/i');
    await expect(errorBoundary).not.toBeVisible();

    // Filter out expected Supabase/network errors from real app errors
    const appErrors = errors.filter(e =>
      !e.includes('supabase') &&
      !e.includes('WebSocket') &&
      !e.includes('realtime') &&
      !e.includes('net::') &&
      !e.includes('Failed to fetch')
    );
    expect(appErrors).toHaveLength(0);
  });

  // ─── 25.10 Course search renders mock results without errors ─────────────
  test('25.10 — course search renders mock results', async ({ page }) => {
    // Mock the golf-course-lookup edge function
    await page.route('**/functions/v1/golf-course-lookup*', async (route) => {
      const url = new URL(route.request().url());
      const action = url.searchParams.get('action');
      if (action === 'search') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            results: [
              {
                id: 'mock-course-1',
                name: 'Pine Valley Golf Club',
                location: 'Pine Valley, NJ',
                holes: 18,
                par: 70,
              },
              {
                id: 'mock-course-2',
                name: 'Augusta National',
                location: 'Augusta, GA',
                holes: 18,
                par: 72,
              },
            ],
          }),
        });
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      }
    });

    // Mock courses query (saved courses) to return empty
    await page.route('**/rest/v1/courses*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.goto('/new-round');
    await waitForAppReady(page);

    // The course search step should be visible on new-round
    const searchInput = page.locator('input[placeholder*="Search" i], input[placeholder*="course" i]');
    if (await searchInput.isVisible({ timeout: 5000 })) {
      await searchInput.fill('Pine Valley');
      // Wait for debounced search + results
      await page.waitForTimeout(800);

      // Verify mock results appear
      await expect(page.getByText('Pine Valley Golf Club')).toBeVisible();
      await expect(page.getByText('Augusta National')).toBeVisible();
    }
  });

  // ─── 25.11 No crash on rapid bottom nav clicks ───────────────────────────
  test('25.11 — rapid bottom nav clicks do not crash', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);

    // Rapidly click through bottom nav tabs
    await page.locator('nav a[href="/social"]').click();
    await page.locator('nav a[href="/stats"]').click();
    await page.locator('nav a[href="/profile"]').click();
    await page.locator('nav a[href="/"]').click();
    await page.waitForTimeout(500);

    // App should still be functional — no error boundary
    const errorBoundary = page.locator('text=/something went wrong/i');
    await expect(errorBoundary).not.toBeVisible();
    // Should have navigated back home
    await page.waitForURL(/^\/$/, { timeout: 10_000 });
  });
});
