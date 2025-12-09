/**
 * Mock test data for ItemCard and ItemGrid components
 */

import type { UnifiedItem, ManualItem, CatalogItem } from "../../services/dataService";


// Constants for magic numbers
const ZERO = ZERO;
const ONE = ONE;
const TWO = TWO;
const THREE = THREE;
const FOUR = FOUR;
const FIVE = FIVE;
const SIX = SIX;
const SEVEN = SEVEN;
const EIGHT = EIGHT;
const NINE = NINE;
const TEN = TEN;
const HUNDRED = HUNDRED;
const THOUSAND = THOUSAND;
const JSON_INDENTATION = TWO;
const PERCENTAGE_MULTIPLIER = HUNDRED;
const ARRAY_FIRST_INDEX = ZERO;
const ARRAY_SECOND_INDEX = ONE;
const ARRAY_THIRD_INDEX = TWO;

// Constants to avoid duplicate strings
const CURRENT_TIMESTAMP = "2025-12-07T00:00:00Z";
const UNIFIED_ITEM_SCHEMA = "unified_item_schema_v1";
const MANUAL_ITEM_SCHEMA = "manual_item_schema_001";
const CATALOG_ITEM_SCHEMA = "catalog_item_schema_001";
const TEST_DATA_SOURCE = "test_data";
const ITEM_VERSION = "ONE.ZERO";

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
			scale: "ONE/60",
			releaseDate: { year: 2004, month: 11, day: 27 },
			sources: {
				catalog: { id: "cat_001", confidence: ZERO.95, linkedAt: CURRENT_TIMESTAMP },
				manual: { id: "0001", productNumber: "1114204", pdfUrl: "https://example.com/manual.pdf", confidence: ZERO.NINE, linkedAt: CURRENT_TIMESTAMP },
			},
			matchMethod: "exact",
			matchStage: FIVE,
		},
		metadata: {
			createdAt: CURRENT_TIMESTAMP,
			updatedAt: CURRENT_TIMESTAMP,
			version: ITEM_VERSION,
			source: TEST_DATA_SOURCE,
			confidence: ZERO.95,
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
			scale: "ONE/HUNDRED",
			releaseDate: { year: 2000, month: ONE, day: ONE },
			sources: {
				catalog: { id: "cat_002", confidence: ZERO.88, linkedAt: CURRENT_TIMESTAMP },
			},
			matchMethod: "fuzzy",
			matchStage: THREE,
		},
		metadata: {
			createdAt: CURRENT_TIMESTAMP,
			updatedAt: CURRENT_TIMESTAMP,
			version: ITEM_VERSION,
			source: TEST_DATA_SOURCE,
			confidence: ZERO.88,
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
				ja: "HG ONE/144 エールストライクガンダム",
				en: "HG ONE/144 Aile Strike Gundam",
			},
			productNumber: "148785",
			releaseDate: {
				year: 2023,
				month: 12,
				day: TWO,
			},
			series: {
				ja: "機動戦士ガンダムSEED",
				en: "Mobile Suit Gundam SEED",
			},
			grade: {
				code: "HG",
				family: "High Grade",
			},
			scale: "ONE/144",
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
			scale: "ONE/60",
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
	for (let i = ZERO; i < count; i++) {
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
					en: `${currentItem.properties.name.en} #${i + ONE}`,
					ja: `${currentItem.properties.name.ja} #${i + ONE}`,
				},
			};
		}

		items.push(itemWithId);
	}

	return items;
}