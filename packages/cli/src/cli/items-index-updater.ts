/**
 * Helper to update the items index (data/src/items/index.json)
 * when the scraper discovers valid/invalid IDs on the Japanese site.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { resolveWorkspacePath } from "@hobby-ninja/utils/workspace";

const ITEMS_INDEX_PATH = resolveWorkspacePath("data/src/items/index.json");

interface SiteStatus {
	hasPage: boolean;
	checkedAt: string;
	productName?: string;
	error?: string;
}

interface SiteStats {
	checked: number;
	withPage: number;
	withoutPage: number;
	errors: number;
}

interface ItemIndexEntry {
	japaneseSite?: SiteStatus;
	globalSite?: SiteStatus;
	/** Whether the item JSON file exists in data/src/items/ */
	hasFile?: boolean;
}

interface ItemsIndex {
	version: string;
	updatedAt: string;
	stats: {
		totalItems: number;
		japaneseSite: SiteStats;
		globalSite: SiteStats;
	};
	items: Record<string, ItemIndexEntry>;
}

let itemsIndex: ItemsIndex | null = null;
let isDirty = false;

function createEmptyIndex(): ItemsIndex {
	return {
		version: "1.0.0",
		updatedAt: new Date().toISOString(),
		stats: {
			totalItems: 0,
			japaneseSite: { checked: 0, withPage: 0, withoutPage: 0, errors: 0 },
			globalSite: { checked: 0, withPage: 0, withoutPage: 0, errors: 0 },
		},
		items: {},
	};
}

function calculateStats(items: Record<string, ItemIndexEntry>): ItemsIndex["stats"] {
	const entries = Object.values(items);
	return {
		totalItems: Object.keys(items).length,
		japaneseSite: {
			checked: entries.filter((e) => e.japaneseSite).length,
			withPage: entries.filter((e) => e.japaneseSite?.hasPage).length,
			withoutPage: entries.filter((e) => e.japaneseSite && !e.japaneseSite.hasPage && !e.japaneseSite.error).length,
			errors: entries.filter((e) => e.japaneseSite?.error).length,
		},
		globalSite: {
			checked: entries.filter((e) => e.globalSite).length,
			withPage: entries.filter((e) => e.globalSite?.hasPage).length,
			withoutPage: entries.filter((e) => e.globalSite && !e.globalSite.hasPage && !e.globalSite.error).length,
			errors: entries.filter((e) => e.globalSite?.error).length,
		},
	};
}

/**
 * Utility class for updating the items index during scraping
 */
export class ItemsIndexUpdater {
	/**
	 * Load the items index from disk
	 */
	static load(): void {
		if (itemsIndex) return;

		try {
			if (existsSync(ITEMS_INDEX_PATH)) {
				itemsIndex = JSON.parse(readFileSync(ITEMS_INDEX_PATH, "utf-8")) as ItemsIndex;
			} else {
				itemsIndex = createEmptyIndex();
			}
		} catch {
			itemsIndex = createEmptyIndex();
		}
		isDirty = false;
	}

	/**
	 * Record a valid item on the Japanese site
	 */
	static recordJpValid(itemId: string, productName?: string): void {
		if (!itemsIndex) this.load();
		if (!itemsIndex) return;

		if (!itemsIndex.items[itemId]) {
			itemsIndex.items[itemId] = {};
		}

		// Only update if not already checked or if this is new info
		if (!itemsIndex.items[itemId].japaneseSite) {
			itemsIndex.items[itemId].japaneseSite = {
				hasPage: true,
				checkedAt: new Date().toISOString(),
				productName,
			};
			isDirty = true;
		}
	}

	/**
	 * Record an invalid (404) item on the Japanese site
	 */
	static recordJpInvalid(itemId: string, error?: string): void {
		if (!itemsIndex) this.load();
		if (!itemsIndex) return;

		if (!itemsIndex.items[itemId]) {
			itemsIndex.items[itemId] = {};
		}

		// Only update if not already checked
		if (!itemsIndex.items[itemId].japaneseSite) {
			itemsIndex.items[itemId].japaneseSite = {
				hasPage: false,
				checkedAt: new Date().toISOString(),
				error,
			};
			isDirty = true;
		}
	}

