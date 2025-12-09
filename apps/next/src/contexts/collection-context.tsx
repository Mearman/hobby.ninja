"use client";

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from "react";

import type { CollectionItem, CollectionStats, Collection, CollectionListResponse } from "@/lib/collection-storage";
import {
	addItem,
	updateItem,
	removeItem,
	getCollectionItems,
	getCollection,
	getCollections,
	createCollection,
	updateCollection,
	deleteCollection,
	getStats,
	bulkAddItems,
	bulkUpdateItems,
	bulkRemoveItems,
} from "@/lib/collection-storage";

// State interface for collection context
interface CollectionState {
  collections: CollectionListResponse["collections"];
  currentCollection: Collection | null;
  items: CollectionItem[];
  stats: CollectionStats | null;
  loading: boolean;
  error: string | null;
  searchQuery: string;
  filters: {
    status?: string;
    brand?: string;
    category?: string;
    series?: string;
    grade?: string;
    scale?: string;
  };
  sortBy: "name" | "dateAdded" | "price" | "releaseDate";
  sortOrder: "asc" | "desc";
  viewMode: "grid" | "list";
}

// Action types for collection reducer
type CollectionAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_COLLECTIONS"; payload: CollectionListResponse["collections"] }
  | { type: "SET_CURRENT_COLLECTION"; payload: Collection | null }
  | { type: "SET_ITEMS"; payload: CollectionItem[] }
  | { type: "SET_STATS"; payload: CollectionStats | null }
  | { type: "SET_SEARCH_QUERY"; payload: string }
  | { type: "SET_FILTERS"; payload: Partial<CollectionState["filters"]> }
  | { type: "SET_SORT_BY"; payload: CollectionState["sortBy"] }
  | { type: "SET_SORT_ORDER"; payload: CollectionState["sortOrder"] }
  | { type: "SET_VIEW_MODE"; payload: CollectionState["viewMode"] }
  | { type: "ADD_ITEM"; payload: CollectionItem }
  | { type: "UPDATE_ITEM"; payload: { id: string; updates: Partial<CollectionItem> } }
  | { type: "REMOVE_ITEM"; payload: string }
  | { type: "BULK_UPDATE_ITEMS"; payload: CollectionItem[] }
  | { type: "CLEAR_FILTERS" }
  | { type: "RESET_STATE" };

// Initial state
const initialState: CollectionState = {
	collections: [],
	currentCollection: null,
	items: [],
	stats: null,
	loading: false,
	error: null,
	searchQuery: "",
	filters: {},
	sortBy: "dateAdded",
	sortOrder: "desc",
	viewMode: "grid",
};

// Collection reducer
function collectionReducer(state: CollectionState, action: CollectionAction): CollectionState {
	switch (action.type) {
		case "SET_LOADING": {
			return { ...state, loading: action.payload };
		}

		case "SET_ERROR": {
			return { ...state, error: action.payload, loading: false };
		}

		case "SET_COLLECTIONS": {
			return { ...state, collections: action.payload };
		}

		case "SET_CURRENT_COLLECTION": {
			return { ...state, currentCollection: action.payload };
		}

		case "SET_ITEMS": {
			return { ...state, items: action.payload, loading: false };
		}

		case "SET_STATS": {
			return { ...state, stats: action.payload };
		}

		case "SET_SEARCH_QUERY": {
			return { ...state, searchQuery: action.payload };
		}

		case "SET_FILTERS": {
			return { ...state, filters: { ...state.filters, ...action.payload } };
		}

		case "SET_SORT_BY": {
			return { ...state, sortBy: action.payload };
		}

		case "SET_SORT_ORDER": {
			return { ...state, sortOrder: action.payload };
		}

		case "SET_VIEW_MODE": {
			return { ...state, viewMode: action.payload };
		}

		case "ADD_ITEM": {
			return { ...state, items: [...state.items, action.payload] };
		}

		case "UPDATE_ITEM": {
			return {
				...state,
				items: state.items.map(item =>
					item.id === action.payload.id ? { ...item, ...action.payload.updates } : item,
				),
			};
		}

		case "REMOVE_ITEM": {
			return {
				...state,
				items: state.items.filter(item => item.id !== action.payload),
			};
		}

		case "BULK_UPDATE_ITEMS": {
			return {
				...state,
				items: state.items.map(item => {
					const updatedItem = action.payload.find(updated => updated.id === item.id);
					return updatedItem ? updatedItem : item;
				}),
			};
		}

		case "CLEAR_FILTERS": {
			return { ...state, filters: {}, searchQuery: "" };
		}

		case "RESET_STATE": {
			return { ...initialState };
		}

		default: {
			return state;
		}
	}
}

