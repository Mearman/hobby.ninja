import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for testing against built production server
 * Uses the static file server to test production builds
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
  outputDir: './test-results/prod',

  // Enhanced reporter configuration
  reporter: [
    ['html', { outputFolder: './playwright-report/prod' }],
    ['json', { outputFile: './test-results/prod-results.json' }],
    ['junit', { outputFile: './test-results/junit-prod.xml' }],
    ['line'],
  ],

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env['CI'],

  // Retry on CI only
  retries: process.env['CI'] ? 2 : 0,

  // Worker configuration
  workers: process.env['CI'] ? 2 : 4,

  // Maximum test failures
  maxFailures: process.env['CI'] ? 10 : undefined,

  // Shared settings for all projects
  use: {
    // Base URL for production static server
    baseURL: 'http://localhost:4200/hobby-ninja',

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

    // Ignore HTTPS errors for local testing
    ignoreHTTPSErrors: true,

    // Viewport size
    viewport: { width: 1280, height: 720 },
  },

  // Configure projects for comprehensive testing
  projects: [
    // Desktop browsers
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
      testMatch: '**/*.mobile.e2e.test.{ts,tsx}',
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
      testMatch: '**/*.mobile.e2e.test.{ts,tsx}',
    },
    // Tablet testing
    {
      name: 'Tablet',
      use: { ...devices['iPad Pro'] },
      testMatch: '**/*.tablet.e2e.test.{ts,tsx}',
    },
  ],

  // Production server configuration (starts static file server)
  webServer: {
    command: 'pnpm nx serve-static web',
    url: 'http://localhost:4200/hobby-ninja',
    reuseExistingServer: !process.env['CI'],
    timeout: 120 * 1000, // 2 minutes
    stdout: 'pipe',
    stderr: 'pipe',
  },

  // Performance settings
  reportSlowTests: {
    max: 5,
    threshold: 15000,
  },

  // Metadata
  metadata: {
    'Test Environment': 'Production',
    'Test Suite': 'E2E Production Tests',
    'Target': 'Static Production Build',
  },
});