import pako from "pako";

import type { CollectionItem } from "./collection-storage";
import { getAllItems } from "./graph-data";
import { getNodeDisplayName, isItemNode } from "./schemas";

// Export collection data
export interface ExportData {
  version: string;
  exportDate: string;
  collection: {
    id: string;
    name: string;
    description?: string;
    createdAt: string;
    lastModified: string;
  };
  items: CollectionItem[];
  metadata: {
    totalItems: number;
    databaseVersion: string;
    exportFormat: "json";
  };
}

export const exportCollection = async (collectionId: string, includeHidden = false): Promise<string> => {
	try {
		// Get collection items (this would use the actual collection storage)
		// For now, we'll simulate with a placeholder implementation
		const items: CollectionItem[] = [];

		const exportData: ExportData = {
			version: "1.0",
			exportDate: new Date().toISOString(),
			collection: {
				id: collectionId,
				name: `Collection ${collectionId}`,
				description: "Exported collection",
				createdAt: new Date().toISOString(),
				lastModified: new Date().toISOString(),
			},
			items: items, // CollectionItem doesn't have hidden property
			metadata: {
				totalItems: items.length,
				databaseVersion: "1.0",
				exportFormat: "json",
			},
		};

		// Compress the data
		const jsonString = JSON.stringify(exportData, null, 2);
		const compressed = pako.deflate(jsonString);
		const base64 = btoa(String.fromCharCode(...compressed));

		return base64;
	} catch (error) {
		console.error("Failed to export collection:", error);
		throw new Error("Failed to export collection");
	}
};

// Import collection data
export const importCollection = async (
	base64Data: string,
	collectionId: string,
	collectionName?: string,
): Promise<{
  items: CollectionItem[];
  stats: {
    total: number;
    valid: number;
    invalid: number;
    duplicates: number;
  };
}> => {
	try {
		// Decompress and parse the data
		const compressed = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
		const decompressed = pako.inflate(compressed);
		const jsonString = new TextDecoder().decode(decompressed);
		const exportData: ExportData = JSON.parse(jsonString);

		// Validate the import data
		if (!exportData.items || !Array.isArray(exportData.items)) {
			throw new Error("Invalid export data format");
		}

		// Process items
		const processedItems: CollectionItem[] = [];
		let validCount = 0;
		let invalidCount = 0;
		let duplicateCount = 0;
		const seenIds = new Set<string>();

		for (const item of exportData.items) {
			// Basic validation
			if (!item.id || !item.itemId) {
				invalidCount++;
				continue;
			}

			// Check for duplicates
			if (seenIds.has(item.id)) {
				duplicateCount++;
				continue;
			}
			seenIds.add(item.id);

			// Validate itemId exists in our database
			try {
				const allItems = await getAllItems();
				const existsInDatabase = allItems.some(dbItem =>
					isItemNode(dbItem) && dbItem.id === item.itemId,
				);

				if (!existsInDatabase) {
					invalidCount++;
					continue;
				}

				processedItems.push({
					...item,
					id: item.id || `item-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`,
					collectionId: collectionId,
					category: item.category ?? "default",
					added: item.added ?? new Date(),
					modified: new Date(),
				});
				validCount++;
			} catch (error) {
				console.warn("Failed to validate item:", item, error);
				invalidCount++;
			}
		}

		return {
			items: processedItems,
			stats: {
				total: exportData.items.length,
				valid: validCount,
				invalid: invalidCount,
				duplicates: duplicateCount,
			},
		};
	} catch (error) {
		console.error("Failed to import collection:", error);
		throw new Error("Failed to import collection: " + (error as Error).message);
	}
};

