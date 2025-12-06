# E2E Testing Setup

This directory contains end-to-end tests for the hobby.ninja web application using Playwright.

## 🎯 Available E2E Targets

### Development Server Testing
Tests against the Vite development server (localhost:3000).

**Automatic Dev Server**: Playwright automatically starts and manages the dev server for you:

```bash
# Automatic dev server start + E2E testing
TEST_ENV=development pnpm nx test:e2e:dev web

# Run specific tests with auto dev server
TEST_ENV=development pnpm nx test:e2e:dev web --project=chromium --testFiles="universal-smoke.e2e.test.ts"

# Run with different reporters
TEST_ENV=development pnpm nx test:e2e:dev web --reporter=html
```

### Production Build Testing
Tests against the built production static server (localhost:4200).

```bash
# Run tests against production build
TEST_ENV=production pnpm nx test:e2e:prod web
```

### Default E2E Testing
Tests against production build using the default Playwright configuration.

```bash
pnpm nx test:e2e web
```

## 📁 Test Files

- `universal-smoke.e2e.test.ts` - Universal smoke test that adapts to dev/prod environments
- `smoke.final.e2e.test.ts` - Minimal smoke test for basic functionality
- `smoke.e2e.test.ts` - Comprehensive smoke test suite
- `basic-smoke.e2e.test.ts` - Basic functionality tests

## 🔧 Configuration Files

- `playwright.config.ts` - Default Playwright configuration
- `playwright.dev.config.ts` - Development-specific configuration
- `playwright.prod.config.ts` - Production-specific configuration

## 🌐 Browser Support

### Development Testing
- Chromium (Desktop Chrome)
- Firefox (Desktop Firefox)
- WebKit (Desktop Safari)
- Mobile Chrome (Pixel 5 emulation)

### Production Testing
- All development browsers +
- Mobile Safari (iPhone 12 emulation)
- Tablet (iPad Pro emulation)

## 📊 Test Results

Test results are saved to:
- Development: `test-results/dev/`
- Production: `test-results/prod/`
- Reports: `playwright-report/dev/` and `playwright-report/prod/`

## 🚀 Running Specific Tests

```bash
# Run specific test file
pnpm nx test:e2e:dev web --testFiles="universal-smoke.e2e.test.ts"

# Run specific browser
pnpm nx test:e2e:dev web --project=chromium

# Run with specific reporter
pnpm nx test:e2e:dev web --reporter=line
```

## 🛠 Environment Variables

- `TEST_ENV=development` - Run tests in development mode
- `TEST_ENV=production` - Run tests in production mode
- `CI=true` - Enable CI-specific settings (no retries, etc.)

## 📝 Test Features

### Universal Smoke Test Features:
- ✅ HTTP response validation
- ✅ HTML structure verification
- ✅ React application mounting
- ✅ Page title validation
- ✅ JavaScript error filtering
- ✅ Basic interactivity testing
- ✅ Environment-specific expectations

### Error Filtering
Tests automatically filter out non-critical errors:
- Development warnings and deprecations
- MIME type issues from static server
- X-Frame-Options warnings
- React DevTools messages

## 🔍 Debugging Failed Tests

1. Screenshots are saved for failed tests
2. Video recordings are available for test runs
3. Console errors and warnings are captured
4. HTML snapshots are preserved

```bash
# Open HTML report
open playwright-report/dev/index.html
open playwright-report/prod/index.html
```