// Context interface
interface CollectionContextType {
  state: CollectionState;
  actions: {
    // Collection management
    loadCollections: () => Promise<void>;
    loadCollection: (collectionId: string) => Promise<void>;
    createCollection: (name: string, description?: string) => Promise<Collection>;
    updateCollection: (collectionId: string, updates: Partial<Collection>) => Promise<void>;
    deleteCollection: (collectionId: string) => Promise<void>;
    setCurrentCollection: (collection: Collection | null) => void;

    // Item management
    loadItems: (collectionId?: string) => Promise<void>;
    addItem: (itemId: string, item: Omit<CollectionItem, "id" | "dateAdded" | "lastModified">) => Promise<void>;
    updateItem: (itemId: string, updates: Partial<CollectionItem>) => Promise<void>;
    removeItem: (itemId: string) => Promise<void>;
    bulkAddItems: (items: Array<Omit<CollectionItem, "id" | "dateAdded" | "lastModified">>) => Promise<void>;
    bulkUpdateItems: (updates: Array<{ id: string; updates: Partial<CollectionItem> }>) => Promise<void>;
    bulkRemoveItems: (itemIds: string[]) => Promise<void>;

    // Stats and filtering
    loadStats: (collectionId?: string) => Promise<void>;
    setSearchQuery: (query: string) => void;
    setFilters: (filters: Partial<CollectionState["filters"]>) => void;
    clearFilters: () => void;
    setSorting: (sortBy: CollectionState["sortBy"], order: CollectionState["sortOrder"]) => void;
    setViewMode: (mode: CollectionState["viewMode"]) => void;

    // Utility
    refreshData: () => Promise<void>;
    resetState: () => void;
  };
}

// Create context
const CollectionContext = createContext<CollectionContextType | null>(null);

// Provider component
interface CollectionProviderProps {
  children: ReactNode;
  defaultCollectionId?: string;
}

