import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: 'scripts/app-store-screenshots.ts',
  timeout: 180_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:8080',
    // iPhone 14 Pro Max — 6.5" display (1284×2778 @ 3x = 428×926)
    viewport: { width: 428, height: 926 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    colorScheme: 'dark',
  },
  projects: [
    {
      name: 'iphone-6.7',
      use: {
        viewport: { width: 428, height: 926 },
        deviceScaleFactor: 3,
      },
    },
  ],
  webServer: {
    command: 'bun run dev',
    url: process.env.E2E_BASE_URL || 'http://localhost:8080',
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
