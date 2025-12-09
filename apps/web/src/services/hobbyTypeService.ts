/**
 * Service for managing hobby types from public data and user customizations
 * Loads configuration from public/config/hobby-types.json and merges with user data
 */

import { HobbyType } from "../types/hobby";


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

export interface PublicHobbyType {
  id: string;
  name: string;
  description: string;
  brands?: string[];
  categories?: string[];
  scales?: string[];
  difficulty_levels?: string[];
  rarities?: string[];
  card_types?: string[];
  materials?: string[];
}

export interface HobbyTypeStats {
  totalCollections: number;
  totalItems: number;
  recentItems: number;
}

// Constants
const CACHE_DURATION_MINUTES = FIVE;
const CACHE_DURATION_MS = CACHE_DURATION_MINUTES * 60 * THOUSAND;

export class HobbyTypeService {
	private cache = new Map<string, HobbyType[]>();
	private lastFetch = ZERO;
	private readonly CACHE_DURATION = CACHE_DURATION_MS;

	/**
   * Get all available hobby types (public + user custom)
   */
	async getHobbyTypes(): Promise<HobbyType[]> {
		const now = Date.now();

		// Return cached data if still valid
		if (this.cache.has("all") && now - this.lastFetch < this.CACHE_DURATION) {
			return this.cache.get("all")!;
		}

		try {
			// Load public hobby types
			const publicTypes = await this.loadPublicHobbyTypes();

			// Load user custom hobby types from localStorage
			const userTypes = await this.loadUserHobbyTypes();

			// Merge public and user types (user types override if same ID)
			const mergedTypes = this.mergeHobbyTypes(publicTypes, userTypes);

			// Cache the result
			this.cache.set("all", mergedTypes);
			this.lastFetch = now;

			return mergedTypes;
		} catch (error) {
			console.error("Failed to load hobby types:", error);
			// Return fallback built-in types
			return this.getFallbackHobbyTypes();
		}
	}

	/**
   * Get hobby type by ID
   */
	async getHobbyType(id: string): Promise<HobbyType | null> {
		const hobbyTypes = await this.getHobbyTypes();
		return hobbyTypes.find(ht => ht.id === id) || null;
	}

	/**
   * Get statistics for a hobby type (from user collections + public data)
   */
	async getHobbyTypeStats(hobbyTypeId: string): Promise<HobbyTypeStats> {
		try {
			// Load user collections for this hobby type
			const userCollections = await this.loadUserCollections(hobbyTypeId);

			// Load public data stats (could be enhanced with actual API calls)
			const publicStats = await this.getPublicDataStats(hobbyTypeId);

			return {
				totalCollections: userCollections.length + publicStats.collections,
				totalItems: userCollections.reduce((sum, coll) => sum + coll.itemCount, ZERO) + publicStats.items,
				recentItems: publicStats.recentItems, // Items added recently from public data
			};
		} catch (error) {
			console.error(`Failed to get stats for hobby type ${hobbyTypeId}:`, error);
			return {
				totalCollections: ZERO,
				totalItems: ZERO,
				recentItems: ZERO,
			};
		}
	}

