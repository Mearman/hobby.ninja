# Development Commands Reference

This comprehensive reference covers all available commands for developing, testing, building, and deploying the Gunpla App.

##  Quick Reference

| Category | Command | Description |
|---------|---------|-------------|
| **Development** | `npm run dev` | Start development server |
| **Building** | `npm run build` | Build for production |
| **Testing** | `npm test` | Run all tests |
| **Linting** | `npm run lint` | Check code quality |
| **Formatting** | `npm run format` | Format code |
| **Database** | `npm run db:reset` | Reset local database |

---

##  Development Commands

### Starting Development Server

```bash
# Basic development server
npm run dev

# With custom port
npm run dev -- --port 4300

# Access from other devices
npm run dev -- --host 0.0.0.0

# Auto-open browser
npm run dev -- --open

# With HTTPS
npm run dev:https

# With mock data
npm run dev:mock

# With debugging enabled
npm run dev:debug
```

### Nx Development Commands

```bash
# Serve specific application
nx serve gunpla-app

# Serve with custom configuration
nx serve gunpla-app --configuration=development

# Serve with specific port
nx serve gunpla-app --port=4200

# Generate dependency graph
nx graph

# Serve with file watching
nx serve gunpla-app --watch
```

---

## 🔨 Build Commands

### Production Build

```bash
# Standard production build
npm run build

# Build with analysis
npm run build:analyze

# Build for specific environment
npm run build:production
npm run build:staging
npm run build:development

# Build with stats
npm run build:stats

# Build without source maps
npm run build:min

# Build for debugging
npm run build:debug
```

### Nx Build Commands

```bash
# Build specific application
nx build gunpla-app

# Build with specific configuration
nx build gunpla-app --configuration=production

# Build with verbose output
nx build gunpla-app --verbose

# Build without cache
nx build gunpla-app --skip-nx-cache
```

---

##  Testing Commands

### Running Tests

```bash
# Run all tests
npm test

# Run tests once
npm run test:once

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests for specific file
npm test -- KitCard.test.tsx

# Run tests matching pattern
npm test -- --grep "Kit.*"

# Run tests with verbose output
npm test -- --verbose
```

### Test Categories

```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# End-to-end tests only
npm run test:e2e

# E2E tests in headed mode
npm run test:e2e:headed

# E2E tests on specific browser
npm run test:e2e:chrome
npm run test:e2e:firefox
npm run test:e2e:safari
npm run test:e2e:edge
```

### Test Configuration

```bash
# Debug tests
npm run test:debug

# Run tests in CI mode
npm run test:ci

# Generate test coverage report
npm run test:coverage:report

# Update test snapshots
npm run test:update-snapshots

# Run tests with specific reporter
npm test -- --reporter=spec
```

### Nx Test Commands

```bash
# Test specific project
nx test gunpla-app

# Test specific project with coverage
nx test gunpla-app --coverage

# Test affected projects
nx affected --target=test

# Test with specific configuration
nx test gunpla-app --configuration=ci
```

---

## 🔍 Code Quality Commands

### Linting

```bash
# Run ESLint
npm run lint

# Auto-fix ESLint issues
npm run lint:fix

# Lint specific file
npm run lint -- src/components/KitCard.tsx

# Lint with specific formatter
npm run lint -- --format=compact

# Lint with warnings as errors
npm run lint:strict

# Check only (no auto-fix)
npm run lint:check
```

### Formatting

```bash
# Format all files
npm run format

# Check formatting without changing files
npm run format:check

# Format specific file
npm run format -- src/components/KitCard.tsx

# Format with specific config
npm run format -- --config .prettierrc.custom
```

### Type Checking

```bash
# TypeScript checking
npm run type-check

# Check without emitting files
npx tsc --noEmit

# Check specific file
npx tsc --noEmit src/components/KitCard.tsx

# Watch for type changes
npm run type-check:watch
```

### Nx Quality Commands

```bash
# Lint specific project
nx lint gunpla-app

# Lint affected projects
nx affected --target=lint

# Format affected files
nx format --write

# Type check affected projects
nx affected --target=build --parallel
```

---

## 🗄️ Database Commands

### Local Database Management

```bash
# Reset local database
npm run db:reset

# Seed database with sample data
npm run db:seed

# Clear all data
npm run db:clear

# Create database backup
npm run db:backup

# Restore from backup
npm run db:restore

# Validate database schema
npm run db:validate
```

### Data Import/Export

```bash
# Export all data
npm run db:export

# Export specific collection
npm run db:export:collection kits

# Import from file
npm run db:import data.json

# Import specific collection
npm run db:import:collection kits kits.json

# Merge data
npm run db:merge additional-data.json
```

