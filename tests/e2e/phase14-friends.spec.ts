/**
 * Phase 14: Friends (via Social page)
 * Tests the friends tab on the consolidated Social page.
 * The /friends route now redirects to /social?tab=friends.
 */
import { test, expect } from '@playwright/test';
import { setupAuthenticatedTest, waitForAppReady } from './helpers';

test.describe('Phase 14: Friends', () => {

  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedTest(page);
    await page.goto('/social?tab=friends');
    await waitForAppReady(page);
  });

  // ─── 14.1 Redirect from /friends ─────────────────────────────────────────
  test('14.1 — /friends redirects to /social?tab=friends', async ({ page }) => {
    await page.goto('/friends');
    await page.waitForURL(/\/social\?tab=friends/, { timeout: 10_000 });
    expect(page.url()).toContain('/social?tab=friends');
  });

  // ─── 14.2 Friends tab loads with "Add a Friend" section ──────────────────
  test('14.2 — Friends tab shows "Add a Friend" section', async ({ page }) => {
    await expect(page.getByText('Add a Friend')).toBeVisible();
  });

  // ─── 14.3 Search type tabs visible and switchable ────────────────────────
  test('14.3 — search type tabs (Name, Code, Email, Phone) switch correctly', async ({ page }) => {
    // All four search type buttons should be visible
    const nameTab = page.getByRole('button', { name: 'Name' });
    const codeTab = page.getByRole('button', { name: 'Code' });
    const emailTab = page.getByRole('button', { name: 'Email' });
    const phoneTab = page.getByRole('button', { name: 'Phone' });

    await expect(nameTab).toBeVisible();
    await expect(codeTab).toBeVisible();
    await expect(emailTab).toBeVisible();
    await expect(phoneTab).toBeVisible();

    // Click Code tab — placeholder should change
    await codeTab.click();
    await expect(page.locator('input[placeholder="Enter code..."]')).toBeVisible();

    // Click Email tab
    await emailTab.click();
    await expect(page.locator('input[placeholder="Enter email..."]')).toBeVisible();

    // Click Phone tab
    await phoneTab.click();
    await expect(page.locator('input[placeholder="Enter phone..."]')).toBeVisible();

    // Click Name tab — back to name search
    await nameTab.click();
    await expect(page.locator('input[placeholder="Search by name..."]')).toBeVisible();
  });

  // ─── 14.4 Name search input accepts text ─────────────────────────────────
  test('14.4 — name search input shows and accepts text', async ({ page }) => {
    const input = page.locator('input[placeholder="Search by name..."]');
    await expect(input).toBeVisible();
    await input.fill('Tiger');
    await expect(input).toHaveValue('Tiger');
  });

  // ─── 14.5 "Your Friends" section visible ─────────────────────────────────
  test('14.5 — "Your Friends" section is visible', async ({ page }) => {
    await expect(page.getByText('Your Friends')).toBeVisible();
  });

  // ─── 14.6 Friend code section exists (collapsible) ───────────────────────
  test('14.6 — friend code section exists and is collapsible', async ({ page }) => {
    const codeButton = page.getByText('Your Friend Code');
    await expect(codeButton).toBeVisible();

    // Click to expand
    await codeButton.click();
    // After expanding, the large friend code display should appear
    // Wait a moment for animation
    await page.waitForTimeout(500);
    // The expanded section shows the code in a large mono font
    const expandedCode = page.locator('.font-mono.text-3xl');
    await expect(expandedCode).toBeVisible();

    // Click again to collapse
    await codeButton.click();
    await page.waitForTimeout(500);
    await expect(expandedCode).not.toBeVisible();
  });

  // ─── 14.7 QR scan button exists ──────────────────────────────────────────
  test('14.7 — QR scan button exists', async ({ page }) => {
    // The scan button uses the ScanLine icon, inside a 9x9 button near "Add a Friend"
    const scanButton = page.locator('button').filter({ has: page.locator('svg.lucide-scan-line') });
    await expect(scanButton).toBeVisible();
  });

  // ─── 14.8 Contact sync button exists ─────────────────────────────────────
  test('14.8 — contact sync button exists', async ({ page }) => {
    // The contact sync button uses the Contact icon
    const contactButton = page.locator('button').filter({ has: page.locator('svg.lucide-contact') });
    await expect(contactButton).toBeVisible();
  });

  // ─── 14.9 Code input uppercases automatically ────────────────────────────
  test('14.9 — code input uppercases input automatically', async ({ page }) => {
    await page.getByRole('button', { name: 'Code' }).click();
    const input = page.locator('input[placeholder="Enter code..."]');
    await input.fill('abc123');
    await expect(input).toHaveValue('ABC123');
  });

  // ─── 14.10 Social heading visible on friends tab ─────────────────────────
  test('14.10 — Social heading is visible when on friends tab', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Social' })).toBeVisible();
  });
});
