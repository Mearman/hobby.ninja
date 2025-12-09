/**
 * Universal Collection Management Service
 * Handles user collections, items, and hobby-specific operations
 */

import { generateId } from "../db/storage";
import { logger } from "../lib/logger";
import {
	HobbyType,
	UniversalItem,
	Collection,
	CollectionImport,
	ItemStatus,
	BUILT_IN_HOBBY_TYPES,
	DEFAULT_HOBBY_TYPE,
} from "../types/hobby";

interface CollectionStorage {
  collections: Collection[];
  items: UniversalItem[];
  hobbyTypes: HobbyType[];
  settings: UserSettings;
}

interface UserSettings {
  defaultHobbyType: string;
  defaultCollection?: string;
  autoSave: boolean;
  theme: "light" | "dark" | "auto";
  language: string;
  exportFormat: string;
  privacy: {
    defaultCollectionPublic: boolean;
    shareUsageStats: boolean;
  };
}

export class CollectionService {
	private storageKey = "hobby_ninja_collections";
	private isInitialized = false;

	constructor() {
		this.initialize();
	}

	/**
   * Initialize the collection service
   */
	async initialize(): Promise<void> {
		if (this.isInitialized) return;

		try {
			await this.loadFromStorage();
			this.isInitialized = true;
			logger.info("Collection service initialized");
		} catch (error) {
			logger.error("Failed to initialize collection service:", error);
			throw error;
		}
	}

	/**
   * Get all available hobby types
   */
	async getHobbyTypes(): Promise<HobbyType[]> {
		const storage = await this.loadFromStorage();
		return [...storage.hobbyTypes];
	}

	/**
   * Get hobby type by ID
   */
	async getHobbyType(id: string): Promise<HobbyType | null> {
		const storage = await this.loadFromStorage();
		return storage.hobbyTypes.find(ht => ht.id === id) || null;
	}

