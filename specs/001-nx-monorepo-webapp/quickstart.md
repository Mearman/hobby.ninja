# Quick Start Guide

**Feature**: Nx Monorepo Webapp Setup
**Date**: 2025-12-03
**Prerequisites**: Node.js 18+, npm/yarn/pnpm

## Prerequisites

### System Requirements
- **Node.js**: Version 18.0.0 or higher
- **Package Manager**: npm (comes with Node.js), or yarn/pnpm
- **Git**: For version control and GitHub Pages deployment
- **IDE**: VS Code with recommended extensions (optional)

### Global Installation
```bash
# Install Nx CLI globally (optional but recommended)
npm install -g nx@latest

# Verify installation
nx --version
```

## Project Initialization

### 1. Create Nx Workspace
```bash
# Create new Nx workspace with React
npx create-nx-workspace@latest my-webapp --preset=react

# Choose options:
# ✔ Application name · my-webapp
# ✔ Standalone application · Yes
# ✔ Default stylesheet format · css
# ✔ Enable distributed caching to make your CI faster · No
```

### 2. Navigate to Project
```bash
cd my-webapp
```

### 3. Configure for TypeScript Strict Mode
```bash
# Update tsconfig.base.json for strict mode
nx g @nx/workspace:move --project=my-webapp --destination=apps/webapp
```

## Dependencies Installation

### Install Required Packages (All Latest Stable Versions)
```bash
# Install React 19 and latest dependencies
npm install react@latest react-dom@latest

# Install TanStack Router (latest stable) with hash routing support
npm install @tanstack/react-router@latest

# Install Mantine UI (latest stable)
npm install @mantine/core@latest @mantine/hooks@latest @mantine/notifications@latest

# Install Vanilla Extract CSS (latest stable)
npm install @vanilla-extract/css@latest @vanilla-extract/dynamic@latest
npm install -D @vanilla-extract/vite-plugin@latest @vanilla-extract/esbuild-plugin@latest

# Install Dexie for IndexedDB (latest stable)
npm install dexie@latest

# Install development tools (all latest stable)
npm install -D @playwright/test@latest vitest@latest @vitest/ui@latest

# Install Vite (latest stable) if not already included
npm install -D vite@latest @vitejs/plugin-react@latest

# Install syncpack for dependency version management
npm install -D syncpack@latest
```

### Install Nx Plugins
```bash
# Install Nx plugins for enhanced tooling
npm install -D @nx/playwright @nx/vite @nx/eslint-plugin-react

# Generate Playwright setup
nx g @nx/playwright:playwright --project=webapp

# Generate Vitest setup if not already present
nx g @nx/js:library --name=test-utils --directory=shared
```

### 4. Lock Dependency Versions (Critical for Production)

**IMPORTANT**: After initial installation, you must lock all dependencies to fixed versions for reproducible builds.

```bash
# Update package.json to remove ^ and ~ ranges and use exact versions
npm install --package-lock-only

# Or manually edit package.json to remove version ranges
# Example: Change "react": "^19.0.0" to "react": "19.0.0"
# Example: Change "typescript": "^5.0.0" to "typescript": "5.0.0"

# Verify exact versions are locked
npm ls --depth=0

# Update package-lock.json to reflect exact versions
npm install --package-lock-only
```

**Why Version Locking is Critical:**
- Ensures reproducible builds across environments
- Prevents unexpected updates that could break production
- Guarantees all team members use identical dependency versions
- Essential for CI/CD pipeline reliability
- Required for GitHub Pages deployment consistency

**Example package.json entries after locking:**
```json
{
  "dependencies": {
    "react": "19.0.0",
    "react-dom": "19.0.0",
    "@tanstack/react-router": "1.45.0",
    "@mantine/core": "7.5.0",
    "@mantine/hooks": "7.5.0",
    "@mantine/notifications": "7.5.0",
    "@vanilla-extract/css": "2.2.0",
    "@vanilla-extract/dynamic": "2.1.0",
    "dexie": "3.2.4"
  },
  "devDependencies": {
    "@vanilla-extract/vite-plugin": "4.0.0",
    "@vanilla-extract/esbuild-plugin": "2.2.0",
    "vite": "5.1.0",
    "@vitejs/plugin-react": "4.2.0",
    "typescript": "5.3.0",
    "vitest": "1.3.0",
    "@vitest/ui": "1.3.0",
    "eslint": "8.57.0",
    "playwright": "1.44.0",
    "nx": "18.2.0"
  }
}
```

### 5. Configure Syncpack for Monorepo Dependency Management

