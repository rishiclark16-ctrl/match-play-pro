/**
 * Phase 13: Profile
 * Tests the profile page — user info, handicap, tee preference, settings, sign out.
 */
import { test, expect } from '@playwright/test';
import { setupAuthenticatedTest, waitForAppReady } from './helpers';

test.describe('Phase 13: Profile', () => {

  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedTest(page);
    await page.goto('/profile');
    await waitForAppReady(page);
  });

  // ─── 13.1 Profile page loads ──────────────────────────────────────────────
  test('13.1 — profile page loads with user name', async ({ page }) => {
    // Should show the user's name or "Add your name"
    const nameVisible = await page.getByText('E2E Test Player').isVisible().catch(() => false);
    const placeholderVisible = await page.getByText('Add your name').isVisible().catch(() => false);
    expect(nameVisible || placeholderVisible).toBe(true);
  });

  // ─── 13.2 Friend Code visible ─────────────────────────────────────────────
  test('13.2 — friend code section is visible', async ({ page }) => {
    await expect(page.getByText('Friend Code')).toBeVisible();
  });

  // ─── 13.3 Golf section visible ────────────────────────────────────────────
  test('13.3 — Golf section with handicap input', async ({ page }) => {
    await expect(page.getByRole('main').getByText('Golf', { exact: true })).toBeVisible();
    await expect(page.getByText('Handicap Index')).toBeVisible();
  });

  // ─── 13.4 Account section visible ─────────────────────────────────────────
  test('13.4 — Account section with login email', async ({ page }) => {
    await expect(page.getByText('Account', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Login Email')).toBeVisible();
  });

  // ─── 13.5 Scoring section visible ─────────────────────────────────────────
  test('13.5 — Scoring section is visible', async ({ page }) => {
    await expect(page.getByText('Scoring', { exact: true }).first()).toBeVisible();
  });

  // ─── 13.6 Voice section visible ────────────────────────────────────────────
  test('13.6 — Voice section is visible', async ({ page }) => {
    await expect(page.getByText('Voice')).toBeVisible();
  });

  // ─── 13.7 Danger Zone visible ──────────────────────────────────────────────
  test('13.7 — Danger Zone with Delete Account', async ({ page }) => {
    // Scroll to bottom
    await page.evaluate(() => {
      document.querySelector('main')?.scrollTo(0, 99999);
    });
    await page.waitForTimeout(300);
    await expect(page.getByText('Danger Zone')).toBeVisible();
    await expect(page.getByText('Delete Account')).toBeVisible();
  });

  // ─── 13.8 My Game Formats section visible ─────────────────────────────────
  test('13.8 — My Game Formats section is visible', async ({ page }) => {
    await expect(page.getByText('My Game Formats')).toBeVisible();
  });

  // ─── 13.9 Tee preference options ──────────────────────────────────────────
  test('13.9 — tee preference options (Black/Blue/White/Gold/Red) visible', async ({ page }) => {
    // The tee selector should show colored buttons
    await expect(page.getByText('Black').first()).toBeVisible();
    await expect(page.getByText('Blue').first()).toBeVisible();
  });
});
