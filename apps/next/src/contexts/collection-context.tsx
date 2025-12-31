"use client";

import React, { createContext, useContext, useReducer, useEffect, ReactNode, useCallback } from "react";

import type { List, ListMembership, SyntheticList } from "@/lib/collection-storage";
import {
	getLists,
	getList,
	createList,
	updateList,
	deleteList,
	getListItems,
	getItemLists,
	addToList,
	removeFromList,
	getSyntheticListItems,
	initializeDatabase,
	SYNTHETIC_LISTS,
} from "@/lib/collection-storage";

// ============================================================================
// State
// ============================================================================

interface ListState {
	lists: List[];
	syntheticLists: SyntheticList[];
	currentList: List | null;
	currentListItems: ListMembership[];
	loading: boolean;
	error: string | null;
}

const initialState: ListState = {
	lists: [],
	syntheticLists: SYNTHETIC_LISTS,
	currentList: null,
	currentListItems: [],
	loading: false,
	error: null,
};

// ============================================================================
// Actions
// ============================================================================

type ListAction =
	| { type: "SET_LOADING"; payload: boolean }
	| { type: "SET_ERROR"; payload: string | null }
	| { type: "SET_LISTS"; payload: List[] }
	| { type: "SET_CURRENT_LIST"; payload: List | null }
	| { type: "SET_CURRENT_LIST_ITEMS"; payload: ListMembership[] }
	| { type: "ADD_LIST"; payload: List }
	| { type: "UPDATE_LIST"; payload: { id: string; updates: Partial<List> } }
	| { type: "REMOVE_LIST"; payload: string };

function listReducer(state: ListState, action: ListAction): ListState {
	switch (action.type) {
		case "SET_LOADING": {
			return { ...state, loading: action.payload };
		}
		case "SET_ERROR": {
			return { ...state, error: action.payload, loading: false };
		}
		case "SET_LISTS": {
			return { ...state, lists: action.payload, loading: false };
		}
		case "SET_CURRENT_LIST": {
			return { ...state, currentList: action.payload };
		}
		case "SET_CURRENT_LIST_ITEMS": {
			return { ...state, currentListItems: action.payload };
		}
		case "ADD_LIST": {
			return { ...state, lists: [...state.lists, action.payload] };
		}
		case "UPDATE_LIST": {
			return {
				...state,
				lists: state.lists.map(list =>
					list.id === action.payload.id
						? { ...list, ...action.payload.updates }
						: list,
				),
				currentList: state.currentList?.id === action.payload.id
					? { ...state.currentList, ...action.payload.updates }
					: state.currentList,
			};
		}
		case "REMOVE_LIST": {
			return {
				...state,
				lists: state.lists.filter(list => list.id !== action.payload),
				currentList: state.currentList?.id === action.payload ? null : state.currentList,
			};
		}
		default: {
			return state;
		}
	}
}

// ============================================================================
// Context
// ============================================================================

interface ListContextType {
	state: ListState;
	actions: {
		// List management
		loadLists: () => Promise<void>;
		loadList: (listId: string) => Promise<void>;
		createList: (name: string, description?: string, icon?: string) => Promise<List>;
		updateList: (listId: string, updates: Partial<List>) => Promise<void>;
		deleteList: (listId: string) => Promise<void>;

		// Membership management
		addItemToList: (listId: string, itemId: string, notes?: string) => Promise<void>;
		removeItemFromList: (listId: string, itemId: string) => Promise<void>;
		getItemLists: (itemId: string) => Promise<List[]>;
		isItemInList: (listId: string, itemId: string) => Promise<boolean>;

		// Synthetic lists
		getSyntheticListItems: (listId: string) => Promise<string[]>;

		// Utility
		refreshLists: () => Promise<void>;
	};
}

const ListContext = createContext<ListContextType | null>(null);

// ============================================================================
// Provider
// ============================================================================

interface ListProviderProps {
	children: ReactNode;
}

