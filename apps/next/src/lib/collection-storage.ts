import Dexie, { type EntityTable } from "dexie";

// ============================================================================
// Types
// ============================================================================

/** A user's list of items */
export interface List {
	// Identity
	id: string;
	name: string;
	description?: string;

	// Display
	icon?: string;              // Emoji or icon name
	color?: string;             // Accent color (hex or CSS)

	// Behavior
	isSystem?: boolean;         // true = can't delete (Starred/Owned/Built/Wishlist)

	// Timestamps
	createdAt: Date;
	modifiedAt: Date;

	// Future extensibility
	attributes?: Record<string, unknown>;
}

/** Many-to-many: item membership in a list */
export interface ListMembership {
	id: string;
	listId: string;
	itemId: string;             // Catalog item ID
	addedAt: Date;

	// Per-membership data
	notes?: string;

	// Future extensibility (e.g., wishlist priority, purchase info)
	attributes?: Record<string, unknown>;
}

/** User preferences */
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

/** Filter types that can be tracked */
export type FilterType = "grades" | "categories" | "series" | "brands" | "scales" | "years";

/** Tracks usage of individual filters for dynamic quick filters */
export interface FilterUsage {
	id: string;                 // Compound: `${filterType}:${filterId}`
	filterType: FilterType;
	filterId: string;           // e.g., "hg", "mg", "2024"
	usageCount: number;
	lastUsedAt: Date;
}

/** Synthetic list definition (computed, not stored) */
export interface SyntheticList {
	id: string;
	name: string;
	description?: string;
	icon?: string;
	expression: {
		op: "difference" | "intersection" | "union";
		left: string;   // list ID
		right: string;  // list ID
	};
}

// ============================================================================
// System Lists
// ============================================================================

/** Default system lists created for all users */
export const SYSTEM_LISTS: Array<Omit<List, "createdAt" | "modifiedAt">> = [
	{ id: "bookmarked", name: "Bookmarked", description: "Your favorite items", icon: "bookmark", isSystem: true },
	{ id: "owned", name: "Owned", description: "Items you currently own", icon: "package", isSystem: true },
	{ id: "built", name: "Built", description: "Items you have completed building", icon: "hammer", isSystem: true },
	{ id: "wishlist", name: "Wishlist", description: "Items you want to acquire", icon: "sparkles", isSystem: true },
];

/** Synthetic lists (computed from set operations) */
export const SYNTHETIC_LISTS: SyntheticList[] = [
	{
		id: "backlog",
		name: "Backlog",
		description: "Owned items not yet built",
		icon: "clipboard-list",
		expression: { op: "difference", left: "owned", right: "built" },
	},
];

// ============================================================================
// Database
// ============================================================================

const DEFAULT_ITEMS_PER_PAGE = 24;
const ID_RANDOM_BASE = 36;
const ID_SLICE_START = 2;
const ID_SLICE_END = 9;
const LIST_ITEM_COMPOUND_INDEX = "[listId+itemId]";

export class ListDatabase extends Dexie {
	lists!: EntityTable<List, "id">;
	listMemberships!: EntityTable<ListMembership, "id">;
	userPreferences!: EntityTable<UserPreferences, "id">;
	filterUsage!: EntityTable<FilterUsage, "id">;

	constructor() {
		super("hobby-ninja-lists-db");

		this.version(1).stores({
			lists: "id, name, isSystem, createdAt, modifiedAt",
			listMemberships: "id, listId, itemId, [listId+itemId], addedAt",
			userPreferences: "id",
		});

		// Version 2: Add filter usage tracking
		this.version(2).stores({
			lists: "id, name, isSystem, createdAt, modifiedAt",
			listMemberships: "id, listId, itemId, [listId+itemId], addedAt",
			userPreferences: "id",
			filterUsage: "id, filterType, usageCount, lastUsedAt",
		});
	}

	// ========================================================================
	// List Operations
	// ========================================================================

	async getAllLists(): Promise<List[]> {
		return this.lists.toArray();
	}

	async getList(id: string): Promise<List | undefined> {
		return this.lists.get(id);
	}

	async createList(list: Omit<List, "id" | "createdAt" | "modifiedAt">): Promise<string> {
		const now = new Date();
		const id = `list-${Date.now()}-${Math.random().toString(ID_RANDOM_BASE).slice(ID_SLICE_START, ID_SLICE_END)}`;
		await this.lists.add({
			...list,
			id,
			createdAt: now,
			modifiedAt: now,
		});
		return id;
	}