**IMPORTANT**: Syncpack ensures consistent dependency versions across all packages in the monorepo, which is critical for Nx monorepo stability.

```typescript
// syncpack.config.ts
import type { Config } from 'syncpack';

export default {
  versionGroups: [
    {
      label: 'Use workspace protocol for internal packages',
      packages: ['@workspace/*'],
      dependencies: [
        {
          // Group for internal workspace packages
          packageManager: 'npm',
          dependencyTypes: ['dev', 'peer', 'prod'],
          pinVersion: 'workspace:*',
        },
      ],
    },
    {
      label: 'Lock all external dependencies to exact versions',
      dependencies: [
        {
          // External dependencies should use exact versions
          dependencyTypes: ['dev', 'peer', 'prod'],
          pinVersion: 'exact',
        },
      ],
    },
    {
      label: 'React ecosystem',
      packages: ['react', 'react-dom', '@types/react', '@types/react-dom'],
      dependencies: [
        {
          dependencyTypes: ['dev', 'peer', 'prod'],
          pinVersion: 'exact',
        },
      ],
    },
    {
      label: 'TypeScript ecosystem',
      packages: ['typescript', '@types/*'],
      dependencies: [
        {
          dependencyTypes: ['dev', 'peer', 'prod'],
          pinVersion: 'exact',
        },
      ],
    },
    {
      label: 'Testing tools',
      packages: ['vitest', '@vitest/*', 'playwright', '@playwright/test'],
      dependencies: [
        {
          dependencyTypes: ['dev', 'peer', 'prod'],
          pinVersion: 'exact',
        },
      ],
    },
    {
      label: 'Build tools',
      packages: ['vite', '@vitejs/*', 'esbuild'],
      dependencies: [
        {
          dependencyTypes: ['dev', 'peer', 'prod'],
          pinVersion: 'exact',
        },
      ],
    },
  ],
} satisfies Config;
```

```json
// Add to package.json scripts
{
  "scripts": {
    "syncpack:check": "syncpack list-mismatches",
    "syncpack:fix": "syncpack fix-mismatches",
    "syncpack:format": "syncpack format",
    "preinstall": "syncpack list-mismatches",
    "postinstall": "syncpack format"
  }
}
```

### 6. Run Initial Syncpack Setup
```bash
# Check for existing dependency mismatches
npm run syncpack:check

# Fix any version mismatches
npm run syncpack:fix

# Format package.json files consistently
npm run syncpack:format

# Verify everything is synchronized
npm run syncpack:check
```

**Why Syncpack is Essential for Nx Monorepos:**
- Ensures all packages use identical dependency versions
- Prevents "dependency hell" across monorepo projects
- Guarantees consistent builds across all packages
- Automatically detects and fixes version mismatches
- Integrates with Nx's dependency graph
- Essential for monorepo stability and maintenance

**Syncpack Commands Usage:**
```bash
# Regular development workflow
npm run syncpack:check    # Check for version mismatches
npm run syncpack:fix      # Auto-fix detected issues
npm run syncpack:format   # Format package.json consistently

# When adding new dependencies
npm install new-package@latest
npm run syncpack:fix      # Propagate to all packages
npm run syncpack:format   # Format all package.json files
```

## Configuration Setup

### 1. Update Project Configuration
```json
// apps/webapp/project.json
{
  "name": "webapp",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "apps/webapp/src",
  "projectType": "application",
  "tags": ["scope:webapp"],
  "targets": {
    "build": {
      "executor": "@nx/vite:build",
      "outputs": ["{options.outputPath}"],
      "defaultConfiguration": "production",
      "options": {
        "outputPath": "dist/apps/webapp",
        "baseHref": "/my-webapp/"
      }
    },
    "serve": {
      "executor": "@nx/vite:dev-server",
      "defaultConfiguration": "development",
      "options": {
        "buildTarget": "webapp:build"
      },
      "configurations": {
        "development": {
          "buildTarget": "webapp:build:development"
        },
        "production": {
          "buildTarget": "webapp:build:production"
        }
      }
    },
    "lint": {
      "executor": "@nx/eslint:lint",
      "outputs": ["{options.outputFile}"],
      "options": {
        "lintFilePatterns": ["apps/webapp/**/*.{ts,tsx,js,jsx}"]
      }
    },
    "test": {
      "executor": "@nx/vite:test",
      "outputs": ["{workspaceRoot}/coverage/{projectRoot}"],
      "options": {
        "passWithNoTests": true,
        "reportsDirectory": "../../coverage/apps/webapp"
      }
    },
    "e2e": {
      "executor": "@nx/playwright:run",
      "options": {
        "config": "apps/webapp-e2e/playwright.config.ts"
      }
    }
  }
}
```

