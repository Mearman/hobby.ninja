/**
 * Standalone translate command handler for all scraped data
 *
 * Reads existing scraped catalog items and manual files, translates all text fields
 * from Japanese to English using the shared translation infrastructure.
 *
 * Supports sources: 'all' (default), 'bandai-catalog', 'bandai-manuals'
 */

import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { CatalogTranslator } from './catalog-translator';
import {
	TranslationService,
	createServerTranslationStore,
	loadDictionary,
	rebuildAndReloadDictionary,
	TRANSLATION_STORE_DIR,
} from '../../../translation/src/index';
import type { CatalogItem } from '../../../types/src/catalogData';

const BATCH_SIZE = 10;
const DELAY_BETWEEN_BATCHES_MS = 500;

const DEFAULT_CATALOG_DIR = 'data/bandai/items';
const DEFAULT_MANUALS_DIR = 'data/bandai/manuals';

export type TranslateSource = 'all' | 'bandai-catalog' | 'bandai-manuals';

export interface TranslateOptions {
	/** Data source to translate: 'all', 'bandai-catalog', 'bandai-manuals' */
	source: TranslateSource;
	/** Input directory (overrides default for source) */
	input?: string;
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

interface FilteredManualData {
	id: string;
	name: { ja: string; en?: string };
	series: { ja: string; en?: string };
	[key: string]: unknown;
}

async function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Main entry point - translate data from all or specific sources
 */
export async function translateCatalogData(options: TranslateOptions): Promise<void> {
	const {
		source,
		cacheDir = TRANSLATION_STORE_DIR,
		dryRun = false,
		verbose = false,
	} = options;

	const validSources: TranslateSource[] = ['all', 'bandai-catalog', 'bandai-manuals'];
	if (!validSources.includes(source as TranslateSource)) {
		console.error(`Unknown source: ${source}`);
		console.error('Supported sources: all, bandai-catalog, bandai-manuals');
		process.exit(1);
	}

	console.log('Translation Configuration:');
	console.log(`  Source: ${source}`);
	console.log(`  Cache directory: ${cacheDir}`);
	console.log(`  Dry run: ${dryRun}`);
	console.log('');

	let totalTranslated = 0;

	// Translate catalog items
	if (source === 'all' || source === 'bandai-catalog') {
		const catalogDir = options.input && source === 'bandai-catalog' ? options.input : DEFAULT_CATALOG_DIR;
		const result = await translateCatalogItems({
			inputDir: catalogDir,
			cacheDir,
			dryRun,
			verbose,
		});
		totalTranslated += result.translated;
	}

	// Translate manual files
	if (source === 'all' || source === 'bandai-manuals') {
		const manualsDir = options.input && source === 'bandai-manuals' ? options.input : DEFAULT_MANUALS_DIR;
		const result = await translateManualFiles({
			inputDir: manualsDir,
			cacheDir,
			dryRun,
			verbose,
		});
		totalTranslated += result.translated;
	}

	// Rebuild dictionary once at the end if any translations were made
	if (!dryRun && totalTranslated > 0) {
		console.log('\nRebuilding dictionary with new translations...');
		const result = await rebuildAndReloadDictionary({ verbose });
		if (result.success && result.dictionary) {
			console.log(`Dictionary rebuilt: ${result.dictionary.stats.uniquePhrases} phrases`);
		} else if (result.error) {
			console.error(`Failed to rebuild dictionary: ${result.error}`);
		}
	}

	if (dryRun) {
		console.log('\n[DRY RUN] No files were modified.');
	}
}

// ============================================================================
// Catalog Translation
// ============================================================================

interface CatalogTranslateOptions {
	inputDir: string;
	cacheDir: string;
	dryRun: boolean;
	verbose: boolean;
}

interface TranslateResult {
	translated: number;
	fieldsTranslated: number;
}

async function translateCatalogItems(options: CatalogTranslateOptions): Promise<TranslateResult> {
	const { inputDir, cacheDir, dryRun, verbose } = options;

	console.log('='.repeat(60));
	console.log('Translating Bandai catalog items...');
	console.log(`  Input directory: ${inputDir}`);
	console.log('');

	// Initialize translator (without auto-rebuild - we do it once at the end)
	const translator = new CatalogTranslator({
		storeDir: cacheDir,
		verbose,
		rebuildDictionary: false,
	});

	try {
		await translator.initialize();
	} catch (error) {
		console.error('Failed to initialize translation service:', error);
		return { translated: 0, fieldsTranslated: 0 };
	}

	// Find all item directories
	let entries: string[];
	try {
		const dirEntries = await fs.readdir(inputDir, { withFileTypes: true });
		entries = dirEntries
			.filter((e) => e.isDirectory())
			.map((e) => e.name)
			.sort();
	} catch (error) {
		console.error(`Failed to read input directory: ${inputDir}`, error);
		return { translated: 0, fieldsTranslated: 0 };
	}

	if (entries.length === 0) {
		console.log('No catalog items found to translate.');
		return { translated: 0, fieldsTranslated: 0 };
	}

	console.log(`Found ${entries.length} catalog items to process\n`);

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
				const itemPath = join(inputDir, id, `${id}.json`);
				return translateCatalogItem(itemPath, translator, dryRun, verbose);
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
				`[Catalog] Progress: ${progress.processed}/${entries.length} | ` +
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

	console.log('\n[Catalog] Complete!');
	console.log(`  Total processed: ${progress.processed}`);
	console.log(`  Translated: ${progress.translated} items (${progress.fieldsTranslated} fields)`);
	console.log(`  Skipped (already translated): ${progress.skipped}`);
	console.log(`  Errors: ${progress.errors}`);

	// Show cache stats
	const cacheStats = translator.getCacheStats();
	console.log(`  Cache stats: ${cacheStats.hits} hits, ${cacheStats.misses} misses`);

	return { translated: progress.translated, fieldsTranslated: progress.fieldsTranslated };
}

interface TranslateItemResult {
	translated: boolean;
	fieldsTranslated: number;
	error?: string;
}

async function translateCatalogItem(
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

// ============================================================================
// Manual Translation
// ============================================================================

interface ManualTranslateOptions {
	inputDir: string;
	cacheDir: string;
	dryRun: boolean;
	verbose: boolean;
}

async function translateManualFiles(options: ManualTranslateOptions): Promise<TranslateResult> {
	const { inputDir, cacheDir, dryRun, verbose } = options;

	console.log('='.repeat(60));
	console.log('Translating Bandai manual files...');
	console.log(`  Input directory: ${inputDir}`);
	console.log('');

	// Initialize translation service with persistent store
	if (verbose) {
		console.log('Initializing translation service with persistent cache...');
	}

	// Load dictionary for fast O(1) lookups
	try {
		const dictionary = await loadDictionary();
		if (verbose) {
			console.log(`  Dictionary loaded: ${dictionary.stats.uniquePhrases} phrases, ${dictionary.stats.uniqueWords} words`);
		}
	} catch {
		if (verbose) {
			console.log('  Dictionary not found, will use API/store only');
		}
	}

	const store = await createServerTranslationStore(cacheDir, {
		maxEntries: 10000,
	});
	const translator = new TranslationService({}, undefined, store);

	// Find all manual directories
	let entries: string[];
	try {
		const dirEntries = await fs.readdir(inputDir, { withFileTypes: true });
		entries = dirEntries
			.filter((e) => e.isDirectory())
			.map((e) => e.name)
			.sort();
	} catch (error) {
		console.error(`Failed to read input directory: ${inputDir}`, error);
		return { translated: 0, fieldsTranslated: 0 };
	}

	if (entries.length === 0) {
		console.log('No manual files found to translate.');
		return { translated: 0, fieldsTranslated: 0 };
	}

	console.log(`Found ${entries.length} manual files to process\n`);

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
				const manualPath = join(inputDir, id, `${id}.json`);
				return translateManualItem(manualPath, translator, dryRun, verbose);
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
				`[Manuals] Progress: ${progress.processed}/${entries.length} | ` +
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

	console.log('\n[Manuals] Complete!');
	console.log(`  Total processed: ${progress.processed}`);
	console.log(`  Translated: ${progress.translated} items (${progress.fieldsTranslated} fields)`);
	console.log(`  Skipped (already translated): ${progress.skipped}`);
	console.log(`  Errors: ${progress.errors}`);

	// Show cache stats
	const cacheStats = translator.getCacheStats();
	console.log(`  Cache stats: ${cacheStats.hits} hits, ${cacheStats.misses} misses`);

	return { translated: progress.translated, fieldsTranslated: progress.fieldsTranslated };
}

async function translateManualItem(
	manualPath: string,
	translator: TranslationService,
	dryRun: boolean,
	verbose: boolean
): Promise<TranslateItemResult> {
	try {
		const content = await fs.readFile(manualPath, 'utf-8');
		const manual: FilteredManualData = JSON.parse(content);

		let fieldsTranslated = 0;

		// Translate name if not already translated
		if (manual.name.ja && !manual.name.en) {
			try {
				const result = await translator.translateText(manual.name.ja, 'en', 'ja');
				manual.name.en = result.translated;
				fieldsTranslated++;
			} catch (err) {
				if (verbose) {
					console.error(`  Failed to translate name for ${manual.id}:`, err);
				}
			}
		}

		// Translate series if not already translated
		if (manual.series.ja && !manual.series.en) {
			try {
				const result = await translator.translateText(manual.series.ja, 'en', 'ja');
				manual.series.en = result.translated;
				fieldsTranslated++;
			} catch (err) {
				if (verbose) {
					console.error(`  Failed to translate series for ${manual.id}:`, err);
				}
			}
		}

		if (fieldsTranslated > 0 && !dryRun) {
			await fs.writeFile(manualPath, JSON.stringify(manual, null, 2), 'utf-8');
		}

		if (verbose && fieldsTranslated > 0) {
			console.log(`  Translated ${fieldsTranslated} fields in ${manualPath}`);
		}

		return {
			translated: fieldsTranslated > 0,
			fieldsTranslated,
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
