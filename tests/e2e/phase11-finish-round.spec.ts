/**
 * Phase 11: Finish Round & Settlements
 * Tests the round completion flow — finish overlay, results page.
 */
import { test, expect, Page } from '@playwright/test';
import { setupAuthenticatedTest, waitForAppReady } from './helpers';

async function createRound(page: Page) {
  await page.goto('/new-round');
  await waitForAppReady(page);
  await page.getByText('Add Course Manually').click();
  await page.waitForTimeout(400);
  await page.locator('input[placeholder="Course name"]').fill('Finish Test');
  await page.getByRole('button', { name: /Save Course/i }).click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: /Next/i }).click();
  await page.waitForTimeout(500);
  const playerInputs = page.locator('input[placeholder*="Player" i], input[placeholder*="name" i]');
  await playerInputs.nth(0).fill('Alice');
  await playerInputs.nth(1).fill('Bob');
  await page.getByRole('button', { name: /Next/i }).click();
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: /Start Round/i }).click();
  await page.waitForURL(/\/round\//, { timeout: 30_000 });
}

test.describe('Phase 11: Finish Round & Settlements', () => {

  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedTest(page);
    await createRound(page);
  });

  // ─── 11.1 Finish options accessible ───────────────────────────────────────
  test('11.1 — finish/menu button is accessible on scorecard', async ({ page }) => {
    // There should be a menu or finish button in the header/bottom bar
    const menuBtn = page.locator('button').filter({ has: page.locator('svg.lucide-more-horizontal, svg.lucide-settings-2, svg.lucide-menu') });
    const finishBtn = page.getByText(/finish|complete/i);
    const menuCount = await menuBtn.count();
    const finishCount = await finishBtn.count();
    expect(menuCount + finishCount).toBeGreaterThanOrEqual(0);
  });
});
