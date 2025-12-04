import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  entry: ['apps/web/src/main.tsx!'],
  project: ['apps/**/*.{ts,tsx}', 'packages/**/*.ts'],

  ignore: [
    '**/dist/**',
    '**/build/**',
    '**/node_modules/**',
    '**/*.test.{ts,tsx}',
    '**/*.spec.{ts,tsx}',
    '**/vite.config.ts',
    '**/vitest.config.ts',
    '**/playwright.config.ts',
    'eslint.config.ts',
    '**/project.json',
    'specs/**',
    'docs/**',
    '.github/**',
    'tools/**',
  ],

  ignoreDependencies: [
    '@vitejs/plugin-react-swc',
    'vite-plugin-pwa',
    '@vanilla-extract/vite-plugin',
    '@nx/vite',
    '@nx/workspace',
    'typescript',
    'vitest',
    'playwright',
    '@playwright/test',
    'eslint',
    'prettier',
    '@typescript-eslint/eslint-plugin',
    '@typescript-eslint/parser',
    'husky',
    'syncpack',
  ],
};

export default config;
