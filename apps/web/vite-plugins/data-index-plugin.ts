import { readdir, writeFile, stat } from 'node:fs/promises';
import { join, relative, extname } from 'node:path';
import type { Plugin } from 'vite';

// Debouncing mechanism to prevent infinite loops
let regenerateTimeout: NodeJS.Timeout | null = null;
const REGENERATE_DELAY = 1000; // 1 second debounce

// Debounced function to prevent infinite loops
function debouncedRegenerateIndices(dataDir: string) {
  if (regenerateTimeout) {
    clearTimeout(regenerateTimeout);
  }

  regenerateTimeout = setTimeout(() => {
    console.log('🔄 Regenerating hierarchical data indices...');
    generateHierarchicalIndices(dataDir);
  }, REGENERATE_DELAY);
}

interface IndexEntry {
  filename: string;
  relativePath: string;
  size: number;
  lastModified: number;
  type: 'file' | 'directory';
  id?: string;
  metadata?: any;
}

interface HierarchicalIndex {
  generated: string;
  version: string;
  type: 'master' | 'directory';
  path: string;
  entries: IndexEntry[];
  children: string[]; // Paths to child indexes
  summary: {
    totalFiles: number;
    totalDirectories: number;
    totalSize: number;
  };
}

async function generateIndexForDirectory(
  dirPath: string,
  type: string,
): Promise<DataIndex> {
  const allJsonFiles = await getAllJsonFilesRecursively(dirPath);
  const indexFiles: IndexEntry[] = [];
  let totalSize = 0;

  for (const filePath of allJsonFiles) {
    try {
      const stats = await stat(filePath);
      const relativePath = filePath.replace(dirPath + '/', '');

      const entry: IndexEntry = {
        filename: relativePath,
        size: stats.size,
        lastModified: stats.mtime.getTime(),
      };

      // Extract metadata from filename based on type
      if (type === 'unified') {
        entry.id = relativePath.replace('.json', '');
      } else if (type === 'catalog' || type === 'items') {
        entry.id = relativePath.replace('.json', '');
      } else if (type === 'manuals') {
        entry.id = relativePath.replace('.json', '');
        entry.productNumber = relativePath.split('/')[0]; // Extract folder name as product number
      }

      indexFiles.push(entry);
      totalSize += stats.size;
    } catch (error) {
      console.warn(`Warning: Could not stat file ${filePath}:`, error);
    }
  }

  // Sort files by filename for consistent ordering
  indexFiles.sort((a, b) => a.filename.localeCompare(b.filename));

  return {
    type,
    generated: new Date().toISOString(),
    totalFiles: indexFiles.length,
    totalSize,
    files: indexFiles,
  };
}

async function getAllJsonFilesRecursively(dirPath: string): Promise<string[]> {
  const { readdir } = await import('node:fs/promises');
  const jsonFiles: string[] = [];

  async function scanDirectory(currentPath: string) {
    try {
      const entries = await readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(currentPath, entry.name);

        if (entry.isFile() && entry.name.endsWith('.json') && entry.name !== 'index.json') {
          jsonFiles.push(fullPath);
        } else if (entry.isDirectory()) {
          await scanDirectory(fullPath);
        }
      }
    } catch (error) {
      // Skip directories that can't be read
    }
  }

  await scanDirectory(dirPath);
  return jsonFiles;
}

async function scanDataDirectories(dataDir: string): Promise<string[]> {
  const { readdir } = await import('node:fs/promises');
  const entries = await readdir(dataDir, { withFileTypes: true });
  const directories: string[] = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const dirPath = join(dataDir, entry.name);

      try {
        // Recursively look for JSON files in subdirectories
        const hasJsonFiles = await checkDirectoryForJsonFiles(dirPath);

        if (hasJsonFiles) {
          directories.push(entry.name);
        }
      } catch (error) {
        console.warn(`Warning: Could not scan directory ${entry.name}:`, error);
      }
    }
  }

  return directories.sort();
}

