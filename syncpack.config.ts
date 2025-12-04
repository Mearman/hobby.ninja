import type { SyncpackConfig } from 'syncpack';

const config: SyncpackConfig = {
  // Sort exports condition keys (source before import/require for bundler support)
  sortExports: [
    'types',
    'source',
    'node-addons',
    'node',
    'browser',
    'module',
    'import',
    'require',
    'development',
    'production',
    'script',
    'default',
  ],

  // Sort package.json properties
  sortFirst: [
    'name',
    'description',
    'version',
    'type',
    'private',
    'packageManager',
    'workspaces',
    'repository',
    'scripts',
    'dependencies',
    'devDependencies',
    'peerDependencies',
    'optionalDependencies',
  ],

  // Source files to analyze
  source: [
    'package.json',
    'apps/*/package.json',
    'packages/*/package.json',
    'tools/*/package.json',
  ],

  versionGroups: [
    // Local workspace packages must use workspace:* protocol
    {
      label: 'Local workspace packages',
      packages: ['**/*'],
      dependencies: ['@workspace/*'],
      dependencyTypes: ['prod', 'dev'],
      pinVersion: 'workspace:*',
    },
    // Pin all dependencies to exact versions (no ^ or ~)
    {
      label: 'Use exact versions for all dependencies',
      packages: ['**/*'],
      dependencyTypes: [
        'dev',
        'peer',
        'prod',
        'optional',
        'overrides',
        'resolutions',
        'pnpmOverrides',
      ],
      pinVersion: true,
      dependencyTypesStrategy: 'lock',
    },
    // React ecosystem - same range across all packages
    {
      label: 'React packages',
      packages: ['**/*'],
      dependencyTypes: ['dev', 'peer', 'prod'],
      dependencies: ['react', 'react-dom'],
      policy: 'sameRange',
    },
    {
      label: 'React types',
      packages: ['**/*'],
      dependencyTypes: ['dev', 'peer', 'prod'],
      dependencies: ['@types/react', '@types/react-dom'],
      policy: 'sameRange',
    },
    // TypeScript ecosystem
    {
      label: 'TypeScript compiler',
      packages: ['**/*'],
      dependencyTypes: ['dev', 'peer', 'prod'],
      dependencies: ['typescript'],
      policy: 'sameRange',
    },
    {
      label: 'TypeScript ESLint packages',
      packages: ['**/*'],
      dependencyTypes: ['dev', 'peer', 'prod'],
      dependencies: ['@typescript-eslint/*'],
      policy: 'sameRange',
    },
    // Nx ecosystem
    {
      label: 'Nx packages',
      packages: ['**/*'],
      dependencyTypes: ['dev', 'peer', 'prod'],
      dependencies: ['nx', '@nx/*'],
      policy: 'sameRange',
    },
    // Vite ecosystem
    {
      label: 'Vite packages',
      packages: ['**/*'],
      dependencyTypes: ['dev', 'peer', 'prod'],
      dependencies: ['vite', '@vitejs/*', 'vite-*'],
      policy: 'sameRange',
    },
    // Mantine UI ecosystem
    {
      label: 'Mantine packages',
      packages: ['**/*'],
      dependencyTypes: ['dev', 'peer', 'prod'],
      dependencies: ['@mantine/*'],
      policy: 'sameRange',
    },
    // TanStack ecosystem
    {
      label: 'TanStack packages',
      packages: ['**/*'],
      dependencyTypes: ['dev', 'peer', 'prod'],
      dependencies: ['@tanstack/*'],
      policy: 'sameRange',
    },
    // Testing ecosystem
    {
      label: 'Vitest packages',
      packages: ['**/*'],
      dependencyTypes: ['dev', 'peer', 'prod'],
      dependencies: ['vitest', '@vitest/*'],
      policy: 'sameRange',
    },
    {
      label: 'Testing Library packages',
      packages: ['**/*'],
      dependencyTypes: ['dev', 'peer', 'prod'],
      dependencies: ['@testing-library/*'],
      policy: 'sameRange',
    },
    {
      label: 'Playwright packages',
      packages: ['**/*'],
      dependencyTypes: ['dev', 'peer', 'prod'],
      dependencies: ['@playwright/*'],
      policy: 'sameRange',
    },
    // ESLint ecosystem
    {
      label: 'ESLint core packages',
      packages: ['**/*'],
      dependencyTypes: ['dev', 'peer', 'prod'],
      dependencies: ['eslint', '@eslint/*'],
      policy: 'sameRange',
    },
    // Vanilla Extract ecosystem
    {
      label: 'Vanilla Extract packages',
      packages: ['**/*'],
      dependencyTypes: ['dev', 'peer', 'prod'],
      dependencies: ['@vanilla-extract/*'],
      policy: 'sameRange',
    },
    // General type definitions
    {
      label: 'Type definitions',
      packages: ['**/*'],
      dependencyTypes: ['dev', 'peer', 'prod'],
      dependencies: ['@types/*'],
      policy: 'highest',
    },
    // Everything else: use highest semver version found across all packages
    {
      label: 'Use highest version across all packages',
      packages: ['**/*'],
      dependencies: ['**'],
      policy: 'highest',
    },
  ],
};

export default config;