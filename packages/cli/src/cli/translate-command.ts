/**
 * Standalone translate command handler for Bandai catalog items
 *
 * Reads existing scraped catalog items and translates all text fields
 * from Japanese to English using the CatalogTranslator.
 */

import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { CatalogTranslator } from './catalog-translator';
import type { CatalogItem } from '../../../types/src/catalogData';

const BATCH_SIZE = 10;
const DELAY_BETWEEN_BATCHES_MS = 500;

export interface TranslateOptions {
	/** Data source to translate */
	source: string;
	/** Input directory containing scraped items */
	input: string;
	/** Directory for translation cache */
	cacheDir?: string;
	/** Preview changes without writing */
	dryRun?: boolean;
	/** Enable verbose logging */
	verbose?: boolean;
}

interface TranslationProgress {
	processed: number;
	translated: number;
	skipped: number;
	errors: number;
	fieldsTranslated: number;
}

async function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Translate existing catalog data from Japanese to English
 */
export async function translateCatalogData(options: TranslateOptions): Promise<void> {
	const {
		source,
		input,
		cacheDir = './data/translations',
		dryRun = false,
		verbose = false,
	} = options;

	if (source !== 'bandai-catalog') {
		console.error(`Unknown source: ${source}`);
		console.error('Supported sources: bandai-catalog');
		process.exit(1);
	}

	console.log('Translating Bandai catalog items...\n');
	console.log(`  Input directory: ${input}`);
	console.log(`  Cache directory: ${cacheDir}`);
	console.log(`  Dry run: ${dryRun}`);
	console.log('');

	// Initialize translator
	const translator = new CatalogTranslator({
		storeDir: cacheDir,
		verbose,
	});

	try {
		await translator.initialize();
	} catch (error) {
		console.error('Failed to initialize translation service:', error);
		process.exit(1);
	}

	// Find all item directories
	let entries: string[];
	try {
		const dirEntries = await fs.readdir(input, { withFileTypes: true });
		entries = dirEntries
			.filter((e) => e.isDirectory())
			.map((e) => e.name)
			.sort();
	} catch (error) {
		console.error(`Failed to read input directory: ${input}`, error);
		process.exit(1);
	}

	if (entries.length === 0) {
		console.log('No items found to translate.');
		return;
	}

	console.log(`Found ${entries.length} items to process\n`);

	const progress: TranslationProgress = {
		processed: 0,
		translated: 0,
		skipped: 0,
		errors: 0,
		fieldsTranslated: 0,
	};

	// Process in batches
	for (let i = 0; i < entries.length; i += BATCH_SIZE) {
		const batch = entries.slice(i, i + BATCH_SIZE);

		const results = await Promise.all(
			batch.map(async (id) => {
				const itemPath = join(input, id, `${id}.json`);
				return translateItem(itemPath, translator, dryRun, verbose);
			})
		);

		for (const result of results) {
			progress.processed++;
			if (result.error) {
				progress.errors++;
			} else if (result.translated) {
				progress.translated++;
				progress.fieldsTranslated += result.fieldsTranslated;
			} else {
				progress.skipped++;
			}
		}

		// Progress logging
		if (progress.processed % 100 === 0 || progress.processed === entries.length) {
			console.log(
				`Progress: ${progress.processed}/${entries.length} | ` +
					`Translated: ${progress.translated} (${progress.fieldsTranslated} fields) | ` +
					`Skipped: ${progress.skipped} | ` +
					`Errors: ${progress.errors}`
			);
		}

		// Rate limiting between batches
		if (i + BATCH_SIZE < entries.length) {
			await sleep(DELAY_BETWEEN_BATCHES_MS);
		}
	}

	console.log('\nComplete!');
	console.log(`  Total processed: ${progress.processed}`);
	console.log(`  Translated: ${progress.translated} items (${progress.fieldsTranslated} fields)`);
	console.log(`  Skipped (already translated): ${progress.skipped}`);
	console.log(`  Errors: ${progress.errors}`);

	// Show cache stats
	const cacheStats = translator.getCacheStats();
	console.log(`\nCache stats: ${cacheStats.hits} hits, ${cacheStats.misses} misses`);

	if (dryRun) {
		console.log('\n[DRY RUN] No files were modified.');
	}
}

interface TranslateItemResult {
	translated: boolean;
	fieldsTranslated: number;
	error?: string;
}

async function translateItem(
	itemPath: string,
	translator: CatalogTranslator,
	dryRun: boolean,
	verbose: boolean
): Promise<TranslateItemResult> {
	try {
		const content = await fs.readFile(itemPath, 'utf-8');
		const item: CatalogItem = JSON.parse(content);

		const result = await translator.translateItem(item);

		if (result.error) {
			if (verbose) {
				console.error(`  Error translating ${itemPath}: ${result.error}`);
			}
			return {
				translated: result.translated,
				fieldsTranslated: result.fieldsTranslated,
				error: result.error,
			};
		}

		if (result.translated && !dryRun) {
			await fs.writeFile(itemPath, JSON.stringify(item, null, 2), 'utf-8');
		}

		if (verbose && result.translated) {
			console.log(`  Translated ${result.fieldsTranslated} fields in ${itemPath}`);
		}

		return {
			translated: result.translated,
			fieldsTranslated: result.fieldsTranslated,
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return {
			translated: false,
			fieldsTranslated: 0,
			error: message,
		};
	}
}