	/**
   * Create custom hobby type
   */
	async createHobbyType(hobbyType: Omit<HobbyType, "id" | "createdAt" | "updatedAt">): Promise<HobbyType> {
		const storage = await this.loadFromStorage();

		const newHobbyType: HobbyType = {
			...hobbyType,
			id: generateId(),
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		storage.hobbyTypes.push(newHobbyType);
		await this.saveToStorage(storage);

		logger.info(`Created hobby type: ${newHobbyType.name}`);
		return newHobbyType;
	}

	/**
   * Update hobby type
   */
	async updateHobbyType(id: string, updates: Partial<HobbyType>): Promise<HobbyType> {
		const storage = await this.loadFromStorage();
		const index = storage.hobbyTypes.findIndex(ht => ht.id === id);

		if (index === -ONE) {
			throw new Error(`Hobby type not found: ${id}`);
		}

		storage.hobbyTypes[index] = {
			...storage.hobbyTypes[index],
			...updates,
			updatedAt: new Date().toISOString(),
		};

		await this.saveToStorage(storage);
		logger.info(`Updated hobby type: ${id}`);
		return storage.hobbyTypes[index];
	}

	/**
   * Get all collections for a user
   */
	async getCollections(hobbyType?: string): Promise<Collection[]> {
		const storage = await this.loadFromStorage();
		let collections = storage.collections;

		if (hobbyType) {
			collections = collections.filter(c => c.hobbyType === hobbyType);
		}

		return collections.sort((a, b) => {
			// Default collection first, then by updated date
			if (a.isDefault) return -ONE;
			if (b.isDefault) return ONE;
			return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
		});
	}

	/**
   * Get collection by ID
   */
	async getCollection(id: string): Promise<Collection | null> {
		const storage = await this.loadFromStorage();
		return storage.collections.find(c => c.id === id) || null;
	}

	/**
   * Create new collection
   */
	async createCollection(collection: Omit<Collection, "id" | "items" | "statistics" | "owner" | "createdAt" | "updatedAt">): Promise<Collection> {
		const storage = await this.loadFromStorage();

		const newCollection: Collection = {
			...collection,
			id: generateId(),
			items: [],
			statistics: {
				totalItems: ZERO,
				lastUpdated: new Date().toISOString(),
				breakdown: {},
			},
			owner: "current_user", // TODO: Implement user management
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		storage.collections.push(newCollection);
		await this.saveToStorage(storage);

		logger.info(`Created collection: ${newCollection.name}`);
		return newCollection;
	}

	/**
   * Update collection
   */
	async updateCollection(id: string, updates: Partial<Collection>): Promise<Collection> {
		const storage = await this.loadFromStorage();
		const index = storage.collections.findIndex(c => c.id === id);

		if (index === -ONE) {
			throw new Error(`Collection not found: ${id}`);
		}

		const updatedCollection = {
			...storage.collections[index],
			...updates,
			updatedAt: new Date().toISOString(),
		};

		// Update statistics if items changed
		if (updates.items !== undefined) {
			updatedCollection.statistics = this.calculateStatistics(updatedCollection);
		}

		storage.collections[index] = updatedCollection;
		await this.saveToStorage(storage);

		logger.info(`Updated collection: ${id}`);
		return updatedCollection;
	}

	/**
   * Delete collection
   */
	async deleteCollection(id: string): Promise<void> {
		const storage = await this.loadFromStorage();
		const index = storage.collections.findIndex(c => c.id === id);

		if (index === -ONE) {
			throw new Error(`Collection not found: ${id}`);
		}

		const collectionName = storage.collections[index].name;
		storage.collections.splice(index, ONE);
		await this.saveToStorage(storage);

		logger.info(`Deleted collection: ${collectionName}`);
	}

	/**
   * Get all items
   */
	async getItems(hobbyType?: string, collectionId?: string): Promise<UniversalItem[]> {
		const storage = await this.loadFromStorage();
		let items = storage.items;

		if (hobbyType) {
			items = items.filter(item => item.hobbyType === hobbyType);
		}

		if (collectionId) {
			items = items.filter(item => collectionId && storage.collections
				.find(c => c.id === collectionId)
				?.items.includes(item.id),
			);
		}

		return items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
	}

	/**
   * Get item by ID
   */
	async getItem(id: string): Promise<UniversalItem | null> {
		const storage = await this.loadFromStorage();
		return storage.items.find(item => item.id === id) || null;
	}

	/**
   * Create new item
   */
	async createItem(item: Omit<UniversalItem, "id" | "createdAt" | "updatedAt">, collectionId?: string): Promise<UniversalItem> {
		const storage = await this.loadFromStorage();

		const newItem: UniversalItem = {
			...item,
			id: generateId(),
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			images: item.images || [],
			tags: item.tags || [],
		};

		storage.items.push(newItem);

		// Add to collection if specified
		if (collectionId) {
			const collection = storage.collections.find(c => c.id === collectionId && c.hobbyType === item.hobbyType);
			if (collection) {
				collection.items.push(newItem.id);
				collection.statistics = this.calculateStatistics(collection);
			}
		}

		await this.saveToStorage(storage);
		logger.info(`Created item: ${newItem.data?.["name"] || newItem.id}`);
		return newItem;
	}

	/**
   * Update item
   */
	async updateItem(id: string, updates: Partial<UniversalItem>): Promise<UniversalItem> {
		const storage = await this.loadFromStorage();
		const index = storage.items.findIndex(item => item.id === id);

		if (index === -ONE) {
			throw new Error(`Item not found: ${id}`);
		}

		storage.items[index] = {
			...storage.items[index],
			...updates,
			updatedAt: new Date().toISOString(),
		};

		await this.saveToStorage(storage);
		logger.info(`Updated item: ${id}`);
		return storage.items[index];
	}

	/**
   * Delete item
   */
	async deleteItem(id: string): Promise<void> {
		const storage = await this.loadFromStorage();
		const index = storage.items.findIndex(item => item.id === id);

		if (index === -ONE) {
			throw new Error(`Item not found: ${id}`);
		}

		const item = storage.items[index];

		// Remove from all collections
		for (const collection of storage.collections) {
			const itemIndex = collection.items.indexOf(id);
			if (itemIndex !== -ONE) {
				collection.items.splice(itemIndex, ONE);
				collection.statistics = this.calculateStatistics(collection);
			}
		}

		storage.items.splice(index, ONE);
		await this.saveToStorage(storage);

		logger.info(`Deleted item: ${id}`);
	}

	/**
   * Add item to collection
   */
	async addItemToCollection(itemId: string, collectionId: string): Promise<void> {
		const storage = await this.loadFromStorage();
		const collection = storage.collections.find(c => c.id === collectionId);
		const item = storage.items.find(i => i.id === itemId);

		if (!collection) {
			throw new Error(`Collection not found: ${collectionId}`);
		}

		if (!item) {
			throw new Error(`Item not found: ${itemId}`);
		}

		if (!collection.items.includes(itemId)) {
			collection.items.push(itemId);
			collection.statistics = this.calculateStatistics(collection);
			await this.saveToStorage(storage);
			logger.info(`Added item ${itemId} to collection ${collectionId}`);
		}
	}

	/**
   * Remove item from collection
   */
	async removeItemFromCollection(itemId: string, collectionId: string): Promise<void> {
		const storage = await this.loadFromStorage();
		const collection = storage.collections.find(c => c.id === collectionId);

		if (!collection) {
			throw new Error(`Collection not found: ${collectionId}`);
		}

		const itemIndex = collection.items.indexOf(itemId);
		if (itemIndex !== -ONE) {
			collection.items.splice(itemIndex, ONE);
			collection.statistics = this.calculateStatistics(collection);
			await this.saveToStorage(storage);
			logger.info(`Removed item ${itemId} from collection ${collectionId}`);
		}
	}

	/**
   * Search items across all collections and hobby types
   */
	async searchItems(
		query: string,
		filters: {
      hobbyType?: string;
      collectionId?: string;
      status?: ItemStatus;
      tags?: string[];
      priceRange?: { min?: number; max?: number };
      ratingRange?: { min?: number; max?: number };
    } = {},
	): Promise<UniversalItem[]> {
		const storage = await this.loadFromStorage();
		let items = storage.items;

		// Apply filters
		if (filters.hobbyType) {
			items = items.filter(item => item.hobbyType === filters.hobbyType);
		}

		if (filters.collectionId) {
			const collection = storage.collections.find(c => c.id === filters.collectionId);
			if (collection) {
				items = items.filter(item => collection.items.includes(item.id));
			}
		}

		if (filters.status) {
			items = items.filter(item => item.status === filters.status);
		}

		if (filters.tags && filters.tags.length > ZERO) {
			items = items.filter(item =>
				filters.tags?.some(tag => item.tags.includes(tag)),
			);
		}

		// Text search
		if (query) {
			const queryLower = query.toLowerCase();
			items = items.filter(item => {
				const hobbyType = storage.hobbyTypes.find(ht => ht.id === item.hobbyType);

				// Search in item data fields
				const dataString = JSON.stringify(item.data).toLowerCase();
				const nameMatch = item.data["name"]?.toString().toLowerCase().includes(queryLower);
				const tagsMatch = item.tags.some(tag => tag.toLowerCase().includes(queryLower));

				return dataString.includes(queryLower) || nameMatch || tagsMatch;
			});
		}

		return items;
	}

	/**
   * Import items from various formats
   */
	async importItems(importData: CollectionImport): Promise<{
    success: number;
    failed: number;
    errors: string[];
  }> {
		const results = {
			success: ZERO,
			failed: ZERO,
			errors: [] as string[],
		};

		try {
			const hobbyType = importData.hobbyType;
			const fieldMapping = importData.mapping;

			for (const rowData of importData.data) {
				try {
					const itemData: Record<string, unknown> = {};

					// Apply field mapping
					for (const mapping of fieldMapping) {
						const sourceValue = rowData[mapping.sourceField];
						if (sourceValue !== undefined && sourceValue !== null) {
							let value = sourceValue;

							// Apply transformation if specified
							if (mapping.transform) {
								// Simple transformations for now
								switch (mapping.transform) {
									case "trim": {
										value = String(value).trim();
										break;
									}
									case "lower": {
										value = String(value).toLowerCase();
										break;
									}
									case "upper": {
										value = String(value).toUpperCase();
										break;
									}
									case "number": {
										value = Number(value) || ZERO;
										break;
									}
									case "date": {
										value = new Date(value).toISOString();
										break;
									}
								}
							}

							itemData[mapping.targetField] = value;
						}
					}

					// Create item
					await this.createItem({
						hobbyType,
						data: itemData,
						images: [], // Default empty images array
						tags: [], // Default empty tags array
						status: "wanted", // Default status for imported items
						metadata: {
							source: "import",
							sourceId: importData.format,
						},
					});

					results.success++;
				} catch (error) {
					results.failed++;
					const errorMessage = error instanceof Error ? error.message : String(error);
					results.errors.push(`Row ${results.success + results.failed}: ${errorMessage}`);
				}
			}

			logger.info(`Import completed: ${results.success} items imported, ${results.failed} failed`);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			logger.error("Import failed:", errorMessage);
			results.failed = importData.data.length;
			results.errors = [errorMessage];

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

		}

		return results;
	}

	/**
   * Export collection to specified format
   */
	async exportCollection(collectionId: string, format = "json"): Promise<Blob> {
		const collection = await this.getCollection(collectionId);
		if (!collection) {
			throw new Error(`Collection not found: ${collectionId}`);
		}

		const items = await Promise.all(
			collection.items.map(id => this.getItem(id)),
		);
		const validItems = items.filter((item): item is UniversalItem => item !== null);

		const exportData = {
			collection: {
				name: collection.name,
				description: collection.description,
				tags: collection.tags,
				hobbyType: collection.hobbyType,
			},
			items: validItems,
			exportedAt: new Date().toISOString(),
			format,
		};

		let mimeType: string;
		let content: string;

		switch (format) {
			case "csv": {
				mimeType = "text/csv";
				content = this.convertToCSV(validItems, collection.hobbyType);
				break;
			}
			case "excel": {
				mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
				content = JSON.stringify(TWO, $TWO, JSON_INDENTATION);
			}
		}

		return new Blob([content], { type: mimeType });
	}

	/**
   * Get user settings
   */
	async getSettings(): Promise<UserSettings> {
		const storage = await this.loadFromStorage();
		return storage.settings;
	}

	/**
   * Update user settings
   */
	async updateSettings(updates: Partial<UserSettings>): Promise<UserSettings> {
		const storage = await this.loadFromStorage();
		storage.settings = { ...storage.settings, ...updates };
		await this.saveToStorage(storage);
		return storage.settings;
	}

	// Private helper methods

	private async loadFromStorage(): Promise<CollectionStorage> {
		try {
			const stored = localStorage.getItem(this.storageKey);
			if (!stored) {
				return this.getDefaultStorage();
			}

			const storage = JSON.parse(stored);

			// Ensure built-in hobby types are present
			if (storage.hobbyTypes.length === ZERO) {
				storage.hobbyTypes = [...BUILT_IN_HOBBY_TYPES];
			}

			return storage;
		} catch (error) {
			logger.error("Failed to load from storage:", error);
			return this.getDefaultStorage();
		}
	}

	private async saveToStorage(storage: CollectionStorage): Promise<void> {
		try {
			localStorage.setItem(this.storageKey, JSON.stringify(storage));
		} catch (error) {
			logger.error("Failed to save to storage:", error);
			throw error;
		}
	}

	private getDefaultStorage(): CollectionStorage {
		return {
			collections: [],
			items: [],
			hobbyTypes: [...BUILT_IN_HOBBY_TYPES],
			settings: {
				defaultHobbyType: DEFAULT_HOBBY_TYPE,
				autoSave: true,
				theme: "auto",
				language: "en",
				exportFormat: "json",
				privacy: {
					defaultCollectionPublic: false,
					shareUsageStats: false,
				},
			},
		};
	}

	private calculateStatistics(collection: Collection): Collection["statistics"] {
		const statusBreakdown: Record<string, number> = {};

		for (const itemId of collection.items) {
			// In a real implementation, we'd fetch the item status
			// For now, use placeholder data
			statusBreakdown["owned"] = (statusBreakdown["owned"] || ZERO) + ONE;
		}

		return {
			totalItems: collection.items.length,
			lastUpdated: new Date().toISOString(),
			breakdown: statusBreakdown,
		};
	}

	private convertToCSV(items: UniversalItem[], hobbyType: string): string {
		if (items.length === ZERO) return "";

		const hobbyTypeConfig = BUILT_IN_HOBBY_TYPES.find(ht => ht.id === hobbyType);
		const headers = hobbyTypeConfig?.fields.map(f => f.name) || ["Name"];

		const csvRows = [headers.join(",")];

		for (const item of items) {
			const values = headers.map(header => {
				// Find corresponding field value
				const field = hobbyTypeConfig?.fields.find(f => f.name === header);
				if (field && item.data[field.key] !== undefined) {
					const value = item.data[field.key];
					const stringValue = String(value);
					return stringValue.includes(",") ? `"${stringValue.replaceAll('"', '""')}"` : stringValue;
				}
				return "";
			});
			csvRows.push(values.join(","));
		}

		return csvRows.join("\n");
	}
}

export const collectionService = new CollectionService();