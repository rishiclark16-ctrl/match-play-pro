/**
 * Phase 2: Home & Navigation
 * Tests the home page, bottom nav, stats cards, CTA buttons, and navigation flows.
 * Requires authenticated user.
 */
import { test, expect } from '@playwright/test';
import { setupAuthenticatedTest, waitForAppReady, blockExternalRequests } from './helpers';

test.describe('Phase 2: Home & Navigation', () => {

  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedTest(page);
    // Navigate to home after login
    await page.goto('/');
    await waitForAppReady(page);
  });

  // ─── 2.1 Home page loads ────────────────────────────────────────────────────
  test('2.1 — home page loads with MATCH wordmark', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('MATCH');
  });

  // ─── 2.2 Stats row visible ─────────────────────────────────────────────────
  test('2.2 — stats row shows Active / Watching / Rounds cards', async ({ page }) => {
    await expect(page.getByText('Active')).toBeVisible();
    await expect(page.getByText('Watching')).toBeVisible();
    await expect(page.getByText('Rounds', { exact: true }).first()).toBeVisible();
  });

  // ─── 2.3 New Round CTA ─────────────────────────────────────────────────────
  test('2.3 — "New Round" button visible and navigates to /new-round', async ({ page }) => {
    const newRoundBtn = page.getByLabel('Start new round');
    await expect(newRoundBtn).toBeVisible();
    await newRoundBtn.click();
    await page.waitForURL(/\/new-round/, { timeout: 10_000 });
    expect(page.url()).toContain('/new-round');
  });

  // ─── 2.4 Watch a Round CTA ────────────────────────────────────────────────
  test('2.4 — "Watch a round" button opens join modal', async ({ page }) => {
    const watchBtn = page.getByLabel('Watch a live round');
    await expect(watchBtn).toBeVisible();
    await watchBtn.click();
    await page.waitForTimeout(500);
    // Join modal should show "Enter Round Code" heading
    await expect(page.getByText('Enter Round Code')).toBeVisible();
  });

  // ─── 2.5 Profile avatar button ─────────────────────────────────────────────
  test('2.5 — profile avatar navigates to /profile', async ({ page }) => {
    const avatarBtn = page.getByLabel('Open profile');
    await expect(avatarBtn).toBeVisible();
    await avatarBtn.click();
    await page.waitForURL(/\/profile/, { timeout: 10_000 });
    expect(page.url()).toContain('/profile');
  });

  // ─── 2.6 Bottom nav visible ─────────────────────────────────────────────────
  test('2.6 — bottom nav shows 5 items: Home, Social, New, Stats, Profile', async ({ page }) => {
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
    await expect(nav.getByText('Home')).toBeVisible();
    await expect(nav.getByText('Social')).toBeVisible();
    await expect(nav.getByText('Stats')).toBeVisible();
    await expect(nav.getByText('Profile')).toBeVisible();
  });

  // ─── 2.7 Bottom nav — Home active indicator ─────────────────────────────────
  test('2.7 — Home tab is active on / route', async ({ page }) => {
    // Home link should have the active indicator dot
    const homeLink = page.locator('nav a[href="/"]');
    await expect(homeLink).toBeVisible();
    // Active state shows a yellow dot
    const activeDot = homeLink.locator('span.rounded-full');
    await expect(activeDot).toBeVisible();
  });

  // ─── 2.8 Bottom nav — navigate to Social ─────────────────────────────────────
  test('2.8 — Social tab navigates to /social', async ({ page }) => {
    await page.locator('nav').getByText('Social').click();
    await page.waitForURL(/\/social/, { timeout: 10_000 });
    expect(page.url()).toContain('/social');
  });

  // ─── 2.9 Bottom nav — navigate to Stats ───────────────────────────────────────
  test('2.9 — Stats tab navigates to /stats', async ({ page }) => {
    await page.locator('nav').getByText('Stats').click();
    await page.waitForURL(/\/stats/, { timeout: 10_000 });
    expect(page.url()).toContain('/stats');
  });

  // ─── 2.10 Bottom nav — navigate to Profile ─────────────────────────────────────
  test('2.10 — Profile tab navigates to /profile', async ({ page }) => {
    await page.locator('nav').getByText('Profile').click();
    await page.waitForURL(/\/profile/, { timeout: 10_000 });
    expect(page.url()).toContain('/profile');
  });

  // ─── 2.11 Bottom nav — New Round center button ─────────────────────────────────
  test('2.11 — center New button navigates to /new-round', async ({ page }) => {
    // The center button is the yellow circle with + icon
    const centerLink = page.locator('nav a[href="/new-round"]');
    await expect(centerLink).toBeVisible();
    await centerLink.click();
    await page.waitForURL(/\/new-round/, { timeout: 10_000 });
    expect(page.url()).toContain('/new-round');
  });

  // ─── 2.12 Bottom nav hidden on /new-round ──────────────────────────────────────
  test('2.12 — bottom nav is hidden on /new-round page', async ({ page }) => {
    await page.goto('/new-round');
    await waitForAppReady(page);
    // Nav should not be visible
    await expect(page.locator('nav')).not.toBeVisible();
  });

  // ─── 2.13 Empty state for new user ──────────────────────────────────────────────
  test('2.13 — home shows zero counts for new user', async ({ page }) => {
    // Our test user has no rounds, so counts should be 0
    const statsCards = page.locator('.grid-cols-3 .rounded-2xl');
    const firstCardNum = statsCards.first().locator('p.text-\\[28px\\]');
    await expect(firstCardNum).toHaveText('0');
  });

  // ─── 2.14 Join modal close ──────────────────────────────────────────────────────
  test('2.14 — join round modal can be dismissed', async ({ page }) => {
    const watchBtn = page.getByLabel('Watch a live round');
    await watchBtn.click();
    await page.waitForTimeout(500);

    // Modal is visible
    const modalHeading = page.getByText('Enter Round Code');
    await expect(modalHeading).toBeVisible();

    // Click the close button (X)
    const closeBtn = page.locator('button').filter({ has: page.locator('svg.lucide-x') });
    await closeBtn.click();
    await page.waitForTimeout(500);

    // Modal should be gone
    await expect(modalHeading).not.toBeVisible();
  });
});
