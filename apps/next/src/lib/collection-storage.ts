import Dexie, { type EntityTable } from 'dexie';
import { PAGINATION } from './constants';

export interface CollectionItem {
  id: string;
  collectionId: string;
  itemId: string;
  category: string;
  status: 'owned' | 'wanted' | 'ordered' | 'pre-ordered' | 'building' | 'completed';
  condition: 'new' | 'used' | 'damaged' | 'box-damaged';
  purchaseInfo?: {
    price: number;
    currency: 'JPY' | 'USD' | 'EUR';
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
  currency: 'JPY' | 'USD' | 'EUR';
  createdAt: Date;
  modifiedAt: Date;
  settings: {
    defaultStatus: CollectionItem['status'];
    defaultCondition: CollectionItem['condition'];
    autoBackup: boolean;
  };
}

export interface UserPreferences {
  id: string;
  theme: 'light' | 'dark' | 'auto';
  language: 'en' | 'ja';
  defaultCurrency: 'JPY' | 'USD' | 'EUR';
  gridView: 'grid' | 'list';
  itemsPerPage: number;
  showAdvancedFilters: boolean;
  autoSaveSearch: boolean;
}

export interface CollectionStats {
  totalItems: number;
  totalValue: number;
  statusBreakdown: Record<CollectionItem['status'], number>;
  conditionBreakdown: Record<CollectionItem['condition'], number>;
}

export interface CollectionListResponse {
  collections: Collection[];
  total: number;
  page: number;
  pageSize: number;
}

export class CollectionDatabase extends Dexie {
  collections!: EntityTable<Collection, 'id'>;
  collectionItems!: EntityTable<CollectionItem, 'id'>;
  userPreferences!: EntityTable<UserPreferences, 'id'>;

  constructor() {
    super('hobby-ninja-collection-db');

    this.version(1).stores({
      collections: 'id, category, name, isPublic, createdAt, modifiedAt',
      collectionItems: 'id, collectionId, itemId, category, status, added, modified',
      userPreferences: '++id, theme, language, defaultCurrency'
    });
  }

  // Simple wrapper functions to avoid Dexie complexity for now
  async getAllCollections(): Promise<Collection[]> {
    // Temporary implementation - can be enhanced later
    return [];
  }

  async getItemsByCollection(collectionId: string): Promise<CollectionItem[]> {
    // Temporary implementation - can be enhanced later
    return [];
  }

  async createCollection(collection: Omit<Collection, 'id'>): Promise<string> {
    // Temporary implementation - can be enhanced later
    return 'collection-id-' + Date.now();
  }

  async addItemToCollection(item: Omit<CollectionItem, 'id'>): Promise<string> {
    // Temporary implementation - can be enhanced later
    return 'item-id-' + Date.now();
  }

  async getPreferences(): Promise<UserPreferences> {
    // Return default preferences
    return {
      id: 'default-user-preferences',
      theme: 'auto',
      language: 'en',
      defaultCurrency: 'JPY',
      gridView: 'grid',
      itemsPerPage: PAGINATION.ITEMS_PER_PAGE,
      showAdvancedFilters: false,
      autoSaveSearch: true
    };
  }

  // Placeholder for other methods - will be implemented as needed
  async getCollection(id: string): Promise<Collection | undefined> {
    return undefined;
  }

  async updateCollection(id: string, updates: Partial<Collection>): Promise<string> {
    return id;
  }

  async deleteCollection(id: string): Promise<void> {
    // Placeholder
  }

  async updateCollectionItem(id: string, updates: Partial<CollectionItem>): Promise<string> {
    return id;
  }

  async removeItemFromCollection(id: string): Promise<void> {
    // Placeholder
  }

  async getCollectionStats(collectionId: string): Promise<{
    totalItems: number;
    totalValue: number;
    statusBreakdown: Record<CollectionItem['status'], number>;
    conditionBreakdown: Record<CollectionItem['condition'], number>;
  }> {
    return {
      totalItems: 0,
      totalValue: 0,
      statusBreakdown: {
        owned: 0,
        wanted: 0,
        ordered: 0,
        'pre-ordered': 0,
        building: 0,
        completed: 0,
      },
      conditionBreakdown: {
        new: 0,
        used: 0,
        damaged: 0,
        'box-damaged': 0,
      },
    };
  }

  async searchItems(query: string, category?: string): Promise<CollectionItem[]> {
    return [];
  }

  async updatePreferences(updates: Partial<UserPreferences>): Promise<void> {
    // Placeholder
  }

  async exportCollection(collectionId: string): Promise<Record<string, unknown>> {
    return {};
  }

  async importCollection(data: Record<string, unknown>): Promise<void> {
    // Placeholder
  }

  async exportAllData(): Promise<Record<string, unknown>> {
    return {};
  }

  async importAllData(data: Record<string, unknown>): Promise<void> {
    // Placeholder
  }

  async restoreAllData(data: Record<string, unknown>): Promise<void> {
    // Placeholder
  }
}

export const db = new CollectionDatabase();

export async function initializeDatabase() {
  try {
    await db.open();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

// Export functions for context provider
export const getCollections = async (): Promise<CollectionListResponse> => {
  const collections = await db.getAllCollections();
  return {
    collections,
    total: collections.length,
    page: 1,
    pageSize: collections.length
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

export const bulkAddItems = async (items: Omit<CollectionItem, 'id'>[]): Promise<CollectionItem[]> => {
  // Placeholder implementation that returns items with generated IDs
  return items.map((item, index) => ({
    ...item,
    id: `bulk-item-id-${Date.now()}-${index}`
  }));
};

export const bulkUpdateItems = async (items: { id: string; updates: Partial<CollectionItem> }[]): Promise<string[]> => {
  // Placeholder implementation
  return items.map(() => 'updated');
};

export const bulkRemoveItems = async (ids: string[]): Promise<void> => {
  // Placeholder implementation
};

export default db;