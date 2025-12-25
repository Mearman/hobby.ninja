/**
 * Item ID resolution logic for scrape command
 *
 * Determines which items and manuals to process based on:
 * - Command line options (single ID, ranges, all items)
 * - Max age filtering (skip recently scraped items)
 * - Orphan manual detection (manuals not linked to items)
 */

import { ItemsIndexUpdater } from "../items-index-updater.js";
import { ManualsIndexUpdater } from "../manuals-index-updater.js";

import { formatItemId, parseItemIdSuffix } from "./id-utils.js";
import { MAX_ITEM_ID, type ScrapeOptions } from "./types.js";

/**
 * Get all item IDs to process based on command options
 *
 * Supports multiple selection modes:
 * - Single ID: --id=01_1234
 * - Range: --start=01_1000 --end=01_2000
 * - Count: --start=01_1000 --count=100
 * - All items with pages (default)
 *
 * @param options - Scrape command options
 * @returns Array of item IDs in format "01_XXXX"
 */
export function getAllItemIds(options: ScrapeOptions): string[] {
	// Single specific ID
	if (options.id) {
		const id = formatItemId(parseItemIdSuffix(options.id));
		return [id];
	}

	// Range specified by start (and optionally end or count)
	if (options.start) {
		const startSuffix = parseItemIdSuffix(options.start);
		let endSuffix: number;

		if (options.end) {
			endSuffix = parseItemIdSuffix(options.end);
		} else if (options.count) {
			endSuffix = startSuffix + options.count - 1;
		} else {
			// Just start specified - process that single item
			return [formatItemId(startSuffix)];
		}

		// Generate range
		const itemIds: string[] = [];
		for (let i = startSuffix; i <= endSuffix && i <= MAX_ITEM_ID; i++) {
			const id = formatItemId(i);
			const status = ItemsIndexUpdater.isIndexed(id);
			if (status.indexed && status.hasPage) {
				itemIds.push(id);
			}
		}
		return itemIds;
	}

	// Default: all items with pages
	const itemIds: string[] = [];
	for (let i = 1; i <= MAX_ITEM_ID; i++) {
		const id = formatItemId(i);
		const status = ItemsIndexUpdater.isIndexed(id);
		if (status.indexed && status.hasPage) {
			itemIds.push(id);
		}
	}
	return itemIds;
}

/**
 * Filter items to only those needing scraping based on max age
 *
 * @param options - Scrape command options
 * @param maxAgeHours - Maximum age in hours (0 = scrape all)
 * @returns Array of item IDs that need processing
 */
export function getItemsToProcess(options: ScrapeOptions, maxAgeHours: number): string[] {
	const allItemIds = getAllItemIds(options);

	if (maxAgeHours === 0) {
		return allItemIds;
	}

	return allItemIds.filter((id) => !ItemsIndexUpdater.wasPageRecentlyScraped(id, maxAgeHours));
}

/**
 * Get manual IDs that weren't discovered via items (orphans)
 *
 * Orphan manuals are those in the index but not linked to any item.
 * Also includes manuals with old/invalid format that need re-scraping.
 *
 * @param discoveredManualIds - Set of manual IDs found during item scraping
 * @param maxAgeHours - Maximum age in hours (0 = process all orphans)
 * @param getManualsNeedingMigration - Callback to check for format migration needs
 * @returns Array of orphan manual IDs to process
 */
export function getOrphanManualIds(
	discoveredManualIds: Set<string>,
	maxAgeHours: number,
	getManualsNeedingMigration: (ids: string[]) => string[],
): string[] {
	const allManualIds = ManualsIndexUpdater.getIdsWithPages();

	// Filter out manuals that were discovered via items
	const orphanIds = allManualIds.filter((id) => !discoveredManualIds.has(id));

	if (maxAgeHours === 0) {
		return orphanIds;
	}

	// Get stale IDs by age
	const staleByAge = ManualsIndexUpdater.getStaleIds(orphanIds, maxAgeHours);
	const staleIds = new Set(staleByAge);

	// Also include manuals with old format that need migration
	const needsMigration = getManualsNeedingMigration(orphanIds);
	const migrationNotStale = needsMigration.filter((id) => !staleIds.has(id));
	for (const id of migrationNotStale) {
		staleIds.add(id);
	}

	if (migrationNotStale.length > 0) {
		console.log(`  (${migrationNotStale.length} manuals need format migration)`);
	}

	return [...staleIds];
}
