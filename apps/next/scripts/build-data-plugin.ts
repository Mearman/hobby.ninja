import type { Compiler } from 'webpack';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { DataProcessor } from './data-processor';

const execAsync = promisify(exec);

interface WebpackPluginOptions {
  // Options specific to webpack plugin behavior
  sourceDir?: string;
  outputDir?: string;
  categories?: readonly string[];
  strategy?: 'webpack' | 'nx' | 'disabled'; // Single strategy variable
}

class BuildDataPlugin {
  private hasRun = false;
  private dataProcessor: DataProcessor;
  private strategy: 'webpack' | 'nx' | 'disabled';

  constructor(options: WebpackPluginOptions = {}) {
    // Determine build data strategy
    this.strategy = options.strategy || 'webpack';

    // Set up default paths relative to monorepo root when running from webpack
    const defaultOptions = {
      sourceDir: options.sourceDir || path.join(process.cwd(), '../../data/api/graph'),
      outputDir: options.outputDir || path.join(process.cwd(), 'src/data'),
      categories: options.categories
    };

    // Initialize data processor with corrected paths
    this.dataProcessor = new DataProcessor(defaultOptions);
  }

  /**
   * Get data processor instance stats
   */
  getStats() {
    return this.dataProcessor.getStats();
  }

  /**
   * Get current build data strategy
   */
  getStrategy(): string {
    return this.strategy;
  }

  /**
   * Invoke NX target programmatically to leverage NX caching
   */
  private async invokeNxTarget(): Promise<void> {
    console.log('🔧 Invoking NX build-data target for cached data processing...');

    try {
      // Execute NX build-data target from monorepo root
      const { stdout, stderr } = await execAsync('nx build-data next', {
        cwd: path.join(process.cwd(), '../../'), // Go to monorepo root
        maxBuffer: 1024 * 1024, // 1MB buffer for console output
      });

      if (stderr && !stderr.includes('Warning')) {
        console.warn('⚠️  NX target warnings:', stderr);
      }

      if (stdout) {
        console.log('📄 NX target output:', stdout);
      }

      console.log('✅ NX build-data target completed successfully');
    } catch (error) {
      console.error('❌ Failed to invoke NX build-data target:', error);
      throw new Error(`NX build-data target failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  apply(compiler: Compiler): void {
    switch (this.strategy) {
      case 'nx':
        console.log('🔧 BuildDataPlugin using NX strategy - invoking NX build-data target for cached data processing');

        // Hook into before compilation to invoke NX target (async support)
        compiler.hooks.beforeCompile.tapAsync('BuildDataPlugin', async (params, callback) => {
          // Only run on server-side compilation and only once per build
          if (compiler.options.target === 'node' && !this.hasRun) {
            this.hasRun = true;

            try {
              await this.invokeNxTarget();
            } catch (error) {
              console.error('❌ CRITICAL: NX target invocation failed:', error instanceof Error ? error.message : String(error));
              // Re-throw to fail the build properly when data processing fails
              callback(new Error(`NX target invocation failed: ${error instanceof Error ? error.message : String(error)}`));
              return;
            }
          }
          callback();
        });
        break;

      case 'disabled':
        console.log('🔧 BuildDataPlugin is disabled - data processing will not run during webpack compilation');
        break;

      case 'webpack':
      default:
        // Hook into compilation start to generate data files directly
        compiler.hooks.compile.tap('BuildDataPlugin', () => {
          // Only run on server-side compilation and only once per build
          if (compiler.options.target === 'node' && !this.hasRun) {
            this.hasRun = true;

            try {
              const results = this.dataProcessor.buildDataFiles();
              console.log('✅ Build data files completed successfully via webpack plugin');
            } catch (error) {
              console.error('❌ CRITICAL: Data processing failed:', error instanceof Error ? error.message : String(error));
              // Re-throw to fail the build properly when data processing fails
              throw error;
            }
          }
        });
        break;
    }
  }
}

export default BuildDataPlugin;