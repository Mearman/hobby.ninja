#!/usr/bin/env tsx

import { getStaticPathsCount } from './src/lib/static-paths.js';

async function main() {
  try {
    console.log('Testing static path generation from graph data...');
    const counts = await getStaticPathsCount();
    console.log('Static paths counts:', JSON.stringify(counts, null, 2));
    console.log(`Total paths to generate: ${counts.total}`);
  } catch (error) {
    console.error('Error testing static paths:', error);
    process.exit(1);
  }
}

main();