import type { Compiler } from 'webpack';
import path from 'path';
import { DataProcessor } from './data-processor';

interface WebpackPluginOptions {
  // Options specific to webpack plugin behavior
  sourceDir?: string;
  outputDir?: string;
  categories?: readonly string[];
  enabled?: boolean; // Toggle for enabling/disabling the plugin
}

class BuildDataPlugin {
  private hasRun = false;
  private dataProcessor: DataProcessor;
  private enabled: boolean;

  constructor(options: WebpackPluginOptions = {}) {
    // Check if plugin is explicitly disabled
    this.enabled = options.enabled !== false; // Default to enabled

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
   * Check if plugin is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  apply(compiler: Compiler): void {
    if (!this.enabled) {
      console.log('🔧 BuildDataPlugin is disabled - data processing will not run during webpack compilation');
      return;
    }

    // Hook into compilation start to generate data files
    // Use compile hook to avoid interfering with Next.js initialization
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
  }
}

export default BuildDataPlugin;