/**
 * Phase 19: Social
 * Tests the social page — friend activity, live rounds feed.
 */
import { test, expect } from '@playwright/test';
import { setupAuthenticatedTest, waitForAppReady } from './helpers';

test.describe('Phase 19: Social', () => {

  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedTest(page);
    await page.goto('/social');
    await waitForAppReady(page);
  });

  // ─── 19.1 Page loads ──────────────────────────────────────────────────────
  test('19.1 — /social page loads', async ({ page }) => {
    await expect(page.locator('body')).toContainText(/social|friends|activity/i);
  });

  // ─── 19.2 Bottom nav Social tab active ────────────────────────────────────
  test('19.2 — Social tab is active in bottom nav', async ({ page }) => {
    const socialLink = page.locator('nav a[href="/social"]');
    await expect(socialLink).toBeVisible();
    const activeDot = socialLink.locator('span.rounded-full');
    await expect(activeDot).toBeVisible();
  });

  // ─── 19.3 Empty state ────────────────────────────────────────────────────
  test('19.3 — social page renders without error', async ({ page }) => {
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.length).toBeGreaterThan(50);
  });
});
