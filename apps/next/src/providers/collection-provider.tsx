"use client";

import { notifications } from "@mantine/notifications";
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

import { db, type Collection, type CollectionItem, type UserPreferences } from "@/lib/collection-storage";

// Export/Import data type
type ExportData = Record<string, unknown>;
type ImportData = Record<string, unknown>;

interface CollectionContextType {
  // Collections
  collections: Collection[];
  currentCollection: Collection | null;
  loading: boolean;
  error: string | null;

  // Collection items
  collectionItems: CollectionItem[];
  itemStats: {
    totalItems: number;
    totalValue: number;
    statusBreakdown: Record<string, number>;
    conditionBreakdown: Record<string, number>;
  } | null;

  // User preferences
  preferences: UserPreferences | null;

  // Collection CRUD operations
  createCollection: (collection: Omit<Collection, "id">) => Promise<string>;
  updateCollection: (id: string, updates: Partial<Collection>) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;
  setCurrentCollection: (collection: Collection | null) => void;

  // Item operations
  addItemToCollection: (item: Omit<CollectionItem, "id">) => Promise<string>;
  updateCollectionItem: (id: string, updates: Partial<CollectionItem>) => Promise<void>;
  removeItemFromCollection: (id: string) => Promise<void>;
  toggleItemSelection: (itemId: string) => void;
  selectedItems: string[];

  // Preferences
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>;

  // Bulk operations
  bulkUpdateItems: (itemIds: string[], updates: Partial<CollectionItem>) => Promise<void>;
  bulkRemoveItems: (itemIds: string[]) => Promise<void>;

  // Import/Export
  exportCollection: (collectionId: string) => Promise<ExportData>;
  importCollection: (data: ImportData) => Promise<void>;
  exportAllData: () => Promise<ExportData>;
  importAllData: (data: ImportData) => Promise<void>;

  // Search within collections
  searchItems: (query: string, category?: string) => Promise<CollectionItem[]>;

  // Refresh data
  refreshCollections: () => Promise<void>;
  refreshItems: () => Promise<void>;
}

const CollectionContext = createContext<CollectionContextType | undefined>(undefined);

export function useCollection() {
	const context = useContext(CollectionContext);
	if (!context) {
		throw new Error("useCollection must be used within CollectionProvider");
	}
	return context;
}

interface CollectionProviderProps {
  children: React.ReactNode;
}

