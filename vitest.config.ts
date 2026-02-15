import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: [
        'src/lib/**/*.{ts,tsx}',
        'src/hooks/**/*.{ts,tsx}',
      ],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
        'src/test/**',
        'src/lib/sentry.ts',
        'src/lib/logger.ts',
        'src/lib/statusBar.ts',
      ],
      thresholds: {
        // Game logic - well tested, maintain high coverage
        'src/lib/games/**': {
          statements: 75,
          branches: 65,
          functions: 75,
          lines: 75,
        },
        // Hooks - baseline, improve over time
        'src/hooks/**': {
          statements: 15,
          branches: 12,
          functions: 12,
          lines: 15,
        },
        // Global minimums - realistic starting point
        statements: 30,
        branches: 25,
        functions: 25,
        lines: 30,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
