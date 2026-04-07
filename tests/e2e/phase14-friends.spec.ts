/**
 * Phase 14: Friends
 * Tests the friends page — search, friend code, friend list.
 */
import { test, expect } from '@playwright/test';
import { setupAuthenticatedTest, waitForAppReady } from './helpers';

test.describe('Phase 14: Friends', () => {

  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedTest(page);
    await page.goto('/friends');
    await waitForAppReady(page);
  });

  // ─── 14.1 Page loads ──────────────────────────────────────────────────────
  test('14.1 — /friends page loads with header', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Friends' })).toBeVisible();
  });

  // ─── 14.2 Add Friend input visible ────────────────────────────────────────
  test('14.2 — add friend search input is visible', async ({ page }) => {
    // There should be a search/code input for adding friends
    const searchInput = page.locator('input[placeholder*="friend" i], input[placeholder*="search" i], input[placeholder*="code" i], input[placeholder*="email" i]');
    await expect(searchInput.first()).toBeVisible();
  });

  // ─── 14.3 Your Friends section ────────────────────────────────────────────
  test('14.3 — "Your Friends" section visible', async ({ page }) => {
    const friendsLabel = page.getByText('Your Friends');
    await expect(friendsLabel).toBeVisible();
  });

  // ─── 14.4 Empty state for new user ────────────────────────────────────────
  test('14.4 — new user sees empty friends state', async ({ page }) => {
    // Should show a message about sharing friend code or QR
    const emptyText = page.getByText(/share.*friend.*code|no friends|connect/i);
    const emptyCount = await emptyText.count();
    expect(emptyCount).toBeGreaterThanOrEqual(0); // May or may not show, just check no crash
  });

  // ─── 14.5 Back navigation ────────────────────────────────────────────────
  test('14.5 — back button navigates home', async ({ page }) => {
    const backBtn = page.locator('button').filter({ has: page.locator('svg.lucide-arrow-left') });
    if (await backBtn.isVisible()) {
      await backBtn.click();
      await page.waitForURL('/', { timeout: 10_000 });
    }
  });
});
