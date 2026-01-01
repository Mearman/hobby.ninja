export default {
  // TypeScript and JavaScript files - use ESLint directly for faster performance
  // (Nx project graph building is slow with large data directories)
  '*.{ts,tsx,js,jsx}': (filenames) => {
    // Filter out configuration files and storybook files
    const filteredFiles = filenames.filter(file =>
      !file.includes('lint-staged.config.js') &&
      !file.includes('eslint.config.ts') &&
      !file.includes('.storybook') &&
      !file.includes('/stories/')
    );

    if (filteredFiles.length === 0) {
      return [];
    }

    // Use ESLint directly for faster linting (bypasses Nx project graph)
    return [`eslint --fix ${filteredFiles.join(' ')}`];
  },

  // Storybook files - typecheck with separate tsconfig (skip ESLint to avoid OOM)
  'apps/next/{.storybook,stories}/**/*.{ts,tsx}': () => [
    'pnpm --filter @hobby-ninja/next typecheck:storybook'
  ],

  // JSON files - basic linting
  '*.{json,jsonc}': 'npx prettier --write',

  // Markdown files - formatting
  '*.md': 'npx prettier --write',

  // Configuration files that might need formatting
  '*.{yml,yaml}': 'npx prettier --write'
};