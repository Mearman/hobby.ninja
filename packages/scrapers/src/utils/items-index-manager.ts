/**
 * Items Index Manager
 *
 * Manages centralized tracking of item availability on both
 * Japanese (bandai-hobby.net) and global (global.bandai-hobby.net/en-us) sites.
 *
 * Stored in data/src/items/index.json (version controlled)
 */

import { promises as fs } from "node:fs";
import path from "node:path";

import type {
	ItemsIndex,
	ItemIndexEntry,
	SiteStatus,
	SiteStats,
} from "@hobby-ninja/types/catalog";

/** Which site to update */
export type SiteType = "japaneseSite" | "globalSite";

/** Data to update for a site status */
export interface SiteUpdateData {
	hasPage: boolean;
	productName?: string;
	error?: string;
}

/**
 * Manages the items index file for tracking page availability
 */
export class ItemsIndexManager {
	private index: ItemsIndex;
	private dirty = false;

	constructor(private indexPath = "data/src/items/index.json") {
		this.index = this.createEmptyIndex();
	}

	/**
	 * Load index from disk or create new if doesn't exist
	 */
	async load(): Promise<void> {
		try {
			const data = await fs.readFile(this.indexPath, "utf8");
			this.index = JSON.parse(data) as ItemsIndex;
			this.dirty = false;
		} catch {
			// Index doesn't exist yet, start with empty
			this.index = this.createEmptyIndex();
			this.dirty = true;
		}
	}

	/**
	 * Create an empty index structure
	 */
	private createEmptyIndex(): ItemsIndex {
		const emptyStats: SiteStats = {
			checked: 0,
			withPage: 0,
			withoutPage: 0,
			errors: 0,
		};
		return {
			version: "1.0.0",
			updatedAt: new Date().toISOString(),
			stats: {
				totalItems: 0,
				japaneseSite: { ...emptyStats },
				globalSite: { ...emptyStats },
			},
			items: {},
		};
	}

	/**
	 * Update status for a specific site (JP or global)
	 */
	updateSiteStatus(itemId: string, site: SiteType, data: SiteUpdateData): void {
		if (!(itemId in this.index.items)) {
			this.index.items[itemId] = {};
		}

		const status: SiteStatus = {
			hasPage: data.hasPage,
			checkedAt: new Date().toISOString(),
		};

		if (data.productName) {
			status.productName = data.productName;
		}

		if (data.error) {
			status.error = data.error;
		}

		this.index.items[itemId][site] = status;
		this.dirty = true;
	}

	/**
	 * Get status for a specific item and site
	 */
	getSiteStatus(itemId: string, site: SiteType): SiteStatus | undefined {
		if (!(itemId in this.index.items)) {
			return undefined;
		}
		return this.index.items[itemId][site];
	}

	/**
	 * Check if an item has been checked on a specific site
	 */
	isChecked(itemId: string, site: SiteType): boolean {
		return itemId in this.index.items && this.index.items[itemId][site] !== undefined;
	}

	/**
	 * Get items not yet checked on a specific site
	 */
	getUncheckedItems(allItemIds: string[], site: SiteType): string[] {
		return allItemIds.filter((id) => !(id in this.index.items) || !this.index.items[id][site]);
	}

	/**
	 * Get items with pages on a specific site
	 */
	getItemsWithPage(site: SiteType): string[] {
		return Object.entries(this.index.items)
			.filter(([, entry]) => entry[site]?.hasPage)
			.map(([id]) => id);
	}

	/**
	 * Get items that exist on JP site but haven't been checked on global site
	 * (candidates for translation lookup)
	 */
	getItemsNeedingTranslationLookup(): string[] {
		return Object.entries(this.index.items)
			.filter(([, entry]) => entry.japaneseSite?.hasPage && !entry.globalSite)
			.map(([id]) => id);
	}

	/**
	 * Get items that exist on JP but not on global (after checking)
	 */
	getJapaneseOnlyItems(): string[] {
		return Object.entries(this.index.items)
			.filter(
				([, entry]) =>
					entry.japaneseSite?.hasPage &&
					entry.globalSite &&
					!entry.globalSite.hasPage,
			)
			.map(([id]) => id);
	}

	/**
	 * Get items with errors on a specific site (for retry)
	 */
	getItemsWithErrors(site: SiteType): string[] {
		return Object.entries(this.index.items)
			.filter(([, entry]) => entry[site]?.error)
			.map(([id]) => id);
	}

	/**
	 * Calculate stats for a single site
	 */
	private calculateSiteStats(
		entries: ItemIndexEntry[],
		site: SiteType,
	): SiteStats {
		return {
			checked: entries.filter((e) => e[site]).length,
			withPage: entries.filter((e) => e[site]?.hasPage).length,
			withoutPage: entries.filter((e) => {
				const siteStatus = e[site];
				return siteStatus && !siteStatus.hasPage && !siteStatus.error;
			}).length,
			errors: entries.filter((e) => e[site]?.error).length,
		};
	}

	/**
	 * Recalculate stats and save to disk
	 */
	async save(): Promise<void> {
		if (!this.dirty) {
			return;
		}

		const entries = Object.values(this.index.items);

		this.index.stats = {
			totalItems: Object.keys(this.index.items).length,
			japaneseSite: this.calculateSiteStats(entries, "japaneseSite"),
			globalSite: this.calculateSiteStats(entries, "globalSite"),
		};
		this.index.updatedAt = new Date().toISOString();

		// Ensure directory exists
		const dir = path.dirname(this.indexPath);
		try {
			await fs.access(dir);
		} catch {
			await fs.mkdir(dir, { recursive: true });
		}

		// Write atomically
		const tempPath = `${this.indexPath}.tmp.${Date.now()}`;
		try {
			await fs.writeFile(tempPath, JSON.stringify(this.index, null, "\t"), "utf8");
			await fs.rename(tempPath, this.indexPath);
			this.dirty = false;
		} catch (error) {
			// Clean up temp file
			try {
				await fs.unlink(tempPath);
			} catch {
				// Ignore cleanup errors
			}
			throw error;
		}
	}

	/**
	 * Get current stats
	 */
	getStats(): ItemsIndex["stats"] {
		const entries = Object.values(this.index.items);
		return {
			totalItems: Object.keys(this.index.items).length,
			japaneseSite: this.calculateSiteStats(entries, "japaneseSite"),
			globalSite: this.calculateSiteStats(entries, "globalSite"),
		};
	}

	/**
	 * Get all item IDs in the index
	 */
	getAllItemIds(): string[] {
		return Object.keys(this.index.items);
	}

	/**
	 * Check if index has been modified since load
	 */
	isDirty(): boolean {
		return this.dirty;
	}
}
