/**
 * Helper to update the items index (data/src/items/index.json)
 * when the scraper discovers valid/invalid IDs on the Japanese site.
 *
 * Note: Timing fields (pageScrapedAt, arrayVerifiedAt, downloadVerifiedAt, etc.)
 * are now stored in individual item JSON files instead of the centralized index.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { resolveWorkspacePath } from "@hobby-ninja/utils/workspace";

const ITEMS_INDEX_PATH = resolveWorkspacePath("data/src/items/index.json");

/**
 * Pad the numeric suffix of an item ID to 4 digits for consistent indexing
 * 01_1 -> 01_0001, 01_778 -> 01_0778, 01_1000 -> 01_1000 (unchanged)
 */
function padItemId(id: string): string {
	const parts = id.split("_");
	if (parts.length !== 2) return id;
	const [prefix, suffix] = parts;
	if (!/^\d+$/.test(prefix) || !/^\d+$/.test(suffix)) return id;
	return `${prefix}_${suffix.padStart(4, "0")}`;
}
const ITEMS_DATA_DIR = resolveWorkspacePath("data/src/items");

// Timing fields now stored in individual item files
interface ItemTimingFields {
	pageScrapedAt?: string;     // When we last scraped the page for image content
	downloadVerifiedAt?: string; // When we verified all images were downloaded
}

