export default {
  // TypeScript and JavaScript files - use Nx for optimal performance
  // Exclude lint-staged config file from being linted by itself
  '*.{ts,tsx,js,jsx}': (filenames) => {
    // Filter out the lint-staged config file to prevent circular linting
    const filteredFiles = filenames.filter(file => !file.includes('lint-staged.config.js'));

    if (filteredFiles.length === 0) {
      return [];
    }

    // Join all filenames into a single string
    const files = filteredFiles.join(' ');

    // Use Nx to lint with auto-fix - Nx will handle affected detection
    // and run the appropriate linter for each project
    return [`nx lint --fix --files="${files}"`];
  },

  // JSON files - basic linting
  '*.{json,jsonc}': 'npx prettier --write',

  // Markdown files - formatting
  '*.md': 'npx prettier --write',

  // Configuration files that might need formatting
  '*.{yml,yaml}': 'npx prettier --write'
};