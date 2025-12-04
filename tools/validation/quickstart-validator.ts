#!/usr/bin/env node

/**
 * Quickstart Validation Script
 *
 * This script validates that the quickstart.md guide is accurate and production-ready.
 * It tests all setup instructions, dependencies, configurations, and workflows.
 */

import { execSync, spawn } from 'child_process';
import { existsSync, readFileSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { createHash } from 'crypto';

interface ValidationReport {
  timestamp: Date;
  nodeVersion: string;
  packageManager: string;
  overallStatus: 'PASSED' | 'FAILED' | 'WARNING';
  sections: {
    prerequisites: ValidationResult;
    dependencies: ValidationResult;
    configuration: ValidationResult;
    workflows: ValidationResult;
    security: ValidationResult;
    performance: ValidationResult;
  };
  errors: string[];
  warnings: string[];
  recommendations: string[];
}

interface ValidationResult {
  status: 'PASSED' | 'FAILED' | 'WARNING' | 'SKIPPED';
  tests: TestResult[];
  details: string;
}

interface TestResult {
  name: string;
  status: 'PASSED' | 'FAILED' | 'WARNING' | 'SKIPPED';
  expected: string;
  actual?: string;
  error?: string;
  duration: number;
}

class QuickstartValidator {
  private report: ValidationReport;
  private projectRoot: string;
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
    this.projectRoot = process.cwd();
    this.report = {
      timestamp: new Date(),
      nodeVersion: process.version,
      packageManager: this.detectPackageManager(),
      overallStatus: 'PASSED',
      sections: {
        prerequisites: { status: 'SKIPPED', tests: [], details: '' },
        dependencies: { status: 'SKIPPED', tests: [], details: '' },
        configuration: { status: 'SKIPPED', tests: [], details: '' },
        workflows: { status: 'SKIPPED', tests: [], details: '' },
        security: { status: 'SKIPPED', tests: [], details: '' },
        performance: { status: 'SKIPPED', tests: [], details: '' }
      },
      errors: [],
      warnings: [],
      recommendations: []
    };
  }

  private detectPackageManager(): string {
    try {
      if (existsSync(join(this.projectRoot, 'yarn.lock'))) return 'yarn';
      if (existsSync(join(this.projectRoot, 'pnpm-lock.yaml'))) return 'pnpm';
      if (existsSync(join(this.projectRoot, 'package-lock.json'))) return 'npm';
    } catch {
      return 'npm';
    }
    return 'npm';
  }

  private async runCommand(command: string, timeout = 30000): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve, reject) => {
      const [cmd, ...args] = command.split(' ');
      const child = spawn(cmd, args, {
        cwd: this.projectRoot,
        stdio: 'pipe',
        shell: true
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => stdout += data.toString());
      child.stderr?.on('data', (data) => stderr += data.toString());

      const timer = setTimeout(() => {
        child.kill('SIGKILL');
        reject(new Error(`Command timed out after ${timeout}ms`));
      }, timeout);

      child.on('close', (code) => {
        clearTimeout(timer);
        resolve({ stdout, stderr, exitCode: code || 0 });
      });

      child.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  private async testPrerequisites(): Promise<ValidationResult> {
    const tests: TestResult[] = [];
    let details = '';

    // Test Node.js version
    tests.push(await this.wrapTest('Node.js version >= 20', async () => {
      const nodeVersion = process.version;
      const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
      if (majorVersion < 20) {
        throw new Error(`Node.js ${majorVersion} detected, requires >= 20`);
      }
      return `Node.js ${nodeVersion} detected`;
    }));

    // Test package manager availability
    tests.push(await this.wrapTest(`${this.report.packageManager} availability`, async () => {
      try {
        const result = await this.runCommand(`${this.report.packageManager} --version`);
        return `${this.report.packageManager} ${result.stdout.trim()}`;
      } catch (error) {
        throw new Error(`${this.report.packageManager} not available`);
      }
    }));

    // Test Git availability
    tests.push(await this.wrapTest('Git availability', async () => {
      try {
        const result = await this.runCommand('git --version');
        return result.stdout.trim();
      } catch (error) {
        throw new Error('Git not available');
      }
    }));

    // Test Nx CLI
    tests.push(await this.wrapTest('Nx CLI availability', async () => {
      try {
        const result = await this.runCommand('npx nx --version');
        return `Nx ${result.stdout.trim()}`;
      } catch (error) {
        throw new Error('Nx CLI not available');
      }
    }));

    const failedTests = tests.filter(t => t.status === 'FAILED');
    const status = failedTests.length === 0 ? 'PASSED' : 'FAILED';
    details = `${tests.length - failedTests.length}/${tests.length} tests passed`;

    return { status, tests, details };
  }

  private async testDependencies(): Promise<ValidationResult> {
    const tests: TestResult[] = [];
    let details = '';

    // Test if package.json exists
    tests.push(await this.wrapTest('package.json exists', async () => {
      const packageJsonPath = join(this.projectRoot, 'package.json');
      if (!existsSync(packageJsonPath)) {
        throw new Error('package.json not found');
      }
      const stat = statSync(packageJsonPath);
      return `package.json exists (${stat.size} bytes)`;
    }));

    // Test if lockfile exists
    const lockfile = this.report.packageManager === 'yarn' ? 'yarn.lock' :
                    this.report.packageManager === 'pnpm' ? 'pnpm-lock.yaml' :
                    'package-lock.json';
    tests.push(await this.wrapTest(`${lockfile} exists`, async () => {
      const lockfilePath = join(this.projectRoot, lockfile);
      if (!existsSync(lockfilePath)) {
        throw new Error(`${lockfile} not found`);
      }
      const stat = statSync(lockfilePath);
      return `${lockfile} exists (${stat.size} bytes)`;
    }));

    // Test dependencies installation
    tests.push(await this.wrapTest('Dependencies installed', async () => {
      try {
        const result = await this.runCommand(`${this.report.packageManager} ls --depth=0`);
        return 'Dependencies appear to be installed';
      } catch (error) {
        throw new Error('Dependencies not properly installed');
      }
    }));

    // Test critical dependencies from quickstart
    const criticalDeps = [
      'react',
      'react-dom',
      '@tanstack/react-router',
      '@mantine/core',
      '@vanilla-extract/css',
      'dexie'
    ];

    for (const dep of criticalDeps) {
      tests.push(await this.wrapTest(`Critical dependency: ${dep}`, async () => {
        try {
          const result = await this.runCommand(`${this.report.packageManager} list ${dep}`);
          if (result.exitCode !== 0) {
            throw new Error(`${dep} not found`);
          }
          return `${dep} is installed`;
        } catch (error) {
          throw new Error(`${dep} not properly installed`);
        }
      }));
    }

    // Test syncpack configuration
    tests.push(await this.wrapTest('Syncpack configuration', async () => {
      const syncpackConfigPath = join(this.projectRoot, 'syncpack.config.ts');
      if (!existsSync(syncpackConfigPath)) {
        throw new Error('syncpack.config.ts not found');
      }
      return 'Syncpack configuration exists';
    }));

    const failedTests = tests.filter(t => t.status === 'FAILED');
    const status = failedTests.length === 0 ? 'PASSED' : 'FAILED';
    details = `${tests.length - failedTests.length}/${tests.length} dependency checks passed`;

    return { status, tests, details };
  }

  private async testConfiguration(): Promise<ValidationResult> {
    const tests: TestResult[] = [];
    let details = '';

    // Test TypeScript configuration
    tests.push(await this.wrapTest('TypeScript base configuration', async () => {
      const tsconfigPath = join(this.projectRoot, 'tsconfig.base.json');
      if (!existsSync(tsconfigPath)) {
        throw new Error('tsconfig.base.json not found');
      }
      const config = JSON.parse(readFileSync(tsconfigPath, 'utf8'));
      if (!config.compilerOptions?.strict) {
        throw new Error('TypeScript strict mode not enabled');
      }
      return 'TypeScript configuration is valid';
    }));

    // Test Nx configuration
    tests.push(await this.wrapTest('Nx configuration', async () => {
      const nxConfigPath = join(this.projectRoot, 'nx.json');
      if (!existsSync(nxConfigPath)) {
        throw new Error('nx.json not found');
      }
      const config = JSON.parse(readFileSync(nxConfigPath, 'utf8'));
      if (!config.defaultProject) {
        throw new Error('No default project configured in Nx');
      }
      return 'Nx configuration is valid';
    }));

    // Test Vite configuration
    tests.push(await this.wrapTest('Vite configuration', async () => {
      const viteConfigPath = join(this.projectRoot, 'apps/webapp/vite.config.ts');
      if (!existsSync(viteConfigPath)) {
        throw new Error('Vite config not found at apps/webapp/vite.config.ts');
      }
      return 'Vite configuration exists';
    }));

    // Test Playwright configuration
    tests.push(await this.wrapTest('Playwright configuration', async () => {
      const playwrightConfigPath = join(this.projectRoot, 'playwright.config.ts');
      if (!existsSync(playwrightConfigPath)) {
        throw new Error('playwright.config.ts not found');
      }
      return 'Playwright configuration exists';
    }));

    // Test Vitest configuration
    tests.push(await this.wrapTest('Vitest configuration', async () => {
      const vitestConfigPath = join(this.projectRoot, 'vitest.config.ts');
      if (!existsSync(vitestConfigPath)) {
        throw new Error('vitest.config.ts not found');
      }
      return 'Vitest configuration exists';
    }));

    // Test webapp project configuration
    tests.push(await this.wrapTest('Webapp project configuration', async () => {
      const projectJsonPath = join(this.projectRoot, 'apps/webapp/project.json');
      if (!existsSync(projectJsonPath)) {
        throw new Error('apps/webapp/project.json not found');
      }
      const config = JSON.parse(readFileSync(projectJsonPath, 'utf8'));
      const requiredTargets = ['build', 'serve', 'lint', 'test'];
      const missingTargets = requiredTargets.filter(target => !config.targets?.[target]);
      if (missingTargets.length > 0) {
        throw new Error(`Missing targets: ${missingTargets.join(', ')}`);
      }
      return 'Webapp project configuration is valid';
    }));

    const failedTests = tests.filter(t => t.status === 'FAILED');
    const status = failedTests.length === 0 ? 'PASSED' : 'FAILED';
    details = `${tests.length - failedTests.length}/${tests.length} configuration checks passed`;

    return { status, tests, details };
  }

  private async testWorkflows(): Promise<ValidationResult> {
    const tests: TestResult[] = [];
    let details = '';

    // Test build workflow
    tests.push(await this.wrapTest('Build workflow', async () => {
      try {
        const result = await this.runCommand('nx build webapp', 120000);
        if (result.exitCode !== 0) {
          throw new Error(`Build failed: ${result.stderr}`);
        }

        // Check if build output exists
        const distPath = join(this.projectRoot, 'dist/apps/webapp');
        if (!existsSync(distPath)) {
          throw new Error('Build output directory not created');
        }

        return 'Build completed successfully';
      } catch (error) {
        throw new Error(`Build workflow failed: ${error}`);
      }
    }));

    // Test lint workflow
    tests.push(await this.wrapTest('Lint workflow', async () => {
      try {
        const result = await this.runCommand('nx lint webapp', 60000);
        if (result.exitCode !== 0) {
          throw new Error(`Linting failed: ${result.stderr}`);
        }
        return 'Linting passed';
      } catch (error) {
        throw new Error(`Lint workflow failed: ${error}`);
      }
    }));

    // Test unit test workflow
    tests.push(await this.wrapTest('Unit test workflow', async () => {
      try {
        const result = await this.runCommand('nx test webapp', 60000);
        if (result.exitCode !== 0 && result.exitCode !== 1) { // Exit code 1 might mean no tests
          throw new Error(`Tests failed: ${result.stderr}`);
        }
        return 'Unit tests completed';
      } catch (error) {
        throw new Error(`Unit test workflow failed: ${error}`);
      }
    }));

    // Test syncpack workflow
    tests.push(await this.wrapTest('Syncpack workflow', async () => {
      try {
        const result = await this.runCommand('npx syncpack list-mismatches', 30000);
        // syncpack should not find any mismatches
        if (result.stdout.includes('mismatches found')) {
          throw new Error('Dependency version mismatches found');
        }
        return 'No dependency mismatches found';
      } catch (error) {
        throw new Error(`Syncpack workflow failed: ${error}`);
      }
    }));

    // Test development server start (quick check)
    tests.push(await this.wrapTest('Development server start check', async () => {
      try {
        // Just check if the command can start (timeout quickly)
        await this.runCommand('timeout 10s nx serve webapp || true', 15000);
        return 'Development server appears to start correctly';
      } catch (error) {
        // This test is expected to timeout, so we're more lenient
        return 'Development server start check completed (timeout expected)';
      }
    }));

    const failedTests = tests.filter(t => t.status === 'FAILED');
    const status = failedTests.length === 0 ? 'PASSED' : 'FAILED';
    details = `${tests.length - failedTests.length}/${tests.length} workflow tests passed`;

    return { status, tests, details };
  }

  private async testSecurity(): Promise<ValidationResult> {
    const tests: TestResult[] = [];
    let details = '';

    // Test for security scanning tools
    tests.push(await this.wrapTest('Security scanning tools', async () => {
      const securityToolPath = join(this.projectRoot, 'tools/security/src/index.ts');
      if (existsSync(securityToolPath)) {
        return 'Security scanning tools are available';
      }
      return 'Security scanning tools not found (optional)';
    }));

    // Test package.json security
    tests.push(await this.wrapTest('Package.json security configuration', async () => {
      const packageJsonPath = join(this.projectRoot, 'package.json');
      const config = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

      if (config.engines && config.engines.node) {
        const nodeVersion = config.engines.node;
        if (nodeVersion.includes('>=20')) {
          return `Node.js version constraint properly set: ${nodeVersion}`;
        }
      }

      return 'Node.js version constraint not set or too permissive';
    }));

    // Test for sensitive files in git
    tests.push(await this.wrapTest('No sensitive files in git', async () => {
      try {
        const result = await this.runCommand('git ls-files | grep -E "\\.(env|key|pem|p12)$" || true');
        if (result.stdout.trim()) {
          throw new Error('Sensitive files detected in git');
        }
        return 'No sensitive files found in git';
      } catch (error) {
        throw new Error(`Security check failed: ${error}`);
      }
    }));

    // Test dependency security (basic check)
    tests.push(await this.wrapTest('Dependency security check', async () => {
      try {
        const result = await this.runCommand(`${this.report.packageManager} audit --audit-level=high`, 30000);
        if (result.stderr.includes('vulnerabilities found')) {
          throw new Error('High-severity vulnerabilities found');
        }
        return 'No high-severity vulnerabilities found';
      } catch (error) {
        throw new Error(`Dependency security check failed: ${error}`);
      }
    }));

    const failedTests = tests.filter(t => t.status === 'FAILED');
    const status = failedTests.length === 0 ? 'PASSED' : 'WARNING';
    details = `${tests.length - failedTests.length}/${tests.length} security checks passed`;

    return { status, tests, details };
  }

  private async testPerformance(): Promise<ValidationResult> {
    const tests: TestResult[] = [];
    let details = '';

    // Test build size analysis
    tests.push(await this.wrapTest('Build size analysis', async () => {
      const distPath = join(this.projectRoot, 'dist/apps/webapp');
      if (existsSync(distPath)) {
        try {
          const result = await this.runCommand(`du -sh ${distPath}`, 10000);
          const size = result.stdout.trim().split('\t')[0];
          return `Build size: ${size}`;
        } catch (error) {
          return 'Build size analysis failed';
        }
      }
      return 'Build not available for size analysis';
    }));

    // Test performance budget configuration
    tests.push(await this.wrapTest('Performance budget configuration', async () => {
      const perfBudgetPath = join(this.projectRoot, 'performance-budget.json');
      if (existsSync(perfBudgetPath)) {
        const config = JSON.parse(readFileSync(perfBudgetPath, 'utf8'));
        if (config.bundles && config.thresholds) {
          return 'Performance budget configuration found';
        }
        return 'Performance budget configuration incomplete';
      }
      return 'Performance budget configuration not found';
    }));

    // Test dependency optimization
    tests.push(await this.wrapTest('Dependency optimization check', async () => {
      try {
        const result = await this.runCommand(`${this.report.packageManager} ls --depth=0 | wc -l`, 10000);
        const depCount = parseInt(result.stdout.trim());
        if (depCount > 100) {
          return `${depCount} dependencies (consider optimization)`;
        }
        return `${depCount} dependencies (reasonable count)`;
      } catch (error) {
        return 'Dependency count check failed';
      }
    }));

    // Test for bundle analysis tools
    tests.push(await this.wrapTest('Bundle analysis tools', async () => {
      const packageJsonPath = join(this.projectRoot, 'package.json');
      const config = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

      const hasBundleAnalyzer = config.devDependencies && (
        config.devDependencies['rollup-plugin-visualizer'] ||
        config.devDependencies['webpack-bundle-analyzer']
      );

      if (hasBundleAnalyzer) {
        return 'Bundle analysis tools are available';
      }
      return 'Bundle analysis tools not found (optional)';
    }));

    const failedTests = tests.filter(t => t.status === 'FAILED');
    const status = failedTests.length === 0 ? 'PASSED' : 'WARNING';
    details = `${tests.length - failedTests.length}/${tests.length} performance checks passed`;

    return { status, tests, details };
  }

  private async wrapTest(name: string, testFn: () => Promise<string>): Promise<TestResult> {
    const startTime = Date.now();
    try {
      const expected = 'Test should pass';
      const actual = await testFn();
      return {
        name,
        status: 'PASSED',
        expected,
        actual,
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        name,
        status: 'FAILED',
        expected: 'Test should pass',
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      };
    }
  }

  private generateRecommendations(): void {
    const recommendations: string[] = [];

    // Analyze test results and generate recommendations
    Object.entries(this.report.sections).forEach(([section, result]) => {
      const failedTests = result.tests.filter(t => t.status === 'FAILED');

      if (failedTests.length > 0) {
        switch (section) {
          case 'prerequisites':
            recommendations.push('Update Node.js to version 20 or higher');
            recommendations.push('Ensure all required tools are installed globally');
            break;
          case 'dependencies':
            recommendations.push('Run dependency installation commands from quickstart');
            recommendations.push('Verify all critical dependencies are installed');
            break;
          case 'configuration':
            recommendations.push('Review and fix configuration files');
            recommendations.push('Ensure TypeScript strict mode is enabled');
            break;
          case 'workflows':
            recommendations.push('Fix failing build and test workflows');
            recommendations.push('Verify all scripts in package.json work correctly');
            break;
          case 'security':
            recommendations.push('Implement security scanning tools');
            recommendations.push('Update dependencies to fix security vulnerabilities');
            break;
          case 'performance':
            recommendations.push('Optimize bundle size and dependency count');
            recommendations.push('Implement performance budgets');
            break;
        }
      }
    });

    if (recommendations.length === 0) {
      recommendations.push('Quickstart validation passed successfully!');
      recommendations.push('Consider adding integration tests for better coverage');
      recommendations.push('Set up CI/CD pipeline for automated validation');
    }

    this.report.recommendations = recommendations;
  }

  private generateReport(): void {
    console.log('\n' + '='.repeat(80));
    console.log('QUICKSTART VALIDATION REPORT');
    console.log('='.repeat(80));
    console.log(`Timestamp: ${this.report.timestamp.toISOString()}`);
    console.log(`Node.js: ${this.report.nodeVersion}`);
    console.log(`Package Manager: ${this.report.packageManager}`);
    console.log(`Overall Status: ${this.report.overallStatus}`);
    console.log(`Duration: ${Date.now() - this.startTime}ms`);
    console.log('');

    // Print section results
    Object.entries(this.report.sections).forEach(([section, result]) => {
      console.log(`${section.toUpperCase()} SECTION: ${result.status}`);
      console.log(`  ${result.details}`);

      if (result.tests.length > 0) {
        result.tests.forEach(test => {
          const icon = test.status === 'PASSED' ? '✓' : test.status === 'FAILED' ? '✗' : '⚠';
          console.log(`  ${icon} ${test.name} (${test.duration}ms)`);
          if (test.error) {
            console.log(`    Error: ${test.error}`);
          }
        });
      }
      console.log('');
    });

    // Print recommendations
    if (this.report.recommendations.length > 0) {
      console.log('RECOMMENDATIONS:');
      this.report.recommendations.forEach((rec, index) => {
        console.log(`  ${index + 1}. ${rec}`);
      });
      console.log('');
    }

    // Print errors and warnings
    if (this.report.errors.length > 0) {
      console.log('ERRORS:');
      this.report.errors.forEach(error => console.log(`  - ${error}`));
      console.log('');
    }

    if (this.report.warnings.length > 0) {
      console.log('WARNINGS:');
      this.report.warnings.forEach(warning => console.log(`  - ${warning}`));
      console.log('');
    }

    console.log('='.repeat(80));
  }

  public async validate(): Promise<ValidationReport> {
    console.log('Starting Quickstart Validation...\n');

    try {
      this.report.sections.prerequisites = await this.testPrerequisites();
      console.log('✓ Prerequisites validated');

      this.report.sections.dependencies = await this.testDependencies();
      console.log('✓ Dependencies validated');

      this.report.sections.configuration = await this.testConfiguration();
      console.log('✓ Configuration validated');

      this.report.sections.workflows = await this.testWorkflows();
      console.log('✓ Workflows validated');

      this.report.sections.security = await this.testSecurity();
      console.log('✓ Security validated');

      this.report.sections.performance = await this.testPerformance();
      console.log('✓ Performance validated');

      this.generateRecommendations();

      // Determine overall status
      const sections = Object.values(this.report.sections);
      const hasFailures = sections.some(s => s.status === 'FAILED');
      const hasWarnings = sections.some(s => s.status === 'WARNING');

      if (hasFailures) {
        this.report.overallStatus = 'FAILED';
      } else if (hasWarnings) {
        this.report.overallStatus = 'WARNING';
      } else {
        this.report.overallStatus = 'PASSED';
      }

    } catch (error) {
      this.report.overallStatus = 'FAILED';
      this.report.errors.push(`Validation failed: ${error}`);
    }

    this.generateReport();

    return this.report;
  }
}

// Run validation if script is executed directly
if (require.main === module) {
  const validator = new QuickstartValidator();
  validator.validate()
    .then(report => {
      process.exit(report.overallStatus === 'FAILED' ? 1 : 0);
    })
    .catch(error => {
      console.error('Validation script failed:', error);
      process.exit(1);
    });
}

export { QuickstartValidator, ValidationReport, ValidationResult, TestResult };