/**
 * Phase 10: Round Dashboard
 * Tests the /round/:id/dashboard page.
 */
import { test, expect, Page } from '@playwright/test';
import { setupAuthenticatedTest, waitForAppReady } from './helpers';

async function createRoundAndGetId(page: Page): Promise<string> {
  await page.goto('/new-round');
  await waitForAppReady(page);

  await page.getByText('Add Course Manually').click();
  await page.waitForTimeout(400);
  await page.locator('input[placeholder="Course name"]').fill('Dashboard Test');
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

  // Extract round ID from URL
  const url = page.url();
  const match = url.match(/\/round\/([^/?]+)/);
  return match ? match[1] : '';
}

test.describe('Phase 10: Round Dashboard', () => {

  test('10.1 — /round/:id/dashboard page loads', async ({ page }) => {
    await setupAuthenticatedTest(page);
    const roundId = await createRoundAndGetId(page);
    expect(roundId).toBeTruthy();

    await page.goto(`/round/${roundId}/dashboard`);
    await waitForAppReady(page);

    // Dashboard should show some round info
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.length).toBeGreaterThan(50);
  });
});
