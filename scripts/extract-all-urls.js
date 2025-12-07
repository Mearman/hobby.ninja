#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = './data';

function getAllJsonFiles(dir) {
  const files = [];

  function traverse(currentDir) {
    try {
      const items = readdirSync(currentDir);

      for (const item of items) {
        const fullPath = join(currentDir, item);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          traverse(fullPath);
        } else if (item.endsWith('.json')) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${currentDir}:`, error.message);
    }
  }

  traverse(dir);
  return files;
}

function extractAllUrls() {
  console.log('🔍 Extracting all URLs from JSON files...');

  const jsonFiles = getAllJsonFiles(DATA_DIR);
  console.log(`📁 Found ${jsonFiles.length} JSON files`);

  const urlCategories = {
    manualSourceUrls: new Set(),
    manualPdfUrls: new Set(),
    catalogSourceUrls: new Set(),
    catalogImageUrls: new Set()
  };

  let processedFiles = 0;

  for (const filePath of jsonFiles) {
    try {
      const content = readFileSync(filePath, 'utf8');
      const data = JSON.parse(content);

      // Determine if this is a manual or catalog file
      if (filePath.includes('/manuals/')) {
        // Manual file - extract manual source URLs and PDF URLs
        if (data.sourceUrl) {
          const url = data.sourceUrl.trim();
          if (url && url.startsWith('http')) {
            urlCategories.manualSourceUrls.add(url);
          }
        }
        if (data.pdfUrl) {
          const url = data.pdfUrl.trim();
          if (url && url.startsWith('http')) {
            urlCategories.manualPdfUrls.add(url);
          }
        }
      } else if (filePath.includes('/items/')) {
        // Catalog file - extract source URLs and image URLs
        if (data.sourceUrl) {
          const url = data.sourceUrl.trim();
          if (url && url.startsWith('http')) {
            urlCategories.catalogSourceUrls.add(url);
          }
        }

        // Extract image URLs from images array (can be strings or objects)
        if (data.images && Array.isArray(data.images)) {
          data.images.forEach(imageItem => {
            let url = null;

            // Handle both string URLs and objects with imageUrl field
            if (typeof imageItem === 'string') {
              url = imageItem.trim();
            } else if (imageItem && imageItem.imageUrl) {
              url = imageItem.imageUrl.trim();
            }

            if (url && url.startsWith('http')) {
              urlCategories.catalogImageUrls.add(url);
            }
          });
        }

        // Extract image URLs from relatedProducts array
        if (data.relatedProducts && Array.isArray(data.relatedProducts)) {
          data.relatedProducts.forEach(product => {
            if (product.imageUrl) {
              const url = product.imageUrl.trim();
              if (url && url.startsWith('http')) {
                urlCategories.catalogImageUrls.add(url);
              }
            }
          });
        }

        // Also check for single imageUrl field at root level
        if (data.imageUrl) {
          const url = data.imageUrl.trim();
          if (url && url.startsWith('http')) {
            urlCategories.catalogImageUrls.add(url);
          }
        }
      }

      processedFiles++;
      if (processedFiles % 5000 === 0) {
        const totalUrls = Object.values(urlCategories).reduce((sum, set) => sum + set.size, 0);
        process.stdout.write(`\r⏳ Processed ${processedFiles} files, found ${totalUrls} unique URLs`);
      }
    } catch (error) {
      console.error(`\n❌ Error processing ${filePath}:`, error.message);
    }
  }

  console.log(`\n✅ Processed ${processedFiles} files`);

  // Save each category to separate files
  const results = {};

  for (const [category, urlSet] of Object.entries(urlCategories)) {
    const urls = Array.from(urlSet);
    results[category] = urls;

    // Save to text file
    const filename = `${category}.txt`;
    writeFileSync(filename, urls.join('\n') + '\n');
    console.log(`💾 ${urls.length} ${category} saved to ${filename}`);
  }

  // Save summary
  const summary = {
    manualSourceUrls: urlCategories.manualSourceUrls.size,
    manualPdfUrls: urlCategories.manualPdfUrls.size,
    catalogSourceUrls: urlCategories.catalogSourceUrls.size,
    catalogImageUrls: urlCategories.catalogImageUrls.size,
    total: Object.values(urlCategories).reduce((sum, set) => sum + set.size, 0)
  };

  writeFileSync('url-summary.json', JSON.stringify(summary, null, 2));
  console.log(`\n📊 URL Summary:`);
  console.log(`   Manual Source URLs: ${summary.manualSourceUrls}`);
  console.log(`   Manual PDF URLs: ${summary.manualPdfUrls}`);
  console.log(`   Catalog Source URLs: ${summary.catalogSourceUrls}`);
  console.log(`   Catalog Image URLs: ${summary.catalogImageUrls}`);
  console.log(`   Total Unique URLs: ${summary.total}`);

  // Show samples from each category
  console.log(`\n📋 Sample URLs:`);
  for (const [category, urls] of Object.entries(results)) {
    if (urls.length > 0) {
      console.log(`\n   ${category}:`);
      urls.slice(0, 3).forEach((url, index) => {
        console.log(`     ${index + 1}. ${url}`);
      });
      if (urls.length > 3) {
        console.log(`     ... and ${urls.length - 3} more`);
      }
    }
  }

  return results;
}

// Run extraction
extractAllUrls();