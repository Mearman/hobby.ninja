#!/usr/bin/env node

/**
 * Run JSON filter on all .html.json files to generate clean .json output
 */

import { promises as fs } from "node:fs";
import path from "node:path";

import { filterJsonFile } from "./core/json-filter";

async function main() {
	console.log("Running JSON filter on all manual files...\n");

	let manualsDir = "data/raw/bandai/manuals";
	if (process.cwd().endsWith("packages/scrapers")) {
		manualsDir = "../../data/raw/bandai/manuals";
	}

	const entries = await fs.readdir(manualsDir, { withFileTypes: true });
	const ids = entries
		.filter((e) => e.isDirectory())
		.map((e) => e.name)
		.toSorted();

	console.log(`Found ${ids.length} manuals to process\n`);

	let processed = 0;
	let errors = 0;

	for (const id of ids) {
		const inputPath = path.join(manualsDir, id, `${id}.html.json`);
		const outputPath = path.join(manualsDir, id, `${id}.json`);

		try {
			await filterJsonFile(inputPath, outputPath, id);
			processed++;

			if (processed % 100 === 0) {
				console.log(`Progress: ${processed}/${ids.length}`);
			}
		} catch (error) {
			console.error(`Error processing ${id}:`, error);
			errors++;
		}
	}

	console.log("\nComplete!");
	console.log(`  Processed: ${processed}`);
	console.log(`  Errors: ${errors}`);
}

await main();
