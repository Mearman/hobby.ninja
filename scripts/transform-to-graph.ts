#!/usr/bin/env tsx

/**
 * Transform existing public/data/ structure to graph-based format
 * Creates hobby-graph.json with nodes and relationships from existing data
 * Generates JSON schemas using Zod and includes them as references in the graph
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { z } from "zod";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface PublicHobbyType {
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

interface BandaiUnifiedItem {
  id: string;
  name: { ja: string; en: string };
  series?: { ja: string; en: string };
  grade?: string;
  scale?: string;
  releaseDate?: { year: number; month: number; day: number };
  sources: {
    catalog?: { id: string; confidence: number };
    manual?: { id: string; productNumber: string; pdfUrl: string };
  };
  matchMethod: string;
  createdAt: string;
  updatedAt: string;
}

// Graph node types
type NodeType = "hobby_type" | "brand" | "scale" | "category" | "field" | "attribute" | "value";
type RelationshipType = "HAS_BRAND" | "HAS_SCALE" | "HAS_CATEGORY" | "HAS_PROPERTY" | "HAS_FIELD" | "HAS_VALUE" | "RELATES_TO" | "INSTANCE_OF" | "SUBTYPE_OF" | "CONNECTED_TO" | "SIMILAR_TO";

type PropertyValue = string | number | boolean | unknown[] | Record<string, unknown> | Date | null | undefined;

interface GraphNode {
  id: string;
  type: NodeType;
  properties?: Record<string, PropertyValue>;
  metadata?: {
    createdAt?: string;
    updatedAt?: string;
    version?: string;
  };
}

interface GraphRelationship {
  id: string;
  type: RelationshipType;
  fromNode: string;
  toNode: string;
  directed?: boolean; // true for directed edges, false/undefined for undirected
  properties?: Record<string, PropertyValue>;
  metadata?: {
    createdAt?: string;
    updatedAt?: string;
    strength?: number; // Relationship strength (0-1), used as edge weight in algorithms
    confidence?: number; // Confidence score for automated relationships
  };
}

interface HobbyGraph {
  nodes: GraphNode[];
  relationships: GraphRelationship[];
  schemas: Record<string, string>; // Zod schema definitions
  metadata: {
    version: string;
    createdAt: string;
    updatedAt: string;
    description?: string;
  };
}

class DataTransformer {
	private nodes = new Map<string, GraphNode>();
	private relationships: GraphRelationship[] = [];
	private brandRegistry = new Set<string>();
	private scaleRegistry = new Set<string>();
	private categoryRegistry = new Set<string>();
	private schemas: Record<string, unknown> = {};

	async transform(): Promise<HobbyGraph> {
		console.log("Starting data transformation to graph format...");

		// Load existing data
		const hobbyTypes = await this.loadHobbyTypes();
		const bandaiData = await this.loadBandaiData();

		// Process hobby types
		this.processHobbyTypes(hobbyTypes);

		// Process Bandai data to extract real brands, scales, etc.
		this.processBandaiData(bandaiData);

		// Build relationships
		this.buildRelationships(hobbyTypes);

		// TODO: Generate JSON schemas using Zod (will implement separately)
		// await this.generateSchemas(hobbyTypes);

		// Create final graph
		const graph: HobbyGraph = {
			nodes: [...this.nodes.values()],
			relationships: this.relationships,
			schemas: this.schemas,
			metadata: {
				version: "1.0.0",
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				description: "Graph-based hobby configuration generated from existing data with Zod schemas",
			},
		};

		console.log(`Transformation complete: ${graph.nodes.length} nodes, ${graph.relationships.length} relationships`);
		return graph;
	}

	private async loadHobbyTypes(): Promise<Record<string, PublicHobbyType>> {
		try {
			const content = await fs.readFile(
				path.join(__dirname, "../apps/web/public/data/config/hobby-types.json"),
				"utf8",
			);
			return JSON.parse(content) as Record<string, PublicHobbyType>;
		} catch (error) {
			console.error("Failed to load hobby-types.json:", error);
			return {};
		}
	}

	private async loadBandaiData(): Promise<BandaiUnifiedItem[]> {
		try {
			const unifiedDir = path.join(__dirname, "../apps/web/public/data/bandai/unified");
			const files = await fs.readdir(unifiedDir);
			const jsonFiles = files.filter(file => file.endsWith(".json"));

			const items: BandaiUnifiedItem[] = [];
			for (const file of jsonFiles.slice(0, 100)) { // Limit for testing
				try {
					const content = await fs.readFile(path.join(unifiedDir, file), "utf8");
					const item = JSON.parse(content) as BandaiUnifiedItem;
					items.push(item);
				} catch (error) {
					console.warn(`Failed to parse ${file}:`, error);
				}
			}

			console.log(`Loaded ${items.length} Bandai items`);
			return items;
		} catch (error) {
			console.error("Failed to load Bandai data:", error);
			return [];
		}
	}

	private processHobbyTypes(hobbyTypes: Record<string, PublicHobbyType>) {
		for (const [id, hobbyType] of Object.entries(hobbyTypes)) {
			// Create hobby type node
			this.addNode({
				id: `hobby_${id}`,
				type: "hobby_type",
				properties: {
					name: hobbyType.name,
					description: hobbyType.description,
					icon: this.getIconForHobby(id),
					color: this.getColorForHobby(id),
					isActive: true,
				},
			});

			// Register brands
			if (hobbyType.brands) {
				for (const brand of hobbyType.brands) this.brandRegistry.add(brand);
			}

			// Register scales
			if (hobbyType.scales) {
				for (const scale of hobbyType.scales) this.scaleRegistry.add(scale);
			}

			// Register categories
			if (hobbyType.categories) {
				for (const category of hobbyType.categories) this.categoryRegistry.add(category);
			}

			// Create field nodes for hobby-specific attributes
			this.createFieldsForHobby(id, hobbyType);
		}
	}

	private processBandaiData(bandaiData: BandaiUnifiedItem[]) {
		console.log("Processing Bandai data to extract real-world values...");

		// Extract actual brands from Bandai data
		const brands = new Set<string>();
		const scales = new Set<string>();
		const grades = new Set<string>();
		const series = new Set<string>();

		for (const item of bandaiData) {
			// Extract from metadata (brands are typically embedded in series or grade)
			if (item.series?.en) {
				// Try to extract brand from series name
				const seriesName = item.series.en;
				if (seriesName.includes("Gundam") || seriesName.includes("Mobile Suit")) {
					brands.add("Bandai");
				}
				series.add(seriesName);
			}

			if (item.grade) {
				grades.add(item.grade);
			}

			if (item.scale) {
				scales.add(item.scale);
			}
		}

		// Add extracted brands to registry
		for (const brand of brands) this.brandRegistry.add(brand);

		// Create brand nodes
		for (const brand of this.brandRegistry) {
			this.addNode({
				id: `brand_${brand.toLowerCase().replaceAll(/\s+/g, "_")}`,
				type: "brand",
				properties: {
					name: brand,
					website: this.getBrandWebsite(brand),
					founded: this.getBrandFounded(brand),
					country: this.getBrandCountry(brand),
					specialties: this.getBrandSpecialties(brand),
				},
			});
		}

		// Create scale nodes
		for (const scale of this.scaleRegistry) {
			this.addNode({
				id: `scale_${scale.toLowerCase().replaceAll(/[^a-z0-9]/g, "_")}`,
				type: "scale",
				properties: {
					name: scale,
					description: this.getScaleDescription(scale),
					ratio: this.getScaleRatio(scale),
				},
			});
		}

		// Create grade/attribute nodes for Gundam modeling
		for (const grade of grades) {
			this.addNode({
				id: `attribute_${grade.toLowerCase().replaceAll(/\s+/g, "_")}`,
				type: "attribute",
				properties: {
					name: grade,
					category: "grade",
					description: `${grade} grade model kit`,
				},
			});
		}

		// Create category nodes
		for (const category of this.categoryRegistry) {
			this.addNode({
				id: `category_${category.toLowerCase().replaceAll(/\s+/g, "_")}`,
				type: "category",
				properties: {
					name: category,
					description: `${category} category`,
				},
			});
		}
	}

	private createFieldsForHobby(hobbyId: string, hobbyType: PublicHobbyType) {
		interface FieldDefinition {
			name: string;
			fieldType: string;
			required?: boolean;
			searchable?: boolean;
			filterable?: boolean;
			displayInList?: boolean;
			order?: number;
		}

		// Common base fields
		const commonFields: FieldDefinition[] = [
			{ name: "Name", fieldType: "text", required: true, searchable: true, order: 1 },
			{ name: "Brand", fieldType: "select", required: false, searchable: true, filterable: true, order: 2 },
			{ name: "Price", fieldType: "currency", required: false, filterable: true, order: 5 },
			{ name: "Release Date", fieldType: "date", required: false, filterable: true, order: 6 },
		];

		// Hobby-specific fields
		const hobbySpecificFieldNames: string[] = [];

		if (hobbyId === "model_kits") {
			if (hobbyType.scales?.length) {
				hobbySpecificFieldNames.push("Scale");
			}
			if (hobbyType.difficulty_levels?.length) {
				hobbySpecificFieldNames.push("Difficulty Level");
			}
			hobbySpecificFieldNames.push("Paint Scheme");
		}

		if (hobbyId === "trading_cards") {
			if (hobbyType.rarities?.length) hobbySpecificFieldNames.push("Rarity");
			if (hobbyType.card_types?.length) hobbySpecificFieldNames.push("Card Type");
		}

		if (hobbyId === "action_figures" || hobbyId === "miniatures") {
			if (hobbyType.materials?.length) hobbySpecificFieldNames.push("Material");
			if (hobbyType.scales?.length) hobbySpecificFieldNames.push("Scale");
		}

		// Convert hobby-specific field names to FieldDefinition objects
		const hobbySpecificFields: FieldDefinition[] = hobbySpecificFieldNames.map(name => ({
			name,
			fieldType: this.getFieldType(name),
		}));

		// Create field nodes
		const allFields = [...commonFields, ...hobbySpecificFields];
		for (const [index, field] of allFields.entries()) {
			this.addNode({
				id: `field_${hobbyId}_${field.name.toLowerCase().replaceAll(/\s+/g, "_")}`,
				type: "field",
				properties: {
					name: field.name,
					fieldType: field.fieldType,
					required: field.required ?? false,
					searchable: field.searchable ?? false,
					filterable: field.filterable ?? false,
					displayInList: field.displayInList !== false,
					displayInDetail: true,
					order: field.order ?? (10 + index),
					description: `${field.name} field for ${hobbyType.name}`,
				},
			});
		}
	}

	private buildRelationships(hobbyTypes: Record<string, PublicHobbyType>) {
		for (const [id, hobbyType] of Object.entries(hobbyTypes)) {
			const hobbyNodeId = `hobby_${id}`;

			// HAS_BRAND relationships
			if (hobbyType.brands) {
				for (const brand of hobbyType.brands) {
					const brandNodeId = `brand_${brand.toLowerCase().replaceAll(/\s+/g, "_")}`;
					if (this.nodes.has(brandNodeId)) {
						this.addRelationship({
							id: `rel_${id}_has_brand_${brand.toLowerCase().replaceAll(/\s+/g, "_")}`,
							type: "HAS_BRAND",
							fromNode: hobbyNodeId,
							toNode: brandNodeId,
						});
					}
				}
			}

			// HAS_SCALE relationships
			if (hobbyType.scales) {
				for (const scale of hobbyType.scales) {
					const scaleNodeId = `scale_${scale.toLowerCase().replaceAll(/[^a-z0-9]/g, "_")}`;
					if (this.nodes.has(scaleNodeId)) {
						this.addRelationship({
							id: `rel_${id}_has_scale_${scale.toLowerCase().replaceAll(/[^a-z0-9]/g, "_")}`,
							type: "HAS_SCALE",
							fromNode: hobbyNodeId,
							toNode: scaleNodeId,
						});
					}
				}
			}

			// HAS_CATEGORY relationships
			if (hobbyType.categories) {
				for (const category of hobbyType.categories) {
					const categoryNodeId = `category_${category.toLowerCase().replaceAll(/\s+/g, "_")}`;
					if (this.nodes.has(categoryNodeId)) {
						this.addRelationship({
							id: `rel_${id}_has_category_${category.toLowerCase().replaceAll(/\s+/g, "_")}`,
							type: "HAS_CATEGORY",
							fromNode: hobbyNodeId,
							toNode: categoryNodeId,
						});
					}
				}
			}

			// HAS_FIELD relationships
			const hobbyFields = [...this.nodes.values()]
				.filter(node => node.type === "field" && node.id.startsWith(`field_${id}_`));

			for (const field of hobbyFields) {
				this.addRelationship({
					id: `rel_${id}_has_field_${field.id.replace(`field_${id}_`, "")}`,
					type: "HAS_FIELD",
					fromNode: hobbyNodeId,
					toNode: field.id,
				});
			}
		}
	}

	private addNode(node: GraphNode) {
		this.nodes.set(node.id, node);
	}

	private addRelationship(relationship: GraphRelationship) {
		this.relationships.push(relationship);
	}

	// Helper methods for providing realistic data
	private getIconForHobby(hobbyId: string): string {
		const iconMap: Record<string, string> = {
			model_kits: "🔧",
			trading_cards: "🃏",
			action_figures: "🦸",
			miniatures: "🎭",
		};
		return iconMap[hobbyId] || "📦";
	}

	private getColorForHobby(hobbyId: string): string {
		const colorMap: Record<string, string> = {
			model_kits: "green",
			trading_cards: "purple",
			action_figures: "red",
			miniatures: "orange",
		};
		return colorMap[hobbyId] || "gray";
	}

	private getBrandWebsite(brand: string): string | undefined {
		const websites: Record<string, string> = {
			"Bandai": "https://bandai.com",
			"Tamiya": "https://tamiya.com",
			"Hasegawa": "https://hasegawamodel.co.jp",
			"Revell": "https://revell.com",
			"Airfix": "https://airfix.com",
		};
		return websites[brand];
	}

	private getBrandFounded(brand: string): number | undefined {
		const founded: Record<string, number> = {
			"Bandai": 1950,
			"Tamiya": 1946,
			"Hasegawa": 1941,
			"Revell": 1943,
			"Airfix": 1939,
		};
		return founded[brand];
	}

	private getBrandCountry(brand: string): string | undefined {
		const countries: Record<string, string> = {
			"Bandai": "Japan",
			"Tamiya": "Japan",
			"Hasegawa": "Japan",
			"Revell": "USA",
			"Airfix": "UK",
		};
		return countries[brand];
	}

	private getBrandSpecialties(brand: string): string[] {
		const specialties: Record<string, string[]> = {
			"Bandai": ["Gundam", "Anime figures", "Model kits"],
			"Tamiya": ["Military models", "RC cars", "Scale models"],
			"Hasegawa": ["Aircraft", "Military vehicles", "Ship models"],
			"Revell": ["Aircraft", "Ships", "Cars", "Science Fiction"],
			"Airfix": ["Aircraft", "Military vehicles", "Ships"],
		};
		return specialties[brand] ?? [];
	}

	private getScaleDescription(scale: string): string | undefined {
		const descriptions: Record<string, string> = {
			"1/144": "Small scale ideal for large mobile suits",
			"1/100": "Master Grade scale",
			"1/72": "Standard aircraft scale",
			"1/48": "Large aircraft scale",
			"1/35": "Standard military vehicle scale",
			"28mm": "Standard tabletop gaming scale",
			"1/12": "Standard action figure scale",
		};
		return descriptions[scale];
	}

	private getScaleRatio(scale: string): string | undefined {
		return scale; // Use the scale as the ratio
	}

	private getFieldType(fieldName: string): string {
		const typeMap: Record<string, string> = {
			"Name": "text",
			"Brand": "select",
			"Scale": "select",
			"Difficulty Level": "select",
			"Rarity": "select",
			"Card Type": "select",
			"Material": "select",
			"Price": "currency",
			"Release Date": "date",
			"Paint Scheme": "textarea",
		};
		return typeMap[fieldName] || "text";
	}

	/**
   * Generate JSON schemas using Zod for all hobby types and components
   */
	private generateSchemas(hobbyTypes: Record<string, PublicHobbyType>) {
		console.log("Generating JSON schemas using Zod...");

		// Base value types schema
		const PropertyValueSchema = z.union([
			z.string(),
			z.number(),
			z.boolean(),
			z.array(z.unknown()),
			z.record(z.string(), z.unknown()),
			z.date(),
			z.null(),
		]);

		// Generate centralized registry schemas
		this.schemas["brands"] = this.generateBrandSchema();
		this.schemas["scales"] = this.generateScaleSchema();
		this.schemas["categories"] = this.generateCategorySchema();

		// Generate schemas for each hobby type
		for (const [hobbyId, hobbyType] of Object.entries(hobbyTypes)) {
			this.schemas[`hobby_${hobbyId}`] = this.generateHobbyTypeSchema(hobbyId, hobbyType);
			this.schemas[`item_${hobbyId}`] = this.generateItemSchema(hobbyId, hobbyType);
		}

		// Generate core graph schemas
		const nodeSchema = z.object({
			id: z.string(),
			type: z.enum(["hobby_type", "brand", "scale", "category", "field", "attribute", "value"]),
			properties: z.record(z.string(), PropertyValueSchema).optional(),
			metadata: z.object({
				createdAt: z.iso.datetime().optional(),
				updatedAt: z.iso.datetime().optional(),
				version: z.string().optional(),
				strength: z.number().min(0).max(1).optional(),
				confidence: z.number().min(0).max(1).optional(),
			}).optional(),
		});

		const relationshipSchema = z.object({
			id: z.string(),
			type: z.enum(["HAS_BRAND", "HAS_SCALE", "HAS_CATEGORY", "HAS_PROPERTY", "HAS_FIELD", "HAS_VALUE", "RELATES_TO", "INSTANCE_OF", "SUBTYPE_OF", "CONNECTED_TO", "SIMILAR_TO"]),
			fromNode: z.string(),
			toNode: z.string(),
			directed: z.boolean().optional(),
			properties: z.record(z.string(), PropertyValueSchema).optional(),
			metadata: z.object({
				createdAt: z.iso.datetime().optional(),
				updatedAt: z.iso.datetime().optional(),
				strength: z.number().min(0).max(1).optional(),
				confidence: z.number().min(0).max(1).optional(),
			}).optional(),
		});

		// Use Zod 4.x built-in JSON schema support
		this.schemas["node"] = z.toJSONSchema(nodeSchema);
		this.schemas["relationship"] = z.toJSONSchema(relationshipSchema);

		console.log(`Generated ${Object.keys(this.schemas).length} JSON schemas`);
	}

	private generateBrandSchema() {
		const brandSchema = z.object({
			id: z.string(),
			name: z.string(),
			website: z.url().optional(),
			founded: z.number().min(1000).max(new Date().getFullYear()).optional(),
			country: z.string(),
			specialties: z.array(z.string()),
			isActive: z.boolean().default(true),
		});
		return z.toJSONSchema(brandSchema);
	}

	private generateScaleSchema() {
		const scaleSchema = z.object({
			id: z.string(),
			name: z.string(),
			description: z.string().optional(),
			ratio: z.string(),
			mmPerUnit: z.number().positive().optional(),
			category: z.string().optional(),
		});
		return z.toJSONSchema(scaleSchema);
	}

	private generateCategorySchema() {
		const categorySchema = z.object({
			id: z.string(),
			name: z.string(),
			description: z.string().optional(),
			parentCategory: z.string().optional(),
			isActive: z.boolean().default(true),
		});
		return z.toJSONSchema(categorySchema);
	}

	private generateHobbyTypeSchema(_hobbyId: string, _hobbyType: PublicHobbyType) {
		const hobbyTypeSchema = z.object({
			id: z.string(),
			name: z.string(),
			description: z.string(),
			icon: z.string(),
			color: z.string(),
			category: z.string(),
			fields: z.array(z.object({
				id: z.string(),
				name: z.string(),
				fieldType: z.enum(["text", "select", "multiselect", "number", "currency", "date", "boolean", "url", "textarea"]),
				required: z.boolean().default(false),
				searchable: z.boolean().default(false),
				filterable: z.boolean().default(false),
				displayInList: z.boolean().default(true),
				displayInDetail: z.boolean().default(true),
				order: z.number().default(0),
				description: z.string().optional(),
			})),
			settings: z.object({
				allowCustomFields: z.boolean().default(true),
				allowImportExport: z.boolean().default(true),
				defaultSort: z.string().default("name"),
				defaultView: z.enum(["grid", "list"]).default("grid"),
			}),
			isActive: z.boolean().default(true),
		});
		return z.toJSONSchema(hobbyTypeSchema);
	}

	private generateItemSchema(hobbyId: string, hobbyType: PublicHobbyType) {
		// Base item schema
		let itemSchema = z.object({
			id: z.string(),
			name: z.string().min(1),
			description: z.string().optional(),
			hobbyType: z.literal(hobbyId),
			createdAt: z.iso.datetime(),
			updatedAt: z.iso.datetime(),
		});

		// Add hobby-specific fields
		if (hobbyType.brands?.length) {
			itemSchema = itemSchema.extend({
				brand: z.string().optional(),
			});
		}

		if (hobbyType.scales?.length) {
			itemSchema = itemSchema.extend({
				scale: z.string().optional(),
			});
		}

		if (hobbyId === "model_kits") {
			if (hobbyType.difficulty_levels?.length) {
				itemSchema = itemSchema.extend({
					difficultyLevel: z.enum(hobbyType.difficulty_levels as [string, ...string[]]).optional(),
				});
			}
			itemSchema = itemSchema.extend({
				paintScheme: z.string().optional(),
				grade: z.enum(["HG", "RG", "MG", "PG", "SD", "RE", "EG", "HGUC", "MGSD", "30MM"]).optional(),
			});
		}

		if (hobbyId === "trading_cards") {
			if (hobbyType.rarities?.length) {
				itemSchema = itemSchema.extend({
					rarity: z.enum(hobbyType.rarities as [string, ...string[]]).optional(),
				});
			}
			if (hobbyType.card_types?.length) {
				itemSchema = itemSchema.extend({
					cardType: z.enum(hobbyType.card_types as [string, ...string[]]).optional(),
				});
			}
		}

		// Add common fields
		itemSchema = itemSchema.extend({
			price: z.number().positive().optional(),
			purchaseDate: z.iso.datetime().optional(),
			condition: z.enum(["mint", "near_mint", "excellent", "very_good", "good", "fair", "poor"]).optional(),
			status: z.enum(["owned", "wanted", "ordered", "preordered", "sold", "traded", "lost", "damaged", "archived"]).default("owned"),
			quantity: z.number().positive().default(1),
			notes: z.string().optional(),
			tags: z.array(z.string()).default([]),
			images: z.array(z.object({
				url: z.url(),
				caption: z.string().optional(),
				isPrimary: z.boolean().default(false),
			})).default([]),
		});

		return z.toJSONSchema(itemSchema);
	}
}