### 2. Configure TypeScript
```json
// tsconfig.base.json
{
  "compileOnSave": false,
  "compilerOptions": {
    "rootDir": ".",
    "sourceMap": true,
    "declaration": false,
    "moduleResolution": "node",
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "importHelpers": true,
    "target": "es2015",
    "module": "esnext",
    "lib": ["es2020", "dom"],
    "skipLibCheck": true,
    "skipDefaultLibCheck": true,
    "baseUrl": ".",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  },
  "exclude": ["node_modules", "tmp"]
}
```

### 3. Configure Vite for GitHub Pages
```typescript
// apps/webapp/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nxViteTsPaths } from '@nx/vite/plugins/tsconfig-paths.plugin';

export default defineConfig({
  cacheDir: '../../node_modules/.vite/webapp',
  server: {
    port: 4200,
    host: true,
  },
  preview: {
    port: 4300,
    host: true,
  },
  plugins: [react(), nxViteTsPaths()],
  build: {
    base: '/my-webapp/',
    outDir: '../../dist/apps/webapp',
    emptyOutDir: true,
  },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  },
});
```

### 4. Configure Vanilla Extract CSS
```typescript
// apps/webapp/vite.config.ts (Updated)
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nxViteTsPaths } from '@nx/vite/plugins/tsconfig-paths.plugin';
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';

export default defineConfig({
  cacheDir: '../../node_modules/.vite/webapp',
  server: {
    port: 4200,
    host: true,
  },
  preview: {
    port: 4300,
    host: true,
  },
  plugins: [
    react(),
    nxViteTsPaths(),
    vanillaExtractPlugin({
      identifiers: ({ hash }) => `css_${hash}`,
      esbuildOptions: {
        target: 'es2020',
      },
    }),
  ],
  build: {
    base: '/my-webapp/',
    outDir: '../../dist/apps/webapp',
    emptyOutDir: true,
  },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  },
});
```

## Application Setup

### 1. Create Router Setup
```typescript
// apps/webapp/src/app/router.tsx
import { createRouter, createRootRoute, createRoute } from '@tanstack/react-router';
import { App } from './app';

// Create root route
const rootRoute = createRootRoute({
  component: App,
});

// Create home route
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => <div>Welcome to the webapp!</div>,
});

// Create about route
const aboutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/about',
  component: () => <div>About page</div>,
});

// Create router instance
export const router = createRouter({
  routeTree: rootRoute.addChildren([indexRoute, aboutRoute]),
  defaultPreload: 'intent',
});

// Register router for TypeScript
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
```

### 2. Create Main App Component
```typescript
// apps/webapp/src/app/app.tsx
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { RouterProvider, useRouter } from '@tanstack/react-router';
import { router } from './router';

export function App() {
  return (
    <MantineProvider>
      <Notifications />
      <RouterProvider router={router} />
    </MantineProvider>
  );
}
```

### 3. Create Vanilla Extract CSS Setup (Minimal Custom Styling)

**Important Note**: Always prioritize Mantine components over custom styling. Use Vanilla Extract CSS only for brand-specific theming and unique requirements that Mantine doesn't cover.

#### Create Brand Theme that Extends Mantine
```typescript
// apps/webapp/src/styles/theme.css.ts
import { createTheme, createGlobalTheme } from '@vanilla-extract/css';

// Define brand-specific CSS variables that complement Mantine's theme
export const brandVars = createGlobalTheme(':root', {
  colors: {
    brandPrimary: '#your-brand-blue', // Use only for brand-specific elements
    brandAccent: '#your-brand-accent',
    brandGradient: 'linear-gradient(135deg, #brandPrimary 0%, #brandAccent 100%)',
  },
  spacing: {
    // Only add spacing not covered by Mantine's default spacing
    brandGutter: '24px',
  },
  // Note: Use Mantine's default spacing whenever possible
  // Only add spacing values not covered by Mantine
  typography: {
    brandFont: 'Your custom font if needed',
  },
  breakpoints: {
    mobile: '576px',
    tablet: '768px',
    desktop: '992px',
    widescreen: '1200px',
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: {
      xs: '12px',
      sm: '14px',
      md: '16px',
      lg: '18px',
      xl: '20px',
      xxl: '24px',
    },
  },
});

// Create theme contract
export const theme = createTheme({
  colors: {
    primary: vars.colors.primary,
    secondary: vars.colors.secondary,
    accent: vars.colors.accent,
    background: vars.colors.background,
    surface: vars.colors.surface,
    text: vars.colors.text,
  },
  spacing: vars.spacing,
  typography: vars.typography,
});
```

