/**
 * Data Service Usage Examples
 *
 * Demonstrates how to use the data service for common operations.
 */

import { dataService, progressTracker, workerManager } from "./index";
import type { FilterOptions, SearchResult } from "./index";

/**
 * Basic search example
 */
export async function basicSearchExample() {
	try {
		console.log("Starting basic search...");

		const result: SearchResult = await dataService.searchItems("Gundam", {
			grade: ["MG", "PG"],
			releaseDateRange: {
				start: 2020,
				end: 2024,
			},
		});

		console.log(`Found ${result.total} items in ${result.queryTime}ms`);
		console.log("First result:", result.items[0]);

		return result;
	} catch (error) {
		console.error("Search failed:", error);
		throw error;
	}
}

/**
 * Search with progress tracking example
 */
export async function searchWithProgressExample() {
	try {
		console.log("Starting search with progress tracking...");

		const result: SearchResult = await dataService.searchItems(
			"RX-78",
			{},
			{
				useWorker: true,
				onProgress: (progress) => {
					console.log(`Progress: ${progress.percentage}% - ${progress.message}`);
				},
				fieldWeights: {
					name: 2,
					series: 1.5,
					description: 1,
				},
			},
		);

		console.log("Search completed with results:", result.total);
		return result;
	} catch (error) {
		console.error("Progressive search failed:", error);
		throw error;
	}
}

/**
 * Get paginated items example
 */
export async function paginationExample() {
	try {
		console.log("Loading paginated items...");

		const page1 = await dataService.getItemsByPage(1, 20, "unified");
		console.log(`Page 1: ${page1.items.length} items, Total: ${page1.pagination.total}`);

		const page2 = await dataService.getItemsByPage(2, 20, "unified");
		console.log(`Page 2: ${page2.items.length} items`);

		return { page1, page2 };
	} catch (error) {
		console.error("Pagination failed:", error);
		throw error;
	}
}

/**
 * Data aggregation example
 */
export async function dataAggregationExample() {
	try {
		console.log("Loading and aggregating data...");

		const [unifiedItems, manualItems, catalogItems] = await Promise.all([
			dataService.getUnifiedItems(),
			dataService.getManualsOnly(),
			dataService.getCatalogOnly(),
		]);

		console.log(`Unified items: ${unifiedItems.length}`);
		console.log(`Manual items: ${manualItems.length}`);
		console.log(`Catalog items: ${catalogItems.length}`);

		// Get statistics
		const stats = await dataService.getStatistics();
		console.log("Database statistics:", stats);

		return { unifiedItems, manualItems, catalogItems, stats };
	} catch (error) {
		console.error("Data aggregation failed:", error);
		throw error;
	}
}

/**
 * Preload data example
 */
export async function preloadDataExample() {
	try {
		console.log("Preloading data for better performance...");

		await dataService.preloadData({
			indices: true,
			sampleData: 100,
			useWorker: true,
			onProgress: (progress) => {
				console.log(`Preload progress: ${progress.percentage}% - ${progress.message}`);
			},
		});

		console.log("Data preloading completed");
	} catch (error) {
		console.error("Data preloading failed:", error);
		throw error;
	}
}

/**
 * Export data example
 */
export async function exportDataExample() {
	try {
		console.log("Exporting data...");

		const blob = await dataService.exportData({
			sources: ["unified"],
			format: "json",
			includeStats: true,
			onProgress: (progress) => {
				console.log(`Export progress: ${progress.percentage}% - ${progress.message}`);
			},
		});

		// Create download link
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = "hobby-database-export.json";
		document.body.append(link);
		link.click();
		link.remove();
		URL.revokeObjectURL(url);

		console.log("Data export completed");
	} catch (error) {
		console.error("Data export failed:", error);
		throw error;
	}
}

/**
 * Filter presets example
 */
