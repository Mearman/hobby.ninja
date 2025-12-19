import Dexie, { type EntityTable } from "dexie";

import { PAGINATION } from "./constants";

export interface CollectionItem {
  id: string;
  collectionId: string;
  itemId: string;
  categories: string[];
  status: "owned" | "wanted" | "ordered" | "pre-ordered" | "building" | "completed";
  condition: "new" | "used" | "damaged" | "box-damaged";
  purchaseInfo?: {
    price: number;
    currency: "JPY" | "USD" | "EUR";
    date: Date;
    store: string;
    url?: string;
  };
  photos: string[];
  notes: string;
  rating?: number;
  tags: string[];
  added: Date;
  modified: Date;
  hidden?: boolean;
  dateAdded?: string;
  lastModified?: string;
  price?: number;
  location?: string;
  metadata?: Record<string, unknown>;
}

export interface Collection {
  id: string;
  name: string;
  category: string;
  description: string;
  isPublic: boolean;
  itemCount: number;
  totalValue: number;
  currency: "JPY" | "USD" | "EUR";
  createdAt: Date;
  modifiedAt: Date;
  settings: {
    defaultStatus: CollectionItem["status"];
    defaultCondition: CollectionItem["condition"];
    autoBackup: boolean;
  };
}

export interface UserPreferences {
  id: string;
  theme: "light" | "dark" | "auto";
  language: "en" | "ja";
  defaultCurrency: "JPY" | "USD" | "EUR";
  gridView: "grid" | "list";
  itemsPerPage: number;
  showAdvancedFilters: boolean;
  autoSaveSearch: boolean;
}

export interface CollectionStats {
  totalItems: number;
  totalValue: number;
  statusBreakdown: Record<CollectionItem["status"], number>;
  conditionBreakdown: Record<CollectionItem["condition"], number>;
  completionPercentage: number;
}

export interface CollectionListResponse {
  collections: Collection[];
  total: number;
  page: number;
  pageSize: number;
}

export class CollectionDatabase extends Dexie {
	collections!: EntityTable<Collection, "id">;
	collectionItems!: EntityTable<CollectionItem, "id">;
	userPreferences!: EntityTable<UserPreferences, "id">;

	constructor() {
		super("hobby-ninja-collection-db");

		this.version(1).stores({
			collections: "id, category, name, isPublic, createdAt, modifiedAt",
			collectionItems: "id, collectionId, itemId, category, status, added, modified",
			userPreferences: "++id, theme, language, defaultCurrency",
		});
	}

	// Simple wrapper functions to avoid Dexie complexity for now
	getAllCollections(): Promise<Collection[]> {
		// Temporary implementation - can be enhanced later
		return Promise.resolve([]);
	}

	getItemsByCollection(_collectionId: string): Promise<CollectionItem[]> {
		// Temporary implementation - can be enhanced later
		return Promise.resolve([]);
	}

	createCollection(_collection: Omit<Collection, "id">): Promise<string> {
		// Temporary implementation - can be enhanced later
		return Promise.resolve(`collection-id-${Date.now()}`);
	}

	addItemToCollection(_item: Omit<CollectionItem, "id">): Promise<string> {
		// Temporary implementation - can be enhanced later
		return Promise.resolve(`item-id-${Date.now()}`);
	}

	getPreferences(): Promise<UserPreferences> {
		// Return default preferences
		return Promise.resolve({
			id: "default-user-preferences",
			theme: "auto",
			language: "en",
			defaultCurrency: "JPY",
			gridView: "grid",
			itemsPerPage: PAGINATION.ITEMS_PER_PAGE,
			showAdvancedFilters: false,
			autoSaveSearch: true,
		});
	}

	// Placeholder for other methods - will be implemented as needed
	getCollection(_id: string): Promise<Collection | undefined> {
		return Promise.resolve();
	}

	updateCollection(id: string, _updates: Partial<Collection>): Promise<string> {
		return Promise.resolve(id);
	}

	deleteCollection(_id: string): Promise<void> {
		// Placeholder
		return Promise.resolve();
	}

	updateCollectionItem(id: string, _updates: Partial<CollectionItem>): Promise<string> {
		return Promise.resolve(id);
	}

	removeItemFromCollection(_id: string): Promise<void> {
		// Placeholder
		return Promise.resolve();
	}

	getCollectionStats(_collectionId: string): Promise<CollectionStats> {
		return Promise.resolve({
			totalItems: 0,
			totalValue: 0,
			statusBreakdown: {
				owned: 0,
				wanted: 0,
				ordered: 0,
				"pre-ordered": 0,
				building: 0,
				completed: 0,
			},
			conditionBreakdown: {
				new: 0,
				used: 0,
				damaged: 0,
				"box-damaged": 0,
			},
			completionPercentage: 0,
		});
	}

	searchItems(_query: string, _category?: string): Promise<CollectionItem[]> {
		return Promise.resolve([]);
	}

	updatePreferences(_updates: Partial<UserPreferences>): Promise<void> {
		// Placeholder
		return Promise.resolve();
	}

	exportCollection(_collectionId: string): Promise<Record<string, never>> {
		return Promise.resolve({});
	}

	importCollection(_data: Record<string, unknown>): Promise<void> {
		// Placeholder
		return Promise.resolve();
	}

	exportAllData(): Promise<Record<string, never>> {
		return Promise.resolve({});
	}

	importAllData(_data: Record<string, never>): Promise<void> {
		// Placeholder
		return Promise.resolve();
	}

	restoreAllData(_data: Record<string, never>): Promise<void> {
		// Placeholder
		return Promise.resolve();
	}
}

export const db = new CollectionDatabase();

export async function initializeDatabase() {
	await db.open();
	// Database initialized successfully
}

// Export functions for context provider
export const getCollections = async (): Promise<CollectionListResponse> => {
	const collections = await db.getAllCollections();
	return {
		collections,
		total: collections.length,
		page: 1,
		pageSize: collections.length,
	};
};

export const getCollection = db.getCollection.bind(db);
export const createCollection = db.createCollection.bind(db);
export const updateCollection = db.updateCollection.bind(db);
export const deleteCollection = db.deleteCollection.bind(db);
export const getStats = db.getCollectionStats.bind(db);
export const addItem = db.addItemToCollection.bind(db);
export const updateItem = db.updateCollectionItem.bind(db);
export const removeItem = db.removeItemFromCollection.bind(db);

// Add missing functions that context expects
export const getCollectionItems = db.getItemsByCollection.bind(db);

export const bulkAddItems = (items: Array<Omit<CollectionItem, "id">>): Promise<CollectionItem[]> => {
	// Placeholder implementation that returns items with generated IDs
	return Promise.resolve(items.map((item, index) => ({
		...item,
		id: `bulk-item-id-${Date.now()}-${index}`,
	})));
};

export const bulkUpdateItems = (items: Array<{ id: string; updates: Partial<CollectionItem> }>): Promise<string[]> => {
	// Placeholder implementation
	return Promise.resolve(items.map(() => "updated"));
};

export const bulkRemoveItems = async (_ids: string[]): Promise<void> => {
	// Placeholder implementation
};