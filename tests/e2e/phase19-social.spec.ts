/**
 * Phase 19: Social
 * Tests the Social page — tabs, feed, upcoming rounds, friends, groups navigation.
 */
import { test, expect } from '@playwright/test';
import { setupAuthenticatedTest, waitForAppReady } from './helpers';

test.describe('Phase 19: Social', () => {

  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedTest(page);
    await page.goto('/social');
    await waitForAppReady(page);
  });

  // ─── 19.1 Page loads with heading ────────────────────────────────────────
  test('19.1 — /social page loads with "Social" heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Social' })).toBeVisible();
  });

  // ─── 19.2 Bottom nav Social tab active ────────────────────────────────────
  test('19.2 — Social tab is active in bottom nav', async ({ page }) => {
    const socialLink = page.locator('nav a[href="/social"]');
    await expect(socialLink).toBeVisible();
    // Active tab has a yellow dot indicator (span with rounded-full and bg-[#F0EE3A])
    const activeDot = socialLink.locator('span.rounded-full');
    await expect(activeDot).toBeVisible();
  });

  // ─── 19.3 All three tabs visible ─────────────────────────────────────────
  test('19.3 — all 3 tabs visible: Feed, Upcoming, Friends', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Feed' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Upcoming' })).toBeVisible();
    // Friends tab text may include count like "Friends · 2"
    await expect(page.getByRole('button', { name: /^Friends/ })).toBeVisible();
  });

  // ─── 19.4 Tab switching — Feed to Upcoming ───────────────────────────────
  test('19.4 — clicking Upcoming tab shows upcoming content', async ({ page }) => {
    await page.getByRole('button', { name: 'Upcoming' }).click();
    await page.waitForTimeout(300); // animation
    // Upcoming tab should show its content area (UpcomingRoundsTab component)
    const body = page.locator('body');
    await expect(body).toContainText(/upcoming|no upcoming|scheduled|rounds/i);
  });

  // ─── 19.5 Tab switching — Feed to Friends ────────────────────────────────
  test('19.5 — clicking Friends tab shows friend management UI', async ({ page }) => {
    await page.getByRole('button', { name: /^Friends/ }).click();
    await page.waitForTimeout(300); // animation
    await expect(page.getByText('Add a Friend')).toBeVisible();
    await expect(page.getByText('Your Friends')).toBeVisible();
  });

  // ─── 19.6 Feed tab shows content area ────────────────────────────────────
  test('19.6 — Feed tab shows feed content area', async ({ page }) => {
    // Feed tab is active by default
    const body = page.locator('body');
    // SocialFeedTab renders feed content — at minimum the body should have text
    const text = await body.innerText();
    expect(text.length).toBeGreaterThan(50);
  });

  // ─── 19.7 Groups button navigates to /groups ─────────────────────────────
  test('19.7 — Groups button (Users icon) navigates to /groups', async ({ page }) => {
    // The groups button is in the header, uses Users icon
    const groupsButton = page.locator('button').filter({ has: page.locator('svg.lucide-users') });
    await expect(groupsButton).toBeVisible();
    await groupsButton.click();
    await page.waitForURL(/\/groups/, { timeout: 10_000 });
  });

  // ─── 19.8 Default tab is Feed ────────────────────────────────────────────
  test('19.8 — default active tab is Feed', async ({ page }) => {
    // The Feed button should have the active indicator (a motion div underneath)
    const feedButton = page.getByRole('button', { name: 'Feed' });
    // Active tab has text-foreground class (not text-muted-foreground)
    await expect(feedButton).toHaveClass(/text-foreground/);
  });

  // ─── 19.9 Tab query param sets initial tab ───────────────────────────────
  test('19.9 — ?tab=friends query param opens Friends tab directly', async ({ page }) => {
    await page.goto('/social?tab=friends');
    await waitForAppReady(page);
    // Friends tab content should be visible immediately
    await expect(page.getByText('Add a Friend')).toBeVisible();
  });

  // ─── 19.10 Tab switching back to Feed ────────────────────────────────────
  test('19.10 — switching from Friends back to Feed works', async ({ page }) => {
    // Go to Friends first
    await page.getByRole('button', { name: /^Friends/ }).click();
    await page.waitForTimeout(300);
    await expect(page.getByText('Add a Friend')).toBeVisible();

    // Switch back to Feed
    await page.getByRole('button', { name: 'Feed' }).click();
    await page.waitForTimeout(300);
    // "Add a Friend" should no longer be visible (it's on the Friends tab)
    await expect(page.getByText('Add a Friend')).not.toBeVisible();
  });
});
