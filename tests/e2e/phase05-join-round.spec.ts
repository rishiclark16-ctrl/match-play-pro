/**
 * Phase 5: Join Round
 * Tests the /join page — spectator code entry, validation, error states.
 */
import { test, expect } from '@playwright/test';
import { setupAuthenticatedTest, waitForAppReady } from './helpers';

test.describe('Phase 5: Join Round', () => {

  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedTest(page);
    await page.goto('/join');
    await waitForAppReady(page);
  });

  // ─── 5.1 Page loads ────────────────────────────────────────────────────────
  test('5.1 — /join page loads with Watch Live header', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Watch Live' })).toBeVisible();
    await expect(page.getByText('Watch a Round')).toBeVisible();
  });

  // ─── 5.2 Code input visible ────────────────────────────────────────────────
  test('5.2 — 6-character code input is visible', async ({ page }) => {
    const codeInput = page.locator('input[placeholder="XXXXXX"]');
    await expect(codeInput).toBeVisible();
    await expect(codeInput).toHaveAttribute('maxlength', '6');
  });

  // ─── 5.3 Join button disabled when code too short ──────────────────────────
  test('5.3 — join button disabled when code is less than 6 chars', async ({ page }) => {
    const codeInput = page.locator('input[placeholder="XXXXXX"]');
    await codeInput.fill('ABC');

    // The "Watch Live" / join button should be disabled
    const joinBtn = page.locator('button').filter({ hasText: /Watch Live|Join/i }).last();
    await expect(joinBtn).toBeDisabled();
  });

  // ─── 5.4 Code auto-uppercases ─────────────────────────────────────────────
  test('5.4 — code input auto-uppercases text', async ({ page }) => {
    const codeInput = page.locator('input[placeholder="XXXXXX"]');
    await codeInput.fill('abcdef');
    await expect(codeInput).toHaveValue('ABCDEF');
  });

  // ─── 5.5 Join button enabled with 6-char code ─────────────────────────────
  test('5.5 — join button enabled when code is 6 characters', async ({ page }) => {
    const codeInput = page.locator('input[placeholder="XXXXXX"]');
    await codeInput.fill('ZZZZZY');

    // Button should be enabled
    const joinBtn = page.locator('button').filter({ hasText: /Watch Live|Join/i }).last();
    await expect(joinBtn).toBeEnabled();
  });

  // ─── 5.6 Invalid code shows error ─────────────────────────────────────────
  test('5.6 — invalid code shows error message', async ({ page }) => {
    const codeInput = page.locator('input[placeholder="XXXXXX"]');
    await codeInput.fill('ZZZZZZ');

    // Click join
    const joinBtn = page.locator('button').filter({ hasText: /Watch Live|Join/i }).last();
    await joinBtn.click();

    // Wait for error to appear
    await page.waitForTimeout(3000);
    // Should show error text (either toast or inline error)
    const errorVisible = await page.locator('text=/not found|invalid|no round/i').isVisible().catch(() => false);
    const toastVisible = await page.locator('[data-sonner-toast]').isVisible().catch(() => false);
    expect(errorVisible || toastVisible).toBe(true);
  });

  // ─── 5.7 Back button navigates home ────────────────────────────────────────
  test('5.7 — back button navigates to home', async ({ page }) => {
    const backBtn = page.locator('button').filter({ has: page.locator('svg.lucide-arrow-left') });
    await backBtn.click();
    await page.waitForURL('/', { timeout: 10_000 });
    expect(page.url()).not.toContain('/join');
  });

  // ─── 5.8 QR scanner button visible ────────────────────────────────────────
  test('5.8 — QR scanner button is visible', async ({ page }) => {
    // The scan icon button is inside the input area
    const scanBtn = page.locator('button').filter({ has: page.locator('svg.lucide-scan-line') });
    await expect(scanBtn).toBeVisible();
  });
});
