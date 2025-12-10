/**
 * Universal Collection Management Service
 * Handles user collections, items, and hobby-specific operations
 */

import { generateId } from "../db/storage";
import { logger } from "../lib/logger";

// Define types inline to avoid import restriction issues
interface HobbyType {
	id: string;
	name: string;
	icon: string;
	description: string;
	category: string;
	color: string;
	fields: HobbyField[];
	settings: HobbySettings;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
}

interface HobbyField {
	id: string;
	name: string;
	key: string;
	type: "text" | "number" | "select" | "multiselect" | "date" | "url" | "image" | "boolean" | "rating" | "currency";
	required: boolean;
	searchable: boolean;
	filterable: boolean;
	displayInList: boolean;
	displayInDetail: boolean;
	validation?: FieldValidation;
	options?: FieldOption[];
	defaultValue?: string | number | boolean | string[] | null;
	order: number;
}

interface FieldValidation {
	min?: number;
	max?: number;
	pattern?: string;
	minLength?: number;
	maxLength?: number;
	format?: "email" | "url" | "date" | "currency";
}

interface FieldOption {
	label: string;
	value: string;
	color?: string;
	icon?: string;
}

interface HobbySettings {
	allowCustomItems: boolean;
	allowImages: boolean;
	allowNotes: boolean;
	allowTags: boolean;
	allowRating: boolean;
	allowStatus: boolean;
	allowQuantity: boolean;
	allowPurchaseInfo: boolean;
	maxImages?: number;
	supportedExportFormats: string[];
	defaultSortField?: string;
	defaultViewMode?: "grid" | "list" | "table";
}

interface UniversalItem {
	id: string;
	hobbyType: string;
	data: Record<string, unknown>;
	images: ItemImage[];
	tags: string[];
	status: ItemStatus;
	rating?: number;
	quantity?: number;
	notes?: string;
	purchaseInfo?: PurchaseInfo;
	metadata: ItemMetadata;
	createdAt: string;
	updatedAt: string;
}

interface ItemImage {
	id: string;
	url: string;
	thumbnail?: string;
	caption?: string;
	isPrimary?: boolean;
	order: number;
}

type ItemStatus =
	| "wanted"
	| "ordered"
	| "owned"
	| "building"
	| "completed"
	| "for_sale"
	| "traded"
	| "lost"
	| "archived";

interface PurchaseInfo {
	date?: string;
	price?: number;
	currency?: string;
	seller?: string;
	store?: string;
	link?: string;
	condition?: "new" | "used" | "refurbished";
	receiptUrl?: string;
}

interface ItemMetadata {
	source?: "manual" | "scan" | "user_input" | "import" | "reference_database";
	sourceId?: string;
	sourceUrl?: string;
	confidence?: number;
	lastSync?: string;
	version?: string;
}

interface Collection {
	id: string;
	hobbyType: string;
	name: string;
	description?: string;
	isPublic: boolean;
	isDefault: boolean;
	tags: string[];
	items: string[];
	filters?: Record<string, unknown>;
	settings: CollectionSettings;
	statistics: CollectionStatistics;
	owner: string;
	createdAt: string;
	updatedAt: string;
}

interface CollectionSettings {
	allowPublicView: boolean;
	allowComments: boolean;
	allowRating: boolean;
	allowSharing: boolean;
	requireApproval: boolean;
	autoSync: boolean;
}

interface CollectionStatistics {
	totalItems: number;
	totalValue?: number;
	completionRate?: number;
	averageRating?: number;
	lastUpdated: string;
	breakdown: Record<string, number>;
}

interface CollectionImport {
	format: "csv" | "json" | "excel" | "airtable" | "google_sheets";
	hobbyType: string;
	mapping: FieldMapping[];
	data: unknown[];
	options: ImportOptions;
}

interface FieldMapping {
	sourceField: string;
	targetField: string;
	transform?: string;
	required: boolean;
}

interface ImportOptions {
	skipInvalidRows: boolean;
	updateExisting: boolean;
	generateIds: boolean;
	batchSize?: number;
}

