import { mkdirSync } from 'fs';
import { discoverCatalogItems, generateCatalogRanges } from './catalog-discovery.js';

export interface ScrapeOptions {
	source: string;
	output: string;
	cache: boolean;
	resume: boolean;
	verbose: boolean;
	translate?: boolean;
	delay?: number;
	delayMs?: number;
	startId?: string;
	count?: number;
}

export async function scrapeData(options: ScrapeOptions): Promise<void> {
	const { source, output } = options;
	const delayMs = options.delayMs ?? options.delay ?? 1000;

	console.log(`🚀 Starting scrape from source: ${source}`);
	console.log(`📁 Output directory: ${output}`);
	console.log(`⏱️  Delay: ${delayMs}ms between requests`);

	// Ensure output directory exists
	mkdirSync(output, { recursive: true });

	switch (source.toLowerCase()) {
		case 'bandai-catalog':
			await scrapeBandaiCatalog(options);
			break;

		case 'manuals':
			console.log('📋 Manual scraping is already implemented separately');
			console.log('Use the existing manual scraper workflow');
			break;

		default:
			throw new Error(`Unknown data source: ${source}. Available: bandai-catalog, manuals`);
	}

	console.log('✅ Scraping completed successfully!');
}

async function scrapeBandaiCatalog(options: ScrapeOptions): Promise<void> {
	const { output } = options;
	const delayMs = options.delayMs ?? options.delay ?? 1000;
	const startId = options.startId ?? '00_0000';
	const count = options.count ?? 10;
	const verbose = options.verbose ?? false;

	console.log('🔍 Starting Bandai catalog discovery...');

	// Generate ranges starting from startId
	const [prefix, suffix] = startId.split('_');
	const startIndex = parseInt(suffix || '0');
	const ranges = generateCatalogRanges(count).map((_, index) => {
		const id = startIndex + index;
		const formattedId = id.toString().padStart(4, '0');
		return `${prefix}_${formattedId}`;
	});

	if (verbose) {
		console.log(`📋 Processing ${ranges.length} ranges: ${ranges.slice(0, 5).join(', ')}${ranges.length > 5 ? '...' : ''}`);
	}

	// Prepare catalog discovery options
	const catalogOptions = {
		ranges,
		outputDir: output,
		cache: options.cache ?? true,
		resume: options.resume ?? false,
		verbose,
		delayMs,
		translate: options.translate ?? false
	};

	// Execute catalog discovery
	const result = await discoverCatalogItems(catalogOptions);

	// Display results
	console.log('\n📊 Catalog Discovery Results:');
	console.log(`✅ Total ranges: ${result.totalRanges}`);
	console.log(`✅ Completed: ${result.completedRanges}`);
	console.log(`❌ Failed: ${result.failedRanges}`);
	console.log(`📄 Discovered URLs: ${result.discoveredUrls}`);
	console.log(`📄 Processed URLs: ${result.processedUrls}`);
	console.log(`⏱️  Processing time: ${result.processingTime}ms`);
	console.log(`⚡ Average time per range: ${result.stats.averageProcessingTime.toFixed(0)}ms`);

	if (result.errors.length > 0) {
		console.log('\n❌ Errors encountered:');
		result.errors.forEach((error, index) => {
			console.log(`  ${index + 1}. ${error}`);
		});
	}

	if (result.successful) {
		console.log('\n🎉 Catalog discovery completed successfully!');
	} else {
		console.log('\n⚠️  Catalog discovery completed with some errors.');
	}
}