async function checkDirectoryForJsonFiles(dirPath: string): Promise<boolean> {
  const { readdir, stat } = await import('node:fs/promises');

  try {
    const entries = await readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);

      if (entry.isFile() && entry.name.endsWith('.json') && entry.name !== 'index.json') {
        return true; // Found a JSON file
      } else if (entry.isDirectory()) {
        // Recursively check subdirectory
        const hasJson = await checkDirectoryForJsonFiles(fullPath);
        if (hasJson) {
          return true;
        }
      }
    }

    return false; // No JSON files found
  } catch (error) {
    return false;
  }
}

async function generateAllIndices(dataDir: string): Promise<void> {
  console.log('🚀 Scanning data directories for index generation...');

  try {
    // Check if data directory exists
    const { stat } = await import('node:fs/promises');
    try {
      await stat(dataDir);
    } catch {
      console.log(`📁 Data directory does not exist: ${dataDir}`);
      return;
    }

    // Scan for all directories with JSON files
    const directories = await scanDataDirectories(dataDir);
    console.log(`Found ${directories.length} directories with JSON files:`, directories);

    // Generate indices for all found directories
    const indexPromises = directories.map(async (dirName) => {
      const dirPath = join(dataDir, dirName);
      const index = await generateIndexForDirectory(dirPath, dirName as any);
      await writeFile(
        join(dirPath, 'index.json'),
        JSON.stringify(index, null, 2),
        'utf-8',
      );
      return { dirName, index };
    });

    const results = await Promise.all(indexPromises);

    // Generate master index with dynamic sources
    const sources: Record<string, DataIndex> = {};
    let totalFiles = 0;
    let totalSize = 0;

    for (const { dirName, index } of results) {
      sources[dirName] = index;
      totalFiles += index.totalFiles;
      totalSize += index.totalSize;
    }

    const masterIndex = {
      generated: new Date().toISOString(),
      version: '1.0.0',
      sources,
      summary: {
        totalFiles,
        totalSize,
      },
    };

    // Write master index
    await writeFile(
      join(dataDir, 'index.json'),
      JSON.stringify(masterIndex, null, 2),
      'utf-8',
    );

    console.log('✅ Data indices generated successfully!');
    for (const { dirName, index } of results) {
      console.log(`   ${dirName}: ${index.totalFiles.toLocaleString()} files`);
    }
    console.log(`   Total: ${totalFiles.toLocaleString()} files`);

  } catch (error) {
    console.error('❌ Error generating data indices:', error);
  }
}

/**
 * Vite plugin to automatically generate data indices
 *
 * This plugin monitors the data/bandai/ directory and automatically
 * generates index.json files for efficient data loading.
 */
export function dataIndexPlugin(): Plugin {
  return {
    name: 'data-index-plugin',
    configureServer(server) {
      // Generate initial indices once when server starts
      const dataDir = join(process.cwd(), 'public/data/bandai');

      // Only watch for changes if data directory exists
      server.watcher.add([join(dataDir, '**/!(*index).json')]);

      // Debounced regeneration for file changes (excluding index.json)
      server.watcher.on('change', (path) => {
        if (path.includes('/data/bandai/') && path.endsWith('.json') && !path.includes('/index.json')) {
          console.log(`📝 Data file changed: ${path}`);
          debouncedRegenerateIndices(dataDir);
        }
      });

      server.watcher.on('add', (path) => {
        if (path.includes('/data/bandai/') && path.endsWith('.json') && !path.includes('/index.json')) {
          console.log(`➕ Data file added: ${path}`);
          debouncedRegenerateIndices(dataDir);
        }
      });

      server.watcher.on('unlink', (path) => {
        if (path.includes('/data/bandai/') && path.endsWith('.json') && !path.includes('/index.json')) {
          console.log(`➖ Data file removed: ${path}`);
          debouncedRegenerateIndices(dataDir);
        }
      });
    },
    buildStart() {
      // Generate indices before build
      const dataDir = join(process.cwd(), 'public/data/bandai');
      return generateAllIndices(dataDir);
    },
  };
}