	/**
   * Create custom hobby type
   */
	async createCustomHobbyType(hobbyType: Omit<HobbyType, "id" | "createdAt" | "updatedAt">): Promise<HobbyType> {
		const newHobbyType: HobbyType = {
			...hobbyType,
			id: this.generateId(),
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		// Save to localStorage
		const userTypes = await this.loadUserHobbyTypes();
		userTypes.push(newHobbyType);
		await this.saveUserHobbyTypes(userTypes);

		// Clear cache
		this.cache.clear();

		return newHobbyType;
	}

	/**
   * Update custom hobby type
   */
	async updateCustomHobbyType(id: string, updates: Partial<HobbyType>): Promise<HobbyType> {
		const userTypes = await this.loadUserHobbyTypes();
		const index = userTypes.findIndex(ht => ht.id === id);

		if (index === -ONE) {
			throw new Error(`Custom hobby type not found: ${id}`);
		}

		userTypes[index] = {
			...userTypes[index],
			...updates,
			updatedAt: new Date().toISOString(),
		};

		await this.saveUserHobbyTypes(userTypes);

		// Clear cache
		this.cache.clear();

		return userTypes[index];
	}

	/**
   * Delete custom hobby type
   */
	async deleteCustomHobbyType(id: string): Promise<void> {
		const userTypes = await this.loadUserHobbyTypes();
		const filteredTypes = userTypes.filter(ht => ht.id !== id);

		await this.saveUserHobbyTypes(filteredTypes);

		// Clear cache
		this.cache.clear();
	}

	// Private methods

	private async loadPublicHobbyTypes(): Promise<HobbyType[]> {
		try {
			const response = await fetch("/data/config/hobby-types.json");
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const publicTypes: PublicHobbyType[] = await response.json();

			// Convert public format to HobbyType format
			return publicTypes.map(pt => this.convertPublicToHobbyType(pt));
		} catch (error) {
			console.error("Failed to load public hobby types:", error);
			return [];
		}
	}

	private convertPublicToHobbyType(publicType: PublicHobbyType): HobbyType {
		// Determine icon and color based on ID
		const iconMap: Record<string, string> = {
			"gunpla": "🤖",
			"action-figures": "🦸",
			"model-kits": "🔧",
			"trading-cards": "🃏",
			"miniatures": "🎭",
		};

		const colorMap: Record<string, string> = {
			"gunpla": "blue",
			"action-figures": "red",
			"model-kits": "green",
			"trading-cards": "purple",
			"miniatures": "orange",
		};

		return {
			id: publicType.id,
			name: publicType.name,
			icon: iconMap[publicType.id] || "📦",
			description: publicType.description,
			category: this.inferCategory(publicType.id),
			color: colorMap[publicType.id] || "gray",
			fields: this.generateFieldsForHobbyType(publicType),
			settings: {
				allowCustomItems: true,
				allowImages: true,
				allowNotes: true,
				allowTags: true,
				allowRating: true,
				allowStatus: true,
				allowQuantity: true,
				allowPurchaseInfo: true,
				supportedExportFormats: ["json", "csv", "excel"],
				defaultSortField: "name",
				defaultViewMode: "grid",
			},
			isActive: true,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};
	}

	private inferCategory(hobbyTypeId: string): string {
		if (hobbyTypeId.includes("gunpla") || hobbyTypeId.includes("model")) {
			return "modeling";
		}
		if (hobbyTypeId.includes("card")) {
			return "cards";
		}
		if (hobbyTypeId.includes("figure") || hobbyTypeId.includes("miniature")) {
			return "figures";
		}
		return "other";
	}

	private generateFieldsForHobbyType(publicType: PublicHobbyType) {
		const baseFields = [
			{
				id: "name",
				name: "Name",
				key: "name",
				type: "text" as const,
				required: true,
				searchable: true,
				filterable: false,
				displayInList: true,
				displayInDetail: true,
				order: ONE,
			},
			{
				id: "brand",
				name: "Brand",
				key: "brand",
				type: "select" as const,
				required: false,
				searchable: true,
				filterable: true,
				displayInList: true,
				displayInDetail: true,
				options: publicType.brands?.map(brand => ({ label: brand, value: brand })) || [],
				order: TWO,
			},
		];

		// Add hobby-specific fields based on type
		if (publicType.id === "model_kits" && publicType.difficulty_levels?.length) {
			baseFields.push({
				id: "difficulty_level",
				name: "Difficulty Level",
				key: "difficulty_level",
				type: "select" as const,
				required: false,
				searchable: false,
				filterable: true,
				displayInList: true,
				displayInDetail: true,
				options: publicType.difficulty_levels.map(level => ({ label: level, value: level })),
				order: THREE,
			});
		}

		if (publicType.id === "trading_cards" && publicType.rarities?.length) {
			baseFields.push({
				id: "rarity",
				name: "Rarity",
				key: "rarity",
				type: "select" as const,
				required: false,
				searchable: false,
				filterable: true,
				displayInList: true,
				displayInDetail: true,
				options: publicType.rarities.map(rarity => ({ label: rarity, value: rarity })),
				order: THREE,
			});
		}

		if (publicType.id === "trading_cards" && publicType.card_types?.length) {
			baseFields.push({
				id: "card_type",
				name: "Card Type",
				key: "card_type",
				type: "select" as const,
				required: false,
				searchable: false,
				filterable: true,
				displayInList: true,
				displayInDetail: true,
				options: publicType.card_types.map(type => ({ label: type, value: type })),
				order: FOUR,
			});
		}

		if (publicType.id === "action_figures" && publicType.materials?.length) {
			baseFields.push({
				id: "material",
				name: "Material",
				key: "material",
				type: "select" as const,
				required: false,
				searchable: false,
				filterable: true,
				displayInList: false,
				displayInDetail: true,
				options: publicType.materials.map(material => ({ label: material, value: material })),
				order: THREE,
			});
		}

		if (publicType.id === "miniatures" && publicType.materials?.length) {
			baseFields.push({
				id: "material",
				name: "Material",
				key: "material",
				type: "select" as const,
				required: false,
				searchable: false,
				filterable: true,
				displayInList: false,
				displayInDetail: true,
				options: publicType.materials.map(material => ({ label: material, value: material })),
				order: THREE,
			});
		}

		if (publicType.scales?.length) {
			baseFields.push({
				id: "scale",
				name: "Scale",
				key: "scale",
				type: "select" as const,
				required: false,
				searchable: false,
				filterable: true,
				displayInList: true,
				displayInDetail: true,
				options: publicType.scales.map(scale => ({ label: scale, value: scale })),
				order: FOUR,
			});
		}

		// Add common fields
		baseFields.push(
			{
				id: "price",
				name: "Price",
				key: "price",
				type: "text",
				required: false,
				searchable: false,
				filterable: true,
				displayInList: false,
				displayInDetail: true,
				order: FIVE,
			},
			{
				id: "releaseDate",
				name: "Release Date",
				key: "releaseDate",
				type: "text" as const,
				required: false,
				searchable: false,
				filterable: true,
				displayInList: false,
				displayInDetail: true,
				order: SIX,
			},
		);

		return baseFields;
	}

	private async loadUserHobbyTypes(): Promise<HobbyType[]> {
		try {
			const stored = localStorage.getItem("custom_hobby_types");
			return stored ? JSON.parse(stored) : [];
		} catch (error) {
			console.error("Failed to load user hobby types:", error);
			return [];
		}
	}

	private async saveUserHobbyTypes(hobbyTypes: HobbyType[]): Promise<void> {
		try {
			localStorage.setItem("custom_hobby_types", JSON.stringify(hobbyTypes));
		} catch (error) {
			console.error("Failed to save user hobby types:", error);
			throw error;
		}
	}

	private mergeHobbyTypes(publicTypes: HobbyType[], userTypes: HobbyType[]): HobbyType[] {
		const typeMap = new Map<string, HobbyType>();

		// Add all public types
		for (const pt of publicTypes) typeMap.set(pt.id, pt);

		// Override/add user types
		for (const ut of userTypes) typeMap.set(ut.id, ut);

		// Convert to array and sort by name
		return [...typeMap.values()].sort((a, b) => a.name.localeCompare(b.name));
	}

	private async loadUserCollections(hobbyTypeId: string): Promise<Array<{ name: string; itemCount: number }>> {
		try {
			const collectionsData = localStorage.getItem("hobby_ninja_collections");
			if (!collectionsData) return [];

			const parsed = JSON.parse(collectionsData);
			const collections = parsed.collections || [];

			return collections
				.filter((coll: { hobbyType: string; name: string; items?: unknown[] }) => coll.hobbyType === hobbyTypeId)
				.map((coll: { hobbyType: string; name: string; items?: unknown[] }) => ({
					name: coll.name,
					itemCount: coll.items?.length || ZERO,
				}));
		} catch (error) {
			console.error("Failed to load user collections:", error);
			return [];
		}
	}

	private async getPublicDataStats(hobbyTypeId: string): Promise<{ collections: number; items: number; recentItems: number }> {
		try {
			// For now, return placeholder data
			// In future, this could make API calls to actual data endpoints
			switch (hobbyTypeId) {
				case "gunpla": {
					return { collections: ONE, items: 5966, recentItems: 45 };
				} // Based on unified products
				case "action-figures": {
					return { collections: ZERO, items: ZERO, recentItems: ZERO };
				}
				case "model-kits": {
					return { collections: ZERO, items: ZERO, recentItems: ZERO };
				}
				default: {
					return { collections: ZERO, items: ZERO, recentItems: ZERO };
				}
			}
		} catch (error) {
			console.error("Failed to get public data stats:", error);
			return { collections: ZERO, items: ZERO, recentItems: ZERO };
		}
	}

	private getFallbackHobbyTypes(): HobbyType[] {
		// Return minimal fallback hobby types if everything fails
		return [
			{
				id: "other",
				name: "Other",
				icon: "📦",
				description: "Custom hobby collections",
				category: "other",
				color: "gray",
				fields: [
					{
						id: "name",
						name: "Name",
						key: "name",
						type: "text",
						required: true,
						searchable: true,
						filterable: false,
						displayInList: true,
						displayInDetail: true,
						order: ONE,
					},
				],
				settings: {
					allowCustomItems: true,
					allowImages: true,
					allowNotes: true,
					allowTags: true,
					allowRating: true,
					allowStatus: true,
					allowQuantity: true,
					allowPurchaseInfo: true,
					supportedExportFormats: ["json", "csv"],
					defaultSortField: "name",
					defaultViewMode: "grid",
				},
				isActive: true,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			},
		];
	}

	private generateId(): string {
		if (typeof crypto !== "undefined" && crypto.randomUUID) {
			return crypto.randomUUID();
		}
		return "custom_" + Date.now() + "_" + Math.random().toString(36).slice(TWO, 11);
	}
}

export const hobbyTypeService = new HobbyTypeService();