#### Create Component Styles
```typescript
// apps/webapp/src/styles/components/container.css.ts
import { style } from '@vanilla-extract/css';
import { vars } from '../theme.css.ts';

export const container = style({
  maxWidth: '1200px',
  margin: '0 auto',
  padding: `0 ${vars.spacing.md}`,
  backgroundColor: vars.colors.background,
});

export const flexContainer = style({
  display: 'flex',
  gap: vars.spacing.md,
  alignItems: 'center',
  justifyContent: 'space-between',
});

export const card = style({
  backgroundColor: vars.colors.surface,
  borderRadius: '8px',
  padding: vars.spacing.lg,
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  border: `1px solid #e9ecef`,
});
```

#### Create Responsive Styles
```typescript
// apps/webapp/src/styles/responsive.css.ts
import { style, media } from '@vanilla-extract/css';
import { vars } from '../theme.css.ts';

export const responsiveContainer = style([
  {
    padding: vars.spacing.sm,
  },
  media({
    minWidth: vars.breakpoints.tablet,
  }, {
    padding: vars.spacing.md,
  }),
  media({
    minWidth: vars.breakpoints.desktop,
  }, {
    padding: vars.spacing.lg,
  }),
]);

export const responsiveGrid = style([
  {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: vars.spacing.md,
  },
  media({
    minWidth: vars.breakpoints.tablet,
  }, {
    gridTemplateColumns: 'repeat(2, 1fr)',
  }),
  media({
    minWidth: vars.breakpoints.desktop,
  }, {
    gridTemplateColumns: 'repeat(3, 1fr)',
  }),
]);
```

### 4. Update Entry Point
```typescript
// apps/webapp/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { router } from './app/router';

const rootElement = document.getElementById('root');
if (rootElement && !rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<RouterProvider router={router} />);
}
```

## Database Setup

### Create Database Service
```typescript
// apps/webapp/src/lib/db.ts
import Dexie, { Table } from 'dexie';

interface Setting {
  id?: number;
  key: string;
  value: unknown;
  updatedAt: Date;
}

interface CacheItem {
  id?: number;
  key: string;
  data: unknown;
  expiresAt: Date;
  createdAt: Date;
}

export class AppDatabase extends Dexie {
  settings!: Table<Setting>;
  cache!: Table<CacheItem>;

  constructor() {
    super('WebAppDatabase');
    this.version(1).stores({
      settings: '++id, key, updatedAt',
      cache: '++id, key, expiresAt, createdAt',
    });
  }
}

export const db = new AppDatabase();
```

## Styling Philosophy: Mantine First

### When to Use Mantine Components (Always)
- Forms, inputs, buttons, modals, and interactive elements
- Layout components (Grid, Stack, Container, etc.)
- Data display (Tables, Lists, Cards, etc.)
- Navigation components (Header, Footer, Breadcrumbs, etc.)
- Feedback components (Notifications, Loading states, etc.)
- Any component that Mantine provides out of the box

### When to Use Vanilla Extract CSS (Rarely)
- Brand-specific gradients and color schemes
- Custom animations not available in Mantine
- Unique layout patterns not covered by Mantine's layout system
- Brand-specific spacing or typography that differs from Mantine's defaults
- Custom component variations when Mantine component props are insufficient

### Example: Proper Integration
```typescript
// GOOD: Use Mantine button with custom brand colors via theme
import { Button, MantineProvider } from '@mantine/core';
import { brandVars } from '../styles/theme.css.ts';

// Configure Mantine theme with brand colors
const mantineTheme = {
  colors: {
    brand: [
      brandVars.colors.brandPrimary,
      // ... other shades
    ],
  },
};

// Use Mantine button
<Button color="brand">Click me</Button>

// BAD: Creating custom button styles with Vanilla Extract
// Use Mantine Button component instead!
```

## Testing Setup

### 1. Configure Vitest
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import { nxViteTsPaths } from '@nx/vite/plugins/tsconfig-paths.plugin';

export default defineConfig({
  cacheDir: '../../node_modules/.vite/vitest',
  test: {
    globals: true,
    cache: {
      dir: '../../node_modules/.vitest',
    },
    environment: 'jsdom',
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    coverage: {
      reportsDirectory: '../../coverage',
      provider: 'v8',
    },
  },
  plugins: [nxViteTsPaths()],
});
```

