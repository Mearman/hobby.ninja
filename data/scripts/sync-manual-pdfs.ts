#!/usr/bin/env tsx
/**
 * Sync pdfs array from raw manuals to canonical manuals
 *
 * This script reads the pdfs array from raw scraped manual data
 * and copies it to the canonical manual files in data/src/manuals/,
 * removing the old pdfUrl/supplementaryPdfUrl fields.
 *
 * Usage:
 *   pnpm tsx data/scripts/sync-manual-pdfs.ts
 *   pnpm tsx data/scripts/sync-manual-pdfs.ts --dry-run
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "../..");
const DATA_ROOT = join(ROOT, "data");
const RAW_MANUALS_PATH = join(DATA_ROOT, "raw/bandai/manuals");
const CANONICAL_MANUALS_PATH = join(DATA_ROOT, "src/manuals");

const DRY_RUN = process.argv.includes("--dry-run");

interface ManualPdf {
	url: string;
	name: { ja: string; en?: string };
}

interface RawManual {
	id: string;
	pdfs?: ManualPdf[];
	[key: string]: unknown;
}

interface CanonicalManual {
	id: string;
	pdfUrl?: string;
	supplementaryPdfUrl?: string;
	pdfs?: ManualPdf[];
	[key: string]: unknown;
}

function log(message: string) {
	console.log(DRY_RUN ? `[DRY-RUN] ${message}` : message);
}

async function main() {
	console.log("=== Syncing pdfs array from raw manuals to canonical ===\n");
	if (DRY_RUN) {
		console.log("Running in DRY-RUN mode - no files will be modified\n");
	}

	// Get list of canonical manuals
	const canonicalFiles = readdirSync(CANONICAL_MANUALS_PATH).filter((f) => f.endsWith(".json"));
	console.log(`Found ${canonicalFiles.length} canonical manuals\n`);

	let updated = 0;
	let skipped = 0;
	let notFound = 0;
	let errors = 0;

	for (const file of canonicalFiles) {
		const id = file.replace(".json", "");
		const canonicalPath = join(CANONICAL_MANUALS_PATH, file);
		const rawPath = join(RAW_MANUALS_PATH, id, `${id}.json`);

		try {
			// Check if raw manual exists
			if (!existsSync(rawPath)) {
				console.log(`  ${id}: Raw manual not found`);
				notFound++;
				continue;
			}

			// Read both files
			const canonicalData = JSON.parse(readFileSync(canonicalPath, "utf-8")) as CanonicalManual;
			const rawData = JSON.parse(readFileSync(rawPath, "utf-8")) as RawManual;

			// Check if raw has pdfs array
			if (!rawData.pdfs || rawData.pdfs.length === 0) {
				console.log(`  ${id}: No pdfs array in raw data`);
				skipped++;
				continue;
			}

			// Check if canonical already has pdfs array
			if (canonicalData.pdfs && canonicalData.pdfs.length > 0) {
				skipped++;
				continue;
			}

			// Update canonical with pdfs array and remove old fields
			const updatedCanonical = { ...canonicalData };
			updatedCanonical.pdfs = rawData.pdfs;
			delete updatedCanonical.pdfUrl;
			delete updatedCanonical.supplementaryPdfUrl;

			if (!DRY_RUN) {
				writeFileSync(canonicalPath, JSON.stringify(updatedCanonical, null, "\t"));
			}

			log(`  ${id}: Updated with ${rawData.pdfs.length} PDF(s)`);
			updated++;
		} catch (err) {
			console.error(`  ${id}: Error - ${err}`);
			errors++;
		}
	}

	console.log("\n=== Sync Complete ===");
	console.log(`  Updated: ${updated}`);
	console.log(`  Skipped (already has pdfs): ${skipped}`);
	console.log(`  Not found (no raw data): ${notFound}`);
	console.log(`  Errors: ${errors}`);
}

main().catch(console.error);
