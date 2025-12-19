import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for testing against Vite development server
 * Uses the running dev server on localhost:3000
 */
export default defineConfig({
  // Test directory and patterns
  testDir: './',
  testMatch: [
    '**/*.e2e.test.{ts,tsx}',
    '**/e2e/**/*.{test,spec}.{ts,tsx}',
    '**/__tests__/**/*.{test,spec}.{ts,tsx}',
  ],

  // Timeout configurations
  timeout: 30000,
  expect: {
    timeout: 5000,
  },

  // Test output directory
  outputDir: './test-results/dev',

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: './playwright-report/dev' }],
    ['json', { outputFile: './test-results/dev-results.json' }],
    ['line'],
  ],

  // Run tests in files in parallel
  fullyParallel: true,

  // Retry on CI only
  retries: process.env['CI'] ? 2 : 0,

  // Worker configuration
  workers: process.env['CI'] ? 2 : 4,

  // Shared settings for all projects
  use: {
    // Base URL for Vite dev server
    baseURL: 'http://localhost:3000/hobby-ninja',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshot configuration
    screenshot: 'only-on-failure',

    // Video recording for failed tests
    video: 'retain-on-failure',

    // Locale and timezone
    locale: 'en-US',
    timezoneId: 'America/New_York',

    // Color scheme testing
    colorScheme: 'light',

    // Ignore HTTPS errors for local development
    ignoreHTTPSErrors: true,

    // Viewport size
    viewport: { width: 1280, height: 720 },
  },

  // Configure projects for major browsers (development testing)
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
    // Add mobile testing
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
      testMatch: '**/*.mobile.e2e.test.{ts,tsx}',
    },
  ],

  // Development server configuration (auto-start dev server)
  webServer: {
    command: 'pnpm nx serve web --port=3000',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120 * 1000, // 2 minutes for dev server to start
    stdout: 'ignore',
    stderr: 'ignore',
  },

  // Performance settings
  reportSlowTests: {
    max: 5,
    threshold: 15000,
  },

  // Metadata
  metadata: {
    'Test Environment': 'Development',
    'Test Suite': 'E2E Development Tests',
    'Target': 'Vite Dev Server',
  },
});