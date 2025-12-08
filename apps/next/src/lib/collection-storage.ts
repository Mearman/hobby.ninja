import Dexie, { type EntityTable } from 'dexie';

export interface CollectionItem {
  id?: number;
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
}

export interface Collection {
  id?: number;
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
  id?: number;
  theme: 'light' | 'dark' | 'auto';
  language: 'en' | 'ja';
  defaultCurrency: 'JPY' | 'USD' | 'EUR';
  gridView: 'grid' | 'list';
  itemsPerPage: number;
  showAdvancedFilters: boolean;
  autoSaveSearch: boolean;
}

export class CollectionDatabase extends Dexie {
  collections!: EntityTable<Collection, 'id'>;
  collectionItems!: EntityTable<CollectionItem, 'id'>;
  userPreferences!: EntityTable<UserPreferences, 'id'>;

  constructor() {
    super('hobby-ninja-collection-db');

    this.version(1).stores({
      collections: '++id, category, name, isPublic, createdAt, modifiedAt',
      collectionItems: '++id, collectionId, itemId, category, status, added, modified',
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

  async createCollection(collection: Omit<Collection, 'id'>): Promise<number> {
    // Temporary implementation - can be enhanced later
    return 1;
  }

  async addItemToCollection(item: Omit<CollectionItem, 'id'>): Promise<number> {
    // Temporary implementation - can be enhanced later
    return 1;
  }

  async getPreferences(): Promise<UserPreferences> {
    // Return default preferences
    return {
      theme: 'auto',
      language: 'en',
      defaultCurrency: 'JPY',
      gridView: 'grid',
      itemsPerPage: 24,
      showAdvancedFilters: false,
      autoSaveSearch: true
    };
  }

  // Placeholder for other methods - will be implemented as needed
  async getCollection(id: number): Promise<Collection | undefined> {
    return undefined;
  }

  async updateCollection(id: number, updates: Partial<Collection>): Promise<number> {
    return 1;
  }

  async deleteCollection(id: number): Promise<void> {
    // Placeholder
  }

  async updateCollectionItem(id: number, updates: Partial<CollectionItem>): Promise<number> {
    return 1;
  }

  async removeItemFromCollection(id: number): Promise<void> {
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

  async exportCollection(collectionId: string): Promise<any> {
    return {};
  }

  async importCollection(data: any): Promise<void> {
    // Placeholder
  }

  async exportAllData(): Promise<any> {
    return {};
  }

  async importAllData(data: any): Promise<void> {
    // Placeholder
  }

  async restoreAllData(data: any): Promise<void> {
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

export default db;