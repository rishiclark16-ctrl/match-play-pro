/**
 * Every screen, at every device size: loads cleanly, no console errors, nothing
 * off-screen, tap targets big enough, no new accessibility violations. A full-page
 * screenshot of each is attached to the report for human (and Claude) review.
 */
import { test, expect, type Page } from '@playwright/test';
import { mockBackend, R_DONE, R_LIVE, SENTENCE } from './mockBackend';
import { audit, ratchet, watchConsole } from './audit';

interface Screen { name: string; path: string; signedIn?: boolean; ready?: (page: Page) => Promise<void> }

const SCREENS: Screen[] = [
  { name: 'home', path: '/' },
  { name: 'play-compose', path: '/play' },
  {
    name: 'play-review', path: '/play',
    ready: async page => {
      await page.getByLabel('Describe your round').fill(SENTENCE);
      await page.getByRole('button', { name: 'Set it up' }).click();
      await expect(page.getByRole('button', { name: 'Tee off' })).toBeVisible({ timeout: 15_000 });
    },
  },
  { name: 'scorecard', path: `/round/${R_LIVE}` },
  { name: 'leaderboard', path: `/round/${R_LIVE}/leaderboard` },
  { name: 'dashboard', path: `/round/${R_LIVE}/dashboard` },
  { name: 'round-complete', path: `/round/${R_DONE}/complete` },
  { name: 'new-round', path: '/new-round' },
  { name: 'rounds', path: '/rounds' },
  { name: 'stats', path: '/stats' },
  { name: 'social', path: '/social' },
  { name: 'groups', path: '/groups' },
  { name: 'profile', path: '/profile' },
  { name: 'my-formats', path: '/my-formats' },
  { name: 'ai-game-builder', path: '/my-formats/new' },
  { name: 'auth', path: '/auth', signedIn: false },
  { name: 'join', path: '/join' },
  { name: 'watch', path: `/watch/${R_LIVE}` },
  { name: 'friend-profile', path: '/profile/u-jack' },
  { name: 'onboarding', path: '/onboarding' },
  { name: 'privacy-policy', path: '/privacy-policy', signedIn: false },
  { name: 'terms', path: '/terms-of-service', signedIn: false },
  { name: 'support', path: '/support', signedIn: false },
  { name: 'not-found', path: '/no-such-page' },
  {
    name: 'paywall', path: '/profile',
    ready: async page => {
      await page.getByRole('button', { name: /upgrade|go pro|unlock/i }).first().click();
      await expect(page.getByRole('dialog')).toBeVisible();
    },
  },
];

for (const screen of SCREENS) {
  test(`${screen.name}`, async ({ page }, testInfo) => {
    const consoleFindings = watchConsole(page);
    await mockBackend(page, { signedIn: screen.signedIn, tier: screen.name === 'paywall' ? 'free' : 'pro' });
    await page.goto(screen.path);
    await page.waitForLoadState('networkidle');
    // The launch splash fades over the first screen; audit what's under it, not the fade.
    await page.locator('[data-splash]').waitFor({ state: 'detached', timeout: 10_000 }).catch(() => {});
    if (screen.ready) await screen.ready(page);
    await page.waitForTimeout(1200); // let entrance animations settle

    // Never the error boundary, never a blank page.
    await expect(page.getByText(/something went wrong/i)).toHaveCount(0);
    expect((await page.locator('body').innerText()).trim().length, 'page rendered no text').toBeGreaterThan(20);

    await testInfo.attach(`${screen.name}.png`, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });

    const findings = await audit(page, consoleFindings);
    // QA_DUMP=1 prints every finding with its detail (colours, sizes) to help fix known debt.
    if (process.env.QA_DUMP) console.log(findings.map(f => `[${testInfo.project.name}/${screen.name}] ${f.key}  (${f.detail})`).join('\n'));
    const { added, fixed } = ratchet(findings, screen.name, testInfo);
    if (fixed.length) testInfo.annotations.push({ type: 'fixed', description: `${fixed.length} known issue(s) gone. Run UPDATE_QA_BASELINE=1 to record: ${fixed.join(' | ')}` });
    expect(added.map(f => `${f.key}  (${f.detail})`), `New UI issues on ${screen.name}`).toEqual([]);
  });
}
