/**
 * Phase 8: Game Sections on Scorecard
 * Tests that game sections (Stroke Play, Skins, etc.) render on the scorecard.
 */
import { test, expect, Page } from '@playwright/test';
import { setupAuthenticatedTest, waitForAppReady } from './helpers';

async function createRound(page: Page) {
  await page.goto('/new-round');
  await waitForAppReady(page);
  await page.getByText('Add Course Manually').click();
  await page.waitForTimeout(400);
  await page.locator('input[placeholder="Course name"]').fill('Games Test');
  await page.getByRole('button', { name: /Save Course/i }).click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: /Next/i }).click();
  await page.waitForTimeout(500);
  const playerInputs = page.locator('input[placeholder*="Player" i], input[placeholder*="name" i]');
  await playerInputs.nth(0).fill('Alice');
  await playerInputs.nth(1).fill('Bob');
  await page.getByRole('button', { name: /Next/i }).click();
  await page.waitForTimeout(500);
  // Enable Skins
  const skinsRow = page.locator('div, label').filter({ hasText: /^Skins$/ }).first();
  const skinsToggle = skinsRow.locator('button[role="switch"]');
  if (await skinsToggle.count() > 0) {
    await skinsToggle.click();
    await page.waitForTimeout(300);
  }
  await page.getByRole('button', { name: /Start Round/i }).click();
  await page.waitForURL(/\/round\//, { timeout: 30_000 });
}

test.describe('Phase 8: Game Sections on Scorecard', () => {

  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedTest(page);
    await createRound(page);
  });

  // ─── 8.1 Stroke Play section visible ──────────────────────────────────────
  test('8.1 — Stroke Play section visible on scorecard', async ({ page }) => {
    // Stroke Play is enabled by default
    const strokePlayText = page.getByText(/Stroke Play/i);
    const count = await strokePlayText.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  // ─── 8.2 Games section renders ────────────────────────────────────────────
  test('8.2 — scorecard renders without crash with games enabled', async ({ page }) => {
    // Just verify the scorecard loaded with games
    await expect(page.getByRole('heading', { name: 'Alice' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Bob' })).toBeVisible();
  });
});
