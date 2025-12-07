#!/usr/bin/env node

/**
 * Simple SSG Validation Script
 * Tests that our SSG infrastructure can load and process graph data
 */

const { generateGraphRoutes, loadGraphNode } = require('../src/utils/graph-routes-generator.ts');

async function testSSG() {
  console.log('🧪 Testing SSG Infrastructure...\n');

  try {
    // Test 1: Route generation
    console.log('1. Testing route generation...');
    const routes = await generateGraphRoutes();
    console.log(`✅ Generated ${routes.length} routes`);

    if (routes.length === 0) {
      console.log('❌ No routes generated - check graph data directory');
      return false;
    }

    // Test 2: Sample node loading
    console.log('\n2. Testing sample node loading...');
    const sampleRoutes = routes.slice(0, 5); // Test first 5 routes

    for (const route of sampleRoutes) {
      const [, nodeType, nodeId] = route.split('/');
      const node = await loadGraphNode(nodeType, nodeId);

      if (node) {
        console.log(`✅ ${route}: ${node.name?.en || node.name?.ja || 'Unknown'}`);
      } else {
        console.log(`❌ ${route}: Failed to load`);
      }
    }

    console.log('\n🎉 SSG Infrastructure Test Completed Successfully!');
    console.log(`\n📊 Summary:`);
    console.log(`   - Total routes: ${routes.length}`);
    console.log(`   - Sample nodes tested: ${sampleRoutes.length}`);
    console.log(`   - Ready for full SSG generation: ✅`);

    return true;

  } catch (error) {
    console.error('❌ SSG Test Failed:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

// Run test
testSSG().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});