### 2. Configure Playwright
```typescript
// apps/webapp-e2e/playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './src',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'on-first-retry',
  },
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
  ],
  webServer: {
    command: 'npm run serve',
    url: 'http://localhost:4200',
    reuseExistingServer: !process.env.CI,
  },
});
```

## Development Commands

### Available Scripts
```bash
# Development
npm run dev              # Start development server
npm run serve            # Start production preview server

# Building
npm run build            # Build for production
npm run preview          # Preview production build

# Testing
npm run test             # Run unit tests with Vitest
npm run test:watch       # Watch mode for unit tests
npm run test:coverage    # Generate coverage report
npm run e2e              # Run Playwright E2E tests
npm run e2e:ui           # Open Playwright UI

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Auto-fix ESLint issues
npm run format           # Format code (if Prettier configured)

# Dependency Management
npm run check-versions   # Check for outdated packages
npm run audit            # Check for security vulnerabilities
npm run lock-verify      # Verify package-lock.json consistency

# Syncpack (Monorepo Dependency Management)
npm run syncpack:check    # Check for dependency version mismatches
npm run syncpack:fix      # Auto-fix syncpack issues
npm run syncpack:format   # Format package.json files consistently

# Nx Commands
nx serve webapp          # Serve the webapp
nx build webapp          # Build the webapp
nx test webapp           # Test the webapp
nx lint webapp           # Lint the webapp
nx e2e webapp-e2e        # Run E2E tests
```

## GitHub Pages Deployment

### 1. Configure GitHub Actions
```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Deploy to GitHub Pages
        uses: crazy-max/ghaction-github-pages@v3
        with:
          target_branch: gh-pages
          build_dir: dist/apps/webapp
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### 2. Update Repository Settings
1. Go to repository Settings > Pages
2. Source: Deploy from a branch
3. Branch: gh-pages / (root)
4. Save

## CLI Usage Examples

### Data Scraping Commands

```bash
# Development Mode - Interactive with verbose output
npx nx run cli:dev --interactive

# Scrape specific data sources
npx nx run cli:scrape --source=bandai --limit=100
npx nx run cli:scrape --source=gundam-info --limit=50

# Parse cached data (development mode)
npx nx run cli:parse --cached --regenerate-indexes

# Export data to webapp
npx nx run cli:export --format=json --destination=apps/webapp/public/data

# Full dataset update (CI mode)
npx nx run cli:update --non-interactive --force-refresh
```

### Advanced CLI Features

```bash
# Configure retry and rate limiting
npx nx run cli:scrape --max-retries=3 --rate-limit=1000

# Use proxy for geographic restrictions
npx nx run cli:scrape --proxy=http://proxy.example.com:8080

# Resume from checkpoint
npx nx run cli:update --resume-from-checkpoint

# Enable detailed logging
npx nx run cli:scrape --verbose --log-level=debug

# Validate data integrity
npx nx run cli:validate --check-duplicates --verify-sku-format
```

### Cache Management

```bash
# Clear cache for specific source
npx nx run cli:cache-clear --source=bandai

# Compress old cache files
npx nx run cli:cache-compress --max-age=72h

# Analyze cache usage
npx nx run cli:cache-stats --format=table
```

## Next Steps

1. **Create Components**: Build your UI components using Mantine
2. **Add Routes**: Define application routes with TanStack Router
3. **Implement Features**: Add business logic and data management
4. **Write Tests**: Add unit and E2E tests for new features
5. **Customize Theme**: Configure Mantine theme to match your brand
6. **Add Analytics**: Implement tracking and monitoring
7. **Configure CI/CD**: Set up automated testing and deployment
8. **Data Management**: Use CLI to keep Gunpla dataset current

## Troubleshooting

### Common Issues
- **Build fails**: Check TypeScript configuration and dependencies
- **Routing not working**: Ensure hash routing is configured properly
- **Styles not loading**: Verify Mantine CSS imports
- **Tests failing**: Check test configuration and dependencies

### Get Help
- Check [Nx Documentation](https://nx.dev/)
- Review [React 19 Documentation](https://react.dev/)
- Consult [Mantine Documentation](https://mantine.dev/)
- Visit [TanStack Router Docs](https://tanstack.com/router)

## Performance Tips

1. **Use Nx Caching**: Nx provides intelligent caching for faster builds
2. **Code Splitting**: Implement lazy loading for large components
3. **Optimize Images**: Use appropriate image formats and sizes
4. **Bundle Analysis**: Use `npm run build -- --analyze` to analyze bundle size
5. **Service Worker**: Consider adding a service worker for offline capability

This quick start guide should get you up and running with a modern, production-ready Nx monorepo webapp using the latest tools and best practices.