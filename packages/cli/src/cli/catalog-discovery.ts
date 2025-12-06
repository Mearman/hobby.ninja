import { SimpleCatalogScraper } from "./simple-catalog-scraper";
import type { CatalogDiscoveryOptions, CatalogDiscoveryResult, CatalogRangeStats } from "./types/catalog-discovery";

/**
 * Generates sequential catalog range identifiers starting from 00_0000
 */
export function generateCatalogRanges(count: number): string[] {
	const ranges: string[] = [];

	for (let i = 0; i < count; i++) {
		// Generate IDs in format 00_0000, 00_0001, 00_0002, etc.
		// This follows the pattern observed on bandai-hobby.net
		const id = 0 + i;
		const formattedId = id.toString().padStart(4, '0');
		ranges.push(`00_${formattedId}`);
	}

	return ranges;
}

/**
 * Builds a catalog URL from a range identifier
 */
export function buildCatalogUrl(range: string): string {
	return `https://bandai-hobby.net/item/${range}/`;
}

/**
 * Processes a single catalog range using SimpleCatalogScraper
 * Catalog pages are static HTML but require browser headers to bypass anti-bot protection
 */
export async function processCatalogRange(
	range: string,
	options: CatalogDiscoveryOptions
): Promise<{ success: boolean; error?: string; data?: any }> {
	const scraper = new SimpleCatalogScraper();

	try {
		if (options.verbose) {
			console.log(`Initializing browser for catalog range: ${range}`);
		}

		await scraper.initialize();

		const url = buildCatalogUrl(range);

		if (options.verbose) {
			console.log(`Processing catalog range: ${range} -> ${url}`);
		}

		// Use SimpleCatalogScraper to bypass anti-bot protection and extract data
		const result = await scraper.extractFromPage(range, url);

		return {
			success: true,
			data: result
		};

	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);

		if (options.verbose) {
			console.error(`Error processing catalog range ${range}:`, errorMessage);
		}

		return {
			success: false,
			error: `${range}: ${errorMessage}`
		};
	} finally {
		try {
			await scraper.cleanup();
		} catch (cleanupError) {
			if (options.verbose) {
				console.error(`Error cleaning up scraper:`, cleanupError);
			}
		}
	}
}

/**
 * Processes multiple catalog ranges sequentially
 */
export async function processCatalogRanges(ranges: string[], options: CatalogDiscoveryOptions): Promise<{
	totalRanges: number;
	completedRanges: number;
	totalUrls: number;
	urls: string[];
	errors: string[];
	rangeStats: Record<string, CatalogRangeStats>;
}> {
	const errors: string[] = [];
	const rangeStats: Record<string, CatalogRangeStats> = {};
	let completedRanges = 0;
	const urls: string[] = [];

	for (const range of ranges) {
		try {
			const result = await processCatalogRange(range, options);

			rangeStats[range] = {
				status: result.success ? 'success' : 'error',
				urlCount: result.success ? 1 : 0,
				error: result.error
			};

			if (result.success) {
				completedRanges++;
				urls.push(buildCatalogUrl(range));
			} else {
				errors.push(result.error || `${range}: Unknown error`);
			}

			// Add delay between requests to respect rate limiting
			if (ranges.indexOf(range) < ranges.length - 1) {
				await new Promise(resolve => setTimeout(resolve, options.delayMs));
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			errors.push(`${range}: ${errorMessage}`);

			rangeStats[range] = {
				status: 'error',
				urlCount: 0,
				error: errorMessage
			};
		}
	}

	return {
		totalRanges: ranges.length,
		completedRanges,
		totalUrls: urls.length,
		urls,
		errors,
		rangeStats
	};
}

/**
 * Main function to discover and process catalog items
 */
export async function discoverCatalogItems(options: CatalogDiscoveryOptions): Promise<CatalogDiscoveryResult> {
	const startTime = Date.now();
	const result: CatalogDiscoveryResult = {
		successful: true,
		totalRanges: options.ranges.length,
		completedRanges: 0,
		failedRanges: 0,
		discoveredUrls: 0,
		processedUrls: 0,
		errors: [],
		processingTime: 0,
		stats: {
			totalRanges: options.ranges.length,
			completedRanges: 0,
			failedRanges: 0,
			averageProcessingTime: 0
		}
	};

	const rangeStats: Record<string, CatalogRangeStats> = {};

	for (const range of options.ranges) {
		try {
			if (options.verbose) {
				console.log(`Processing catalog range: ${range}`);
			}

			const processResult = await processCatalogRange(range, options);

			rangeStats[range] = {
				status: processResult.success ? 'success' : 'error',
				urlCount: processResult.success ? 1 : 0,
				error: processResult.error
			};

			if (processResult.success) {
				result.completedRanges++;
				result.discoveredUrls++;
				result.processedUrls++;

				// Save the extracted data to the output directory
				if (processResult.data && options.outputDir) {
					// The actual saving logic would be implemented here
					// For now, we just acknowledge successful processing
					if (options.verbose) {
						console.log(`Successfully processed ${range} - ${processResult.data.productName || processResult.data.title}`);
					}
				}
			} else {
				result.failedRanges++;
				result.errors.push(processResult.error || `${range}: Unknown error`);
				result.successful = false; // Mark as partially failed if any range fails
			}

			// Add delay between ranges for rate limiting
			if (options.ranges.indexOf(range) < options.ranges.length - 1) {
				await new Promise(resolve => setTimeout(resolve, options.delayMs));
			}

		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);

			rangeStats[range] = {
				status: 'error',
				urlCount: 0,
				error: errorMessage
			};

			result.failedRanges++;
			result.errors.push(`${range}: ${errorMessage}`);
			result.successful = false;
		}
	}

	const endTime = Date.now();
	result.processingTime = endTime - startTime;
	result.stats = {
		totalRanges: options.ranges.length,
		completedRanges: result.completedRanges,
		failedRanges: result.failedRanges,
		averageProcessingTime: result.processingTime / options.ranges.length
	};

	return result;
}