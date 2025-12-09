import fs from 'fs';
import path from 'path';

// Plugin to generate combined index.json files for static export
export function buildDataPlugin() {
  return {
    name: 'build-data-plugin',
    postBuild: async () => {
      const publicDataDir = path.join(process.cwd(), 'public', 'data', 'graph');

      // Create public/data/graph directory structure
      if (!fs.existsSync(publicDataDir)) {
        fs.mkdirSync(publicDataDir, { recursive: true });
      }

      // Categories to process
      const categories = ['items', 'brands', 'categories', 'series'];

      for (const category of categories) {
        const sourceDir = path.join(process.cwd(), 'data', 'api', 'graph', category);
        const targetFile = path.join(publicDataDir, `${category}.json`);

        try {
          if (fs.existsSync(sourceDir)) {
            // Read all JSON files in the source directory
            const files = fs.readdirSync(sourceDir).filter((file: string) => file.endsWith('.json'));
            const allData = [];

            for (const file of files) {
              const filePath = path.join(sourceDir, file);
              const content = fs.readFileSync(filePath, 'utf-8');
              const data = JSON.parse(content);
              allData.push(data);
            }

            // Write combined data to target file
            fs.writeFileSync(targetFile, JSON.stringify(allData, null, 2));
            console.log(`✅ Generated ${targetFile} with ${allData.length} ${category}`);
          }
        } catch (error) {
          console.error(`Failed to generate ${category}.json:`, error);
        }
      }
    }
  };
}