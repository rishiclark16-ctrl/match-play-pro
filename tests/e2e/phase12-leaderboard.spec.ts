/**
 * Phase 12: Leaderboard
 * Tests the /round/:id/leaderboard page.
 */
import { test, expect, Page } from '@playwright/test';
import { setupAuthenticatedTest, waitForAppReady } from './helpers';

async function createRoundAndGetId(page: Page): Promise<string> {
  await page.goto('/new-round');
  await waitForAppReady(page);

  await page.getByText('Add Course Manually').click();
  await page.waitForTimeout(400);
  await page.locator('input[placeholder="Course name"]').fill('Leaderboard Test');
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

  const url = page.url();
  const match = url.match(/\/round\/([^/?]+)/);
  return match ? match[1] : '';
}

test.describe('Phase 12: Leaderboard', () => {

  test('12.1 — /round/:id/leaderboard page loads', async ({ page }) => {
    await setupAuthenticatedTest(page);
    const roundId = await createRoundAndGetId(page);
    expect(roundId).toBeTruthy();

    await page.goto(`/round/${roundId}/leaderboard`);
    await waitForAppReady(page);

    // Leaderboard should show player names
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).toContain('Alice');
    expect(bodyText).toContain('Bob');
  });
});
