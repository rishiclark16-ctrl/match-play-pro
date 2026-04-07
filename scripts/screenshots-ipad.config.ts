import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: 'scripts/app-store-screenshots.ts',
  timeout: 180_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:8080',
    // iPad Pro 12.9" — 2048×2732 @ 2x = 1024×1366 viewport
    viewport: { width: 1024, height: 1366 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    colorScheme: 'dark',
  },
  projects: [
    {
      name: 'ipad-12.9',
      use: {
        viewport: { width: 1024, height: 1366 },
        deviceScaleFactor: 2,
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
