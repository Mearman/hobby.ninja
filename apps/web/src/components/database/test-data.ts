/**
 * Mock test data for ItemCard and ItemGrid components
 */

import type { UnifiedItem, ManualItem, CatalogItem } from "../../services/dataService";

// Constants to avoid duplicate strings
const CURRENT_TIMESTAMP = "2025-12-07T00:00:00Z";
const UNIFIED_ITEM_SCHEMA = "unified_item_schema_v1";
const MANUAL_ITEM_SCHEMA = "manual_item_schema_001";
const CATALOG_ITEM_SCHEMA = "catalog_item_schema_001";
const TEST_DATA_SOURCE = "test_data";
const ITEM_VERSION = "1.0";

export const mockUnifiedItems: UnifiedItem[] = [
	{
		$id: "up_00001",
		$type: "unified_item",
		category: "data" as const,
		schemaId: UNIFIED_ITEM_SCHEMA,
		properties: {
			name: { en: "Strike Freedom Gundam", ja: "ストライクフリーダムガンダム" },
			series: { en: "Mobile Suit Gundam SEED Destiny", ja: "機動戦士ガンダムSEED DESTINY" },
			grade: "PG",
			scale: "1/60",
			releaseDate: { year: 2004, month: 11, day: 27 },
			sources: {
				catalog: { id: "cat_001", confidence: 0.95, linkedAt: CURRENT_TIMESTAMP },
				manual: { id: "0001", productNumber: "1114204", pdfUrl: "https://example.com/manual.pdf", confidence: 0.9, linkedAt: CURRENT_TIMESTAMP },
			},
			matchMethod: "exact",
			matchStage: 5,
		},
		metadata: {
			createdAt: CURRENT_TIMESTAMP,
			updatedAt: CURRENT_TIMESTAMP,
			version: ITEM_VERSION,
			source: TEST_DATA_SOURCE,
			confidence: 0.95,
		},
	},
	{
		$id: "up_00002",
		$type: "unified_item",
		category: "data" as const,
		schemaId: UNIFIED_ITEM_SCHEMA,
		properties: {
			name: { en: "Wing Gundam Zero", ja: "ウイングガンダムゼロ" },
			series: { en: "Mobile Suit Gundam Wing", ja: "新機動戦記ガンダムW" },
			grade: "MG",
			scale: "1/100",
			releaseDate: { year: 2000, month: 1, day: 1 },
			sources: {
				catalog: { id: "cat_002", confidence: 0.88, linkedAt: CURRENT_TIMESTAMP },
			},
			matchMethod: "fuzzy",
			matchStage: 3,
		},
		metadata: {
			createdAt: CURRENT_TIMESTAMP,
			updatedAt: CURRENT_TIMESTAMP,
			version: ITEM_VERSION,
			source: TEST_DATA_SOURCE,
			confidence: 0.88,
		},
	},
];

export const mockManualItems: ManualItem[] = [
	{
		$id: "0001",
		category: "data",
		$type: "manual_item",
		schemaId: MANUAL_ITEM_SCHEMA,
		properties: {
			name: {
				ja: "HG 1/144 エールストライクガンダム",
				en: "HG 1/144 Aile Strike Gundam",
			},
			productNumber: "148785",
			releaseDate: {
				year: 2023,
				month: 12,
				day: 2,
			},
			series: {
				ja: "機動戦士ガンダムSEED",
				en: "Mobile Suit Gundam SEED",
			},
			grade: {
				code: "HG",
				family: "High Grade",
			},
			scale: "1/144",
			pdfUrl: "https://bandai-hobby.net/manual/148785.pdf",
			productImage: "https://bandai-hobby.net/images/148785.jpg",
			thumbnailImage: "https://bandai-hobby.net/images/148785_thumb.jpg",
		},
	},

];

export const mockCatalogItems: CatalogItem[] = [
	{
		$id: "cat_001",
		$type: "catalog_item",
		category: "data" as const,
		schemaId: CATALOG_ITEM_SCHEMA,
		properties: {
			name: { en: "Strike Freedom Gundam", ja: "ストライクフリーダムガンダム" },
			price: { amount: 25_000, currency: "JPY" },
			releaseDate: { year: 2004, month: 11, day: 27 },
			scale: "1/60",
			series: { en: "Mobile Suit Gundam SEED Destiny", ja: "機動戦士ガンダムSEED DESTINY" },
			images: [
				"https://bandai-hobby.net/images/strike-freedom-pg.jpg",
			],
		},
	},
];

// Constants
const DEFAULT_MOCK_COUNT = 50;

// Helper function to get mixed items for testing
export function getMockItems(count = DEFAULT_MOCK_COUNT) {
	const allItems: Array<UnifiedItem | ManualItem | CatalogItem> = [
		...mockUnifiedItems,
		...mockManualItems,
		...mockCatalogItems,
	];

	// Create more items by duplicating with different IDs
	const items: Array<UnifiedItem | ManualItem | CatalogItem> = [];
	for (let i = 0; i < count; i++) {
		const baseItem = allItems[i % allItems.length];
		const itemWithId = { ...baseItem };

		if ("$id" in itemWithId && itemWithId.$id) {
			itemWithId.$id = `${itemWithId.$id}_${i}`;
		}

		if ("properties" in itemWithId && "name" in itemWithId.properties) {
			const currentItem = itemWithId as UnifiedItem | ManualItem | CatalogItem;
			itemWithId.properties = {
				...currentItem.properties,
				name: {
					en: `${currentItem.properties.name.en} #${i + 1}`,
					ja: `${currentItem.properties.name.ja} #${i + 1}`,
				},
			};
		}

		items.push(itemWithId);
	}

	return items;
}