// Minimal index interface - only essential tracking data
interface SiteStatus {
	hasPage: boolean;
	pageCheckedAt: string;    // When we verified the page exists (404 vs 200)
	productName?: string;
	error?: string;
	isBlog?: boolean;         // Whether this is a blog post (no product data)
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

// Helper functions for individual item timing fields
function getItemTimingFields(itemId: string): ItemTimingFields | null {
	try {
		const paddedId = padItemId(itemId);
		const itemPath = resolve(ITEMS_DATA_DIR, `${paddedId}.json`);
		if (!existsSync(itemPath)) return null;

		const itemData = JSON.parse(readFileSync(itemPath, "utf-8"));
		return {
			pageScrapedAt: itemData.pageScrapedAt,
			downloadVerifiedAt: itemData.downloadVerifiedAt,
		};
	} catch {
		return null;
	}
}

function setItemTimingFields(itemId: string, fields: Partial<ItemTimingFields>): boolean {
	try {
		const paddedId = padItemId(itemId);
		const itemPath = resolve(ITEMS_DATA_DIR, `${paddedId}.json`);
		if (!existsSync(itemPath)) return false;

		const itemData = JSON.parse(readFileSync(itemPath, "utf-8"));

		// Update timing fields
		if (fields.pageScrapedAt !== undefined) itemData.pageScrapedAt = fields.pageScrapedAt;
		if (fields.downloadVerifiedAt !== undefined) itemData.downloadVerifiedAt = fields.downloadVerifiedAt;

		writeFileSync(itemPath, JSON.stringify(itemData, null, "\t"));
		return true;
	} catch {
		return false;
	}
}

/**
 * Utility class for updating the items index during scraping
 */
export const ItemsIndexUpdater = {
	/**
	 * Load the items index from disk
	 */
	load(): void {
		if (itemsIndex) return;

		try {
			itemsIndex = existsSync(ITEMS_INDEX_PATH) ? JSON.parse(readFileSync(ITEMS_INDEX_PATH, "utf-8")) as ItemsIndex : createEmptyIndex();
		} catch {
			itemsIndex = createEmptyIndex();
		}
		isDirty = false;
	},

	/**
	 * Record a valid item on the Japanese site
	 */
	recordJpValid(itemId: string, productName?: string): void {
		if (!itemsIndex) this.load();
		if (!itemsIndex) return;

		const paddedId = padItemId(itemId);
		if (!itemsIndex.items[paddedId]) {
			itemsIndex.items[paddedId] = {};
		}

		// Only update if not already checked or if this is new info
		if (!itemsIndex.items[paddedId].japaneseSite) {
			itemsIndex.items[paddedId].japaneseSite = {
				hasPage: true,
				pageCheckedAt: new Date().toISOString(),
				productName,
			};
			isDirty = true;
		}
	},

	/**
	 * Record an invalid (404) item on the Japanese site
	 */
	recordJpInvalid(itemId: string, error?: string): void {
		if (!itemsIndex) this.load();
		if (!itemsIndex) return;

		const paddedId = padItemId(itemId);
		if (!itemsIndex.items[paddedId]) {
			itemsIndex.items[paddedId] = {};
		}

		// Only update if not already checked
		if (!itemsIndex.items[paddedId].japaneseSite) {
			itemsIndex.items[paddedId].japaneseSite = {
				hasPage: false,
				pageCheckedAt: new Date().toISOString(),
				error,
			};
			isDirty = true;
		}
	},

	/**
	 * Mark an item as a blog post (no product data)
	 */
	recordBlog(itemId: string, productName?: string): void {
		if (!itemsIndex) this.load();
		if (!itemsIndex) return;

		const paddedId = padItemId(itemId);
		if (!itemsIndex.items[paddedId]) {
			itemsIndex.items[paddedId] = {};
		}

		if (!itemsIndex.items[paddedId].japaneseSite) {
			itemsIndex.items[paddedId].japaneseSite = {
				hasPage: true,
				pageCheckedAt: new Date().toISOString(),
				productName,
			};
		}

		itemsIndex.items[paddedId].japaneseSite.isBlog = true;
		isDirty = true;
	},

	/**
	 * Check if an item is marked as a blog post
	 */
	isBlog(itemId: string): boolean {
		if (!itemsIndex) this.load();
		if (!itemsIndex) return false;

		const paddedId = padItemId(itemId);
		return itemsIndex.items[paddedId]?.japaneseSite?.isBlog === true;
	},

	/**
	 * Save the items index to disk if changed
	 */
	save(): void {
		if (!itemsIndex || !isDirty) return;

		try {
			itemsIndex.stats = calculateStats(itemsIndex.items);
			itemsIndex.updatedAt = new Date().toISOString();
			writeFileSync(ITEMS_INDEX_PATH, JSON.stringify(itemsIndex, null, "\t"));
			isDirty = false;
		} catch (error) {
			console.warn(`⚠️  Failed to save items index: ${error}`);
		}
	},

	/**
	 * Get current stats
	 */
	getStats(): ItemsIndex["stats"] | null {
		if (!itemsIndex) this.load();
		return itemsIndex?.stats ?? null;
	},

	/**
	 * Check if an ID is already indexed and its status
	 */
	isIndexed(itemId: string): { indexed: boolean; hasPage?: boolean; hasFile?: boolean; productName?: string } {
		if (!itemsIndex) this.load();
		if (!itemsIndex) return { indexed: false };

		const paddedId = padItemId(itemId);
		const entry = itemsIndex.items[paddedId];
		if (!entry?.japaneseSite) {
			return { indexed: false };
		}

		return {
			indexed: true,
			hasPage: entry.japaneseSite.hasPage,
			hasFile: entry.hasFile,
			productName: entry.japaneseSite.productName,
		};
	},

	/**
	 * Mark that a file has been created for an item
	 */
	recordFileCreated(itemId: string, productName?: string): void {
		if (!itemsIndex) this.load();
		if (!itemsIndex) return;

		const paddedId = padItemId(itemId);
		if (!itemsIndex.items[paddedId]) {
			itemsIndex.items[paddedId] = {};
		}

		// Update Japanese site status if not set
		if (!itemsIndex.items[paddedId].japaneseSite) {
			itemsIndex.items[paddedId].japaneseSite = {
				hasPage: true,
				pageCheckedAt: new Date().toISOString(),
				productName,
			};
		} else if (productName && !itemsIndex.items[paddedId].japaneseSite?.productName) {
			itemsIndex.items[paddedId].japaneseSite.productName = productName;
		}

		itemsIndex.items[paddedId].hasFile = true;
		isDirty = true;
	},

	/**
	 * Get IDs that need content download (has page but no file)
	 */
	getIdsNeedingDownload(ranges: string[]): string[] {
		if (!itemsIndex) this.load();
		if (!itemsIndex) return ranges;

		return ranges.filter((id) => {
			const paddedId = padItemId(id);
			const entry = itemsIndex?.items[paddedId];
			// Need download if: not indexed, or indexed with page but no file
			if (!entry?.japaneseSite) return true;
			return entry.japaneseSite.hasPage && !entry.hasFile;
		});
	},

	/**
	 * Get IDs not yet checked on Japanese site
	 */
	getUncheckedIds(ranges: string[]): string[] {
		if (!itemsIndex) this.load();
		if (!itemsIndex) return ranges;

		return ranges.filter((id) => {
			const paddedId = padItemId(id);
			return !itemsIndex?.items[paddedId]?.japaneseSite;
		});
	},

	/**
	 * Get stats for display
	 */
	getDisplayStats(): { valid: number; invalid: number; withFile: number; totalChecked: number } {
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
	},

	/**
	 * Record that all images have been successfully downloaded for an item
	 */
	recordDownloadVerified(itemId: string): void {
		if (!itemsIndex) this.load();
		if (!itemsIndex) return;

		const paddedId = padItemId(itemId);
		if (!itemsIndex.items[paddedId]) {
			itemsIndex.items[paddedId] = {};
		}

		if (!itemsIndex.items[paddedId].japaneseSite) {
			itemsIndex.items[paddedId].japaneseSite = {
				hasPage: false, // Assume no page if we're only tracking downloads
				pageCheckedAt: new Date().toISOString(),
			};
		}

		itemsIndex.items[paddedId].japaneseSite.downloadVerifiedAt = new Date().toISOString();
		isDirty = true;
	},

	/**
	 * Check if an item needs download verification (all images downloaded recently)
	 */
	needsDownloadVerification(itemId: string, maxAgeHours = 24): boolean {
		if (!itemsIndex) this.load();
		if (!itemsIndex) return true;

		const paddedId = padItemId(itemId);
		const entry = itemsIndex.items[paddedId]?.japaneseSite;
		if (!entry) return true;

		// If never verified for downloads, needs verification
		if (!entry.downloadVerifiedAt) return true;

		// Check if verification is too old
		const verificationTime = new Date(entry.downloadVerifiedAt).getTime();
		const maxAge = maxAgeHours * 60 * 60 * 1000;
		const now = Date.now();

		return (now - verificationTime) > maxAge;
	},

	/**
	 * Get download verification status for an item
	 */
	getDownloadStatus(itemId: string): { verified: boolean; at?: string } {
		if (!itemsIndex) this.load();
		if (!itemsIndex) return { verified: false };

		const paddedId = padItemId(itemId);
		const entry = itemsIndex.items[paddedId]?.japaneseSite;
		if (!entry?.downloadVerifiedAt) return { verified: false };

		return {
			verified: true,
			at: entry.downloadVerifiedAt,
		};
	},


	/**
	 * Get page check status for an item
	 */
	getPageStatus(itemId: string): { hasPage: boolean; checkedAt?: string; productName?: string } {
		if (!itemsIndex) this.load();
		if (!itemsIndex) return { hasPage: false };

		const paddedId = padItemId(itemId);
		const entry = itemsIndex.items[paddedId]?.japaneseSite;
		if (!entry) return { hasPage: false };

		return {
			hasPage: entry.hasPage,
			checkedAt: entry.pageCheckedAt,
			productName: entry.productName,
		};
	},

	/**
	 * Record that the page was scraped for image content
	 */
	recordPageScraped(itemId: string): void {
		setItemTimingFields(itemId, {
			pageScrapedAt: new Date().toISOString(),
		});
	},

	/**
	 * Check if page content was recently scraped (within specified hours)
	 */
	wasPageRecentlyScraped(itemId: string, maxAgeHours = 168): boolean { // Default 7 days (168 hours)
		const timingFields = getItemTimingFields(itemId);
		if (!timingFields?.pageScrapedAt) return false;

		// Check if page scraping is recent enough
		const scrapeTime = new Date(timingFields.pageScrapedAt).getTime();
		const maxAge = maxAgeHours * 60 * 60 * 1000;
		const now = Date.now();

		return (now - scrapeTime) <= maxAge;
	},

	/**
	 * Record that all images were verified as downloaded
	 */
	recordDownloadVerified(itemId: string): void {
		setItemTimingFields(itemId, {
			downloadVerifiedAt: new Date().toISOString(),
		});
	},

	/**
	 * Check if an item needs download verification (all images downloaded recently)
	 */
	needsDownloadVerification(itemId: string, maxAgeHours = 24): boolean {
		const timingFields = getItemTimingFields(itemId);
		if (!timingFields?.downloadVerifiedAt) return true;

		// Check if verification is too old
		const verificationTime = new Date(timingFields.downloadVerifiedAt).getTime();
		const maxAge = maxAgeHours * 60 * 60 * 1000;
		const now = Date.now();

		return (now - verificationTime) > maxAge;
	},

	/**
	 * Get download verification status for an item
	 */
	getDownloadStatus(itemId: string): { verified: boolean; at?: string } {
		const timingFields = getItemTimingFields(itemId);
		if (!timingFields?.downloadVerifiedAt) return { verified: false };

		return {
			verified: true,
			at: timingFields.downloadVerifiedAt,
		};
	},
};
