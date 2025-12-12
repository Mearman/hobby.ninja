#!/usr/bin/env npx tsx
/**
 * Add itemType field to all item JSON files
 * - "product" if price field exists
 * - "blog" if no price field (promotional/blog content)
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ITEMS_DIR = "apps/next/public/data/items";

interface ItemData {
	id: string;
	price?: unknown;
	itemType?: "product" | "blog";
	[key: string]: unknown;
}

async function main() {
	console.log("🔍 Adding itemType field to all items...\n");

	const files = await readdir(ITEMS_DIR);
	const jsonFiles = files.filter(f => f.endsWith(".json"));

	let products = 0;
	let blogs = 0;
	let errors = 0;

	for (const file of jsonFiles) {
		const filePath = path.join(ITEMS_DIR, file);

		try {
			const content = await readFile(filePath, "utf8");
			const item = JSON.parse(content) as ItemData;

			// Determine item type based on price presence
			const itemType: "product" | "blog" = item.price !== undefined ? "product" : "blog";

			// Skip if already has correct itemType
			if (item.itemType === itemType) {
				if (itemType === "product") products++;
				else blogs++;
				continue;
			}

			// Add itemType field after id and type
			const { id, type, ...rest } = item;
			const updatedItem = { id, type, itemType, ...rest };

			// Write back to file
			await writeFile(filePath, JSON.stringify(updatedItem));

			if (itemType === "product") products++;
			else blogs++;

			if ((products + blogs) % 500 === 0) {
				console.log(`✅ Processed ${products + blogs} items...`);
			}
		} catch (error) {
			console.error(`❌ Error processing ${file}:`, error);
			errors++;
		}
	}

	console.log("\n📊 Summary:");
	console.log(`   📦 Products: ${products}`);
	console.log(`   📝 Blog/Promo: ${blogs}`);
	console.log(`   ❌ Errors: ${errors}`);
	console.log(`   📁 Total: ${jsonFiles.length}`);
}

await main();
