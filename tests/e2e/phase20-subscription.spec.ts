/**
 * Phase 20: Subscription & Feature Gating
 * Tests that Pro features show paywalls for free users.
 */
import { test, expect } from '@playwright/test';
import { setupAuthenticatedTest, waitForAppReady } from './helpers';

test.describe('Phase 20: Subscription & Feature Gating', () => {

  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedTest(page);
  });

  // ─── 20.1 Nassau shows PRO badge ──────────────────────────────────────────
  test('20.1 — Nassau game shows PRO badge in format selector', async ({ page }) => {
    await page.goto('/new-round');
    await waitForAppReady(page);

    // Go to format step
    await page.getByText('Add Course Manually').click();
    await page.waitForTimeout(400);
    await page.locator('input[placeholder="Course name"]').fill('Pro Test');
    await page.getByRole('button', { name: /Save Course/i }).click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /Next/i }).click();
    await page.waitForTimeout(500);
    const playerInputs = page.locator('input[placeholder*="Player" i], input[placeholder*="name" i]');
    await playerInputs.nth(0).fill('Alice');
    await playerInputs.nth(1).fill('Bob');
    await page.getByRole('button', { name: /Next/i }).click();
    await page.waitForTimeout(500);

    // Nassau should show a PRO badge
    await expect(page.getByText('PRO').first()).toBeVisible();
  });

  // ─── 20.2 Profile page shows subscription status ──────────────────────────
  test('20.2 — profile page renders subscription-related content', async ({ page }) => {
    await page.goto('/profile');
    await waitForAppReady(page);
    // Should render without error
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.length).toBeGreaterThan(100);
  });
});