// Generate shareable URL for collection
export const generateCollectionShareUrl = async (collectionId: string, includeHidden = false): Promise<string> => {
	try {
		const base64Data = await exportCollection(collectionId, includeHidden);
		const compressed = pako.deflate(base64Data);
		const urlSafeBase64 = btoa(String.fromCharCode(...compressed))
			.replace(/\+/g, "-")
			.replace(/\//g, "_")
			.replace(/=/g, "");

		// Generate URL with share parameter
		const url = `${globalThis.window === undefined ? "" : globalThis.location.origin}/collection/${collectionId}?share=${urlSafeBase64}`;
		return url;
	} catch (error) {
		console.error("Failed to generate share URL:", error);
		return "";
	}
};

// Parse shared collection from URL
export const parseSharedCollection = async (
	shareData: string,
	collectionId: string
): Promise<{
  items: CollectionItem[];
  stats: {
    total: number;
    valid: number;
    invalid: number;
    duplicates: number;
  };
  collectionName?: string;
}> => {
	try {
		const urlSafeBase64 = shareData
			.replace(/-/g, "+")
			.replace(/_/g, "/")
			.replace(/=/g, "+");

		const compressed = Uint8Array.from(atob(urlSafeBase64), c => c.charCodeAt(0));
		const decompressed = pako.inflate(compressed);
		const base64Data = new TextDecoder().decode(decompressed);

		return await importCollection(base64Data, collectionId);
	} catch (error) {
		console.error("Failed to parse shared collection:", error);
		throw new Error("Failed to parse shared collection");
	}
};

// Export collection as CSV
export const exportCollectionCSV = async (collectionId: string, includeHidden = false): Promise<string> => {
	try {
		const base64Data = await exportCollection(collectionId, includeHidden);
		const compressed = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
		const decompressed = pako.inflate(compressed);
		const jsonString = new TextDecoder().decode(decompressed);
		const exportData: ExportData = JSON.parse(jsonString);

		const headers = [
			"ID",
			"Database ID",
			"Name",
			"Status",
			"Condition",
			"Rating",
			"Tags",
			"Notes",
			"Date Added",
			"Last Modified",
		];

		const csvRows: string[] = [headers.join(",")];

		for (const item of exportData.items) {
			// Get database item for name
			const allItems = await getAllItems();
			const dbItem = allItems.find(dbItem =>
				isItemNode(dbItem) && dbItem.id === item.itemId,
			);

			const row = [
				`"${item.id ?? ""}"`,
				`"${item.itemId}"`,
				`"${(dbItem ? getNodeDisplayName(dbItem) : "Unknown Item")}"`,
				`"${item.status ?? ""}"`,
				`"${item.condition ?? ""}"`,
				`"${item.rating ?? 0}"`,
				`"${(item.tags ?? []).join("; ")}"`,
				`"${(item.notes ?? "").replace(/"/g, '""')}"`,
				`"${new Date(item.added).toLocaleString()}"`,
				`"${new Date(item.modified).toLocaleString()}"`,
			];

			csvRows.push(row.join(","));
		}

		return csvRows.join("\n");
	} catch (error) {
		console.error("Failed to export CSV:", error);
		throw new Error("Failed to export collection as CSV");
	}
};

// Import items from database
export const importFromDatabase = async (
	itemIds: string[],
	defaultStatus = "wanted",
): Promise<CollectionItem[]> => {
	try {
		const allItems = await getAllItems();
		const items: CollectionItem[] = [];

		for (const itemId of itemIds) {
			const dbItem = allItems.find(item => isItemNode(item) && item.id === itemId);

			if (dbItem) {
				items.push({
					id: `item-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`,
					collectionId: "default",
					itemId: dbItem.id,
					category: dbItem.category ?? "default",
					status: defaultStatus as CollectionItem["status"],
					condition: "new",
					photos: [],
					notes: "",
					rating: 0,
					tags: [],
					added: new Date(),
					modified: new Date(),
				});
			}
		}

		return items;
	} catch (error) {
		console.error("Failed to import from database:", error);
		throw new Error("Failed to import items from database");
	}
};

// Generate collection statistics
export const generateCollectionStats = (items: CollectionItem[]) => {
	const statusBreakdown = {
		owned: items.filter(item => item.status === "owned").length,
		wanted: items.filter(item => item.status === "wanted").length,
		ordered: items.filter(item => item.status === "ordered").length,
		"pre-ordered": items.filter(item => item.status === "pre-ordered").length,
		building: items.filter(item => item.status === "building").length,
		completed: items.filter(item => item.status === "completed").length,
	};

	const conditionBreakdown = {
		new: items.filter(item => item.condition === "new").length,
		used: items.filter(item => item.condition === "used").length,
		damaged: items.filter(item => item.condition === "damaged").length,
		"box-damaged": items.filter(item => item.condition === "box-damaged").length,
	};

	const totalValue = items.reduce((sum, item) => sum + (item.purchaseInfo?.price ?? 0), 0);
	const avgRating = items.length > 0
		? items.reduce((sum, item) => sum + (item.rating ?? 0), 0) / items.length
		: 0;

	const completionPercentage = statusBreakdown.completed > 0
		? (statusBreakdown.completed / items.length) * 100
		: 0;

	return {
		totalItems: items.length,
		totalValue,
		statusBreakdown,
		conditionBreakdown,
		avgRating: Number(avgRating.toFixed(1)),
		completionPercentage: Number(completionPercentage.toFixed(1)),
		itemCount: items.length,
		completedCount: statusBreakdown.completed,
		wantedCount: statusBreakdown.wanted,
		inProgressCount: items.filter(item =>
			["ordered", "pre-ordered", "building"].includes(item.status),
		).length,
	};
};