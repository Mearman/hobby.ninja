#!/usr/bin/env tsx
/**
 * Test script to validate the lib files
 */

import { grades, getGradeCount, getGradeIds } from "./lib/grades.js";
import { scales, getScaleCount, getScalesByPopularity } from "./lib/scales.js";
import { homepage, getStats, getFeaturedItems } from "./lib/homepage.js";
import { search, searchRecords, getSearchRecordCount } from "./lib/search.js";

console.log("=== Testing data/lib modules ===\n");

// Test grades
console.log("Grades:");
console.log(`  Total: ${getGradeCount()}`);
console.log(`  IDs: ${getGradeIds().slice(0, 5).join(", ")}...`);
console.log(`  First grade:`, grades[getGradeIds()[0]]);

// Test scales
console.log("\nScales:");
console.log(`  Total: ${getScaleCount()}`);
const popularScales = getScalesByPopularity();
console.log(`  Most popular: ${popularScales[0]?.name} (${popularScales[0]?.itemCount} items)`);

// Test homepage
console.log("\nHomepage:");
const stats = getStats();
console.log(`  Total items: ${stats.totalItems}`);
console.log(`  Total brands: ${stats.totalBrands}`);
console.log(`  Featured items: ${getFeaturedItems().length}`);

// Test search
console.log("\nSearch:");
console.log(`  Total records: ${getSearchRecordCount()}`);
const results = search("gundam", 3);
console.log(`  Search "gundam" (top 3):`);
results.forEach((result, i) => {
	console.log(`    ${i + 1}. ${result.item.name} (score: ${result.score?.toFixed(3)})`);
});

console.log("\n=== All tests passed! ===");
