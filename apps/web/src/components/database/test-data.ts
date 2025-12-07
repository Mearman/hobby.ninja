/**
 * Mock test data for ItemCard and ItemGrid components
 */

import type { UnifiedItem, ManualItem, DatabaseCatalogItem } from "../../services/dataService";

export const mockUnifiedItems: UnifiedItem[] = [
	{
		id: "up_00001",
		name: { en: "Strike Freedom Gundam", ja: "ストライクフリーダムガンダム" },
		series: { en: "Mobile Suit Gundam SEED Destiny", ja: "機動戦士ガンダムSEED DESTINY" },
		grade: "PG",
		scale: "1/60",
		releaseDate: { year: 2004, month: 11, day: 27 },
		sources: {
			catalog: { id: "cat_001", confidence: 0.95, linkedAt: "2025-12-07T00:00:00Z" },
			manual: { id: "0001", productNumber: "1114204", confidence: 0.9, linkedAt: "2025-12-07T00:00:00Z" },
		},
		matchMethod: "exact",
		matchStage: 5,
		createdAt: "2025-12-07T00:00:00Z",
		updatedAt: "2025-12-07T00:00:00Z",
	},
	{
		id: "up_00002",
		name: { en: "Wing Gundam Zero", ja: "ウイングガンダムゼロ" },
		series: { en: "Mobile Suit Gundam Wing", ja: "新機動戦記ガンダムW" },
		grade: "MG",
		scale: "1/100",
		releaseDate: { year: 2000 },
		sources: {
			catalog: { id: "cat_002", confidence: 0.88, linkedAt: "2025-12-07T00:00:00Z" },
		},
		matchMethod: "fuzzy",
		matchStage: 3,
		createdAt: "2025-12-07T00:00:00Z",
		updatedAt: "2025-12-07T00:00:00Z",
	},
];

export const mockManualItems: ManualItem[] = [
	{
		id: "0001",
		title: "HG 1/144 エールストライクガンダム - バンダイプラモデルWEB取説 | バンダイ ホビーサイト",
		metadata: {
			language: "ja",
			encoding: "utf-8",
			extractedAt: "2025-12-05T23:09:46.317Z",
		},
		content: {
			blocks: [],
		},
		assets: {
			images: [
				"https://bandai-hobby.net/images/155_303_s_kwjuc0ri80ktzu3ahk5r92ecrdr4.jpg",
			],
			links: [],
		},
	},
];

export const mockCatalogItems: DatabaseCatalogItem[] = [
	{
		id: "cat_001",
		name: "Strike Freedom Gundam",
		series: "Mobile Suit Gundam SEED Destiny",
		grade: "PG",
		scale: "1/60",
		productNumber: "1114204",
		releaseDate: { year: 2004, month: 11, day: 27 },
		price: { amount: 25_000, currency: "JPY" },
		images: [
			"https://bandai-hobby.net/images/strike-freedom-pg.jpg",
		],
		status: "available",
	},
];

// Helper function to get mixed items for testing
export function getMockItems(count = 50) {
	const allItems: Array<UnifiedItem | ManualItem | DatabaseCatalogItem> = [
		...mockUnifiedItems,
		...mockManualItems,
		...mockCatalogItems,
	];

	// Create more items by duplicating with different IDs
	const items: Array<UnifiedItem | ManualItem | DatabaseCatalogItem> = [];
	for (let i = 0; i < count; i++) {
		const baseItem = allItems[i % allItems.length];
		const itemWithId = { ...baseItem };

		if ("id" in itemWithId) {
			itemWithId.id = `${itemWithId.id}_${i}`;
		}

		if ("title" in itemWithId) {
			itemWithId.title = `${itemWithId.title} #${i + 1}`;
		}

		if ("name" in itemWithId && typeof itemWithId.name === "object") {
			itemWithId.name = {
				en: `${itemWithId.name.en} #${i + 1}`,
				ja: `${itemWithId.name.ja || ""} #${i + 1}`,
			};
		}

		items.push(itemWithId);
	}

	return items;
}