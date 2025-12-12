#!/usr/bin/env npx tsx
/**
 * Fix release dates in item JSON files
 * Parses the Japanese date string (releaseDate.ja) to populate year/month fields
 * for items where year: 0 (indicating the YYYY年MM月 format wasn't parsed)
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ITEMS_DIR = "apps/next/public/data/items";

interface ReleaseDate {
	ja: string;
	year: number;
	month: number;
	day?: number;
}

interface ItemData {
	id: string;
	releaseDate?: ReleaseDate;
	[key: string]: unknown;
}

/**
 * Parse Japanese date string to extract year and month
 * Handles formats: "YYYY年MM月DD日", "YYYY年MM月", "YYYY年"
 */
function parseJapaneseDate(jaDate: string): { year: number; month: number; day?: number } | null {
	// Try full date format: "2017年05月20日"
	const fullMatch = /(\d{4})年(\d{2})月(\d{2})日/.exec(jaDate);
	if (fullMatch?.[1] && fullMatch[2] && fullMatch[3]) {
		return {
			year: Number.parseInt(fullMatch[1], 10),
			month: Number.parseInt(fullMatch[2], 10),
			day: Number.parseInt(fullMatch[3], 10),
		};
	}

	// Try year+month format: "1985年06月"
	const monthMatch = /(\d{4})年(\d{2})月/.exec(jaDate);
	if (monthMatch?.[1] && monthMatch[2]) {
		return {
			year: Number.parseInt(monthMatch[1], 10),
			month: Number.parseInt(monthMatch[2], 10),
		};
	}

	// Try year-only format: "1985年"
	const yearMatch = /(\d{4})年/.exec(jaDate);
	if (yearMatch?.[1]) {
		return {
			year: Number.parseInt(yearMatch[1], 10),
			month: 0,
		};
	}

	return null;
}

async function main() {
	console.log("🔍 Scanning for items with year: 0 in releaseDate...\n");

	const files = await readdir(ITEMS_DIR);
	const jsonFiles = files.filter(f => f.endsWith(".json"));

	let fixed = 0;
	let skipped = 0;
	let errors = 0;

	for (const file of jsonFiles) {
		const filePath = path.join(ITEMS_DIR, file);

		try {
			const content = await readFile(filePath, "utf8");
			const item = JSON.parse(content) as ItemData;

			// Skip if no releaseDate or year is already set
			if (item.releaseDate?.year !== 0) {
				skipped++;
				continue;
			}

			// Parse the Japanese date string
			const parsed = parseJapaneseDate(item.releaseDate.ja);
			if (!parsed) {
				console.warn(`⚠️  Could not parse date for ${item.id}: "${item.releaseDate.ja}"`);
				errors++;
				continue;
			}

			// Update the releaseDate fields
			item.releaseDate.year = parsed.year;
			item.releaseDate.month = parsed.month;
			if (parsed.day) {
				item.releaseDate.day = parsed.day;
			}

			// Write back to file
			await writeFile(filePath, JSON.stringify(item));

			fixed++;
			if (fixed % 100 === 0) {
				console.log(`✅ Fixed ${fixed} items...`);
			}
		} catch (error) {
			console.error(`❌ Error processing ${file}:`, error);
			errors++;
		}
	}

	console.log("\n📊 Summary:");
	console.log(`   ✅ Fixed: ${fixed}`);
	console.log(`   ⏭️  Skipped (already valid): ${skipped}`);
	console.log(`   ❌ Errors: ${errors}`);
	console.log(`   📁 Total files: ${jsonFiles.length}`);
}

await main();