	/**
	 * Save the items index to disk if changed
	 */
	static save(): void {
		if (!itemsIndex || !isDirty) return;

		try {
			itemsIndex.stats = calculateStats(itemsIndex.items);
			itemsIndex.updatedAt = new Date().toISOString();
			writeFileSync(ITEMS_INDEX_PATH, JSON.stringify(itemsIndex, null, "\t"));
			isDirty = false;
		} catch (error) {
			console.warn(`⚠️  Failed to save items index: ${error}`);
		}
	}

	/**
	 * Get current stats
	 */
	static getStats(): ItemsIndex["stats"] | null {
		if (!itemsIndex) this.load();
		return itemsIndex?.stats ?? null;
	}

	/**
	 * Check if an ID is already indexed and its status
	 */
	static isIndexed(itemId: string): { indexed: boolean; hasPage?: boolean; hasFile?: boolean; productName?: string } {
		if (!itemsIndex) this.load();
		if (!itemsIndex) return { indexed: false };

		const entry = itemsIndex.items[itemId];
		if (!entry?.japaneseSite) {
			return { indexed: false };
		}

		return {
			indexed: true,
			hasPage: entry.japaneseSite.hasPage,
			hasFile: entry.hasFile,
			productName: entry.japaneseSite.productName,
		};
	}

	/**
	 * Mark that a file has been created for an item
	 */
	static recordFileCreated(itemId: string, productName?: string): void {
		if (!itemsIndex) this.load();
		if (!itemsIndex) return;

		if (!itemsIndex.items[itemId]) {
			itemsIndex.items[itemId] = {};
		}

		// Update Japanese site status if not set
		if (!itemsIndex.items[itemId].japaneseSite) {
			itemsIndex.items[itemId].japaneseSite = {
				hasPage: true,
				checkedAt: new Date().toISOString(),
				productName,
			};
		} else if (productName && !itemsIndex.items[itemId].japaneseSite?.productName) {
			itemsIndex.items[itemId].japaneseSite.productName = productName;
		}

		itemsIndex.items[itemId].hasFile = true;
		isDirty = true;
	}

	/**
	 * Get IDs that need content download (has page but no file)
	 */
	static getIdsNeedingDownload(ranges: string[]): string[] {
		if (!itemsIndex) this.load();
		if (!itemsIndex) return ranges;

		return ranges.filter((id) => {
			const entry = itemsIndex?.items[id];
			// Need download if: not indexed, or indexed with page but no file
			if (!entry?.japaneseSite) return true;
			return entry.japaneseSite.hasPage && !entry.hasFile;
		});
	}

	/**
	 * Get IDs not yet checked on Japanese site
	 */
	static getUncheckedIds(ranges: string[]): string[] {
		if (!itemsIndex) this.load();
		if (!itemsIndex) return ranges;

		return ranges.filter((id) => !itemsIndex?.items[id]?.japaneseSite);
	}

	/**
	 * Get stats for display
	 */
	static getDisplayStats(): { valid: number; invalid: number; withFile: number; totalChecked: number } {
		if (!itemsIndex) this.load();
		if (!itemsIndex) return { valid: 0, invalid: 0, withFile: 0, totalChecked: 0 };

		const entries = Object.values(itemsIndex.items);
		const jpEntries = entries.filter((e) => e.japaneseSite);

		return {
			valid: jpEntries.filter((e) => e.japaneseSite?.hasPage).length,
			invalid: jpEntries.filter((e) => e.japaneseSite && !e.japaneseSite.hasPage).length,
			withFile: entries.filter((e) => e.hasFile).length,
			totalChecked: jpEntries.length,
		};
	}
}
