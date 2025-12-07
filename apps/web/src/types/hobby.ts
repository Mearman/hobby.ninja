/**
 * Universal hobby type definitions and configuration
 * Supports any hobby type with dynamic fields and validation
 */

export interface HobbyType {
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

export interface HobbyField {
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
  defaultValue?: any;
  order: number;
}

export interface FieldValidation {
  min?: number;
  max?: number;
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  format?: "email" | "url" | "date" | "currency";
}

export interface FieldOption {
  label: string;
  value: string;
  color?: string;
  icon?: string;
}

export interface HobbySettings {
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

export interface UniversalItem {
  id: string;
  hobbyType: string;
  data: Record<string, any>;
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

export interface ItemImage {
  id: string;
  url: string;
  thumbnail?: string;
  caption?: string;
  isPrimary?: boolean;
  order: number;
}

export type ItemStatus =
  | "wanted"
  | "ordered"
  | "owned"
  | "building"
  | "completed"
  | "for_sale"
  | "traded"
  | "lost"
  | "archived";

export interface PurchaseInfo {
  date?: string;
  price?: number;
  currency?: string;
  seller?: string;
  store?: string;
  link?: string;
  condition?: "new" | "used" | "refurbished";
  receiptUrl?: string;
}

export interface ItemMetadata {
  source?: "manual" | "scan" | "user_input" | "import" | "reference_database";
  sourceId?: string;
  sourceUrl?: string;
  confidence?: number;
  lastSync?: string;
  version?: string;
}

export interface Collection {
  id: string;
  hobbyType: string;
  name: string;
  description?: string;
  isPublic: boolean;
  isDefault: boolean;
  tags: string[];
  items: string[]; // Item IDs
  filters?: Record<string, any>;
  settings: CollectionSettings;
  statistics: CollectionStatistics;
  owner: string;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionSettings {
  allowPublicView: boolean;
  allowComments: boolean;
  allowRating: boolean;
  allowSharing: boolean;
  requireApproval: boolean;
  autoSync: boolean;
}

export interface CollectionStatistics {
  totalItems: number;
  totalValue?: number;
  completionRate?: number;
  averageRating?: number;
  lastUpdated: string;
  breakdown: Record<string, number>; // Status breakdown
}

export interface CollectionImport {
  format: "csv" | "json" | "excel" | "airtable" | "google_sheets";
  hobbyType: string;
  mapping: FieldMapping[];
  data: any[];
  options: ImportOptions;
}

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  transform?: string;
  required: boolean;
}

export interface ImportOptions {
  skipInvalidRows: boolean;
  updateExisting: boolean;
  generateIds: boolean;
  batchSize?: number;
}

// Predefined hobby types
export const BUILT_IN_HOBBY_TYPES: HobbyType[] = [
	{
		id: "model_kits",
		name: "Model Kits",
		icon: "🤖",
		description: "Plastic model kits, gunpla, airfix, Tamiya, etc.",
		category: "modeling",
		color: "blue",
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
				order: 1,
			},
			{
				id: "brand",
				name: "Brand/Manufacturer",
				key: "brand",
				type: "text",
				required: false,
				searchable: true,
				filterable: true,
				displayInList: true,
				displayInDetail: true,
				order: 2,
			},
			{
				id: "scale",
				name: "Scale",
				key: "scale",
				type: "select",
				required: false,
				searchable: false,
				filterable: true,
				displayInList: true,
				displayInDetail: true,
				options: [
					{ label: "1/144", value: "1/144" },
					{ label: "1/100", value: "1/100" },
					{ label: "1/72", value: "1/72" },
					{ label: "1/48", value: "1/48" },
					{ label: "1/35", value: "1/35" },
					{ label: "1/24", value: "1/24" },
					{ label: "Other", value: "other" },
				],
				order: 3,
			},
			{
				id: "grade",
				name: "Grade/Class",
				key: "grade",
				type: "select",
				required: false,
				searchable: false,
				filterable: true,
				displayInList: true,
				displayInDetail: true,
				options: [
					{ label: "HG", value: "HG" },
					{ label: "RG", value: "RG" },
					{ label: "MG", value: "MG" },
					{ label: "PG", value: "PG" },
					{ label: "SD", value: "SD" },
					{ label: "Entry Grade", value: "EG" },
					{ label: "High Grade", value: "high_grade" },
					{ label: "Real Grade", value: "real_grade" },
					{ label: "Master Grade", value: "master_grade" },
					{ label: "Perfect Grade", value: "perfect_grade" },
					{ label: "Other", value: "other" },
				],
				order: 4,
			},
			{
				id: "series",
				name: "Series",
				key: "series",
				type: "text",
				required: false,
				searchable: true,
				filterable: true,
				displayInList: false,
				displayInDetail: true,
				order: 5,
			},
			{
				id: "releaseDate",
				name: "Release Date",
				key: "releaseDate",
				type: "date",
				required: false,
				searchable: false,
				filterable: true,
				displayInList: false,
				displayInDetail: true,
				order: 6,
			},
			{
				id: "price",
				name: "Price",
				key: "price",
				type: "currency",
				required: false,
				searchable: false,
				filterable: true,
				displayInList: false,
				displayInDetail: true,
				validation: { min: 0 },
				order: 7,
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
			maxImages: 10,
			supportedExportFormats: ["json", "csv", "excel"],
			defaultSortField: "name",
			defaultViewMode: "grid",
		},
		isActive: true,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	},
	{
		id: "trading_cards",
		name: "Trading Cards",
		icon: "🃏",
		description: "Pokémon, Magic: The Gathering, sports cards, etc.",
		category: "collectibles",
		color: "purple",
		fields: [
			{
				id: "name",
				name: "Card Name",
				key: "name",
				type: "text",
				required: true,
				searchable: true,
				filterable: false,
				displayInList: true,
				displayInDetail: true,
				order: 1,
			},
			{
				id: "set",
				name: "Set/Expansion",
				key: "set",
				type: "text",
				required: false,
				searchable: true,
				filterable: true,
				displayInList: true,
				displayInDetail: true,
				order: 2,
			},
			{
				id: "cardNumber",
				name: "Card Number",
				key: "cardNumber",
				type: "text",
				required: false,
				searchable: true,
				filterable: false,
				displayInList: true,
				displayInDetail: true,
				order: 3,
			},
			{
				id: "rarity",
				name: "Rarity",
				key: "rarity",
				type: "select",
				required: false,
				searchable: false,
				filterable: true,
				displayInList: true,
				displayInDetail: true,
				options: [
					{ label: "Common", value: "common" },
					{ label: "Uncommon", value: "uncommon" },
					{ label: "Rare", value: "rare" },
					{ label: "Mythic Rare", value: "mythic_rare" },
					{ label: "Legendary", value: "legendary" },
					{ label: "Secret Rare", value: "secret_rare" },
					{ label: "Promo", value: "promo" },
				],
				order: 4,
			},
			{
				id: "type",
				name: "Card Type",
				key: "type",
				type: "select",
				required: false,
				searchable: false,
				filterable: true,
				displayInList: false,
				displayInDetail: true,
				options: [
					{ label: "Creature", value: "creature" },
					{ label: "Instant", value: "instant" },
					{ label: "Sorcery", value: "sorcery" },
					{ label: "Enchantment", value: "enchantment" },
					{ label: "Artifact", value: "artifact" },
					{ label: "Land", value: "land" },
					{ label: "Planeswalker", value: "planeswalker" },
				],
				order: 5,
			},
			{
				id: "condition",
				name: "Condition",
				key: "condition",
				type: "select",
				required: false,
				searchable: false,
				filterable: true,
				displayInList: true,
				displayInDetail: true,
				options: [
					{ label: "Mint", value: "mint", color: "green" },
					{ label: "Near Mint", value: "near_mint", color: "blue" },
					{ label: "Excellent", value: "excellent", color: "cyan" },
					{ label: "Good", value: "good", color: "yellow" },
					{ label: "Played", value: "played", color: "orange" },
					{ label: "Damaged", value: "damaged", color: "red" },
				],
				order: 6,
			},
		],
		settings: {
			allowCustomItems: true,
			allowImages: true,
			allowNotes: true,
			allowTags: true,
			allowRating: false,
			allowStatus: true,
			allowQuantity: true,
			allowPurchaseInfo: true,
			maxImages: 5,
			supportedExportFormats: ["json", "csv", "excel"],
			defaultSortField: "name",
			defaultViewMode: "grid",
		},
		isActive: true,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	},
	{
		id: "miniatures",
		name: "Miniatures",
		icon: "🎭",
		description: "Warhammer, D&D, Flames of War, etc.",
		category: "gaming",
		color: "red",
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
				order: 1,
			},
			{
				id: "game",
				name: "Game System",
				key: "game",
				type: "select",
				required: false,
				searchable: false,
				filterable: true,
				displayInList: true,
				displayInDetail: true,
				options: [
					{ label: "Warhammer 40k", value: "warhammer_40k" },
					{ label: "Warhammer Age of Sigmar", value: "warhammer_aos" },
					{ label: "Dungeons & Dragons", value: "dnd" },
					{ label: "Pathfinder", value: "pathfinder" },
					{ label: "Flames of War", value: "flames_of_war" },
					{ label: "Malifaux", value: "malifaux" },
					{ label: "Infinity", value: "infinity" },
					{ label: "X-Wing", value: "x_wing" },
				],
				order: 2,
			},
			{
				id: "faction",
				name: "Faction",
				key: "faction",
				type: "text",
				required: false,
				searchable: true,
				filterable: true,
				displayInList: true,
				displayInDetail: true,
				order: 3,
			},
			{
				id: "pointValue",
				name: "Point Value",
				key: "pointValue",
				type: "number",
				required: false,
				searchable: false,
				filterable: true,
				displayInList: false,
				displayInDetail: true,
				validation: { min: 0 },
				order: 4,
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
			maxImages: 8,
			supportedExportFormats: ["json", "csv", "excel"],
			defaultSortField: "name",
			defaultViewMode: "grid",
		},
		isActive: true,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	},
	{
		id: "other",
		name: "Other",
		icon: "📦",
		description: "Custom hobby type - define your own fields",
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
				order: 1,
			},
			{
				id: "category",
				name: "Category",
				key: "category",
				type: "text",
				required: false,
				searchable: true,
				filterable: true,
				displayInList: true,
				displayInDetail: true,
				order: 2,
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
			maxImages: 10,
			supportedExportFormats: ["json", "csv"],
			defaultSortField: "name",
			defaultViewMode: "grid",
		},
		isActive: true,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	},
];

export const DEFAULT_HOBBY_TYPE = "model_kits";