// Bandai Catalog Item Types

import type { LocalizedText, LocalizedTextArray } from "./manualData";

export interface CatalogPrice {
	amount: number;
	currency: "JPY";
	taxIncluded: boolean;
	taxRate: number;
}

export interface CatalogReleaseDate {
	ja: string;
	year: number;
	month: number;
	day?: number;
}

export interface CatalogBrand {
	ja: string;
	en?: string;
	url?: string;
}

export interface CatalogSeries {
	ja: string;
	en?: string;
	url?: string;
}

export interface CatalogCategory {
	ja: string;
	en?: string;
	url?: string;
}

export interface CatalogRelatedProduct {
	id: string;
	name: LocalizedText;
	url: string;
	imageUrl?: string;
}

export type CatalogItemType = "product" | "blog";

/** Individual accessory or content item with parsed count */
export interface CountedItem {
	name: LocalizedText;
	/** Quantity if specified in source (e.g., "×2") */
	count?: number;
	/** Unit if specified (e.g., "set", "式") - localized */
	unit?: LocalizedText;
}

export interface CatalogItem {
	id: string;
	itemType: CatalogItemType;
	name: LocalizedText;
	price?: CatalogPrice;
	releaseDate?: CatalogReleaseDate;
	targetAge?: number;
	series?: CatalogSeries;
	brands: CatalogBrand[];
	categories: CatalogCategory[];
	scale?: string;
	description: LocalizedTextArray;
	accessories: LocalizedTextArray;
	contents: LocalizedTextArray;
	images: string[];
	relatedProducts: CatalogRelatedProduct[];
	sourceUrl: string;
	extractedAt: string;
	/** Direct link to manual from manual.bandai-hobby.net/menus/detail/{id} */
	manualId?: string;
}

// ============================================================================
// Index Types - Centralized tracking for items and manuals
// ============================================================================

/** Status of an item/page on a Bandai site (JP or global) */
export interface SiteStatus {
	/** Whether the page exists on this site */
	hasPage: boolean;
	/** ISO timestamp when this was last checked */
	checkedAt: string;
	/** Product name if page exists (JP or EN depending on site) */
	productName?: string;
	/** Network error message (not 404 - those are just hasPage: false) */
	error?: string;
	/** ISO timestamp when downloads were verified complete */
	downloadVerifiedAt?: string;
}

/** Stats for a single site */
export interface SiteStats {
	/** Number of items checked on this site */
	checked: number;
	/** Number of items with pages on this site */
	withPage: number;
	/** Number of items confirmed not to have pages (404, no error) */
	withoutPage: number;
	/** Number of items with network errors (can be retried) */
	errors: number;
}

/** Entry for a single item tracking both Japanese and global sites */
export interface ItemIndexEntry {
	/** Status on bandai-hobby.net (Japanese site) */
	japaneseSite?: SiteStatus;
	/** Status on global.bandai-hobby.net/en-us (English site) */
	globalSite?: SiteStatus;
}

/** Centralized index tracking all items on both sites */
export interface ItemsIndex {
	/** Schema version for migrations */
	version: string;
	/** ISO timestamp of last update */
	updatedAt: string;
	/** Aggregated statistics */
	stats: {
		/** Total unique items tracked */
		totalItems: number;
		/** Stats for Japanese site */
		japaneseSite: SiteStats;
		/** Stats for global English site */
		globalSite: SiteStats;
	};
	/** Per-item status entries */
	items: Record<string, ItemIndexEntry>;
}

// ============================================================================
// Manual Index Types
// ============================================================================

/** Status of a manual ID on the Bandai manual site */
export interface ManualStatus {
	/** Whether the manual page exists */
	hasPage: boolean;
	/** ISO timestamp when this was last checked */
	checkedAt: string;
	/** Japanese name if page exists */
	name?: string;
	/** Network error message (not 404) */
	error?: string;
}

/** Contiguous range of invalid (non-existent) manual IDs */
export interface InvalidRange {
	/** Start of range (inclusive) */
	start: number;
	/** End of range (inclusive) */
	end: number;
	/** ISO timestamp when this range was confirmed */
	checkedAt: string;
}

/** Centralized manual index */
export interface ManualsIndex {
	/** Schema version for migrations */
	version: string;
	/** ISO timestamp of last update */
	updatedAt: string;
	/** Aggregated statistics */
	stats: {
		/** Total IDs checked (individual + ranges) */
		totalChecked: number;
		/** Number of manuals that exist */
		withPage: number;
		/** Number of IDs confirmed not to exist */
		withoutPage: number;
		/** Number with network errors */
		errors: number;
	};
	/** Per-manual status entries (keyed by zero-padded ID like "0001") */
	manuals: Record<string, ManualStatus>;
	/** Compact storage for contiguous invalid ID ranges */
	invalidRanges: InvalidRange[];
}
