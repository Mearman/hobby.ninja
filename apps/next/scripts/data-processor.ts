import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface BuildResults {
  [category: string]: number;
}

export interface DataProcessorOptions {
  sourceDir?: string;
  outputDir?: string;
  categories?: readonly string[];
}

/**
 * Core data processing logic that can be used by both webpack plugin and external scripts
 */
export class DataProcessor {
  private sourceDir: string;
  private outputDir: string;
  private categories: readonly string[];

  constructor(options: DataProcessorOptions = {}) {
    this.sourceDir = options.sourceDir || path.join(process.cwd(), 'data', 'api', 'graph');
    this.outputDir = options.outputDir || path.join(process.cwd(), 'apps', 'next', 'src', 'data');
    this.categories = options.categories || ['items', 'brands', 'categories', 'series'] as const;
  }

  /**
   * Validate that source directories exist before processing
   */
  private validateSourceDirectories(): void {
    const missingDirs: string[] = [];

    for (const category of this.categories) {
      const categoryDir = path.join(this.sourceDir, category);
      if (!fs.existsSync(categoryDir)) {
        missingDirs.push(category);
      }
    }

    if (missingDirs.length > 0) {
      throw new Error(
        `❌ CRITICAL: Missing data directories for categories: ${missingDirs.join(', ')}\n` +
        `   Expected source directory: ${this.sourceDir}\n` +
        `   Missing subdirectories: ${missingDirs.map(cat => path.join(this.sourceDir, cat)).join(', ')}\n` +
        `   This is a hard failure - data processing cannot continue.`
      );
    }
  }

  /**
   * Build data files by combining individual JSON files into single index files
   */
  buildDataFiles(): BuildResults {
    // Validate source directories exist first
    this.validateSourceDirectories();

    // Create output directory
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    const results: BuildResults = {};

    console.log('🔧 Building static data files...');

    for (const category of this.categories) {
      const categoryDir = path.join(this.sourceDir, category);
      const outputFile = path.join(this.outputDir, `${category}.json`);

      try {
        // Read all JSON files in the category directory
        const files = fs.readdirSync(categoryDir).filter((file: string): file is `${string}.json` =>
          file.endsWith('.json')
        );

        if (files.length === 0) {
          throw new Error(`❌ CRITICAL: No JSON files found in ${categoryDir} for category '${category}'`);
        }

        const allData: unknown[] = [];

        for (const file of files) {
          const filePath = path.join(categoryDir, file);
          const content = fs.readFileSync(filePath, 'utf-8');
          const data = JSON.parse(content);
          allData.push(data);
        }

        // Write combined data as JSON
        fs.writeFileSync(outputFile, JSON.stringify(allData, null, 2));
        results[category] = allData.length;

        console.log(`✅ Generated ${category}.json with ${allData.length} items from ${files.length} files`);
      } catch (error) {
        throw new Error(`❌ CRITICAL: Failed to process category '${category}': ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    console.log('\n📊 Build Summary:');
    Object.entries(results).forEach(([category, count]) => {
      console.log(`   ${category}: ${count} items`);
    });

    return results;
  }

  /**
   * Get processing statistics
   */
  getStats(): { sourceDir: string; outputDir: string; categories: string[] } {
    return {
      sourceDir: this.sourceDir,
      outputDir: this.outputDir,
      categories: [...this.categories],
    };
  }
}

/**
 * Standalone function for external script execution
 */
export function buildDataFiles(options: DataProcessorOptions = {}): BuildResults {
  const processor = new DataProcessor(options);
  return processor.buildDataFiles();
}

// Run the build if this script is executed directly
if (process.argv[1] === __filename) {
  try {
    const results = buildDataFiles();
    console.log('\n🎉 Build data files completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Build data files failed:', error);
    process.exit(1);
  }
}