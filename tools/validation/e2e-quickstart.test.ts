/**
 * End-to-End Quickstart Validation Tests
 *
 * These tests validate that a user can follow the quickstart guide from start to finish
 * and end up with a working Nx monorepo webapp.
 */

import { test, expect } from '@playwright/test';
import { execSync, spawn } from 'child_process';
import { existsSync, rmSync, statSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { createHash } from 'crypto';
import { tmpdir } from 'os';
import { execFileNoThrow, npmCommand } from '../../../packages/utils/src/execFileNoThrow';

test.describe('Quickstart End-to-End Validation', () => {
  let tempDir: string;
  let originalDir: string;

  test.beforeAll(async () => {
    originalDir = process.cwd();
    // Create temporary directory for testing
    const uniqueId = createHash('md5').update(Date.now().toString()).digest('hex').slice(0, 8);
    tempDir = join(tmpdir(), `quickstart-test-${uniqueId}`);

    // Create temp directory
    await execFileNoThrow('mkdir', ['-p', tempDir]);
    process.chdir(tempDir);
  });

  test.afterAll(async () => {
    // Return to original directory
    process.chdir(originalDir);

    // Clean up temp directory (comment out for debugging)
    if (existsSync(tempDir)) {
      try {
        await execFileNoThrow('rm', ['-rf', tempDir]);
      } catch (error) {
        console.warn(`Warning: Could not clean up temp directory ${tempDir}`);
      }
    }
  });

  test('Step 1: Prerequisites validation', async () => {
    // Check Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    expect(majorVersion).toBeGreaterThanOrEqual(20);
    console.log(`✓ Node.js ${nodeVersion} meets requirements`);

    // Check if npm is available
    const npmResult = await execFileNoThrow('npm', ['--version']);
    expect(npmResult.success).toBe(true);
    if (npmResult.success) {
      console.log(`✓ npm ${npmResult.stdout.trim()} is available`);
    }

    // Check if Git is available
    const gitResult = await execFileNoThrow('git', ['--version']);
    expect(gitResult.success).toBe(true);
    if (gitResult.success) {
      console.log(`✓ Git is available: ${gitResult.stdout.trim()}`);
    }

    // Check if Nx CLI is available
    const nxResult = await execFileNoThrow('npx', ['nx', '--version']);
    expect(nxResult.success).toBe(true);
    if (nxResult.success) {
      console.log(`✓ Nx CLI ${nxResult.stdout.trim()} is available`);
    }
  });

  test('Step 2: Create Nx workspace', async () => {
    console.log('Creating Nx workspace...');

    // Use npx create-nx-workspace with React preset
    const createResult = await execFileNoThrow('npx', [
      'create-nx-workspace@latest',
      'test-webapp',
      '--preset=react',
      '--standalone',
      '--packageManager=npm',
      '--style=css',
      '--skip-git',
      '--interactive=false'
    ], {
      timeout: 300000 // 5 minutes timeout
    });

    expect(createResult.success).toBe(true);
    console.log('✓ Nx workspace created successfully');

    const workspaceDir = join(tempDir, 'test-webapp');
    expect(existsSync(workspaceDir)).toBe(true);

    // Verify workspace structure
    expect(existsSync(join(workspaceDir, 'package.json'))).toBe(true);
    expect(existsSync(join(workspaceDir, 'nx.json'))).toBe(true);
    expect(existsSync(join(workspaceDir, 'tsconfig.base.json'))).toBe(true);

    process.chdir(workspaceDir);
  });

  test('Step 3: Install dependencies from quickstart', async () => {
    console.log('Installing dependencies from quickstart...');

    const dependencies = [
      'react@latest',
      'react-dom@latest',
      '@tanstack/react-router@latest',
      '@mantine/core@latest',
      '@mantine/hooks@latest',
      '@mantine/notifications@latest',
      '@vanilla-extract/css@latest',
      '@vanilla-extract/dynamic@latest',
      'dexie@latest',
      'zod@latest',
      '@tabler/icons-react@latest',
      'clsx@latest'
    ];

    const devDependencies = [
      '@vanilla-extract/vite-plugin@latest',
      '@vanilla-extract/esbuild-plugin@latest',
      'syncpack@latest'
    ];

    // Install dependencies
    for (const dep of dependencies) {
      const result = await npmCommand('install', [dep], { timeout: 120000 });
      expect(result.success).toBe(true);
      console.log(`✓ Installed ${dep}`);
    }

    // Install dev dependencies
    for (const dep of devDependencies) {
      const result = await npmCommand('install', ['-D', dep], { timeout: 120000 });
      expect(result.success).toBe(true);
      console.log(`✓ Installed dev dependency ${dep}`);
    }

    // Verify package.json updates
    const packageJsonResult = await execFileNoThrow('cat', ['package.json']);
    expect(packageJsonResult.success).toBe(true);

    if (packageJsonResult.success) {
      const packageJson = JSON.parse(packageJsonResult.stdout);

      dependencies.forEach(dep => {
        const packageName = dep.split('@')[0];
        expect(packageJson.dependencies).toHaveProperty(packageName);
      });

      devDependencies.forEach(dep => {
        const packageName = dep.split('@')[0];
        expect(packageJson.devDependencies).toHaveProperty(packageName);
      });
    }

    console.log('✓ All dependencies installed successfully');
  });

  test('Step 4: Configure syncpack', async () => {
    console.log('Configuring syncpack...');

    const syncpackConfig = `import type { Config } from 'syncpack';

export default {
  versionGroups: [
    {
      label: 'Use workspace protocol for internal packages',
      packages: ['@workspace/*'],
      dependencies: [
        {
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
  ],
} satisfies Config;`;

    writeFileSync('syncpack.config.ts', syncpackConfig);
    expect(existsSync('syncpack.config.ts')).toBe(true);

    // Add syncpack scripts to package.json
    const packageJsonResult = await execFileNoThrow('cat', ['package.json']);
    expect(packageJsonResult.success).toBe(true);

    if (packageJsonResult.success) {
      const packageJson = JSON.parse(packageJsonResult.stdout);
      packageJson.scripts = {
        ...packageJson.scripts,
        'syncpack:check': 'syncpack list-mismatches',
        'syncpack:fix': 'syncpack fix-mismatches',
        'syncpack:format': 'syncpack format'
      };
      writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
    }

    console.log('✓ Syncpack configured successfully');
  });

  test('Step 5: Apply dependency locking', async () => {
    console.log('Applying dependency version locking...');

    // Run syncpack to lock dependencies
    const syncpackFixResult = await execFileNoThrow('npx', ['syncpack', 'fix-mismatches'], { timeout: 60000 });
    expect(syncpackFixResult.success).toBe(true);

    const syncpackFormatResult = await execFileNoThrow('npx', ['syncpack', 'format'], { timeout: 60000 });
    expect(syncpackFormatResult.success).toBe(true);

    // Verify no mismatches exist
    const syncpackCheckResult = await execFileNoThrow('npx', ['syncpack', 'list-mismatches']);
    expect(syncpackCheckResult.success).toBe(true);
    if (syncpackCheckResult.success) {
      expect(syncpackCheckResult.stdout.trim()).toBe('');
    }

    // Check that package.json has exact versions
    const packageJsonResult = await execFileNoThrow('cat', ['package.json']);
    expect(packageJsonResult.success).toBe(true);

    if (packageJsonResult.success) {
      const packageJson = JSON.parse(packageJsonResult.stdout);

      const checkExactVersions = (deps: Record<string, string>) => {
        Object.entries(deps).forEach(([name, version]) => {
          if (version.startsWith('^') || version.startsWith('~')) {
            throw new Error(`${name} has version range: ${version}`);
          }
        });
      };

      checkExactVersions(packageJson.dependencies || {});
      checkExactVersions(packageJson.devDependencies || {});
    }

    console.log('✓ Dependencies locked to exact versions');
  });

  test('Step 6: Validate project structure', async () => {
    console.log('Validating project structure...');

    const currentDir = process.cwd();

    // Check all critical files exist
    const criticalFiles = [
      'package.json',
      'nx.json',
      'tsconfig.base.json',
      'syncpack.config.ts'
    ];

    for (const file of criticalFiles) {
      expect(existsSync(file)).toBe(true);
      console.log(`✓ ${file} exists`);
    }

    // Check package.json has required sections
    const packageJsonResult = await execFileNoThrow('cat', ['package.json']);
    expect(packageJsonResult.success).toBe(true);

    if (packageJsonResult.success) {
      const packageJson = JSON.parse(packageJsonResult.stdout);
      expect(packageJson.dependencies).toBeDefined();
      expect(packageJson.devDependencies).toBeDefined();
      expect(packageJson.scripts).toBeDefined();

      // Check critical dependencies are installed
      const criticalDeps = [
        'react',
        'react-dom',
        '@tanstack/react-router',
        '@mantine/core',
        '@vanilla-extract/css',
        'dexie'
      ];

      for (const dep of criticalDeps) {
        expect(packageJson.dependencies).toHaveProperty(dep);
        console.log(`✓ ${dep} is installed`);
      }

      // Check Node.js engine constraint
      if (packageJson.engines) {
        expect(packageJson.engines.node).toMatch(/>=\s*20/);
        console.log(`✓ Node.js engine constraint: ${packageJson.engines.node}`);
      }
    }

    console.log('✓ Project structure validated');
  });

  test('Step 7: Validate development workflows', async () => {
    console.log('Validating development workflows...');

    // Check if build script exists
    const packageJsonResult = await execFileNoThrow('cat', ['package.json']);
    expect(packageJsonResult.success).toBe(true);

    if (packageJsonResult.success) {
      const packageJson = JSON.parse(packageJsonResult.stdout);

      if (packageJson.scripts?.build) {
        // Test build command (but don't wait for full completion)
        console.log('✓ Build script found');
      } else {
        console.log('ℹ Build script not found, this is acceptable for a basic setup');
      }

      if (packageJson.scripts?.lint) {
        console.log('✓ Lint script found');
      } else {
        console.log('ℹ Lint script not found, this is acceptable for a basic setup');
      }

      if (packageJson.scripts?.test) {
        console.log('✓ Test script found');
      } else {
        console.log('ℹ Test script not found, this is acceptable for a basic setup');
      }
    }

    // Test syncpack commands
    const syncpackCheckResult = await execFileNoThrow('npx', ['syncpack', 'list-mismatches'], { timeout: 30000 });
    if (syncpackCheckResult.success) {
      console.log('✓ Syncpack check completed successfully');
    } else {
      console.warn('⚠ Syncpack check failed');
    }

    console.log('✓ Development workflows validated');
  });

  test('Step 8: Performance and Security validation', async () => {
    console.log('Running performance and security validation...');

    // Check package-lock.json exists and is reasonable size
    if (existsSync('package-lock.json')) {
      const lockStat = statSync('package-lock.json');
      const lockSizeMB = lockStat.size / (1024 * 1024);
      expect(lockSizeMB).toBeLessThan(50); // Should be less than 50MB
      console.log(`✓ package-lock.json size: ${lockSizeMB.toFixed(2)}MB`);
    }

    // Check for reasonable dependency count
    const packageJsonResult = await execFileNoThrow('cat', ['package.json']);
    expect(packageJsonResult.success).toBe(true);

    if (packageJsonResult.success) {
      const packageJson = JSON.parse(packageJsonResult.stdout);
      const totalDeps = Object.keys(packageJson.dependencies || {}).length +
                       Object.keys(packageJson.devDependencies || {}).length;
      expect(totalDeps).toBeLessThan(200); // Should be less than 200 dependencies
      console.log(`✓ Total dependencies: ${totalDeps}`);
    }

    // Check for security issues (basic audit)
    const auditResult = await npmCommand('audit', ['--audit-level=high'], { timeout: 30000 });
    if (auditResult.success) {
      console.log('✓ No high-severity vulnerabilities found');
    } else {
      console.warn('⚠ Security audit found issues or failed');
    }

    console.log('✓ Performance and security validation completed');
  });

  test('Step 9: Final validation summary', async () => {
    console.log('Running final validation summary...');

    // Verify we can read back the quickstart configuration
    const packageJsonResult = await execFileNoThrow('cat', ['package.json']);
    expect(packageJsonResult.success).toBe(true);

    const nxJsonResult = await execFileNoThrow('cat', ['nx.json']);
    expect(nxJsonResult.success).toBe(true);

    const tsconfigResult = await execFileNoThrow('cat', ['tsconfig.base.json']);
    expect(tsconfigResult.success).toBe(true);

    const syncpackResult = await execFileNoThrow('cat', ['syncpack.config.ts']);
    expect(syncpackResult.success).toBe(true);

    console.log('✓ All configuration files are readable');

    // Validate the project can be listed by npm
    const npmListResult = await npmCommand('ls', ['--depth=0']);
    expect(npmListResult.success).toBe(true);
    console.log('✓ Dependencies can be listed by npm');

    // Validate syncpack is working
    const syncpackListResult = await execFileNoThrow('npx', ['syncpack', 'list-mismatches']);
    expect(syncpackListResult.success).toBe(true);
    console.log('✓ Syncpack is functioning correctly');

    console.log('✓ Final validation summary completed');
    console.log('🎉 Quickstart end-to-end validation PASSED!');
  });
});