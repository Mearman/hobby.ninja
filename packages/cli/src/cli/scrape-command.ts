import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { discoverCatalogItems, generateCatalogRanges } from './catalog-discovery.js';

export interface ScrapeOptions {
	source: string;
	output: string;
	cache: boolean;
	resume: boolean;
	verbose: boolean;
	delay?: number;
	delayMs?: number;
	startId?: string;
	count?: number;
}

export async function scrapeData(options: ScrapeOptions): Promise<void> {
	const { source, output } = options;
	const delayMs = options.delayMs ?? options.delay ?? 1000;
	const startId = options.startId ?? '00_0000';
	const count = options.count ?? 10;

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
	const { output, delayMs } = options;
	const startId = options.startId ?? '00_0000';
	const count = options.count ?? 10;
	const verbose = options.verbose ?? false;

	console.log('🔍 Starting Bandai catalog discovery...');

	// Generate ranges starting from startId
	const startIndex = parseInt(startId.split('_')[1] || '0');
	const ranges = generateCatalogRanges(count).map((_, index) => {
		const id = startIndex + index;
		const formattedId = id.toString().padStart(4, '0');
		return `00_${formattedId}`;
	});

	if (verbose) {
		console.log(`📋 Processing ${ranges.length} ranges: ${ranges.slice(0, 5).join(', ')}${ranges.length > 5 ? '...' : ''}`);
	}

	// Prepare catalog discovery options
	const catalogOptions = {
		ranges,
		outputDir: join(output, 'bandai', 'catalog'),
		cache: options.cache ?? true,
		resume: options.resume ?? false,
		verbose,
		delayMs
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

	// Save summary statistics
	const summaryFile = join(output, 'bandai', 'catalog', 'summary.json');
	const summary = {
		timestamp: new Date().toISOString(),
		source: 'bandai-catalog',
		results: {
			totalRanges: result.totalRanges,
			completedRanges: result.completedRanges,
			failedRanges: result.failedRanges,
			discoveredUrls: result.discoveredUrls,
			processedUrls: result.processedUrls,
			processingTime: result.processingTime,
			averageProcessingTime: result.stats.averageProcessingTime
		},
		processedRanges: result.rangeStats,
		errors: result.errors
	};

	writeFileSync(summaryFile, JSON.stringify(summary, null, 2), 'utf8');
	console.log(`\n💾 Summary saved to: ${summaryFile}`);

	// Save individual catalog items if output directory is specified
	if (catalogOptions.outputDir && result.completedRanges > 0) {
		mkdirSync(catalogOptions.outputDir, { recursive: true });

		// In a full implementation, we would save each result.data item as a separate JSON file
		// For now, we save a combined file with all processed items
		const catalogFile = join(catalogOptions.outputDir, 'catalog-items.json');
		console.log(`💾 Combined catalog data saved to: ${catalogFile}`);

		// Placeholder for actual item data saving
		writeFileSync(catalogFile, JSON.stringify({
			discoveredAt: new Date().toISOString(),
			source: 'bandai-hobby.net',
			totalProcessed: result.completedRanges,
			// Note: In full implementation, this would contain the actual scraped item data
			items: result.rangeStats
		}, null, 2), 'utf-8');
	}

	if (result.successful) {
		console.log('\n🎉 Catalog discovery completed successfully!');
	} else {
		console.log('\n⚠️  Catalog discovery completed with some errors.');
	}
}