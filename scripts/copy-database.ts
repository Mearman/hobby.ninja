#!/usr/bin/env tsx

/**
 * Data Copy Script
 *
 * CRITICAL: Copies ONLY clean JSON files (excluding .html.json files) from data/ to apps/web/public/data/
 * and generates searchable indices. Handles large file sets efficiently with progress logging.
 *
 * IMPORTANT: This script explicitly EXCLUDES all .html.json files - only clean .json files are processed.
 *
 * Usage:
 *   tsx scripts/copy-database.ts
 *   or make it executable: chmod +x scripts/copy-database.ts && ./scripts/copy-database.ts
 */

import { promises as fs, readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import * as path from 'path';

// Use Node.js __dirname for compatibility
const __dirname = path.dirname(new URL(import.meta.url).pathname);
const PROJECT_ROOT = path.resolve(__dirname, '..');

// Configuration
const CONFIG = {
  sourceDir: path.join(PROJECT_ROOT, 'data'),
  targetDir: path.join(PROJECT_ROOT, 'apps/web/public/data'),
  indicesDir: path.join(PROJECT_ROOT, 'apps/web/public/data/indices'),
  configDir: path.join(PROJECT_ROOT, 'apps/web/public/data/config'),

  paths: {
    unifiedProducts: 'bandai/unified/products',
    manuals: 'bandai/manuals',
    items: 'bandai/items'
  },

  batchSize: 100, // Process files in batches for memory efficiency
  logInterval: 500 // Log progress every N files
};

// Types for our data structures
interface UnifiedProduct {
  id: string;
  brand: string;
  series?: string;
  model?: string;
  name?: string;
  grade?: string;
  scale?: string;
  price?: number;
  releaseDate?: string;
  manualUrl?: string;
  catalogUrl?: string;
  description?: string;
  [key: string]: any;
}

interface ManualData {
  id: string;
  manualUrl?: string;
  catalogUrl?: string;
  [key: string]: any;
}

interface ItemData {
  id: string;
  [key: string]: any;
}

interface MasterIndexItem {
  id: string;
  source: 'unified' | 'manual' | 'item';
  type: string;
  name?: string;
  series?: string;
  model?: string;
  grade?: string;
  lastModified: string;
}

interface SearchIndexItem {
  id: string;
  tokens: string[];
  name?: string;
  series?: string;
  model?: string;
  grade?: string;
  brand?: string;
  type: string;
}

interface HobbyType {
  id: string;
  name: string;
  description: string;
  brands: string[];
  grades: string[];
  scales: string[];
}

// Utility functions
class Logger {
  private static startTime = Date.now();

  static info(message: string, ...args: any[]): void {
    const timestamp = new Date().toISOString();
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
    console.log(`[${timestamp}] [${elapsed}s] ${message}`, ...args);
  }

  static error(message: string, error?: any): void {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ERROR: ${message}`);
    if (error) {
      console.error(String(error));
    }
  }

  static success(message: string): void {
    const timestamp = new Date().toISOString();
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
    console.log(`[${timestamp}] [${elapsed}s] ✅ ${message}`);
  }
}

/**
 * CRITICAL: Function to check if a file is a clean JSON file
 * This explicitly EXCLUDES .html.json files - only includes clean .json files
 */
function isCleanJsonFile(filename: string): boolean {
  return filename.endsWith('.json') && !filename.endsWith('.html.json');
}

// File system utilities
async function ensureDirectory(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
    Logger.info(`Created directory: ${dirPath}`);
  }
}

async function copyFile(src: string, dest: string): Promise<void> {
  try {
    const data = await fs.readFile(src, 'utf8');
    await ensureDirectory(path.dirname(dest));
    await fs.writeFile(dest, data, 'utf8');
  } catch (error) {
    Logger.error(`Failed to copy file ${src} to ${dest}`, error);
    throw error;
  }
}

// JSON file processing
async function processJsonFile<T = any>(filePath: string): Promise<T | null> {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content) as T;
  } catch (error) {
    Logger.error(`Failed to process JSON file: ${filePath}`, error);
    return null;
  }
}

// Data copying functions
async function copyUnifiedProducts(): Promise<UnifiedProduct[]> {
  Logger.info('Starting to copy unified products...');
  const sourceDir = path.join(CONFIG.sourceDir, CONFIG.paths.unifiedProducts);
  const targetDir = path.join(CONFIG.targetDir, 'unified/products');

  const products: UnifiedProduct[] = [];
  let processedCount = 0;

  try {
    const files = await fs.readdir(sourceDir, { withFileTypes: true });
    // CRITICAL: Only process clean JSON files, EXCLUDE all .html.json files
    const jsonFiles = files.filter(file => file.isFile() && isCleanJsonFile(file.name));

    Logger.info(`Found ${jsonFiles.length} clean unified product files to process (excluding .html.json files)`);

    for (const file of jsonFiles) {
      const srcPath = path.join(sourceDir, file.name);
      const destPath = path.join(targetDir, file.name);

      await copyFile(srcPath, destPath);

      const product = await processJsonFile<UnifiedProduct>(srcPath);
      if (product) {
        products.push(product);
      }

      processedCount++;

      if (processedCount % CONFIG.logInterval === 0) {
        Logger.info(`Processed ${processedCount}/${jsonFiles.length} unified products`);
      }
    }

    Logger.success(`Copied ${processedCount} unified products`);
    return products;

  } catch (error) {
    Logger.error('Failed to copy unified products', error);
    throw error;
  }
}

async function copyManuals(): Promise<ManualData[]> {
  Logger.info('Starting to copy manuals...');
  const sourceDir = path.join(CONFIG.sourceDir, CONFIG.paths.manuals);
  const targetDir = path.join(CONFIG.targetDir, 'manuals');

  const manuals: ManualData[] = [];
  let processedCount = 0;

  try {
    const brandDirs = await fs.readdir(sourceDir, { withFileTypes: true });
    const brandDirsFiltered = brandDirs.filter(dir => dir.isDirectory());

    for (const brandDir of brandDirsFiltered) {
      const brandPath = path.join(sourceDir, brandDir.name);
      const targetBrandPath = path.join(targetDir, brandDir.name);

      const manualFiles = await fs.readdir(brandPath, { withFileTypes: true });
      // CRITICAL: Only process clean JSON files, EXCLUDE all .html.json files
      const jsonFiles = manualFiles.filter(file => file.isFile() && isCleanJsonFile(file.name));

      for (const file of jsonFiles) {
        const srcPath = path.join(brandPath, file.name);
        const destPath = path.join(targetBrandPath, file.name);

        await copyFile(srcPath, destPath);

        const manual = await processJsonFile<ManualData>(srcPath);
        if (manual) {
          manuals.push(manual);
        }

        processedCount++;

        if (processedCount % CONFIG.logInterval === 0) {
          Logger.info(`Processed ${processedCount} manual files`);
        }
      }
    }

    Logger.success(`Copied ${processedCount} manual files`);
    return manuals;

  } catch (error) {
    Logger.error('Failed to copy manuals', error);
    throw error;
  }
}

async function copyItems(): Promise<ItemData[]> {
  Logger.info('Starting to copy items...');
  const sourceDir = path.join(CONFIG.sourceDir, CONFIG.paths.items);

  // Check if items directory exists
  try {
    await fs.access(sourceDir);
  } catch {
    Logger.info('Items directory does not exist, skipping...');
    return [];
  }

  const targetDir = path.join(CONFIG.targetDir, 'items');
  const items: ItemData[] = [];
  let processedCount = 0;

  try {
    const brandDirs = await fs.readdir(sourceDir, { withFileTypes: true });
    const brandDirsFiltered = brandDirs.filter(dir => dir.isDirectory());

    for (const brandDir of brandDirsFiltered) {
      const brandPath = path.join(sourceDir, brandDir.name);
      const targetBrandPath = path.join(targetDir, brandDir.name);

      const itemFiles = await fs.readdir(brandPath, { withFileTypes: true });
      // CRITICAL: Only process clean JSON files, EXCLUDE all .html.json files
      const jsonFiles = itemFiles.filter(file => file.isFile() && isCleanJsonFile(file.name));

      for (const file of jsonFiles) {
        const srcPath = path.join(brandPath, file.name);
        const destPath = path.join(targetBrandPath, file.name);

        await copyFile(srcPath, destPath);

        const item = await processJsonFile<ItemData>(srcPath);
        if (item) {
          items.push(item);
        }

        processedCount++;

        if (processedCount % CONFIG.logInterval === 0) {
          Logger.info(`Processed ${processedCount} item files`);
        }
      }
    }

    Logger.success(`Copied ${processedCount} item files`);
    return items;

  } catch (error) {
    Logger.error('Failed to copy items', error);
    throw error;
  }
}

// Index generation functions
function generateTokens(text: any): string[] {
  if (!text || typeof text !== 'string') return [];

  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length >= 2)
    .filter((token, index, arr) => arr.indexOf(token) === index);
}

async function generateMasterIndex(
  unifiedProducts: UnifiedProduct[],
  manuals: ManualData[],
  items: ItemData[]
): Promise<MasterIndexItem[]> {
  Logger.info('Generating master index...');

  const masterIndex: MasterIndexItem[] = [];

  // Add unified products
  for (const product of unifiedProducts) {
    masterIndex.push({
      id: product.id,
      source: 'unified',
      type: 'product',
      name: product.name,
      series: product.series,
      model: product.model,
      grade: product.grade,
      lastModified: new Date().toISOString()
    });
  }

  // Add manuals
  for (const manual of manuals) {
    masterIndex.push({
      id: manual.id,
      source: 'manual',
      type: 'manual',
      lastModified: new Date().toISOString()
    });
  }

  // Add items
  for (const item of items) {
    masterIndex.push({
      id: item.id,
      source: 'item',
      type: 'item',
      lastModified: new Date().toISOString()
    });
  }

  Logger.success(`Generated master index with ${masterIndex.length} items`);
  return masterIndex;
}

async function generateUnifiedIndex(unifiedProducts: UnifiedProduct[]): Promise<UnifiedProduct[]> {
  Logger.info('Generating unified index...');
  Logger.success(`Generated unified index with ${unifiedProducts.length} products`);
  return unifiedProducts;
}

async function generateManualsOnlyIndex(manuals: ManualData[]): Promise<ManualData[]> {
  Logger.info('Generating manuals-only index...');
  Logger.success(`Generated manuals-only index with ${manuals.length} manuals`);
  return manuals;
}

async function generateCatalogOnlyIndex(): Promise<any[]> {
  Logger.info('Generating catalog-only index...');
  // This would contain catalog items without manuals
  // For now, return empty array - can be implemented based on specific requirements
  Logger.success('Generated catalog-only index (empty for now)');
  return [];
}

async function generateSearchIndex(
  unifiedProducts: UnifiedProduct[],
  manuals: ManualData[],
  items: ItemData[]
): Promise<SearchIndexItem[]> {
  Logger.info('Generating search index...');

  const searchIndex: SearchIndexItem[] = [];

  // Process unified products
  for (const product of unifiedProducts) {
    const tokens = [
      ...generateTokens(product.name),
      ...generateTokens(product.series),
      ...generateTokens(product.model),
      ...generateTokens(product.grade),
      ...generateTokens(product.brand)
    ];

    searchIndex.push({
      id: product.id,
      tokens: Array.from(new Set(tokens)), // Remove duplicates
      name: product.name,
      series: product.series,
      model: product.model,
      grade: product.grade,
      brand: product.brand,
      type: 'product'
    });
  }

  // Process manuals
  for (const manual of manuals) {
    searchIndex.push({
      id: manual.id,
      tokens: ['manual'],
      type: 'manual'
    });
  }

  // Process items
  for (const item of items) {
    searchIndex.push({
      id: item.id,
      tokens: ['item'],
      type: 'item'
    });
  }

  Logger.success(`Generated search index with ${searchIndex.length} items`);
  return searchIndex;
}

async function generateHobbyConfig(): Promise<HobbyType[]> {
  Logger.info('Generating hobby configuration...');

  const hobbyTypes: HobbyType[] = [
    {
      id: 'gunpla',
      name: 'Gundam Models',
      description: 'Plastic model kits from the Gundam franchise',
      brands: ['Bandai', 'Bandai Spirits'],
      grades: ['HG', 'MG', 'PG', 'RG', 'EG', 'SD', 'RE', 'Mega Size', '1/144', '1/100', '1/60', '1/48'],
      scales: ['1/144', '1/100', '1/60', '1/48', '1/72', '1/550', '1/400']
    },
    {
      id: 'action-figures',
      name: 'Action Figures',
      description: 'Pre-assembled poseable figures and robots',
      brands: ['Bandai', 'Bandai Spirits', 'Tamashii Nations'],
      grades: ['S.H.Figuarts', 'Metal Build', 'Robot Spirits', 'Figure-rise'],
      scales: ['1/12', '1/6', 'Non-scale']
    },
    {
      id: 'model-kits',
      name: 'Model Kits',
      description: 'Assembly-required model kits from various franchises',
      brands: ['Bandai', 'Kotobukiya', 'Good Smile Company'],
      grades: ['HG', 'MG', 'RG', 'EG', 'Non-grade'],
      scales: ['1/144', '1/100', '1/60', '1/72', '1/48']
    }
  ];

  Logger.success('Generated hobby configuration');
  return hobbyTypes;
}

async function writeIndexJson<T>(filename: string, data: T): Promise<void> {
  const filePath = path.join(CONFIG.indicesDir, filename);
  try {
    const jsonString = JSON.stringify(data, null, 0); // Compact JSON for production
    await fs.writeFile(filePath, jsonString, 'utf8');
    Logger.info(`Wrote index: ${filename} (${Buffer.byteLength(jsonString)} bytes)`);
  } catch (error) {
    Logger.error(`Failed to write index file: ${filename}`, error);
    throw error;
  }
}

async function writeConfigJson<T>(filename: string, data: T): Promise<void> {
  const filePath = path.join(CONFIG.configDir, filename);
  try {
    const jsonString = JSON.stringify(data, null, 2); // Formatted JSON for config
    await fs.writeFile(filePath, jsonString, 'utf8');
    Logger.info(`Wrote config: ${filename} (${Buffer.byteLength(jsonString)} bytes)`);
  } catch (error) {
    Logger.error(`Failed to write config file: ${filename}`, error);
    throw error;
  }
}

// Main execution function
async function main(): Promise<void> {
  Logger.info('🚀 Starting CRITICAL data copy process...');
  Logger.info('🚨 IMPORTANT: ONLY copying clean JSON files - EXCLUDING all .html.json files');
  Logger.info(`Source directory: ${CONFIG.sourceDir}`);
  Logger.info(`Target directory: ${CONFIG.targetDir}`);

  try {
    // Ensure target directories exist
    await ensureDirectory(CONFIG.targetDir);
    await ensureDirectory(CONFIG.indicesDir);
    await ensureDirectory(CONFIG.configDir);

    // Copy ONLY clean JSON data files (excluding .html.json files)
    Logger.info('🔄 Copying ONLY clean JSON files - .html.json files will be EXCLUDED');
    const [unifiedProducts, manuals, items] = await Promise.all([
      copyUnifiedProducts(),
      copyManuals(),
      copyItems()
    ]);

    Logger.info(`Data copy completed. Unified: ${unifiedProducts.length}, Manuals: ${manuals.length}, Items: ${items.length}`);

    // Generate all indices
    const [masterIndex, unifiedIndex, manualsOnlyIndex, catalogOnlyIndex, searchIndex, hobbyConfig] = await Promise.all([
      generateMasterIndex(unifiedProducts, manuals, items),
      generateUnifiedIndex(unifiedProducts),
      generateManualsOnlyIndex(manuals),
      generateCatalogOnlyIndex(),
      generateSearchIndex(unifiedProducts, manuals, items),
      generateHobbyConfig()
    ]);

    // Write all index files
    await Promise.all([
      writeIndexJson('master-index.json', masterIndex),
      writeIndexJson('unified-index.json', unifiedIndex),
      writeIndexJson('manuals-only-index.json', manualsOnlyIndex),
      writeIndexJson('catalog-only-index.json', catalogOnlyIndex),
      writeIndexJson('search-index.json', searchIndex),
      writeConfigJson('hobby-types.json', hobbyConfig)
    ]);

    Logger.success('Data copy and index generation completed successfully!');

    // Print summary statistics
    const totalSize = await getTotalDataSize(CONFIG.targetDir);
    Logger.info(`Total data size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);

  } catch (error) {
    Logger.error('Data copy process failed', error);
    process.exit(1);
  }
}

async function getTotalDataSize(dirPath: string): Promise<number> {
  let totalSize = 0;

  async function calculateSize(currentPath: string): Promise<void> {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);

      if (entry.isFile()) {
        const stats = await fs.stat(fullPath);
        totalSize += stats.size;
      } else if (entry.isDirectory()) {
        await calculateSize(fullPath);
      }
    }
  }

  await calculateSize(dirPath);
  return totalSize;
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  Logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
  process.exit(1);
});

// Run the script
if (process.argv[1] === __filename) {
  main().catch((error) => {
    Logger.error('Script execution failed', error);
    process.exit(1);
  });
}

export { main as copyDatabase };