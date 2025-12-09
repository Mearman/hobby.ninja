import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface BuildResults {
  [category: string]: number;
}

/**
 * Build script to process JSON data files for Next.js static export
 * This script combines individual JSON files into single index files
 * that can be imported directly during the build process
 */
function buildDataFiles(): BuildResults {
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

// Run the build if this script is executed directly
// Check if the module is being run directly (ES modules equivalent of require.main === module)
if (process.argv[1] === __filename) {
  buildDataFiles();
  console.log('\n🎉 Build data files completed successfully!');
}

export { buildDataFiles };