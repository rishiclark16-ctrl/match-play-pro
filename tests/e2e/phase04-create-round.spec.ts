/**
 * Phase 4: Create Round Flow
 * Tests the 3-step round creation: Course → Players → Format.
 */
import { test, expect } from '@playwright/test';
import { setupAuthenticatedTest, waitForAppReady } from './helpers';

test.describe('Phase 4: Create Round Flow', () => {

  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedTest(page);
    await page.goto('/new-round');
    await waitForAppReady(page);
  });

  // ─── 4.1 Page loads ────────────────────────────────────────────────────────
  test('4.1 — /new-round page loads with Step 1 (course)', async ({ page }) => {
    await expect(page.getByText('Step 1 of 3')).toBeVisible();
    // Back button exists
    const backBtn = page.locator('button').filter({ has: page.locator('svg.lucide-arrow-left') });
    await expect(backBtn).toBeVisible();
  });

  // ─── 4.2 Course search visible ─────────────────────────────────────────────
  test('4.2 — course search input is visible', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="search" i], input[placeholder*="course" i]');
    await expect(searchInput).toBeVisible();
  });

  // ─── 4.3 Add Course Manually ───────────────────────────────────────────────
  test('4.3 — "Add Course Manually" button shows form', async ({ page }) => {
    await page.getByText('Add Course Manually').click();
    await page.waitForTimeout(400);
    // Manual course form should show
    await expect(page.getByText('Add New Course')).toBeVisible();
    await expect(page.locator('input[placeholder="Course name"]')).toBeVisible();
    await expect(page.locator('input[placeholder*="Location"]')).toBeVisible();
  });

  // ─── 4.4 Manual course — Save Course enables Next ──────────────────────────
  test('4.4 — saving manual course enables Next button', async ({ page }) => {
    await page.getByText('Add Course Manually').click();
    await page.waitForTimeout(400);

    // Save Course button should be disabled when name is empty
    const saveBtn = page.getByRole('button', { name: /Save Course/i });
    await expect(saveBtn).toBeDisabled();

    // Fill course name
    await page.locator('input[placeholder="Course name"]').fill('Test Golf Club');
    await page.waitForTimeout(300);

    // Save Course should now be enabled
    await expect(saveBtn).toBeEnabled();

    // Click Save Course — it creates the course and shows the selected card
    await saveBtn.click();
    await page.waitForTimeout(300);

    // The course card should show with a checkmark
    await expect(page.getByText('Test Golf Club')).toBeVisible();
  });

  // ─── 4.5 Hole count toggle ────────────────────────────────────────────────
  test('4.5 — hole count toggle between 9 and 18', async ({ page }) => {
    // 9 and 18 Holes buttons should be visible
    await expect(page.getByRole('button', { name: '9 Holes' })).toBeVisible();
    await expect(page.getByRole('button', { name: '18 Holes' })).toBeVisible();

    // Click 9 Holes
    await page.getByRole('button', { name: '9 Holes' }).click();
    await page.waitForTimeout(200);
  });

  // ─── 4.6 Navigate to Step 2 (Players) ────────────────────────────────────
  test('4.6 — Next from course step goes to Players step', async ({ page }) => {
    // Add course manually
    await page.getByText('Add Course Manually').click();
    await page.waitForTimeout(400);
    await page.locator('input[placeholder="Course name"]').fill('Test Golf Club');

    // Click Next
    await page.getByRole('button', { name: /Next/i }).click();
    await page.waitForTimeout(500);

    // Should now be on Players step
    await expect(page.getByText('Step 2 of 3')).toBeVisible();
  });

  // ─── 4.7 Players step has 2 default player slots ─────────────────────────
  test('4.7 — players step shows 2 default player slots', async ({ page }) => {
    // Navigate to Players step
    await page.getByText('Add Course Manually').click();
    await page.waitForTimeout(400);
    await page.locator('input[placeholder="Course name"]').fill('Test Golf Club');
    await page.getByRole('button', { name: /Next/i }).click();
    await page.waitForTimeout(500);

    // Should have at least 2 player name inputs
    const playerInputs = page.locator('input[placeholder*="Player" i], input[placeholder*="name" i]');
    const count = await playerInputs.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  // ─── 4.8 Player names required for Next ───────────────────────────────────
  test('4.8 — Next requires at least 2 player names', async ({ page }) => {
    // Navigate to Players step
    await page.getByText('Add Course Manually').click();
    await page.waitForTimeout(400);
    await page.locator('input[placeholder="Course name"]').fill('Test Golf Club');
    await page.getByRole('button', { name: /Next/i }).click();
    await page.waitForTimeout(500);

    // Next should be disabled with empty players
    const nextBtn = page.getByRole('button', { name: /Next/i });
    await expect(nextBtn).toBeDisabled();

    // Fill 2 player names
    const playerInputs = page.locator('input[placeholder*="Player" i], input[placeholder*="name" i]');
    await playerInputs.nth(0).fill('Alice');
    await playerInputs.nth(1).fill('Bob');
    await page.waitForTimeout(300);

    // Next should now be enabled
    await expect(nextBtn).toBeEnabled();
  });

  // ─── 4.9 Navigate to Step 3 (Format) ─────────────────────────────────────
  test('4.9 — Next from players step goes to Format step', async ({ page }) => {
    // Navigate through course and players
    await page.getByText('Add Course Manually').click();
    await page.waitForTimeout(400);
    await page.locator('input[placeholder="Course name"]').fill('Test Golf Club');
    await page.getByRole('button', { name: /Next/i }).click();
    await page.waitForTimeout(500);

    // Fill player names
    const playerInputs = page.locator('input[placeholder*="Player" i], input[placeholder*="name" i]');
    await playerInputs.nth(0).fill('Alice');
    await playerInputs.nth(1).fill('Bob');
    await page.getByRole('button', { name: /Next/i }).click();
    await page.waitForTimeout(500);

    // Should now be on Format step
    await expect(page.getByText('Step 3 of 3')).toBeVisible();
  });

  // ─── 4.10 Format step shows game toggles ─────────────────────────────────
  test('4.10 — format step shows game type toggles', async ({ page }) => {
    // Navigate to format step
    await page.getByText('Add Course Manually').click();
    await page.waitForTimeout(400);
    await page.locator('input[placeholder="Course name"]').fill('Test Golf Club');
    await page.getByRole('button', { name: /Next/i }).click();
    await page.waitForTimeout(500);
    const playerInputs = page.locator('input[placeholder*="Player" i], input[placeholder*="name" i]');
    await playerInputs.nth(0).fill('Alice');
    await playerInputs.nth(1).fill('Bob');
    await page.getByRole('button', { name: /Next/i }).click();
    await page.waitForTimeout(500);

    // Should see game format options
    await expect(page.getByText(/Skins/i)).toBeVisible();
    await expect(page.getByText(/Nassau/i)).toBeVisible();
    // Start Round button should exist
    await expect(page.getByRole('button', { name: /Start Round/i })).toBeVisible();
  });

  // ─── 4.11 Back button navigates backwards ─────────────────────────────────
  test('4.11 — back button returns to previous step', async ({ page }) => {
    // Go to Players step
    await page.getByText('Add Course Manually').click();
    await page.waitForTimeout(400);
    await page.locator('input[placeholder="Course name"]').fill('Test Golf Club');
    await page.getByRole('button', { name: /Save Course/i }).click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /Next/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText('Step 2 of 3')).toBeVisible();

    // Click back
    const backBtn = page.locator('button').filter({ has: page.locator('svg.lucide-arrow-left') });
    await backBtn.click();
    await page.waitForTimeout(500);

    // Should be back on course step
    await expect(page.getByText('Step 1 of 3')).toBeVisible();
  });

  // ─── 4.12 Back from Step 1 goes to Home ───────────────────────────────────
  test('4.12 — back from Step 1 navigates to Home', async ({ page }) => {
    const backBtn = page.locator('button').filter({ has: page.locator('svg.lucide-arrow-left') });
    await backBtn.click();
    await page.waitForURL('/', { timeout: 10_000 });
    expect(page.url()).not.toContain('/new-round');
  });

  // ─── 4.13 Start Round creates round ───────────────────────────────────────
  test('4.13 — Start Round button creates round and navigates to scorecard', async ({ page }) => {
    // Navigate through all steps
    await page.getByText('Add Course Manually').click();
    await page.waitForTimeout(400);
    await page.locator('input[placeholder="Course name"]').fill('E2E Test Course');
    await page.getByRole('button', { name: /Save Course/i }).click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /Next/i }).click();
    await page.waitForTimeout(500);

    const playerInputs = page.locator('input[placeholder*="Player" i], input[placeholder*="name" i]');
    await playerInputs.nth(0).fill('Alice');
    await playerInputs.nth(1).fill('Bob');
    await page.getByRole('button', { name: /Next/i }).click();
    await page.waitForTimeout(500);

    // Click Start Round — scroll it into view and click via evaluate
    const startBtn = page.getByRole('button', { name: /Start Round/i });
    await expect(startBtn).toBeVisible();
    // Check if it's disabled
    const isDisabled = await startBtn.isDisabled();
    expect(isDisabled).toBe(false);
    // Click by scrolling into view
    await startBtn.scrollIntoViewIfNeeded();
    await startBtn.click();

    // Should navigate to /round/:id (scorecard) after Supabase creates the round
    await page.waitForURL(/\/round\//, { timeout: 30_000 });
    expect(page.url()).toContain('/round/');
  });
});
