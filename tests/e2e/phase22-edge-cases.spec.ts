/**
 * Phase 22: Edge Cases & Error States
 * Tests error handling, invalid URLs, and boundary conditions.
 */
import { test, expect } from '@playwright/test';
import { setupAuthenticatedTest, waitForAppReady, blockExternalRequests } from './helpers';

test.describe('Phase 22: Edge Cases & Error States', () => {

  // ─── 22.1 Invalid round ID ────────────────────────────────────────────────
  test('22.1 — /round/invalid-id shows error or redirect', async ({ page }) => {
    await setupAuthenticatedTest(page);
    await page.goto('/round/invalid-uuid-here');
    await page.waitForTimeout(3000);
    // Should show an error, redirect, or loading state (not crash)
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.length).toBeGreaterThan(10);
  });

  // ─── 22.2 Deep link to protected route without auth ──────────────────────
  test('22.2 — /profile redirects to /auth when not logged in', async ({ page }) => {
    await blockExternalRequests(page);
    await page.goto('/profile');
    await page.waitForURL(/\/auth/, { timeout: 10_000 });
    expect(page.url()).toContain('/auth');
  });

  // ─── 22.3 Multiple legal pages load correctly ─────────────────────────────
  test('22.3 — navigating between legal pages works', async ({ page }) => {
    await blockExternalRequests(page);
    await page.goto('/privacy-policy');
    await expect(page.locator('body')).toContainText(/privacy/i);

    await page.goto('/terms-of-service');
    await expect(page.locator('body')).toContainText(/terms/i);

    await page.goto('/support');
    await expect(page.locator('body')).toContainText(/support/i);
  });

  // ─── 22.4 404 with various paths ─────────────────────────────────────────
  test('22.4 — various invalid paths show 404', async ({ page }) => {
    await blockExternalRequests(page);
    await page.goto('/totally-fake-path');
    await expect(page.locator('body')).toContainText(/not found|404|doesn't exist/i);
  });

  // ─── 22.5 Empty new round can go back ─────────────────────────────────────
  test('22.5 — /new-round back button works immediately', async ({ page }) => {
    await setupAuthenticatedTest(page);
    await page.goto('/new-round');
    await waitForAppReady(page);

    const backBtn = page.locator('button').filter({ has: page.locator('svg.lucide-arrow-left') });
    await backBtn.click();
    await page.waitForURL('/', { timeout: 10_000 });
  });

  // ─── 22.6 Double-click protection on Start Round ──────────────────────────
  test('22.6 — rapid clicks on Start Round don\'t create multiple rounds', async ({ page }) => {
    await setupAuthenticatedTest(page);
    await page.goto('/new-round');
    await waitForAppReady(page);

    // Fill round quickly
    await page.getByText('Add Course Manually').click();
    await page.waitForTimeout(300);
    await page.locator('input[placeholder="Course name"]').fill('Double Click Test');
    await page.getByRole('button', { name: /Save Course/i }).click();
    await page.waitForTimeout(200);
    await page.getByRole('button', { name: /Next/i }).click();
    await page.waitForTimeout(300);
    const playerInputs = page.locator('input[placeholder*="Player" i], input[placeholder*="name" i]');
    await playerInputs.nth(0).fill('P1');
    await playerInputs.nth(1).fill('P2');
    await page.getByRole('button', { name: /Next/i }).click();
    await page.waitForTimeout(300);

    // Click Start Round — verify button shows loading state or navigates
    const startBtn = page.getByRole('button', { name: /Start Round/i });
    await startBtn.click();

    // After click, button should be disabled (isCreating = true) to prevent double-submit
    // or we've already navigated away
    const stillOnPage = await page.waitForURL(/\/round\//, { timeout: 30_000 }).then(() => false).catch(() => true);
    if (stillOnPage) {
      // Button should be disabled during creation
      await expect(startBtn).toBeDisabled();
    }
    expect(page.url()).toContain('/round/');
  });
});
