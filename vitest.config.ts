import { defineConfig } from 'vitest/config';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { resolve } from 'path';

export default defineConfig({
  cacheDir: '../../node_modules/.vite/vitest',
  test: {
    globals: true,
    cache: {
      dir: '../../node_modules/.vite/vitest',
    },
    environment: 'jsdom',
    include: [
      '**/*.{unit,component,integration,e2e}.test.{ts,tsx,js,jsx}',
      '**/*.spec.{ts,tsx,js,jsx}',
    ],
    exclude: [
      'node_modules',
      'dist',
      'build',
      '.nx',
      'coverage',
      'tmp',
      '**/*.config.{js,ts}',
      '**/dist/**',
      '**/build/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'dist/',
        'build/',
        '.nx/',
        'coverage/',
        '**/*.config.{js,ts}',
        '**/*.d.ts',
        '**/test-setup.{ts,tsx}',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        '**/mocks/**',
        '**/__mocks__/**',
        '**/stories/**',
        '**/*.stories.{ts,tsx}',
        'apps/web/src/main.tsx',
        'apps/web/src/vite-env.d.ts',
      ],
      include: [
        'apps/webapp/src/**/*.{ts,tsx}',
        'packages/*/src/**/*.{ts,tsx}',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
        // Per-file thresholds to catch low coverage files
        '**/src/**/*.{ts,tsx}': {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70,
        },
      },
      watermarks: {
        statements: [50, 80],
        functions: [50, 80],
        branches: [50, 80],
        lines: [50, 80],
      },
    },
    testTimeout: 10000, // 10 seconds per test
    hookTimeout: 10000, // 10 seconds for hooks
    isolate: true, // Isolate tests from each other
    passWithNoTests: false, // Fail if no tests found
    allowOnly: process.env['CI'] === 'true' ? false : true, // Disallow only in CI
    watch: false, // Disable watch mode by default
    reporters: ['default', 'junit'],
    outputFile: {
      junit: './coverage/junit.xml',
    },
    pool: 'threads', // Use thread pool for better performance
    poolOptions: {
      threads: {
        singleThread: false,
        maxThreads: 4,
        minThreads: 1,
        useAtomics: true,
      },
    },
    onConsoleLog: (log, type) => {
      // Control console output during tests
      if (type === 'stderr' && log.includes('Warning:')) {
        return false; // Suppress React warnings in test output
      }
      return true; // Allow other output
    },
    chaiConfig: {
      includeStack: true,
      showDiff: true,
      truncateThreshold: 0,
    },
  },
  plugins: [nxViteTsPaths()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './apps/webapp/src'),
      '@workspace/types': resolve(__dirname, './packages/types/src'),
      '@workspace/utils': resolve(__dirname, './packages/utils/src'),
      '@workspace/eslint-config': resolve(__dirname, './packages/eslint-config/src'),
    },
  },
  define: {
    __DEV__: 'true',
    'process.env.NODE_ENV': '"test"',
  },
  // Source map configuration for better test debugging
  esbuild: {
    target: 'es2020',
  },
  // Optimized dependencies for faster test startup
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@tanstack/react-router',
      '@mantine/core',
      '@mantine/hooks',
      '@vanilla-extract/css',
      'dexie',
      'zod',
    ],
  },
  // SSR configuration for testing
  ssr: {
    noExternal: [
      // Include these in SSR bundle for testing
    ],
  },
});