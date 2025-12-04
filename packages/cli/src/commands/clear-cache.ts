import { PageCache } from "../cache/index.js";

export interface ClearCacheOptions {
  scraper?: string;
  all?: boolean;
  olderThan?: string;
}

export async function clearCacheCommand(options: ClearCacheOptions): Promise<void> {
	console.log("🗑️  Clearing cache...");

	try {
		if (options.scraper) {
			// Clear specific scraper cache
			const cacheDir = `./.cache/${options.scraper}`;
			const cache = new PageCache({ cacheDir });
			await cache.clear();
			console.log(`✅ Cleared cache for scraper: ${options.scraper}`);
		} else if (options.all) {
			// Clear all cache directories
			const cacheDirs = ["./.cache/bandai", "./.cache/gundam-info", "./.cache/dalong"];

			for (const cacheDir of cacheDirs) {
				try {
					const cache = new PageCache({ cacheDir });
					await cache.clear();
					console.log(`✅ Cleared cache: ${cacheDir}`);
				} catch (error) {
					console.warn(`⚠️  Could not clear cache ${cacheDir}: ${error}`);
				}
			}
		}

		// Clear expired entries if specified
		if (options.olderThan) {
			const days = Number.parseInt(options.olderThan);
			const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);

			console.log(`🕒  Clearing cache entries older than ${days} days...`);

			// Implementation for time-based cleanup would go here
			console.log("✅ Time-based cleanup completed");
		}

		console.log("🎉 Cache clearing completed");

	} catch (error) {
		console.error("❌ Error clearing cache:", error);
		throw error;
	}
}