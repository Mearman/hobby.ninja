import { defineConfig, devices } from '@playwright/test';

/**
 * Enhanced Playwright configuration for comprehensive E2E testing
 * Supports multiple browsers, devices, accessibility, visual regression, and performance testing
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Test directory and patterns
  testDir: './',
  testMatch: [
    '**/*.e2e.test.{ts,tsx}',
    '**/e2e/**/*.{test,spec}.{ts,tsx}',
    '**/tests/**/*.{test,spec}.{ts,tsx}',
  ],
  testIgnore: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/.nx/**',
    '**/coverage/**',
    '**/*.unit.test.{ts,tsx}',
    '**/*.component.test.{ts,tsx}',
    '**/*.integration.test.{ts,tsx}',
  ],

  // Timeout configurations
  timeout: 30000, // 30 seconds per test
  expect: {
    timeout: 5000, // 5 seconds for assertions
  },

  // Test output directory
  outputDir: './test-results',

  // Enhanced reporter configuration
  reporter: [
    ['html', { outputFolder: './playwright-report' }],
    ['json', { outputFile: './test-results/results.json' }],
    ['junit', { outputFile: './test-results/junit.xml' }],
    ['line'], // Show progress during test run
    ['list'], // Console output
  ],

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Worker configuration - more workers for better performance
  workers: process.env.CI ? 2 : 4,

  // Maximum test failures
  maxFailures: process.env.CI ? 10 : undefined,

  // Update snapshots
  updateSnapshots: process.env.CI ? 'missing' : 'all',

  // Snapshot directory
  snapshotDir: './snapshots',

  // Enhanced shared settings for all projects
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: 'http://localhost:3000',

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

    // Reduced motion for accessibility testing
    reducedMotion: 'reduce',

    // Ignore HTTPS errors for local development
    ignoreHTTPSErrors: true,

    // Viewport size
    viewport: { width: 1280, height: 720 },
  },

  // Configure projects for major browsers and testing scenarios
  projects: [
    // Desktop browsers
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Additional Chrome-specific options
        launchOptions: {
          args: ['--disable-web-security'],
        },
      },
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

    // Branded browsers
    {
      name: 'Microsoft Edge',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },
    {
      name: 'Google Chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },

    // Specialized testing projects
    {
      name: 'accessibility',
      use: {
        ...devices['Desktop Chrome'],
        // Accessibility-specific settings
        reducedMotion: 'reduce',
        forcedColors: 'active',
      },
      testMatch: '**/*.a11y.e2e.test.{ts,tsx}',
    },

    {
      name: 'visual',
      use: {
        ...devices['Desktop Chrome'],
        // Visual regression settings
        screenshot: 'only-on-failure',
        fullPage: true,
      },
      testMatch: '**/*.visual.e2e.test.{ts,tsx}',
    },

    {
      name: 'performance',
      use: {
        ...devices['Desktop Chrome'],
        // Performance testing settings
        launchOptions: {
          args: [
            '--disable-extensions',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
          ],
        },
      },
      testMatch: '**/*.perf.e2e.test.{ts,tsx}',
    },
  ],

  // Enhanced web server configuration
  webServer: {
    command: 'npm run serve',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // 2 minutes
    stdout: 'pipe',
    stderr: 'pipe',
  },

  // Performance settings
  reportSlowTests: {
    max: 5,
    threshold: 15000, // 15 seconds
  },

  // Global environment variables
  env: {
    NODE_ENV: 'test',
    CI: process.env.CI || 'false',
    DEBUG: process.env.DEBUG || 'false',
  },

  // Advanced configuration
  metadata: {
    'Test Environment': process.env.NODE_ENV || 'test',
    'Test Suite': 'E2E Tests',
    'Browser Coverage': 'Cross-browser',
  },

  // Custom configurations for specific test patterns
  testConfig: {
    '**/accessibility/**': {
      retries: 3,
      timeout: 45000,
    },
    '**/visual/**': {
      retries: 1,
      timeout: 60000,
    },
    '**/performance/**': {
      retries: 1,
      timeout: 120000,
    },
  },
});