export function ListProvider({ children }: ListProviderProps) {
	const [state, dispatch] = useReducer(listReducer, initialState);

	// Load all lists
	const loadLists = useCallback(async () => {
		try {
			dispatch({ type: "SET_LOADING", payload: true });
			await initializeDatabase();
			const lists = await getLists();
			dispatch({ type: "SET_LISTS", payload: lists });
		} catch (error) {
			dispatch({
				type: "SET_ERROR",
				payload: error instanceof Error ? error.message : "Failed to load lists",
			});
		}
	}, []);

	// Load a specific list with its items
	const loadList = useCallback(async (listId: string) => {
		try {
			dispatch({ type: "SET_LOADING", payload: true });
			const list = await getList(listId);
			dispatch({ type: "SET_CURRENT_LIST", payload: list ?? null });

			if (list) {
				const items = await getListItems(listId);
				dispatch({ type: "SET_CURRENT_LIST_ITEMS", payload: items });
			}
			dispatch({ type: "SET_LOADING", payload: false });
		} catch (error) {
			dispatch({
				type: "SET_ERROR",
				payload: error instanceof Error ? error.message : "Failed to load list",
			});
		}
	}, []);

	// Create a new list
	const createListAction = useCallback(async (
		name: string,
		description?: string,
		icon?: string,
	): Promise<List> => {
		const id = await createList({ name, description, icon });
		const newList = await getList(id);
		if (!newList) {
			throw new Error("Failed to create list");
		}
		dispatch({ type: "ADD_LIST", payload: newList });
		return newList;
	}, []);

	// Update a list
	const updateListAction = useCallback(async (
		listId: string,
		updates: Partial<List>,
	): Promise<void> => {
		await updateList(listId, updates);
		dispatch({ type: "UPDATE_LIST", payload: { id: listId, updates } });
	}, []);

	// Delete a list
	const deleteListAction = useCallback(async (listId: string): Promise<void> => {
		await deleteList(listId);
		dispatch({ type: "REMOVE_LIST", payload: listId });
	}, []);

	// Add item to list
	const addItemToListAction = useCallback(async (
		listId: string,
		itemId: string,
		notes?: string,
	): Promise<void> => {
		await addToList(listId, itemId, notes ? { notes } : undefined);

		// Update list modified timestamp
		dispatch({
			type: "UPDATE_LIST",
			payload: { id: listId, updates: { modifiedAt: new Date() } },
		});

		// If viewing this list, refresh items
		if (state.currentList?.id === listId) {
			const items = await getListItems(listId);
			dispatch({ type: "SET_CURRENT_LIST_ITEMS", payload: items });
		}
	}, [state.currentList?.id]);

	// Remove item from list
	const removeItemFromListAction = useCallback(async (
		listId: string,
		itemId: string,
	): Promise<void> => {
		await removeFromList(listId, itemId);

		// Update state
		dispatch({
			type: "UPDATE_LIST",
			payload: { id: listId, updates: { modifiedAt: new Date() } },
		});

		// If viewing this list, refresh items
		if (state.currentList?.id === listId) {
			const items = await getListItems(listId);
			dispatch({ type: "SET_CURRENT_LIST_ITEMS", payload: items });
		}
	}, [state.currentList?.id]);

	// Get all lists an item belongs to
	const getItemListsAction = useCallback(async (itemId: string): Promise<List[]> => {
		return getItemLists(itemId);
	}, []);

	// Check if item is in a list
	const isItemInListAction = useCallback(async (
		listId: string,
		itemId: string,
	): Promise<boolean> => {
		const lists = await getItemLists(itemId);
		return lists.some(l => l.id === listId);
	}, []);

	// Get synthetic list items
	const getSyntheticListItemsAction = useCallback(async (listId: string): Promise<string[]> => {
		return getSyntheticListItems(listId);
	}, []);

	// Refresh all lists
	const refreshLists = useCallback(async () => {
		await loadLists();
	}, [loadLists]);

	// Load lists on mount
	useEffect(() => {
		void loadLists();
	}, [loadLists]);

	const actions = {
		loadLists,
		loadList,
		createList: createListAction,
		updateList: updateListAction,
		deleteList: deleteListAction,
		addItemToList: addItemToListAction,
		removeItemFromList: removeItemFromListAction,
		getItemLists: getItemListsAction,
		isItemInList: isItemInListAction,
		getSyntheticListItems: getSyntheticListItemsAction,
		refreshLists,
	};

	return (
		<ListContext.Provider value={{ state, actions }}>
			{children}
		</ListContext.Provider>
	);
}

// ============================================================================
// Hook
// ============================================================================

export function useList() {
	const context = useContext(ListContext);
	if (!context) {
		throw new Error("useList must be used within a ListProvider");
	}
	return context;
}

// Legacy alias for backwards compatibility during migration
export const CollectionProvider = ListProvider;
export const useCollection = useList;