export function CollectionProvider({ children, defaultCollectionId }: CollectionProviderProps) {
	const [state, dispatch] = useReducer(collectionReducer, initialState);

	// Load collections on mount
	useEffect(() => {
		loadCollections();

		if (defaultCollectionId) {
			loadCollection(defaultCollectionId);
		}
	}, [defaultCollectionId]);

	// Action implementations
	const loadCollections = async () => {
		try {
			dispatch({ type: "SET_LOADING", payload: true });
			const result = await getCollections();
			dispatch({ type: "SET_COLLECTIONS", payload: result.collections });
		} catch (error) {
			dispatch({ type: "SET_ERROR", payload: error instanceof Error ? error.message : "Failed to load collections" });
		}
	};

	const loadCollection = async (collectionId: string) => {
		try {
			dispatch({ type: "SET_LOADING", payload: true });
			const collection = await getCollection(collectionId);
			dispatch({ type: "SET_CURRENT_COLLECTION", payload: collection || null });
			await loadItems(collectionId);
			await loadStats(collectionId);
		} catch (error) {
			dispatch({ type: "SET_ERROR", payload: error instanceof Error ? error.message : "Failed to load collection" });
		}
	};

	const createCollectionAction = async (name: string, description?: string): Promise<Collection> => {
		try {
			const collectionData: Omit<Collection, "id"> = {
				name,
				description: description || "",
				category: "general",
				isPublic: false,
				itemCount: 0,
				totalValue: 0,
				currency: 'JPY' as const,
				createdAt: new Date(),
				modifiedAt: new Date(),
				settings: {
					defaultStatus: 'owned',
					defaultCondition: 'new',
					autoBackup: false,
				},
			};
			const collectionId = await createCollection(collectionData);
			const collection: Collection = {
				...collectionData,
				id: collectionId,
			};
			dispatch({ type: "SET_COLLECTIONS", payload: [...state.collections, collection] });
			return collection;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "Failed to create collection";
			dispatch({ type: "SET_ERROR", payload: errorMessage });
			throw new Error(errorMessage);
		}
	};

	const updateCollectionAction = async (collectionId: string, updates: Partial<Collection>) => {
		try {
			await updateCollection(collectionId, updates);
			if (state.currentCollection?.id === collectionId) {
				const updatedCollection = { ...state.currentCollection, ...updates };
				dispatch({ type: "SET_CURRENT_COLLECTION", payload: updatedCollection });
			}

			const updatedCollections = state.collections.map(col =>
				col.id === collectionId ? { ...col, ...updates } : col,
			);
			dispatch({ type: "SET_COLLECTIONS", payload: updatedCollections });
		} catch (error) {
			dispatch({ type: "SET_ERROR", payload: error instanceof Error ? error.message : "Failed to update collection" });
		}
	};

	const deleteCollectionAction = async (collectionId: string) => {
		try {
			await deleteCollection(collectionId);
			const updatedCollections = state.collections.filter(col => col.id !== collectionId);
			dispatch({ type: "SET_COLLECTIONS", payload: updatedCollections });

			if (state.currentCollection?.id === collectionId) {
				dispatch({ type: "SET_CURRENT_COLLECTION", payload: null });
				dispatch({ type: "SET_ITEMS", payload: [] });
				dispatch({ type: "SET_STATS", payload: null });
			}
		} catch (error) {
			dispatch({ type: "SET_ERROR", payload: error instanceof Error ? error.message : "Failed to delete collection" });
		}
	};

	const loadItems = async (collectionId?: string) => {
		try {
			const targetCollectionId = collectionId || state.currentCollection?.id;
			if (!targetCollectionId) return;

			dispatch({ type: "SET_LOADING", payload: true });
			const items = await getCollectionItems(targetCollectionId);
			dispatch({ type: "SET_ITEMS", payload: items });
		} catch (error) {
			dispatch({ type: "SET_ERROR", payload: error instanceof Error ? error.message : "Failed to load items" });
		}
	};

	const addItemAction = async (itemId: string, itemData: Omit<CollectionItem, "id" | "dateAdded" | "lastModified">) => {
		try {
			const generatedId = await addItem(itemData);
			const item: CollectionItem = {
				...itemData,
				id: generatedId,
				dateAdded: new Date().toISOString(),
				lastModified: new Date().toISOString(),
			};
			dispatch({ type: "ADD_ITEM", payload: item });
			if (state.currentCollection?.id) {
				await loadStats(state.currentCollection.id);
			}
		} catch (error) {
			dispatch({ type: "SET_ERROR", payload: error instanceof Error ? error.message : "Failed to add item" });
		}
	};

	const updateItemAction = async (itemId: string, updates: Partial<CollectionItem>) => {
		try {
			await updateItem(itemId, updates);
			dispatch({ type: "UPDATE_ITEM", payload: { id: itemId, updates } });
			if (state.currentCollection?.id) {
				await loadStats(state.currentCollection.id);
			}
		} catch (error) {
			dispatch({ type: "SET_ERROR", payload: error instanceof Error ? error.message : "Failed to update item" });
		}
	};

	const removeItemAction = async (itemId: string) => {
		try {
			await removeItem(itemId);
			dispatch({ type: "REMOVE_ITEM", payload: itemId });
			if (state.currentCollection?.id) {
				await loadStats(state.currentCollection.id);
			}
		} catch (error) {
			dispatch({ type: "SET_ERROR", payload: error instanceof Error ? error.message : "Failed to remove item" });
		}
	};

	const bulkAddItemsAction = async (items: Array<Omit<CollectionItem, "id" | "dateAdded" | "lastModified">>) => {
		try {
			const addedItems = await bulkAddItems(items);
			dispatch({ type: "SET_ITEMS", payload: [...state.items, ...addedItems] });
			if (state.currentCollection?.id) {
				await loadStats(state.currentCollection.id);
			}
		} catch (error) {
			dispatch({ type: "SET_ERROR", payload: error instanceof Error ? error.message : "Failed to add items" });
		}
	};

	const bulkUpdateItemsAction = async (updates: Array<{ id: string; updates: Partial<CollectionItem> }>) => {
		try {
			await bulkUpdateItems(updates);
			// Update local state
			const updatedItems = updates.map(update => ({
				...state.items.find(item => item.id === update.id),
				...update.updates,
			})) as CollectionItem[];

			dispatch({ type: "BULK_UPDATE_ITEMS", payload: updatedItems });
			if (state.currentCollection?.id) {
				await loadStats(state.currentCollection.id);
			}
		} catch (error) {
			dispatch({ type: "SET_ERROR", payload: error instanceof Error ? error.message : "Failed to update items" });
		}
	};

	const bulkRemoveItemsAction = async (itemIds: string[]) => {
		try {
			await bulkRemoveItems(itemIds);
			const remainingItems = state.items.filter(item => !itemIds.includes(item.id));
			dispatch({ type: "SET_ITEMS", payload: remainingItems });
			if (state.currentCollection?.id) {
				await loadStats(state.currentCollection.id);
			}
		} catch (error) {
			dispatch({ type: "SET_ERROR", payload: error instanceof Error ? error.message : "Failed to remove items" });
		}
	};

	const loadStats = async (collectionId?: string) => {
		try {
			const targetCollectionId = collectionId || state.currentCollection?.id;
			if (!targetCollectionId) return;

			const stats = await getStats(targetCollectionId);
			dispatch({ type: "SET_STATS", payload: stats });
		} catch (error) {
			dispatch({ type: "SET_ERROR", payload: error instanceof Error ? error.message : "Failed to load stats" });
		}
	};

	const setSearchQuery = (query: string) => {
		dispatch({ type: "SET_SEARCH_QUERY", payload: query });
	};

	const setFilters = (filters: Partial<CollectionState["filters"]>) => {
		dispatch({ type: "SET_FILTERS", payload: filters });
	};

	const clearFilters = () => {
		dispatch({ type: "CLEAR_FILTERS" });
	};

	const setSorting = (sortBy: CollectionState["sortBy"], order: CollectionState["sortOrder"]) => {
		dispatch({ type: "SET_SORT_BY", payload: sortBy });
		dispatch({ type: "SET_SORT_ORDER", payload: order });
	};

	const setViewMode = (mode: CollectionState["viewMode"]) => {
		dispatch({ type: "SET_VIEW_MODE", payload: mode });
	};

	const setCurrentCollection = (collection: Collection | null) => {
		dispatch({ type: "SET_CURRENT_COLLECTION", payload: collection });
	};

	const refreshData = async () => {
		if (state.currentCollection?.id) {
			await loadCollection(state.currentCollection.id);
		} else {
			await loadCollections();
		}
	};

	const resetState = () => {
		dispatch({ type: "RESET_STATE" });
	};

	const actions = {
		loadCollections,
		loadCollection,
		createCollection: createCollectionAction,
		updateCollection: updateCollectionAction,
		deleteCollection: deleteCollectionAction,
		setCurrentCollection,
		loadItems,
		addItem: addItemAction,
		updateItem: updateItemAction,
		removeItem: removeItemAction,
		bulkAddItems: bulkAddItemsAction,
		bulkUpdateItems: bulkUpdateItemsAction,
		bulkRemoveItems: bulkRemoveItemsAction,
		loadStats,
		setSearchQuery,
		setFilters,
		clearFilters,
		setSorting,
		setViewMode,
		refreshData,
		resetState,
	};

	return (
		<CollectionContext.Provider value={{ state, actions }}>
			{children}
		</CollectionContext.Provider>
	);
}

// Export the state interface for components to use
export type { CollectionState };

// Hook to use collection context
export function useCollection() {
	const context = useContext(CollectionContext);
	if (!context) {
		throw new Error("useCollection must be used within a CollectionProvider");
	}
	return context;
}

// Export context for testing purposes
export { CollectionContext };