	async updateList(id: string, updates: Partial<Omit<List, "id" | "createdAt">>): Promise<void> {
		await this.lists.update(id, { ...updates, modifiedAt: new Date() });
	}

	async deleteList(id: string): Promise<void> {
		const list = await this.lists.get(id);
		if (list?.isSystem) {
			throw new Error("Cannot delete system list");
		}
		// Delete all memberships first
		await this.listMemberships.where("listId").equals(id).delete();
		// Then delete the list
		await this.lists.delete(id);
	}

	// ========================================================================
	// Membership Operations
	// ========================================================================

	async getListItems(listId: string): Promise<ListMembership[]> {
		return this.listMemberships.where("listId").equals(listId).toArray();
	}

	async getItemLists(itemId: string): Promise<List[]> {
		const memberships = await this.listMemberships.where("itemId").equals(itemId).toArray();
		const listIds = memberships.map(m => m.listId);
		return this.lists.where("id").anyOf(listIds).toArray();
	}

	async isInList(listId: string, itemId: string): Promise<boolean> {
		const count = await this.listMemberships
			.where(LIST_ITEM_COMPOUND_INDEX)
			.equals([listId, itemId])
			.count();
		return count > 0;
	}

	async addToList(
		listId: string,
		itemId: string,
		data?: { notes?: string; attributes?: Record<string, unknown> },
	): Promise<string> {
		// Check if already in list
		const existing = await this.listMemberships
			.where(LIST_ITEM_COMPOUND_INDEX)
			.equals([listId, itemId])
			.first();

		if (existing) {
			return existing.id;
		}

		const id = `mem-${Date.now()}-${Math.random().toString(ID_RANDOM_BASE).slice(ID_SLICE_START, ID_SLICE_END)}`;
		await this.listMemberships.add({
			id,
			listId,
			itemId,
			addedAt: new Date(),
			notes: data?.notes,
			attributes: data?.attributes,
		});

		// Update list modifiedAt
		await this.lists.update(listId, { modifiedAt: new Date() });

		return id;
	}

	async removeFromList(listId: string, itemId: string): Promise<void> {
		await this.listMemberships
			.where(LIST_ITEM_COMPOUND_INDEX)
			.equals([listId, itemId])
			.delete();

		// Update list modifiedAt
		await this.lists.update(listId, { modifiedAt: new Date() });
	}

	async updateMembership(
		listId: string,
		itemId: string,
		updates: Partial<Pick<ListMembership, "notes" | "attributes">>,
	): Promise<void> {
		const membership = await this.listMemberships
			.where(LIST_ITEM_COMPOUND_INDEX)
			.equals([listId, itemId])
			.first();

		if (membership) {
			await this.listMemberships.update(membership.id, updates);
		}
	}

	async getListItemCount(listId: string): Promise<number> {
		return this.listMemberships.where("listId").equals(listId).count();
	}

	// ========================================================================
	// Synthetic List Operations
	// ========================================================================

	async getSyntheticListItems(syntheticListId: string): Promise<string[]> {
		const definition = SYNTHETIC_LISTS.find(s => s.id === syntheticListId);
		if (!definition) {
			return [];
		}

		const { op, left, right } = definition.expression;

		const leftMemberships = await this.listMemberships.where("listId").equals(left).toArray();
		const leftItems = new Set(leftMemberships.map(m => m.itemId));

		const rightMemberships = await this.listMemberships.where("listId").equals(right).toArray();
		const rightItems = new Set(rightMemberships.map(m => m.itemId));

		switch (op) {
			case "difference": {
				return [...leftItems].filter(id => !rightItems.has(id));
			}
			case "intersection": {
				return [...leftItems].filter(id => rightItems.has(id));
			}
			case "union": {
				return [...new Set([...leftItems, ...rightItems])];
			}
		}
	}

	// ========================================================================
	// Preferences
	// ========================================================================

	async getPreferences(): Promise<UserPreferences> {
		const prefs = await this.userPreferences.get("default");
		return prefs ?? {
			id: "default",
			theme: "auto",
			language: "en",
			defaultCurrency: "JPY",
			gridView: "grid",
			itemsPerPage: DEFAULT_ITEMS_PER_PAGE,
			showAdvancedFilters: false,
			autoSaveSearch: true,
		};
	}

	async updatePreferences(updates: Partial<Omit<UserPreferences, "id">>): Promise<void> {
		const existing = await this.userPreferences.get("default");
		await (existing
			? this.userPreferences.update("default", updates)
			: this.userPreferences.add({
				id: "default",
				theme: "auto",
				language: "en",
				defaultCurrency: "JPY",
				gridView: "grid",
				itemsPerPage: DEFAULT_ITEMS_PER_PAGE,
				showAdvancedFilters: false,
				autoSaveSearch: true,
				...updates,
			}));
	}