// Constants - using simplified versions for now
const BUILT_IN_HOBBY_TYPES: HobbyType[] = [];
const DEFAULT_HOBBY_TYPE = "model_kits";

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
	initialize(): void {
		if (this.isInitialized) return;

		try {
			this.loadFromStorage();
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
	getHobbyTypes(): HobbyType[] {
		const storage = this.loadFromStorage();
		return [...storage.hobbyTypes];
	}

	/**
   * Get hobby type by ID
   */
	getHobbyType(id: string): HobbyType | null {
		const storage = this.loadFromStorage();
		return storage.hobbyTypes.find(ht => ht.id === id) ?? null;
	}

	/**
   * Create custom hobby type
   */
	createHobbyType(hobbyType: Omit<HobbyType, "id" | "createdAt" | "updatedAt">): HobbyType {
		const storage = this.loadFromStorage();

		const newHobbyType: HobbyType = {
			...hobbyType,
			id: generateId(),
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		storage.hobbyTypes.push(newHobbyType);
		this.saveToStorage(storage);

		logger.info(`Created hobby type: ${newHobbyType.name}`);
		return newHobbyType;
	}

	/**
   * Update hobby type
   */
	updateHobbyType(id: string, updates: Partial<HobbyType>): HobbyType {
		const storage = this.loadFromStorage();
		const index = storage.hobbyTypes.findIndex(ht => ht.id === id);

		if (index === -1) {
			throw new Error(`Hobby type not found: ${id}`);
		}

		storage.hobbyTypes[index] = {
			...storage.hobbyTypes[index],
			...updates,
			updatedAt: new Date().toISOString(),
		};

		this.saveToStorage(storage);
		logger.info(`Updated hobby type: ${id}`);
		return storage.hobbyTypes[index];
	}

	/**
   * Get all collections for a user
   */
	getCollections(hobbyType?: string): Collection[] {
		const storage = this.loadFromStorage();
		let collections = storage.collections;

		if (hobbyType) {
			collections = collections.filter(c => c.hobbyType === hobbyType);
		}

		return collections.toSorted((a, b) => {
			// Default collection first, then by updated date
			if (a.isDefault) return -1;
			if (b.isDefault) return 1;
			return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
		});
	}

	/**
   * Get collection by ID
   */
	getCollection(id: string): Collection | null {
		const storage = this.loadFromStorage();
		return storage.collections.find(c => c.id === id) ?? null;
	}

	/**
   * Create new collection
   */
	createCollection(collection: Omit<Collection, "id" | "items" | "statistics" | "owner" | "createdAt" | "updatedAt">): Collection {
		const storage = this.loadFromStorage();

		const newCollection: Collection = {
			...collection,
			id: generateId(),
			items: [],
			statistics: {
				totalItems: 0,
				lastUpdated: new Date().toISOString(),
				breakdown: {},
			},
			owner: "current_user", // TODO: Implement user management
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		storage.collections.push(newCollection);
		this.saveToStorage(storage);

		logger.info(`Created collection: ${newCollection.name}`);
		return newCollection;
	}

	/**
   * Update collection
   */
	updateCollection(id: string, updates: Partial<Collection>): Collection {
		const storage = this.loadFromStorage();
		const index = storage.collections.findIndex(c => c.id === id);

		if (index === -1) {
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
		this.saveToStorage(storage);

		logger.info(`Updated collection: ${id}`);
		return updatedCollection;
	}

	/**
   * Delete collection
   */
	deleteCollection(id: string): void {
		const storage = this.loadFromStorage();
		const index = storage.collections.findIndex(c => c.id === id);

		if (index === -1) {
			throw new Error(`Collection not found: ${id}`);
		}

		const collectionName = storage.collections[index].name;
		storage.collections.splice(index, 1);
		this.saveToStorage(storage);

		logger.info(`Deleted collection: ${collectionName}`);
	}

	/**
   * Get all items
   */
	getItems(hobbyType?: string, collectionId?: string): UniversalItem[] {
		const storage = this.loadFromStorage();
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

		return items.toSorted((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
	}

	/**
   * Get item by ID
   */
	getItem(id: string): UniversalItem | null {
		const storage = this.loadFromStorage();
		return storage.items.find(item => item.id === id) ?? null;
	}

	/**
   * Create new item
   */
	createItem(item: Omit<UniversalItem, "id" | "createdAt" | "updatedAt">, collectionId?: string): UniversalItem {
		const storage = this.loadFromStorage();

		const newItem: UniversalItem = {
			...item,
			id: generateId(),
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			images: item.images,
			tags: item.tags,
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

		this.saveToStorage(storage);
		const itemName = newItem.data["name"] as string | undefined;
		logger.info(`Created item: ${itemName ?? newItem.id}`);
		return newItem;
	}

	/**
   * Update item
   */
	updateItem(id: string, updates: Partial<UniversalItem>): UniversalItem {
		const storage = this.loadFromStorage();
		const index = storage.items.findIndex(item => item.id === id);

		if (index === -1) {
			throw new Error(`Item not found: ${id}`);
		}

		storage.items[index] = {
			...storage.items[index],
			...updates,
			updatedAt: new Date().toISOString(),
		};

		this.saveToStorage(storage);
		logger.info(`Updated item: ${id}`);
		return storage.items[index];
	}

	/**
   * Delete item
   */
	deleteItem(id: string): void {
		const storage = this.loadFromStorage();
		const index = storage.items.findIndex(item => item.id === id);

		if (index === -1) {
			throw new Error(`Item not found: ${id}`);
		}

		// Remove from all collections
		for (const collection of storage.collections) {
			const itemIndex = collection.items.indexOf(id);
			if (itemIndex !== -1) {
				collection.items.splice(itemIndex, 1);
				collection.statistics = this.calculateStatistics(collection);
			}
		}

		storage.items.splice(index, 1);
		this.saveToStorage(storage);

		logger.info(`Deleted item: ${id}`);
	}

	/**
   * Add item to collection
   */
	addItemToCollection(itemId: string, collectionId: string): void {
		const storage = this.loadFromStorage();
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
			this.saveToStorage(storage);
			logger.info(`Added item ${itemId} to collection ${collectionId}`);
		}
	}

	/**
   * Remove item from collection
   */
	removeItemFromCollection(itemId: string, collectionId: string): void {
		const storage = this.loadFromStorage();
		const collection = storage.collections.find(c => c.id === collectionId);

		if (!collection) {
			throw new Error(`Collection not found: ${collectionId}`);
		}

		const itemIndex = collection.items.indexOf(itemId);
		if (itemIndex !== -1) {
			collection.items.splice(itemIndex, 1);
			collection.statistics = this.calculateStatistics(collection);
			this.saveToStorage(storage);
			logger.info(`Removed item ${itemId} from collection ${collectionId}`);
		}
	}

	/**
   * Search items across all collections and hobby types
   */
	searchItems(
		query: string,
		filters: {
      hobbyType?: string;
      collectionId?: string;
      status?: ItemStatus;
      tags?: string[];
      priceRange?: { min?: number; max?: number };
      ratingRange?: { min?: number; max?: number };
    } = {},
	): UniversalItem[] {
		const storage = this.loadFromStorage();
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

		if (filters.tags && filters.tags.length > 0) {
			items = items.filter(item =>
				filters.tags?.some(tag => item.tags.includes(tag)),
			);
		}

		// Text search
		if (query) {
			const queryLower = query.toLowerCase();
			items = items.filter(item => {
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
			success: 0,
			failed: 0,
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
						const sourceValue: unknown = rowData[mapping.sourceField];
						if (sourceValue !== undefined && sourceValue !== null) {
							let value: unknown = sourceValue;

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
										value = Number(value) || 0;
										break;
									}
									case "date": {
										value = new Date(value as string | number | Date).toISOString();
										break;
									}
								}
							}

							itemData[mapping.targetField] = value;
						}
					}

					// Create item
					this.createItem({
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
					const errorMessage = error instanceof Error ? error.message : "Unknown error";
					results.errors.push(`Row ${results.success + results.failed}: ${errorMessage}`);
				}
			}

			logger.info(`Import completed: ${results.success} items imported, ${results.failed} failed`);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			logger.error("Import failed:", errorMessage);
			results.failed = importData.data.length;
			results.errors = [errorMessage];

			
		}

		return results;
	}

	/**
   * Export collection to specified format
   */
	async exportCollection(collectionId: string, format = "json"): Promise<Blob> {
		const collection = this.getCollection(collectionId);
		if (!collection) {
			throw new Error(`Collection not found: ${collectionId}`);
		}

		const items = collection.items.map(id => this.getItem(id));
		const validItems = items.filter((item): item is UniversalItem => item !== null);

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
				content = JSON.stringify(validItems, null, 2);
				break;
			}
			default: {
				mimeType = "application/json";
				content = JSON.stringify(validItems, null, 2);
				break;
			}
		}

		return new Blob([content], { type: mimeType });
	}

	/**
   * Get user settings
   */
	getSettings(): UserSettings {
		const storage = this.loadFromStorage();
		return storage.settings;
	}

	/**
   * Update user settings
   */
	updateSettings(updates: Partial<UserSettings>): UserSettings {
		const storage = this.loadFromStorage();
		storage.settings = { ...storage.settings, ...updates };
		this.saveToStorage(storage);
		return storage.settings;
	}

	// Private helper methods

	private loadFromStorage(): CollectionStorage {
		try {
			const stored = localStorage.getItem(this.storageKey);
			if (!stored) {
				return this.getDefaultStorage();
			}

			const storage: CollectionStorage = JSON.parse(stored) as CollectionStorage;

			// Ensure built-in hobby types are present
			if (storage.hobbyTypes.length === 0) {
				storage.hobbyTypes = [...BUILT_IN_HOBBY_TYPES];
			}

			return storage;
		} catch (error) {
			logger.error("Failed to load from storage:", error);
			return this.getDefaultStorage();
		}
	}

	private saveToStorage(storage: CollectionStorage): void {
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

		for (const _ of collection.items) {
			// In a real implementation, we'd fetch the item status
			// For now, use placeholder data
			statusBreakdown["owned"] = (statusBreakdown["owned"] ?? 0) + 1;
		}

		return {
			totalItems: collection.items.length,
			lastUpdated: new Date().toISOString(),
			breakdown: statusBreakdown,
		};
	}

	private convertToCSV(items: UniversalItem[], hobbyType: string): string {
		if (items.length === 0) return "";

		const hobbyTypeConfig = BUILT_IN_HOBBY_TYPES.find(ht => ht.id === hobbyType);
		const headers = hobbyTypeConfig?.fields.map(f => f.name) ?? ["Name"];

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