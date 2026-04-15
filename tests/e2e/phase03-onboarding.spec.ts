/**
 * Phase 3: Onboarding Flow
 * Tests the 5-step onboarding flow: Photo → Phone → Handicap → Tees → Course.
 * Uses the real test user to verify end-to-end behavior.
 */
import { test, expect } from '@playwright/test';
import { setupAuthenticatedTest, waitForAppReady } from './helpers';

test.describe('Phase 3: Onboarding Flow', () => {

  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedTest(page);
  });

  // ─── 3.1 Onboarding page loads ────────────────────────────────────────────
  test('3.1 — /onboarding page loads with Step 1 (photo)', async ({ page }) => {
    await page.goto('/onboarding');
    await waitForAppReady(page);
    await expect(page.getByText('Step 1 of 5')).toBeVisible();
    await expect(page.getByText('Add a profile photo')).toBeVisible();
    await expect(page.getByText('Tap to add')).toBeVisible();
  });

  // ─── 3.2 Progress bar visible ──────────────────────────────────────────────
  test('3.2 — progress bar shows 5 segments', async ({ page }) => {
    await page.goto('/onboarding');
    await waitForAppReady(page);
    // Progress bar has 5 pill-shaped segments
    const progressBars = page.locator('header .rounded-full.h-1\\.5');
    await expect(progressBars).toHaveCount(5);
  });

  // ─── 3.3 Skip button advances ─────────────────────────────────────────────
  test('3.3 — Skip button advances to Step 2 (phone)', async ({ page }) => {
    await page.goto('/onboarding');
    await waitForAppReady(page);
    // Click Skip on photo step
    await page.getByText('Skip').click();
    await page.waitForTimeout(500);
    // Should now be on phone step
    await expect(page.getByText('Step 2 of 5')).toBeVisible();
    await expect(page.getByText("What's your number?")).toBeVisible();
  });

  // ─── 3.4 Photo step — Continue never blocked ──────────────────────────────
  test('3.4 — photo step Continue button is always enabled', async ({ page }) => {
    await page.goto('/onboarding');
    await waitForAppReady(page);
    // Continue button should not be disabled even without a photo
    const nextBtn = page.getByRole('button', { name: /Next/i });
    await expect(nextBtn).toBeEnabled();
  });

  // ─── 3.5 Continue button advances through all 5 steps ────────────────────
  test('3.5 — Continue button advances through all steps', async ({ page }) => {
    await page.goto('/onboarding');
    await waitForAppReady(page);

    // Step 1: Photo → Next
    await page.getByRole('button', { name: /Next/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText('Step 2 of 5')).toBeVisible();

    // Step 2: Phone → Next (phone is optional now)
    await page.getByRole('button', { name: /Next/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText('Step 3 of 5')).toBeVisible();

    // Step 3: Handicap → Next
    await page.getByRole('button', { name: /Next/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText('Step 4 of 5')).toBeVisible();

    // Step 4: Tees → Next
    await page.getByRole('button', { name: /Next/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText('Step 5 of 5')).toBeVisible();
  });

  // ─── 3.6 Phone step — optional, can skip ─────────────────────────────────
  test('3.6 — phone step is optional, Continue works without input', async ({ page }) => {
    await page.goto('/onboarding');
    await waitForAppReady(page);
    // Advance to phone step
    await page.getByRole('button', { name: /Next/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText("What's your number?")).toBeVisible();
    // Continue without entering a phone number
    const nextBtn = page.getByRole('button', { name: /Next/i });
    await expect(nextBtn).toBeEnabled();
    await nextBtn.click();
    await page.waitForTimeout(500);
    // Should advance to handicap
    await expect(page.getByText('Step 3 of 5')).toBeVisible();
  });

  // ─── 3.7 Handicap input works ─────────────────────────────────────────────
  test('3.7 — handicap input accepts numeric value', async ({ page }) => {
    await page.goto('/onboarding');
    await waitForAppReady(page);
    // Skip to handicap step (step 3)
    await page.getByText('Skip').click();
    await page.waitForTimeout(400);
    await page.getByText('Skip').click();
    await page.waitForTimeout(500);

    // Fill handicap
    const handicapInput = page.getByLabel('Handicap index');
    await expect(handicapInput).toBeVisible();
    await handicapInput.fill('12.5');
    await expect(handicapInput).toHaveValue('12.5');
  });

  // ─── 3.8 Tee selection works ──────────────────────────────────────────────
  test('3.8 — tee preference selection buttons visible', async ({ page }) => {
    await page.goto('/onboarding');
    await waitForAppReady(page);
    // Skip to tee step (step 4)
    for (let i = 0; i < 3; i++) {
      await page.getByText('Skip').click();
      await page.waitForTimeout(400);
    }

    // Tee options should be visible
    await expect(page.getByText('Step 4 of 5')).toBeVisible();
    await expect(page.getByText('Black')).toBeVisible();
    await expect(page.getByText('Blue')).toBeVisible();
    await expect(page.getByText('White', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Gold')).toBeVisible();
    await expect(page.getByText('Red')).toBeVisible();
  });

  // ─── 3.9 Course step visible ──────────────────────────────────────────────
  test('3.9 — step 5 shows course selector', async ({ page }) => {
    await page.goto('/onboarding');
    await waitForAppReady(page);
    // Skip to course step (step 5)
    for (let i = 0; i < 4; i++) {
      await page.getByText('Skip').click();
      await page.waitForTimeout(400);
    }

    await expect(page.getByText('Step 5 of 5')).toBeVisible();
    await expect(page.getByText('Where do you play?')).toBeVisible();
  });

  // ─── 3.10 Last step shows Finish button ───────────────────────────────────
  test('3.10 — last step Skip button shows "Finish"', async ({ page }) => {
    await page.goto('/onboarding');
    await waitForAppReady(page);
    // Skip to last step
    for (let i = 0; i < 4; i++) {
      await page.getByText('Skip').click();
      await page.waitForTimeout(400);
    }
    // On last step, skip button text changes to "Finish"
    await expect(page.getByText('Finish')).toBeVisible();
  });

  // ─── 3.11 Finish navigates to home ────────────────────────────────────────
  test('3.11 — finishing onboarding navigates to home', async ({ page }) => {
    await page.goto('/onboarding');
    await waitForAppReady(page);
    // Skip all steps to get to finish
    for (let i = 0; i < 4; i++) {
      await page.getByText('Skip').click();
      await page.waitForTimeout(400);
    }
    // Click Finish
    await page.getByText('Finish').click();
    // Should navigate to home
    await page.waitForURL('/', { timeout: 15_000 });
    expect(page.url()).not.toContain('/onboarding');
  });

  // ─── 3.12 Back button works ───────────────────────────────────────────────
  test('3.12 — back button returns to previous step', async ({ page }) => {
    await page.goto('/onboarding');
    await waitForAppReady(page);
    // Advance to step 2
    await page.getByRole('button', { name: /Next/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText('Step 2 of 5')).toBeVisible();
    // Click back arrow
    await page.getByRole('button', { name: '←' }).click();
    await page.waitForTimeout(500);
    // Should be back on step 1
    await expect(page.getByText('Step 1 of 5')).toBeVisible();
  });

  // ─── 3.13 Full happy path with data ───────────────────────────────────────
  test('3.13 — full onboarding with phone + handicap + tees fills correctly', async ({ page }) => {
    await page.goto('/onboarding');
    await waitForAppReady(page);

    // Step 1: Skip photo
    await page.getByRole('button', { name: /Next/i }).click();
    await page.waitForTimeout(500);

    // Step 2: Enter phone
    await page.getByLabel('Phone number').fill('5551234567');
    await page.getByRole('button', { name: /Next/i }).click();
    await page.waitForTimeout(500);

    // Step 3: Enter handicap
    await page.getByLabel('Handicap index').fill('15.2');
    await page.getByRole('button', { name: /Next/i }).click();
    await page.waitForTimeout(500);

    // Step 4: Select tees
    await expect(page.getByText('Which tees do you play?')).toBeVisible();
    await page.getByText('Blue').click();
    await page.getByRole('button', { name: /Next/i }).click();
    await page.waitForTimeout(500);

    // Step 5: Course — just finish
    await expect(page.getByText('Step 5 of 5')).toBeVisible();
  });
});
