#!/usr/bin/env node

import path from 'path';
import { buildDataFiles, DataProcessorOptions } from './data-processor';

/**
 * CLI wrapper for the data processor with customizable options
 */
function parseArgs(): DataProcessorOptions {
  const args = process.argv.slice(2);
  const options: DataProcessorOptions = {};

  // Set up default paths that work whether running from monorepo root or apps/next
  const isRunningFromAppsNext = process.cwd().endsWith('apps/next');
  const defaultSourceDir = isRunningFromAppsNext
    ? path.join(process.cwd(), '../../data/api/graph')
    : path.join(process.cwd(), 'data/api/graph');

  const defaultOutputDir = isRunningFromAppsNext
    ? path.join(process.cwd(), 'src/data')
    : path.join(process.cwd(), 'apps/next/src/data');

  // Set default options
  options.sourceDir = defaultSourceDir;
  options.outputDir = defaultOutputDir;

  for (let i = 0; i < args.length; i += 2) {
    const flag = args[i];
    const value = args[i + 1];

    switch (flag) {
      case '--source-dir':
        options.sourceDir = value;
        break;
      case '--output-dir':
        options.outputDir = value;
        break;
      case '--categories':
        options.categories = value.split(',');
        break;
      case '--help':
      case '-h':
        console.log(`
Usage: build-data-cli.ts [options]

Options:
  --source-dir <path>    Source directory containing JSON files
                         (auto-detected based on current directory)
  --output-dir <path>    Output directory for generated files
                         (auto-detected based on current directory)
  --categories <list>    Comma-separated list of categories to process
                         (default: items,brands,categories,series)
  --help, -h            Show this help message

Examples:
  tsx ./scripts/build-data-cli.ts
  tsx ./scripts/build-data-cli.ts --output-dir ./custom-data
  tsx ./scripts/build-data-cli.ts --categories items,brands
        `);
        process.exit(0);
    }
  }

  return options;
}

// Run CLI with parsed options
const options = parseArgs();
console.log('🚀 Data Processor CLI');
console.log('Options:', options);
console.log('');

try {
  const results = buildDataFiles(options);
  console.log('\n🎉 Build completed successfully!');
  process.exit(0);
} catch (error) {
  console.error('\n❌ Build failed:', error);
  process.exit(1);
}