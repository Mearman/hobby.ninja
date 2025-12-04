import type { SyncpackConfig } from 'syncpack';

const config: SyncpackConfig = {
  versionGroups: [
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
      // Pin all dependencies to exact versions (no ^ or ~)
      pinVersion: true,
      // Don't allow semver ranges
      dependencyTypesStrategy: 'lock',
    },
    {
      label: 'Align React ecosystem versions',
      packages: ['**/*'],
      dependencyTypes: ['dev', 'peer', 'prod'],
      packagesVersionStrategy: 'inherit',
      dependencies: [
        'react',
        'react-dom',
        '@types/react',
        '@types/react-dom',
      ],
    },
    {
      label: 'Align TypeScript ecosystem versions',
      packages: ['**/*'],
      dependencyTypes: ['dev', 'peer', 'prod'],
      packagesVersionStrategy: 'inherit',
      dependencies: [
        'typescript',
        '@types/*',
      ],
    },
    {
      label: 'Align Nx ecosystem versions',
      packages: ['**/*'],
      dependencyTypes: ['dev', 'peer', 'prod'],
      packagesVersionStrategy: 'inherit',
      dependencies: [
        'nx',
        '@nx/*',
      ],
    },
    {
      label: 'Align Vite ecosystem versions',
      packages: ['**/*'],
      dependencyTypes: ['dev', 'peer', 'prod'],
      packagesVersionStrategy: 'inherit',
      dependencies: [
        'vite',
        '@vitejs/*',
      ],
    },
    {
      label: 'Align Mantine UI versions',
      packages: ['**/*'],
      dependencyTypes: ['dev', 'peer', 'prod'],
      packagesVersionStrategy: 'inherit',
      dependencies: [
        '@mantine/*',
      ],
    },
    {
      label: 'Align TanStack ecosystem versions',
      packages: ['**/*'],
      dependencyTypes: ['dev', 'peer', 'prod'],
      packagesVersionStrategy: 'inherit',
      dependencies: [
        '@tanstack/*',
      ],
    },
    {
      label: 'Align testing framework versions',
      packages: ['**/*'],
      dependencyTypes: ['dev', 'peer', 'prod'],
      packagesVersionStrategy: 'inherit',
      dependencies: [
        'vitest',
        '@vitest/*',
        '@testing-library/*',
        '@playwright/test',
      ],
    },
  ],
};

export default config;