export function CollectionProvider({ children }: CollectionProviderProps) {
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [collections, setCollections] = useState<Collection[]>([]);
	const [currentCollection, setCurrentCollection] = useState<Collection | null>(null);
	const [collectionItems, setCollectionItems] = useState<CollectionItem[]>([]);
	const [selectedItems, setSelectedItems] = useState<string[]>([]);
	const [itemStats, setItemStats] = useState<CollectionContextType["itemStats"]>(null);
	const [preferences, setPreferences] = useState<UserPreferences | null>(null);

	// Initialize database and load initial data
	useEffect(() => {
		const initialize = async () => {
			try {
				setLoading(true);
				await db.open();

				// Load collections
				await refreshCollections();

				// Load preferences
				const userPrefs = await db.getPreferences();
				setPreferences(userPrefs);

				setError(null);
			} catch (error_) {
				const errorMessage = error_ instanceof Error ? error_.message : "Failed to initialize collections";
				setError(errorMessage);
				notifications.show({
					title: "Collection Error",
					message: errorMessage,
					color: "red",
				});
			} finally {
				setLoading(false);
			}
		};

		void initialize();
	}, [refreshCollections]);

	// Load collection items when current collection changes
	useEffect(() => {
		if (currentCollection?.id) {
			void loadCollectionItems(currentCollection.id);
		} else {
			setCollectionItems([]);
			setItemStats(null);
		}
	}, [currentCollection]);

	const loadCollectionItems = async (collectionId: string) => {
		try {
			const items = await db.getItemsByCollection(collectionId);
			setCollectionItems(items);

			// Calculate stats
			const stats = await db.getCollectionStats(collectionId);
			setItemStats(stats);

			// Clear selected items when collection changes
			setSelectedItems([]);
		} catch (error_) {
			console.error("Failed to load collection items:", error_);
			setCollectionItems([]);
			setItemStats(null);
		}
	};

	// Collection CRUD operations
	const createCollection = useCallback(async (collection: Omit<Collection, "id">) => {
		try {
			const id = await db.createCollection(collection);
			await refreshCollections();

			notifications.show({
				title: "Collection Created",
				message: `${collection.name} has been created successfully.`,
				color: "green",
			});

			return id;
		} catch (error_) {
			const errorMessage = error_ instanceof Error ? error_.message : "Failed to create collection";
			notifications.show({
				title: "Create Failed",
				message: errorMessage,
				color: "red",
			});
			throw error_;
		}
	}, []);

	const updateCollection = useCallback(async (id: string, updates: Partial<Collection>) => {
		try {
			await db.updateCollection(id, updates);
			await refreshCollections();

			// Update current collection if it's the one being updated
			if (currentCollection?.id === id) {
				const updated = await db.getCollection(id);
				setCurrentCollection(updated ?? null);
			}

			notifications.show({
				title: "Collection Updated",
				message: "Collection has been updated successfully.",
				color: "blue",
			});
		} catch (error_) {
			const errorMessage = error_ instanceof Error ? error_.message : "Failed to update collection";
			notifications.show({
				title: "Update Failed",
				message: errorMessage,
				color: "red",
			});
			throw error_;
		}
	}, [currentCollection]);

	const deleteCollection = useCallback(async (id: string) => {
		try {
			await db.deleteCollection(id);
			await refreshCollections();

			// Clear current collection if it was deleted
			if (currentCollection?.id === id) {
				setCurrentCollection(null);
			}

			notifications.show({
				title: "Collection Deleted",
				message: "Collection has been deleted successfully.",
				color: "orange",
			});
		} catch (error_) {
			const errorMessage = error_ instanceof Error ? error_.message : "Failed to delete collection";
			notifications.show({
				title: "Delete Failed",
				message: errorMessage,
				color: "red",
			});
			throw error_;
		}
	}, [currentCollection]);

	const refreshCollections = useCallback(async () => {
		try {
			const allCollections = await db.getAllCollections();
			setCollections(allCollections);
		} catch (error_) {
			console.error("Failed to refresh collections:", error_);
			throw error_;
		}
	}, []);

	const refreshItems = useCallback(async () => {
		if (currentCollection?.id) {
			await loadCollectionItems(currentCollection.id);
		}
	}, [currentCollection]);

	// Item operations
	const addItemToCollection = useCallback(async (item: Omit<CollectionItem, "id">) => {
		try {
			const id = await db.addItemToCollection(item);
			await refreshItems();
			await refreshCollections(); // Update collection stats

			notifications.show({
				title: "Item Added",
				message: "Item has been added to your collection.",
				color: "green",
			});

			return id;
		} catch (error_) {
			const errorMessage = error_ instanceof Error ? error_.message : "Failed to add item";
			notifications.show({
				title: "Add Failed",
				message: errorMessage,
				color: "red",
			});
			throw error_;
		}
	}, [refreshItems, refreshCollections]);

	const updateCollectionItem = useCallback(async (id: string, updates: Partial<CollectionItem>) => {
		try {
			await db.updateCollectionItem(id, updates);
			await refreshItems();

			notifications.show({
				title: "Item Updated",
				message: "Item has been updated successfully.",
				color: "blue",
			});
		} catch (error_) {
			const errorMessage = error_ instanceof Error ? error_.message : "Failed to update item";
			notifications.show({
				title: "Update Failed",
				message: errorMessage,
				color: "red",
			});
			throw error_;
		}
	}, [refreshItems]);

	const removeItemFromCollection = useCallback(async (id: string) => {
		try {
			await db.removeItemFromCollection(id);
			await refreshItems();
			await refreshCollections(); // Update collection stats

			// Remove from selected items if present
			setSelectedItems(prev => prev.filter(itemId => {
				const item = collectionItems.find(ci => ci.id === id);
				return item?.itemId !== itemId;
			}));

			notifications.show({
				title: "Item Removed",
				message: "Item has been removed from your collection.",
				color: "orange",
			});
		} catch (error_) {
			const errorMessage = error_ instanceof Error ? error_.message : "Failed to remove item";
			notifications.show({
				title: "Remove Failed",
				message: errorMessage,
				color: "red",
			});
			throw error_;
		}
	}, [refreshItems, refreshCollections, collectionItems]);

	const toggleItemSelection = useCallback((itemId: string) => {
		setSelectedItems(prev =>
			prev.includes(itemId)
				? prev.filter(id => id !== itemId)
				: [...prev, itemId],
		);
	}, []);

	// Bulk operations
	const bulkUpdateItems = useCallback(async (itemIds: string[], updates: Partial<CollectionItem>) => {
		try {
			await Promise.all(itemIds.map(id => db.updateCollectionItem(id, updates)));
			await refreshItems();

			notifications.show({
				title: "Items Updated",
				message: `${itemIds.length} items have been updated.`,
				color: "blue",
			});
		} catch (error_) {
			const errorMessage = error_ instanceof Error ? error_.message : "Failed to update items";
			notifications.show({
				title: "Bulk Update Failed",
				message: errorMessage,
				color: "red",
			});
			throw error_;
		}
	}, [refreshItems]);

	const bulkRemoveItems = useCallback(async (itemIds: string[]) => {
		try {
			await Promise.all(itemIds.map(id => db.removeItemFromCollection(id)));
			await refreshItems();
			await refreshCollections(); // Update collection stats

			notifications.show({
				title: "Items Removed",
				message: `${itemIds.length} items have been removed.`,
				color: "orange",
			});
		} catch (error_) {
			const errorMessage = error_ instanceof Error ? error_.message : "Failed to remove items";
			notifications.show({
				title: "Bulk Remove Failed",
				message: errorMessage,
				color: "red",
			});
			throw error_;
		}
	}, [refreshItems, refreshCollections]);

	// Preferences
	const updatePreferences = useCallback(async (updates: Partial<UserPreferences>) => {
		try {
			await db.updatePreferences(updates);
			const updatedPrefs = await db.getPreferences();
			setPreferences(updatedPrefs);
		} catch (error_) {
			const errorMessage = error_ instanceof Error ? error_.message : "Failed to update preferences";
			notifications.show({
				title: "Preferences Update Failed",
				message: errorMessage,
				color: "red",
			});
			throw error_;
		}
	}, []);

	// Import/Export
	const exportCollection = useCallback(async (collectionId: string) => {
		try {
			return await db.exportCollection(collectionId);
		} catch (error_) {
			const errorMessage = error_ instanceof Error ? error_.message : "Failed to export collection";
			notifications.show({
				title: "Export Failed",
				message: errorMessage,
				color: "red",
			});
			throw error_;
		}
	}, []);

	const importCollection = useCallback(async (data: ImportData) => {
		try {
			await db.importCollection(data as Record<string, unknown>);
			await refreshCollections();

			notifications.show({
				title: "Collection Imported",
				message: "Collection has been imported successfully.",
				color: "green",
			});
		} catch (error_) {
			const errorMessage = error_ instanceof Error ? error_.message : "Failed to import collection";
			notifications.show({
				title: "Import Failed",
				message: errorMessage,
				color: "red",
			});
			throw error_;
		}
	}, [refreshCollections]);

	const exportAllData = useCallback(async () => {
		try {
			return await db.exportAllData();
		} catch (error_) {
			const errorMessage = error_ instanceof Error ? error_.message : "Failed to export data";
			notifications.show({
				title: "Export Failed",
				message: errorMessage,
				color: "red",
			});
			throw error_;
		}
	}, []);

	const importAllData = useCallback(async (data: ImportData) => {
		try {
			await db.restoreAllData(data as Record<string, unknown>);
			await refreshCollections();
			await refreshItems();

			notifications.show({
				title: "Data Imported",
				message: "Your data has been imported successfully.",
				color: "green",
			});
		} catch (error_) {
			const errorMessage = error_ instanceof Error ? error_.message : "Failed to import data";
			notifications.show({
				title: "Import Failed",
				message: errorMessage,
				color: "red",
			});
			throw error_;
		}
	}, [refreshCollections, refreshItems]);

	// Search
	const searchItems = useCallback(async (query: string, category?: string) => {
		try {
			return await db.searchItems(query, category);
		} catch (error_) {
			console.error("Search failed:", error_);
			return [];
		}
	}, []);

	const value: CollectionContextType = {
		// Collections
		collections,
		currentCollection,
		loading,
		error,

		// Collection items
		collectionItems,
		itemStats,

		// User preferences
		preferences,

		// Collection CRUD operations
		createCollection,
		updateCollection,
		deleteCollection,
		setCurrentCollection,

		// Item operations
		addItemToCollection,
		updateCollectionItem,
		removeItemFromCollection,
		toggleItemSelection,
		selectedItems,

		// Preferences
		updatePreferences,

		// Bulk operations
		bulkUpdateItems,
		bulkRemoveItems,

		// Import/Export
		exportCollection,
		importCollection,
		exportAllData,
		importAllData,

		// Search
		searchItems,

		// Refresh
		refreshCollections,
		refreshItems,
	};

	return (
		<CollectionContext.Provider value={value}>
			{children}
		</CollectionContext.Provider>
	);
}