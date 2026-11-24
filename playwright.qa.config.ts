import { defineConfig } from '@playwright/test';

/**
 * QA suite: every screen audited at three device sizes, plus core journeys,
 * against a mocked backend (tests/qa/mockBackend.ts). No real accounts, no AI
 * calls, no production writes.
 *
 *   bun run test:qa                     # run
 *   UPDATE_QA_BASELINE=1 bun run test:qa # record current findings as known debt
 *
 * Cloud containers: QA_CHROMIUM=/opt/pw-browsers/chromium (the repo pins its own Playwright).
 */
const port = Number(process.env.QA_PORT || 4173);
const launchOptions = process.env.QA_CHROMIUM ? { executablePath: process.env.QA_CHROMIUM } : {};
const iosUA = (device: 'iPhone' | 'iPad') =>
  `Mozilla/5.0 (${device}; CPU ${device === 'iPad' ? 'OS' : 'iPhone OS'} 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1`;

export default defineConfig({
  testDir: './tests/qa',
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'qa-report' }]],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions,
  },
  projects: [
    // Smallest supported phone: where overflow and cramped layouts show first.
    { name: 'iphone-se', use: { viewport: { width: 375, height: 667 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: iosUA('iPhone') } },
    { name: 'iphone-pro-max', use: { viewport: { width: 440, height: 956 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: iosUA('iPhone') } },
    { name: 'ipad', use: { viewport: { width: 1032, height: 1376 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: iosUA('iPad') } },
  ],
  webServer: {
    command: `bunx vite --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
