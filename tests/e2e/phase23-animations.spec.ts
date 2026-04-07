/**
 * Phase 23: Animations & Polish
 * Tests that key animations and transitions work without crashing.
 */
import { test, expect } from '@playwright/test';
import { setupAuthenticatedTest, waitForAppReady, blockExternalRequests } from './helpers';

test.describe('Phase 23: Animations & Polish', () => {

  // ─── 23.1 Auth page animations render ─────────────────────────────────────
  test('23.1 — auth page animations render without error', async ({ page }) => {
    await blockExternalRequests(page);
    await page.goto('/auth');
    // Wait for initial animations
    await page.waitForTimeout(1500);
    // Page should be visible and functional
    await expect(page.locator('h1')).toContainText('MATCH');
    await expect(page.getByText('Play. Compete. Win.')).toBeVisible();
  });

  // ─── 23.2 Sheet animation works ──────────────────────────────────────────
  test('23.2 — auth sheet slides up and down smoothly', async ({ page }) => {
    await blockExternalRequests(page);
    await page.goto('/auth');
    await page.waitForTimeout(500);

    // Open sheet
    await page.getByRole('button', { name: /Sign in/i }).click();
    await page.waitForTimeout(600);
    await expect(page.getByText('Welcome back')).toBeVisible();

    // Close sheet
    await page.getByRole('button', { name: /Close/i }).click();
    await page.waitForTimeout(600);
    await expect(page.getByText('Play. Compete. Win.')).toBeVisible();
  });

  // ─── 23.3 Home page cards animate in ──────────────────────────────────────
  test('23.3 — home page elements animate in', async ({ page }) => {
    await setupAuthenticatedTest(page);
    await page.goto('/');
    // Wait for Framer Motion animations
    await page.waitForTimeout(1000);
    // Stats cards should be visible after animation
    await expect(page.getByText('Active')).toBeVisible();
    await expect(page.getByText('Watching')).toBeVisible();
  });

  // ─── 23.4 Page transitions don't break ───────────────────────────────────
  test('23.4 — rapid navigation between pages doesn\'t crash', async ({ page }) => {
    await setupAuthenticatedTest(page);
    await page.goto('/');
    await waitForAppReady(page);

    // Rapidly navigate between tabs
    await page.locator('nav').getByText('Stats').click();
    await page.waitForTimeout(300);
    await page.locator('nav').getByText('Social').click();
    await page.waitForTimeout(300);
    await page.locator('nav').getByText('Profile').click();
    await page.waitForTimeout(300);
    await page.locator('nav').getByText('Home').click();
    await page.waitForTimeout(300);

    // App should still be functional
    await expect(page.locator('h1')).toContainText('MATCH');
  });
});