	// ========================================================================
	// Filter Usage Tracking
	// ========================================================================

	/**
	 * Increment usage count for a filter.
	 * Call this when a filter is toggled ON (not when toggled off).
	 */
	async incrementFilterUsage(filterType: FilterType, filterId: string): Promise<void> {
		const id = `${filterType}:${filterId}`;
		const existing = await this.filterUsage.get(id);

		await (existing ? this.filterUsage.update(id, {
			usageCount: existing.usageCount + 1,
			lastUsedAt: new Date(),
		}) : this.filterUsage.add({
			id,
			filterType,
			filterId,
			usageCount: 1,
			lastUsedAt: new Date(),
		}));
	}

	/**
	 * Get the most frequently used filters.
	 * @param limit Maximum number of filters to return
	 * @param filterTypes Optional array of filter types to include
	 */
	async getTopUsedFilters(limit = 10, filterTypes?: FilterType[]): Promise<FilterUsage[]> {
		// Get all and sort descending by usageCount (Dexie orderBy only supports ascending)
		const allFilters = await this.filterUsage.toArray();
		const sorted = allFilters.toSorted((a, b) => b.usageCount - a.usageCount);

		if (filterTypes && filterTypes.length > 0) {
			return sorted
				.filter(f => filterTypes.includes(f.filterType))
				.slice(0, limit);
		}

		return sorted.slice(0, limit);
	}

	/**
	 * Get filter usage for a specific filter type.
	 */
	async getFilterUsageByType(filterType: FilterType): Promise<FilterUsage[]> {
		const filters = await this.filterUsage
			.where("filterType")
			.equals(filterType)
			.toArray();
		return filters.toSorted((a, b) => b.usageCount - a.usageCount);
	}

	/**
	 * Clear all filter usage data (for testing/reset).
	 */
	async clearFilterUsage(): Promise<void> {
		await this.filterUsage.clear();
	}

	// ========================================================================
	// Initialization
	// ========================================================================

	async ensureSystemLists(): Promise<void> {
		const existingLists = await this.lists.toArray();
		const now = new Date();

		for (const systemList of SYSTEM_LISTS) {
			const exists = existingLists.some(l => l.id === systemList.id);
			if (!exists) {
				await this.lists.add({
					...systemList,
					createdAt: now,
					modifiedAt: now,
				});
			}
		}
	}
}

// ============================================================================
// Singleton & Initialization
// ============================================================================

export const db = new ListDatabase();

export async function initializeDatabase(): Promise<void> {
	await db.open();
	await db.ensureSystemLists();
}

// ============================================================================
// Convenience Exports
// ============================================================================

// List operations
export const getLists = () => db.getAllLists();
export const getList = (id: string) => db.getList(id);
export const createList = (list: Omit<List, "id" | "createdAt" | "modifiedAt">) => db.createList(list);
export const updateList = (id: string, updates: Partial<Omit<List, "id" | "createdAt">>) => db.updateList(id, updates);
export const deleteList = (id: string) => db.deleteList(id);

// Membership operations
export const getListItems = (listId: string) => db.getListItems(listId);
export const getItemLists = (itemId: string) => db.getItemLists(itemId);
export const isInList = (listId: string, itemId: string) => db.isInList(listId, itemId);
export const addToList = (
	listId: string,
	itemId: string,
	data?: { notes?: string; attributes?: Record<string, unknown> },
) => db.addToList(listId, itemId, data);
export const removeFromList = (listId: string, itemId: string) => db.removeFromList(listId, itemId);
export const getListItemCount = (listId: string) => db.getListItemCount(listId);

// Synthetic lists
export const getSyntheticListItems = (syntheticListId: string) => db.getSyntheticListItems(syntheticListId);

// Preferences
export const getPreferences = () => db.getPreferences();
export const updatePreferences = (updates: Partial<Omit<UserPreferences, "id">>) => db.updatePreferences(updates);

// Filter usage tracking
export const incrementFilterUsage = (filterType: FilterType, filterId: string) =>
	db.incrementFilterUsage(filterType, filterId);
export const getTopUsedFilters = (limit?: number, filterTypes?: FilterType[]) =>
	db.getTopUsedFilters(limit, filterTypes);
export const getFilterUsageByType = (filterType: FilterType) =>
	db.getFilterUsageByType(filterType);
export const clearFilterUsage = () => db.clearFilterUsage();
