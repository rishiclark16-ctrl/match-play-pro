/**
 * Phase 3: Onboarding Flow
 * Tests the 4-step onboarding flow: Photo → Handicap → Tees → Course.
 * Uses a mock un-onboarded user to trigger the onboarding redirect.
 */
import { test, expect } from '@playwright/test';
import { setupAuthenticatedTest, waitForAppReady, blockExternalRequests } from './helpers';

test.describe('Phase 3: Onboarding Flow', () => {

  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedTest(page);
  });

  // ─── 3.1 Onboarding page loads ────────────────────────────────────────────
  test('3.1 — /onboarding page loads with Step 1 (photo)', async ({ page }) => {
    await page.goto('/onboarding');
    await waitForAppReady(page);
    await expect(page.getByText('Step 1 of 4')).toBeVisible();
    await expect(page.getByText('Add a profile photo')).toBeVisible();
    await expect(page.getByText('Tap to add')).toBeVisible();
  });

  // ─── 3.2 Progress bar visible ──────────────────────────────────────────────
  test('3.2 — progress bar shows 4 segments', async ({ page }) => {
    await page.goto('/onboarding');
    await waitForAppReady(page);
    // Progress bar has 4 pill-shaped segments
    const progressBars = page.locator('header .rounded-full.h-1\\.5');
    await expect(progressBars).toHaveCount(4);
  });

  // ─── 3.3 Skip button advances ─────────────────────────────────────────────
  test('3.3 — Skip button advances to Step 2 (handicap)', async ({ page }) => {
    await page.goto('/onboarding');
    await waitForAppReady(page);
    // Click Skip on photo step
    await page.getByText('Skip').click();
    await page.waitForTimeout(500);
    // Should now be on handicap step
    await expect(page.getByText('Step 2 of 4')).toBeVisible();
    await expect(page.getByText("What's your handicap?")).toBeVisible();
  });

  // ─── 3.4 Continue button advances ─────────────────────────────────────────
  test('3.4 — Continue button advances through all steps', async ({ page }) => {
    await page.goto('/onboarding');
    await waitForAppReady(page);

    // Step 1: Photo — click Next
    await page.getByRole('button', { name: /Next/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText('Step 2 of 4')).toBeVisible();

    // Step 2: Handicap — click Next
    await page.getByRole('button', { name: /Next/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText('Step 3 of 4')).toBeVisible();

    // Step 3: Tees — click Next
    await page.getByRole('button', { name: /Next/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText('Step 4 of 4')).toBeVisible();
  });

  // ─── 3.5 Handicap input works ─────────────────────────────────────────────
  test('3.5 — handicap input accepts numeric value', async ({ page }) => {
    await page.goto('/onboarding');
    await waitForAppReady(page);
    // Skip to handicap step
    await page.getByText('Skip').click();
    await page.waitForTimeout(500);

    // Fill handicap
    const handicapInput = page.getByLabel('Handicap index');
    await expect(handicapInput).toBeVisible();
    await handicapInput.fill('12.5');
    await expect(handicapInput).toHaveValue('12.5');
  });

  // ─── 3.6 Tee selection works ──────────────────────────────────────────────
  test('3.6 — tee preference selection buttons visible', async ({ page }) => {
    await page.goto('/onboarding');
    await waitForAppReady(page);
    // Skip to tee step (step 3)
    await page.getByText('Skip').click();
    await page.waitForTimeout(400);
    await page.getByText('Skip').click();
    await page.waitForTimeout(400);

    // Tee options should be visible
    await expect(page.getByText('Step 3 of 4')).toBeVisible();
    await expect(page.getByText('Black')).toBeVisible();
    await expect(page.getByText('Blue')).toBeVisible();
    await expect(page.getByText('White', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Gold')).toBeVisible();
    await expect(page.getByText('Red')).toBeVisible();
  });

  // ─── 3.7 Course step visible ──────────────────────────────────────────────
  test('3.7 — step 4 shows course selector', async ({ page }) => {
    await page.goto('/onboarding');
    await waitForAppReady(page);
    // Skip to course step (step 4)
    for (let i = 0; i < 3; i++) {
      await page.getByText('Skip').click();
      await page.waitForTimeout(400);
    }

    await expect(page.getByText('Step 4 of 4')).toBeVisible();
  });

  // ─── 3.8 Last step shows Finish button ────────────────────────────────────
  test('3.8 — last step Skip button shows "Finish"', async ({ page }) => {
    await page.goto('/onboarding');
    await waitForAppReady(page);
    // Skip to last step
    for (let i = 0; i < 3; i++) {
      await page.getByText('Skip').click();
      await page.waitForTimeout(400);
    }
    // On last step, skip button text changes to "Finish"
    await expect(page.getByText('Finish')).toBeVisible();
  });

  // ─── 3.9 Finish navigates to home ─────────────────────────────────────────
  test('3.9 — finishing onboarding navigates to home', async ({ page }) => {
    await page.goto('/onboarding');
    await waitForAppReady(page);
    // Skip all steps to get to finish
    for (let i = 0; i < 3; i++) {
      await page.getByText('Skip').click();
      await page.waitForTimeout(400);
    }
    // Click Finish
    await page.getByText('Finish').click();
    // Should navigate to home
    await page.waitForURL('/', { timeout: 15_000 });
    expect(page.url()).not.toContain('/onboarding');
  });
});
