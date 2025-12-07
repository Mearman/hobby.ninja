#!/usr/bin/env node

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

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

function extractSourceUrls() {
  console.log('🔍 Extracting source URLs from JSON files...');

  const jsonFiles = getAllJsonFiles(DATA_DIR);
  console.log(`📁 Found ${jsonFiles.length} JSON files`);

  const urlSet = new Set();
  const urlData = [];
  let processedFiles = 0;

  for (const filePath of jsonFiles) {
    try {
      const content = readFileSync(filePath, 'utf8');
      const data = JSON.parse(content);

      if (data.sourceUrl) {
        const url = data.sourceUrl.trim();
        if (url && url.startsWith('http')) {
          if (!urlSet.has(url)) {
            urlSet.add(url);
            urlData.push({
              url: url,
              id: data.id || null,
              name: data.name?.en || data.name?.ja || null,
              source: filePath
            });
          }
        }
      }

      processedFiles++;
      if (processedFiles % 1000 === 0) {
        process.stdout.write(`\r⏳ Processed ${processedFiles} files, found ${urlSet.size} unique URLs`);
      }
    } catch (error) {
      console.error(`\n❌ Error processing ${filePath}:`, error.message);
    }
  }

  console.log(`\n✅ Processed ${processedFiles} files`);
  console.log(`🔗 Found ${urlSet.size} unique source URLs`);

  // Save URLs to file
  const urlsOnly = Array.from(urlSet);
  writeFileSync('source-urls.txt', urlsOnly.join('\n') + '\n');
  console.log(`💾 Saved ${urlsOnly.length} URLs to source-urls.txt`);

  // Save detailed data to JSON
  writeFileSync('source-urls-detailed.json', JSON.stringify(urlData, null, 2));
  console.log(`💾 Saved detailed data to source-urls-detailed.json`);

  // Show sample URLs
  console.log('\n📋 Sample URLs:');
  urlsOnly.slice(0, 5).forEach((url, index) => {
    console.log(`   ${index + 1}. ${url}`);
  });

  if (urlsOnly.length > 5) {
    console.log(`   ... and ${urlsOnly.length - 5} more`);
  }

  return urlsOnly;
}

// Run extraction
extractSourceUrls();