export async function filterPresetsExample() {
	try {
		console.log("Managing filter presets...");

		// Get existing presets
		const presets = await dataService.getFilterPresets();
		console.log("Available presets:", presets.map(p => p.name));

		// Create a new preset
		const newPreset = {
			id: "my_custom_preset",
			name: "My Custom Filter",
			description: "High grade Gundam models from 2020+",
			filters: {
				grade: ["HG", "MG", "PG"],
				releaseDateRange: {
					start: 2020,
					end: 2024,
				},
				sort: {
					field: "releaseDate" as const,
					direction: "desc" as const,
				},
			},
			createdBy: "user",
			isPublic: false,
			useCount: 0,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		await dataService.saveFilterPreset(newPreset);
		console.log("Custom preset saved");

		// Use the preset
		const searchResult = await dataService.searchItems("", newPreset.filters);
		console.log(`Found ${searchResult.total} items with custom preset`);

		return { presets, newPreset, searchResult };
	} catch (error) {
		console.error("Filter preset example failed:", error);
		throw error;
	}
}

/**
 * Service statistics example
 */
export async function serviceStatsExample() {
	try {
		console.log("Getting service statistics...");

		const stats = dataService.getServiceStats();
		console.log("Cache statistics:", stats.cache);
		console.log("Storage statistics:", stats.storage);
		console.log("Worker statistics:", stats.workers);
		console.log("Progress tracker statistics:", stats.progress);

		return stats;
	} catch (error) {
		console.error("Failed to get service statistics:", error);
		throw error;
	}
}

/**
 * Advanced operation with progress tracking example
 */
export async function advancedOperationExample() {
	try {
		console.log("Starting advanced operation with progress tracking...");

		const operationId = progressTracker.createOperation({
			name: "Advanced Data Processing",
			description: "Process data with custom progress tracking",
			priority: "high",
			pausable: true,
			cancellable: true,
			retry: {
				maxAttempts: 3,
				backoffMs: 1000,
				maxBackoffMs: 5000,
			},
			onProgress: (progress) => {
				console.log(`Operation progress: ${progress.percentage}% - ${progress.message}`);
			},
			onComplete: (result) => {
				console.log("Operation completed:", result);
			},
			onError: (error) => {
				console.error("Operation failed:", error);
			},
		});

		const result = await progressTracker.startOperation(operationId, async ({ updateProgress, checkPaused, checkCancelled }) => {
			updateProgress({ current: 0, total: 100, message: "Starting data processing..." });

			// Step 1: Load data
			if (checkCancelled()) throw new Error("Operation cancelled");
			updateProgress({ current: 20, total: 100, message: "Loading data..." });
			const data = await dataService.getUnifiedItems();

			// Step 2: Process data
			if (checkCancelled()) throw new Error("Operation cancelled");
			updateProgress({ current: 50, total: 100, message: "Processing data..." });
			const processedData = data.slice(0, 100).map(item => ({
				...item,
				processed: true,
				processedAt: new Date().toISOString(),
			}));

			// Step 3: Save results (simulated)
			if (checkCancelled()) throw new Error("Operation cancelled");
			updateProgress({ current: 80, total: 100, message: "Saving results..." });
			await new Promise(resolve => setTimeout(resolve, 500)); // Simulate save

			updateProgress({ current: 100, total: 100, message: "Operation completed" });

			return {
				processed: processedData.length,
				total: data.length,
				timestamp: new Date().toISOString(),
			};
		});

		console.log("Advanced operation result:", result);
		return result;
	} catch (error) {
		console.error("Advanced operation failed:", error);
		throw error;
	}
}

/**
 * Run all examples
 */
export async function runAllExamples() {
	console.log("=== Running Data Service Examples ===\n");

	try {
		// Initialize the data service
		await dataService.initialize();
		console.log("[OK] Data service initialized\n");

		// Run examples
		await basicSearchExample();
		console.log("[OK] Basic search completed\n");

		await searchWithProgressExample();
		console.log("[OK] Progressive search completed\n");

		await paginationExample();
		console.log("[OK] Pagination example completed\n");

		await dataAggregationExample();
		console.log("[OK] Data aggregation completed\n");

		await serviceStatsExample();
		console.log("[OK] Service statistics retrieved\n");

		await filterPresetsExample();
		console.log("[OK] Filter presets example completed\n");

		await advancedOperationExample();
		console.log("[OK] Advanced operation completed\n");

		console.log("=== All Examples Completed Successfully ===");
	} catch (error) {
		console.error("=== Example Failed ===", error);
		throw error;
	}
}

// Export individual examples for selective testing
export default {
	basicSearchExample,
	searchWithProgressExample,
	paginationExample,
	dataAggregationExample,
	preloadDataExample,
	exportDataExample,
	filterPresetsExample,
	serviceStatsExample,
	advancedOperationExample,
	runAllExamples,
};