// Main execution
async function main() {
	try {
		const transformer = new DataTransformer();
		const graph = await transformer.transform();

		// Write output file
		const outputPath = path.join(__dirname, "../apps/web/public/data/config/hobby-graph.json");
		await fs.mkdir(path.dirname(outputPath), { recursive: true });
		await fs.writeFile(outputPath, JSON.stringify(graph, null, 2), "utf8");

		console.log(`Graph configuration written to: ${outputPath}`);
		console.log(`Summary: ${graph.nodes.length} nodes, ${graph.relationships.length} relationships`);

		// Print statistics
		const nodeStats: Record<string, number> = {};
		for (const node of graph.nodes) {
			nodeStats[node.type] = (nodeStats[node.type] ?? 0) + 1;
		}

		const relStats: Record<string, number> = {};
		for (const rel of graph.relationships) {
			relStats[rel.type] = (relStats[rel.type] ?? 0) + 1;
		}

		console.log("\nNode Types:");
		for (const [type, count] of Object.entries(nodeStats)) {
			console.log(`  ${type}: ${count}`);
		}

		console.log("\nRelationship Types:");
		for (const [type, count] of Object.entries(relStats)) {
			console.log(`  ${type}: ${count}`);
		}

	} catch (error) {
		console.error("Transformation failed:", error);
		process.exit(1);
	}
}

if (import.meta.url === `file://${process.argv[1]}`) {
	await main();
}