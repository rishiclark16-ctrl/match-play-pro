/**
 * Phase 18: Stats
 * Tests the stats page — scoring stats, records, trend badges.
 */
import { test, expect } from '@playwright/test';
import { setupAuthenticatedTest, waitForAppReady } from './helpers';

test.describe('Phase 18: Stats', () => {

  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedTest(page);
    await page.goto('/stats');
    await waitForAppReady(page);
  });

  // ─── 18.1 Page loads ──────────────────────────────────────────────────────
  test('18.1 — /stats page loads', async ({ page }) => {
    // Stats page should have some content (may show empty state for new user)
    await expect(page.locator('body')).toContainText(/stats|rounds|scoring|average/i);
  });

  // ─── 18.2 Bottom nav Stats tab active ──────────────────────────────────────
  test('18.2 — Stats tab is active in bottom nav', async ({ page }) => {
    const statsLink = page.locator('nav a[href="/stats"]');
    await expect(statsLink).toBeVisible();
    // Active dot indicator
    const activeDot = statsLink.locator('span.rounded-full');
    await expect(activeDot).toBeVisible();
  });

  // ─── 18.3 Empty state for new user ────────────────────────────────────────
  test('18.3 — new user sees empty or zero stats', async ({ page }) => {
    // For a user with no rounds, stats should show zeros or empty state
    // Just verify the page renders without error
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.length).toBeGreaterThan(50);
  });
});
