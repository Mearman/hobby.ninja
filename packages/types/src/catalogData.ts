// Bandai Catalog Item Types

import type { LocalizedText } from "./manualData";

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
	description: LocalizedText[];
	accessories: LocalizedText[];
	contents: LocalizedText[];
	images: string[];
	relatedProducts: CatalogRelatedProduct[];
	sourceUrl: string;
	extractedAt: string;
}
