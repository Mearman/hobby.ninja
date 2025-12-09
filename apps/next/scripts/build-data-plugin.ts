import type { Compiler } from 'webpack';
import fs from 'fs';
import path from 'path';

interface BuildResults {
  [category: string]: number;
}

class BuildDataPlugin {
  private hasRun = false;

  /**
   * Build data files by combining individual JSON files into single index files
   */
  private buildDataFiles(): BuildResults {
    const sourceDir = path.join(process.cwd(), 'data', 'api', 'graph');
    const outputDir = path.join(process.cwd(), 'apps', 'next', 'src', 'data');

    // Create output directory
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Categories to process
    const categories: readonly string[] = ['items', 'brands', 'categories', 'series'] as const;
    const results: BuildResults = {};

    console.log('🔧 Building static data files...');

    for (const category of categories) {
      const categoryDir = path.join(sourceDir, category);
      const outputFile = path.join(outputDir, `${category}.json`);

      try {
        if (fs.existsSync(categoryDir)) {
          // Read all JSON files in the category directory
          const files = fs.readdirSync(categoryDir).filter((file: string): file is `${string}.json` =>
            file.endsWith('.json')
          );
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

          console.log(`✅ Generated ${category}.json with ${allData.length} items`);
        } else {
          console.log(`⚠️  No data directory found for ${category}`);
          results[category] = 0;

          // Create empty file for consistency
          fs.writeFileSync(outputFile, JSON.stringify([], null, 2));
        }
      } catch (error) {
        console.error(`❌ Failed to process ${category}:`, error);
        results[category] = 0;
      }
    }

    console.log('\n📊 Build Summary:');
    Object.entries(results).forEach(([category, count]) => {
      console.log(`   ${category}: ${count} items`);
    });

    return results;
  }

  apply(compiler: Compiler): void {
    // Hook into compilation start to generate data files
    // Use compile hook to avoid interfering with Next.js initialization
    compiler.hooks.compile.tap('BuildDataPlugin', () => {
      // Only run on server-side compilation and only once per build
      if (compiler.options.target === 'node' && !this.hasRun) {
        this.hasRun = true;

        try {
          const results = this.buildDataFiles();
          console.log('✅ Build data files completed successfully');
        } catch (error) {
          console.error('❌ Failed to build data files:', error);
        }
      }
    });
  }
}

export default BuildDataPlugin;