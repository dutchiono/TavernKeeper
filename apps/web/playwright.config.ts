import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for E2E testing
 * Run tests with: pnpm test:e2e
 * Watch mode: pnpm test:e2e:watch
 * UI mode: pnpm test:e2e:ui
 *
 * Automatically cleans test-results and playwright-report before each run
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // Run tests sequentially to avoid system freeze
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Limit workers to prevent system freeze - use 4 workers for better performance
  workers: process.env.CI ? 1 : 4, // Use 4 workers locally, 1 in CI
  // Clean test results before each run
  globalSetup: './e2e/global-setup.ts',
  // Don't preserve output between runs - clean up after each test run
  preserveOutput: 'never',
  // Single output directory that gets cleaned by global-setup
  outputDir: './test-results',
  reporter: [
    ['list'], // Terminal-friendly output
    ['html'], // HTML report (overwrites previous)
    ['json', { outputFile: 'test-results/playwright-results.json' }], // JSON results (overwrites previous)
  ],
  use: {
    baseURL: 'http://localhost:3000',
    // Only create traces on retry (when test fails)
    trace: 'on-first-retry',
    // Only take screenshots on failure
    screenshot: 'only-on-failure',
    // Don't create video recordings
    video: 'off',
  },
  // Increase timeout for slow-loading pages
  timeout: 60000, // 60 seconds instead of default 30
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    // Mobile testing
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});