### Database Migration

```bash
# Create new migration
npm run db:migration:create add_photo_field

# Run pending migrations
npm run db:migrate

# Rollback last migration
npm run db:rollback

# Check migration status
npm run db:status

# Generate migration from schema changes
npm run db:generate-migration
```

---

##  PWA Commands

### PWA Development

```bash
# Test PWA functionality
npm run pwa:test

# Build PWA assets
npm run pwa:build

# Generate manifest
npm run pwa:manifest

# Optimize service worker
npm run pwa:sw:build

# Test service worker
npm run pwa:sw:test

# Clear PWA cache
npm run pwa:cache:clear
```

### PWA Deployment

```bash
# Deploy PWA to staging
npm run pwa:deploy:staging

# Deploy PWA to production
npm run pwa:deploy:prod

# Test PWA installation
npm run pwa:test:install

# Validate PWA requirements
npm run pwa:validate

# Audit PWA with Lighthouse
npm run pwa:audit
```

---

##  Accessibility Commands

### Accessibility Testing

```bash
# Run accessibility tests
npm run a11y

# Run accessibility tests with specific rules
npm run a11y -- --tags wcag2aa

# Generate accessibility report
npm run a11y:report

# Test specific page
npm run a11y -- --url /collection

# Continuous accessibility monitoring
npm run a11y:watch

# Accessibility audit
npm run a11y:audit
```

### Accessibility Tools

```bash
# Install axe-core for automated testing
npm install axe-core

# Run axe accessibility tests
npm run a11y:axe

# Test color contrast
npm run a11y:contrast

# Test keyboard navigation
npm run a11y:keyboard

# Generate accessibility scorecard
npm run a11y:scorecard
```

---

##  Security Commands

### Security Scanning

```bash
# Run security audit
npm audit

# Fix security vulnerabilities
npm audit fix

# Security audit with dry run
npm audit --dry-run

# Check for secrets in code
npm run security:secrets

# Run dependency security check
npm run security:deps

# Generate security report
npm run security:report
```

### Security Testing

```bash
# Run security tests
npm run security:test

# Test authentication
npm run security:test:auth

# Test authorization
npm run security:test:authz

# Test input validation
npm run security:test:validation

# Test CSRF protection
npm run security:test:csrf
```

---

## 📊 Performance Commands

### Performance Analysis

```bash
# Analyze bundle size
npm run analyze

# Build with bundle analysis
npm run build:analyze

# Generate performance report
npm run perf:report

# Check performance budgets
npm run perf:budget

# Monitor Core Web Vitals
npm run perf:vitals
```

### Performance Testing

```bash
# Run Lighthouse audit
npm run lighthouse

# Performance profiling
npm run perf:profile

# Memory leak detection
npm run perf:memory

# Performance regression testing
npm run perf:regression

# Bundle size monitoring
npm run perf:bundle
```

---

##  Deployment Commands

### Deployment Preparation

```bash
# Prepare for deployment
npm run deploy:prepare

# Build deployment package
npm run deploy:build

# Generate deployment artifacts
npm run deploy:package

# Validate deployment readiness
npm run deploy:validate

# Create deployment tag
npm run deploy:tag
```

### Environment-Specific Deployment

```bash
# Deploy to development
npm run deploy:dev

# Deploy to staging
npm run deploy:staging

# Deploy to production
npm run deploy:prod

# Deploy to preview environment
npm run deploy:preview

# Rollback deployment
npm run deploy:rollback
```

### Deployment Platforms

```bash
# Deploy to Vercel
npm run deploy:vercel

# Deploy to Netlify
npm run deploy:netlify

# Deploy to GitHub Pages
npm run deploy:gh-pages

# Deploy to AWS S3
npm run deploy:s3

# Deploy to Docker
npm run deploy:docker
```

---

## 🔧 Utility Commands

### Project Management

```bash
# Show project information
npm run project:info

# List all available scripts
npm run

# Show Nx project graph
nx graph

# List available generators
nx list

# Show project dependencies
nx graph --focused=gunpla-app
```

### Generator Commands

```bash
# Generate new component
nx g @nx/react:component MyComponent

# Generate with specific options
nx g @nx/react:component MyComponent --project=gunpla-app --style=css

# Generate new library
nx g @nx/js:lib shared-utils

# Generate new application
nx g @nx/react:app my-app

# Generate new service
nx g @nx/js:service my-service
```

### Maintenance Commands

```bash
# Clean build artifacts
npm run clean

# Clean all caches
npm run clean:all

# Update dependencies
npm run update

# Check for outdated dependencies
npm outdated

# Verify project integrity
npm run verify

# Generate project documentation
npm run docs:generate
```

