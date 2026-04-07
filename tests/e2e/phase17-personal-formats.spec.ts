/**
 * Phase 17: Personal Game Formats
 * Tests the /my-formats page — saved formats list.
 */
import { test, expect } from '@playwright/test';
import { setupAuthenticatedTest, waitForAppReady } from './helpers';

test.describe('Phase 17: Personal Game Formats', () => {

  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedTest(page);
  });

  // ─── 17.1 My Game Formats accessible from profile ─────────────────────────
  test('17.1 — My Game Formats section visible in profile', async ({ page }) => {
    await page.goto('/profile');
    await waitForAppReady(page);
    await expect(page.getByText('My Game Formats')).toBeVisible();
  });

  // ─── 17.2 Build New Format button visible ─────────────────────────────────
  test('17.2 — "Build New Format" button visible in format step', async ({ page }) => {
    await page.goto('/new-round');
    await waitForAppReady(page);

    // Go to format step
    await page.getByText('Add Course Manually').click();
    await page.waitForTimeout(400);
    await page.locator('input[placeholder="Course name"]').fill('Format Test');
    await page.getByRole('button', { name: /Save Course/i }).click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /Next/i }).click();
    await page.waitForTimeout(500);
    const playerInputs = page.locator('input[placeholder*="Player" i], input[placeholder*="name" i]');
    await playerInputs.nth(0).fill('A');
    await playerInputs.nth(1).fill('B');
    await page.getByRole('button', { name: /Next/i }).click();
    await page.waitForTimeout(500);

    await expect(page.getByText('Build New Format')).toBeVisible();
  });
});
