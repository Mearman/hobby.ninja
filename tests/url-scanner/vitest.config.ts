/**
 * Vitest configuration for URL Scanner tests
 */

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'unit/**/*.test.ts',
      'integration/**/*.test.ts'
    ],
    exclude: [
      'node_modules',
      'dist',
      '.idea',
      '.git',
      '*.cache'
    ],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*'
      ]
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../../../src')
    }
  }
});