---

## 🎯 Specific Feature Commands

### Kit Management

```bash
# Generate kit-related components
nx g @nx/react:component KitCard --project=gunpla-app
nx g @nx/react:component KitForm --project=gunpla-app

# Test kit features
npm run test:kit

# Validate kit data
npm run validate:kit-data
```

### Collection Features

```bash
# Test collection functionality
npm run test:collection

# Seed collection with sample data
npm run seed:collection

# Export collection data
npm run export:collection
```

### Search and Filtering

```bash
# Test search functionality
npm run test:search

# Index search data
npm run index:search

# Optimize search performance
npm run optimize:search
```

---

## 📝 Environment Variables

### Development Environment

```bash
# Set development environment
export NODE_ENV=development

# Enable debugging
export DEBUG=true

# Set custom port
export PORT=4200

# Enable hot reload
export HMR=true
```

### Production Environment

```bash
# Set production environment
export NODE_ENV=production

# Disable debugging
export DEBUG=false

# Optimize bundles
export OPTIMIZE=true

# Enable minification
export MINIFY=true
```

### Feature Flags

```bash
# Enable PWA features
export ENABLE_PWA=true

# Enable analytics
export ENABLE_ANALYTICS=true

# Enable crash reporting
export ENABLE_CRASH_REPORTING=true

# Enable experimental features
export ENABLE_EXPERIMENTAL=false
```

---

## 🔍 Debugging Commands

### Development Debugging

```bash
# Start with Node.js debugging
npm run dev:debug

# Start with Chrome debugging
npm run dev:debug:chrome

# Debug tests
npm run test:debug

# Debug E2E tests
npm run test:e2e:debug
```

### Build Debugging

```bash
# Build with source maps
npm run build:debug

# Verbose build output
npm run build:verbose

# Build analysis
npm run build:analyze

# Troubleshoot build issues
npm run build:troubleshoot
```

---

## 📚 Documentation Commands

### Documentation Generation

```bash
# Generate API documentation
npm run docs:api

# Generate component documentation
npm run docs:components

# Generate type documentation
npm run docs:types

# Build documentation site
npm run docs:build

# Serve documentation locally
npm run docs:serve
```

---

## 🔄 Continuous Integration Commands

### CI/CD Pipeline

```bash
# Run CI pipeline locally
npm run ci

# Run quality checks
npm run ci:quality

# Run full test suite
npm run ci:test

# Build for CI
npm run ci:build

# Deploy from CI
npm run ci:deploy
```

### Pre-commit Hooks

```bash
# Install pre-commit hooks
npm run hooks:install

# Run pre-commit checks
npm run hooks:pre-commit

# Run pre-push checks
npm run hooks:pre-push

# Skip hooks (emergency only)
git commit --no-verify
```

---

##  Mobile Testing Commands

### Device Testing

```bash
# Test on mobile viewport
npm run test:mobile

# Test on tablet viewport
npm run test:tablet

# Test on responsive design
npm run test:responsive

# Test touch interactions
npm run test:touch
```

### Browser Testing

```bash
# Test on Chrome
npm run test:chrome

# Test on Firefox
npm run test:firefox

# Test on Safari
npm run test:safari

# Test on Edge
npm run test:edge

# Test on all browsers
npm run test:browsers
```

---

## 🎯 Tips and Tricks

### Command Aliases

Create your own aliases in `.bashrc` or `.zshrc`:

```bash
# Development
alias gd="npm run dev"
alias gb="npm run build"
alias gt="npm test"

# Quality
alias gl="npm run lint"
alias gf="npm run format"
alias gc="npm run type-check"

# Testing
alias gtu="npm run test:unit"
alias gti="npm run test:integration"
alias gte="npm run test:e2e"
```

### Nx Workspace Tips

```bash
# See what changed since last commit
nx affected:graph

# Run commands only for affected projects
nx affected --target=build

# See project dependencies
nx show project gunpla-app --web

# Generate dependency graph as image
nx graph --file=output.png
```

### Performance Tips

```bash
# Use Nx cache for faster builds
nx build gunpla-app --parallel

# Skip cache for fresh builds
nx build gunpla-app --skip-nx-cache

# Use daemon for faster command execution
nx daemon

# Clear Nx cache if needed
nx reset
```

---

**Need help with a specific command?** Check our [troubleshooting guide](../troubleshooting/common-issues.md) or [open an issue](https://github.com/your-username/gunpla-app/issues).

**Happy coding!** 

---

**Last Updated**: 2025-12-04
**Version**: 1.0.0