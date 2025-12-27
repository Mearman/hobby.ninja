#!/usr/bin/env tsx
/**
 * Build script for @hobby-ninja/data package
 *
 * Generates JSON files only:
 * - dist/items.json - Record<string, Item>
 * - dist/brands.json - Record<string, Brand> (with computed itemIds)
 * - dist/series.json - Record<string, Series> (with computed itemIds)
 * - dist/categories.json - Record<string, Category> (with computed itemIds)
 * - dist/manuals.json - Record<string, Manual>
 * - dist/grades.json - Record<string, GradeData>
 * - dist/scales.json - Record<string, ScaleData>
 * - dist/homepage.json - HomepageData object
 * - dist/search.json - { records: SearchRecord[], fuseIndex: object }
 *
 * TypeScript modules will be hand-written in lib/
 *
 * Usage:
 *   pnpm tsx data/scripts/build.ts
 */

import { existsSync, mkdirSync } from "node:fs";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import Fuse from "fuse.js";

const ROOT = path.join(import.meta.dirname, "..");
const SRC_PATH = path.join(ROOT, "src");
const DIST_PATH = path.join(ROOT, "dist");

interface LocalizedString {
	ja: string;
	en?: string;
}

interface BrandRef {
	id: string;
	url?: string;
	ja?: string;
	en?: string;
}

interface SeriesRef {
	id: string;
	url?: string;
	ja?: string;
	en?: string;
}

interface CategoryRef {
	id: string;
	url?: string;
	ja?: string;
	en?: string;
}

interface RelatedItemRef {
	id: string;
	url?: string;
	ja?: string;
	en?: string;
}

interface ManualRef {
	id: string;
	url?: string;
}

interface SourceImage {
	src: string;
	path?: string;
}

interface ImagesObject {
	product: SourceImage[];
	instructions: SourceImage[];
}

// Images can be new format (object) or old format (array of strings)
type Images = ImagesObject | string[];

interface Item {
	id: string;
	type: string;
	name: LocalizedString;
	brands: BrandRef[];
	series: SeriesRef[];
	categories: CategoryRef[];
	relatedItems: RelatedItemRef[];
	/** 1:1 manual relationship */
	manual?: ManualRef;
	scale?: string;
	// Grades - keyed by root grade, value is array of specific grades
	// e.g., { "hg": ["hg-uc"], "mg": [] }
	grades?: Record<string, string[]>;
	price?: { amount: number; currency: string };
	releaseDate?: { year?: number; month?: number; day?: number };
	images?: Images;
	displayImage?: string;
	// Tag (localized) - e.g., "Hobby Online", "Event", "Gundam Base"
	tag?: LocalizedString;
	[key: string]: unknown;
}

interface Brand {
	id: string;
	type: string;
	name: LocalizedString;
	url?: string;
	itemIds?: string[];
	gradeId?: string;
	isGrade?: boolean;
	[key: string]: unknown;
}

interface Series {
	id: string;
	type: string;
	name: LocalizedString;
	url?: string;
	itemIds?: string[];
	[key: string]: unknown;
}

interface Category {
	id: string;
	type: string;
	name: LocalizedString;
	url?: string;
	itemIds?: string[];
	[key: string]: unknown;
}

interface Manual {
	id: string;
	type: string;
	name: LocalizedString;
	brandIds: string[];
	seriesIds: string[];
	/** Linked item IDs (computed from items referencing this manual) */
	itemIds: string[];
	productImage?: string;
	thumbnailImage?: string;
	[key: string]: unknown;
}

interface SearchRecord {
	id: string;
	name: string;
	nameJa: string;
	brand: string;
	series: string;
}

interface GradeData {
	id: string;
	type: "grade";
	name: string;
	parent: string | null;
	children: string[];
	itemIds: string[];
	itemCount: number;
	sortOrder: number;
	image?: string;
}

interface ScaleData {
	id: string;
	type: "scale";
	name: string;
	itemIds: string[];
	itemCount: number;
}

interface TagData {
	id: string;
	type: "tag";
	name: LocalizedString;
	itemIds: string[];
	itemCount: number;
}

interface HomepageStats {
	totalItems: number;
	totalBrands: number;
	totalCategories: number;
	totalSeries: number;
}

interface HomepageData {
	stats: HomepageStats;
	featuredItems: unknown[];
	popularBrands: unknown[];
	categories: unknown[];
}


// Grade definitions with hierarchy and sort order
// Main Gunpla progression: EG → HG → RG → FM → MG → PG
// Other Gunpla grades: SD, Mega Size, RE/100
// Non-Gunpla: Figure-rise
const GRADE_DEFINITIONS: Record<string, { name: string; parent: string | null; children: string[]; sortOrder: number }> = {
	// Main progression (by complexity/scale)
	"eg": { name: "Entry Grade", parent: null, children: [], sortOrder: 100 },
	"hg": { name: "High Grade", parent: null, children: ["hg-uc", "hg-ce", "hg-ac", "hg-amplified"], sortOrder: 200 },
	"hg-uc": { name: "HG Universal Century", parent: "hg", children: [], sortOrder: 210 },
	"hg-ce": { name: "HG Cosmic Era", parent: "hg", children: [], sortOrder: 220 },
	"hg-ac": { name: "HG After Colony", parent: "hg", children: [], sortOrder: 230 },
	"hg-amplified": { name: "HG Amplified", parent: "hg", children: [], sortOrder: 240 },
	"rg": { name: "Real Grade", parent: null, children: [], sortOrder: 300 },
	"fm": { name: "Full Mechanics", parent: null, children: [], sortOrder: 400 },
	"mg": { name: "Master Grade", parent: null, children: ["mgsd", "mg-ver-ka", "mgex"], sortOrder: 500 },
	"mgsd": { name: "Master Grade SD", parent: "mg", children: [], sortOrder: 510 },
	"mg-ver-ka": { name: "MG Ver.Ka", parent: "mg", children: [], sortOrder: 520 },
	"mgex": { name: "Master Grade Extreme", parent: "mg", children: [], sortOrder: 530 },
	"pg": { name: "Perfect Grade", parent: null, children: [], sortOrder: 600 },
	// Other Gunpla-specific grades
	"sd": { name: "Super Deformed", parent: null, children: ["sd-cs", "sd-bb", "sd-bb-warrior", "sdex"], sortOrder: 700 },
	"sdex": { name: "SD EX-Standard", parent: "sd", children: [], sortOrder: 710 },
	"sd-cs": { name: "SD Cross Silhouette", parent: "sd", children: [], sortOrder: 720 },
	"sd-bb": { name: "SD BB Senshi", parent: "sd", children: [], sortOrder: 730 },
	"sd-bb-warrior": { name: "SD BB Warrior", parent: "sd", children: [], sortOrder: 740 },
	"mega-size": { name: "Mega Size Model", parent: null, children: [], sortOrder: 800 },
	"re-100": { name: "RE/100", parent: null, children: [], sortOrder: 850 },
	// Non-Gunpla grades
	"figure-rise": { name: "Figure-rise Standard", parent: null, children: [], sortOrder: 900 },
};

function ensureDir(dir: string) {
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}
}

const BATCH_SIZE = 500; // Batch size for parallel file reading

async function readJsonDirAsync<T>(dirPath: string): Promise<Map<string, T>> {
	if (!existsSync(dirPath)) return new Map();

	const files = await readdir(dirPath);
	const jsonFiles = files.filter((f) => f.endsWith(".json") && f !== "index.json");

	const entries: [string, T][] = [];

	// Read in batches to avoid file descriptor limits
	for (let i = 0; i < jsonFiles.length; i += BATCH_SIZE) {
		const batch = jsonFiles.slice(i, i + BATCH_SIZE);
		const batchResults = await Promise.all(
			batch.map(async (file) => {
				const content = await readFile(path.join(dirPath, file), "utf8");
				const data = JSON.parse(content) as T & { id: string };
				return [data.id, data] as [string, T];
			})
		);
		entries.push(...batchResults);
	}

	return new Map(entries);
}

async function writeJsonAsync(filePath: string, data: unknown): Promise<void> {
	await writeFile(filePath, JSON.stringify(data, null, "\t"), "utf8");
}

// Compute displayImage for each item (first image or manual.productImage fallback)
function computeDisplayImages(items: Map<string, Item>, manuals: Map<string, Manual>): void {
	for (const [, item] of items) {
		// Handle images - check both new format (object) and old format (array of strings)
		if (item.images) {
			if (Array.isArray(item.images)) {
				// Old format: array of strings
				if (item.images.length > 0) {
					item.displayImage = item.images[0];
				}
			} else if (item.images.product && item.images.product.length > 0) {
				// New format: object with product/instructions
				const firstImage = item.images.product[0];
				item.displayImage = firstImage.path ?? firstImage.src;
			}
		}

		// Fall back to manual's productImage if no displayImage yet
		if (!item.displayImage && item.manual?.id) {
			const manual = manuals.get(item.manual.id);
			if (manual?.productImage) {
				item.displayImage = manual.productImage;
			}
		}
	}
}

// Grade patterns for extraction
const GRADE_PATTERNS: Array<{ pattern: RegExp; grade: string }> = [
	{ pattern: /\bhg\s*uc\b|\bhguc\b|\bhigh grade universal century\b/, grade: "hg-uc" },
	{ pattern: /\bhg\s*ce\b|\bhgce\b|\bhigh grade cosmic era\b/, grade: "hg-ce" },
	{ pattern: /\bhg\s*ac\b|\bhgac\b|\bhigh grade after colony\b/, grade: "hg-ac" },
	{ pattern: /\bhg\s*amplified\b/, grade: "hg-amplified" },
	{ pattern: /\bmg\s*ver\.?\s*ka\b|\bver\.?\s*ka\b/, grade: "mg-ver-ka" },
	{ pattern: /\bmgex\b/, grade: "mgex" },
	{ pattern: /\bmgsd\b|\bmg\s*sd\b/, grade: "mgsd" },
	{ pattern: /\bsd\s*cs\b|\bsdcs\b|\bcross silhouette\b/, grade: "sd-cs" },
	{ pattern: /\bsd\s*bb\s*warrior\b/, grade: "sd-bb-warrior" },
	{ pattern: /\bsd\s*bb\b|\bbb\s*senshi\b/, grade: "sd-bb" },
	{ pattern: /\bsdex\b/, grade: "sdex" },
	{ pattern: /\bre[/-]?100\b/, grade: "re-100" },
	{ pattern: /\bmega\s*size\b/, grade: "mega-size" },
	{ pattern: /\bfigure[- ]?rise\b/, grade: "figure-rise" },
	{ pattern: /\bpg\b|\bperfect grade\b/, grade: "pg" },
	{ pattern: /\bmg\b|\bmaster grade\b/, grade: "mg" },
	{ pattern: /\brg\b|\breal grade\b/, grade: "rg" },
	{ pattern: /\bhg\b|\bhigh grade\b/, grade: "hg" },
	{ pattern: /\bsd\b|\bsuper deformed\b/, grade: "sd" },
	{ pattern: /\beg\b|\bentry grade\b/, grade: "eg" },
	{ pattern: /\bfm\b|\bfull mechanics\b/, grade: "fm" },
];

// Extract grades from item name and brand names
// Returns hierarchical object: { rootGrade: [specificGrades...] }
// e.g., { "hg": ["hg-uc", "hg-ce"], "mg": [] }
function extractGrades(item: Item, brands: Map<string, Brand>): Record<string, string[]> {
	const matched = new Set<string>();
	const itemName = (item.name.en ?? item.name.ja).toLowerCase();

	// Check item name for all matching patterns
	for (const { pattern, grade } of GRADE_PATTERNS) {
		if (pattern.test(itemName)) {
			matched.add(grade);
		}
	}

	// Check brand names
	for (const brandRef of item.brands ?? []) {
		const brand = brands.get(brandRef.id);
		if (brand) {
			const brandName = (brand.name.en ?? brand.name.ja).toLowerCase();
			for (const { pattern, grade } of GRADE_PATTERNS) {
				if (pattern.test(brandName)) {
					matched.add(grade);
				}
			}
		}
	}

	// Build hierarchical structure: { rootGrade: [specificGrades...] }
	const result: Record<string, string[]> = {};

	for (const gradeId of matched) {
		const definition = GRADE_DEFINITIONS[gradeId] as { parent?: string } | undefined;
		if (!definition) continue;

		const rootGrade = definition.parent ?? gradeId;

		result[rootGrade] ??= [];

		// If this is a child grade, add it to the array
		// If this is a root grade, the array stays empty (or we skip adding it)
		if (definition.parent) {
			result[rootGrade].push(gradeId);
		}
	}

	return result;
}

// Build grades data from items and populate item.grades field
function buildGrades(items: Map<string, Item>, brands: Map<string, Brand>): Map<string, GradeData> {
	const gradeItemIds = new Map<string, string[]>();

	// Extract grades from each item and populate the grades field
	for (const [itemId, item] of items) {
		const grades = extractGrades(item, brands);

		// Populate the grades field on the item
		if (Object.keys(grades).length > 0) {
			item.grades = grades;
		}

		// Track items per grade (both root and specific)
		for (const [rootGrade, specificGrades] of Object.entries(grades)) {
			// Add to root grade
			if (!gradeItemIds.has(rootGrade)) {
				gradeItemIds.set(rootGrade, []);
			}
			gradeItemIds.get(rootGrade)!.push(itemId);

			// Add to specific grades
			for (const specificGrade of specificGrades) {
				if (!gradeItemIds.has(specificGrade)) {
					gradeItemIds.set(specificGrade, []);
				}
				gradeItemIds.get(specificGrade)!.push(itemId);
			}
		}
	}

	// Build GradeData objects
	const grades = new Map<string, GradeData>();
	for (const [gradeId, definition] of Object.entries(GRADE_DEFINITIONS)) {
		const itemIds = gradeItemIds.get(gradeId) ?? [];

		// Find image reference from corresponding brand
		let image: string | undefined;
		// Look for a brand with this gradeId to get its image
		for (const brand of brands.values()) {
			if (brand.gradeId === gradeId) {
				const brandImage = brand["image"] as string | undefined;
				if (brandImage && typeof brandImage === "string") {
					image = brandImage;
					break;
				}
			}
		}

		grades.set(gradeId, {
			id: gradeId,
			type: "grade",
			name: definition.name,
			parent: definition.parent,
			children: definition.children,
			itemIds,
			itemCount: itemIds.length,
			sortOrder: definition.sortOrder,
			image,
		});
	}

	return grades;
}

// Build scales data from items
function buildScales(items: Map<string, Item>): Map<string, ScaleData> {
	const scaleItemIds = new Map<string, string[]>();

	// Extract scale from each item
	for (const [itemId, item] of items) {
		if (item.scale) {
			const scaleId = item.scale;
			if (!scaleItemIds.has(scaleId)) {
				scaleItemIds.set(scaleId, []);
			}
			scaleItemIds.get(scaleId)!.push(itemId);
		}
	}

	// Build ScaleData objects
	const scales = new Map<string, ScaleData>();
	for (const [scaleId, itemIds] of scaleItemIds) {
		scales.set(scaleId, {
			id: scaleId,
			type: "scale",
			name: scaleId,
			itemIds,
			itemCount: itemIds.length,
		});
	}

	return scales;
}

// Normalize tag ID from English name (lowercase, hyphenated)
function normalizeTagId(name: string): string {
	return name.toLowerCase().replace(/\s+/g, "-");
}

// Build tags data from items
function buildTags(items: Map<string, Item>): Map<string, TagData> {
	const tagItemIds = new Map<string, { name: LocalizedString; itemIds: string[] }>();

	// Extract tag from each item
	for (const [itemId, item] of items) {
		if (item.tag?.en) {
			const tagId = normalizeTagId(item.tag.en);
			if (!tagItemIds.has(tagId)) {
				tagItemIds.set(tagId, { name: item.tag, itemIds: [] });
			}
			tagItemIds.get(tagId)!.itemIds.push(itemId);
		}
	}

	// Build TagData objects
	const tags = new Map<string, TagData>();
	for (const [tagId, { name, itemIds }] of tagItemIds) {
		tags.set(tagId, {
			id: tagId,
			type: "tag",
			name,
			itemIds,
			itemCount: itemIds.length,
		});
	}

	return tags;
}

// Build search records and Fuse index
function buildSearchData(items: Map<string, Item>, brands: Map<string, Brand>, series: Map<string, Series>): {
	records: SearchRecord[];
	fuseIndex: object;
} {
	// Create minimal search records
	const searchRecords: SearchRecord[] = [];

	for (const [id, item] of items) {
		const brandNames = (item.brands ?? [])
			.map((ref) => brands.get(ref.id)?.name.en ?? ref.id)
			.join(", ");
		const seriesNames = (item.series ?? [])
			.map((ref) => series.get(ref.id)?.name.en ?? ref.id)
			.join(", ");

		searchRecords.push({
			id,
			name: item.name.en ?? "",
			nameJa: item.name.ja,
			brand: brandNames,
			series: seriesNames,
		});
	}

	// Create Fuse index at build time
	const fuseOptions = {
		keys: ["name", "nameJa", "brand", "series"],
		threshold: 0.3,
		includeScore: true,
	};

	const fuseIndex = Fuse.createIndex(fuseOptions.keys, searchRecords);

	return {
		records: searchRecords,
		fuseIndex: fuseIndex.toJSON(),
	};
}

// Build homepage data
function buildHomepageData(
	items: Map<string, Item>,
	brands: Map<string, Brand>,
	categories: Map<string, Category>,
	series: Map<string, Series>,
): HomepageData {
	// Compute stats
	const stats: HomepageStats = {
		totalItems: items.size,
		totalBrands: brands.size,
		totalCategories: categories.size,
		totalSeries: series.size,
	};

	// Get featured items candidates
	// Criteria: has image, gunpla category, released after 2010
	const FEATURED_MAX_CANDIDATES = 200;

	// Helper to check if item has images (handles both formats)
	const hasImages = (item: Item): boolean => {
		if (!item.images) return false;
		if (Array.isArray(item.images)) return item.images.length > 0;
		return item.images.product?.length > 0;
	};

	const featuredItems = [...items.values()]
		.filter(item =>
			hasImages(item) &&
			item.categories?.some(c => c.id === "gunpla") &&
			item.releaseDate?.year && item.releaseDate.year > 2010
		)
		.slice(0, FEATURED_MAX_CANDIDATES);

	// Get popular brands (by item count)
	const brandsArray = [...brands.values()];
	brandsArray.sort((a, b) => (b.itemIds?.length ?? 0) - (a.itemIds?.length ?? 0));
	const popularBrands = brandsArray.slice(0, 8);

	// Get all categories
	const categoriesArray = [...categories.values()];

	return {
		stats,
		featuredItems,
		popularBrands,
		categories: categoriesArray,
	};
}

/**
 * Validate item-manual relationships and compute manual.itemIds
 * - One item can reference one manual (N:1 from items perspective)
 * - One manual can be referenced by many items (1:N from manual perspective)
 * Throws an error if validation fails
 */
function validateItemManualRelationships(items: Map<string, Item>, manuals: Map<string, Manual>): void {
	const errors: string[] = [];

	// Track which manuals are linked by which items
	const manualsLinkedByItems = new Map<string, string[]>(); // manualId -> [itemIds...]
	// Track which items reference manuals (to detect items with multiple manuals)
	const itemManualCount = new Map<string, number>(); // itemId -> count

	// Check items -> manuals direction and build reverse mapping
	for (const [itemId, item] of items) {
		if (item.manual?.id) {
			const manualId = item.manual.id;

			// Track for computing itemIds
			if (!manualsLinkedByItems.has(manualId)) {
				manualsLinkedByItems.set(manualId, []);
			}
			manualsLinkedByItems.get(manualId)!.push(itemId);

			// Track item's manual count (should only have one)
			itemManualCount.set(itemId, (itemManualCount.get(itemId) ?? 0) + 1);

			// Check if manual exists
			const manual = manuals.get(manualId);
			if (!manual) {
				errors.push(`Item ${itemId} references manual ${manualId} which does not exist`);
			}
		}
	}

	// Validate: one item should only reference one manual
	for (const [itemId, count] of itemManualCount) {
		if (count > 1) {
			errors.push(`Item ${itemId} references multiple manuals (found ${count})`);
		}
	}

	// Compute itemIds for each manual from the items that reference it
	for (const [manualId, manual] of manuals) {
		manual.itemIds = manualsLinkedByItems.get(manualId) ?? [];
	}

	// Log statistics
	const manualsWithMultipleItems = [...manualsLinkedByItems.entries()].filter(([, ids]) => ids.length > 1);
	if (manualsWithMultipleItems.length > 0) {
		console.log(`  ℹ ${manualsWithMultipleItems.length} manuals shared by multiple items (color variants)`);
	}

	if (errors.length > 0) {
		console.error("\n❌ Item-Manual relationship validation failed:\n");
		for (const error of errors) {
			console.error(`  - ${error}`);
		}
		console.error("");
		throw new Error(`Item-Manual validation failed with ${errors.length} error(s)`);
	}
}

async function main(): Promise<void> {
	console.log("=== Building @hobby-ninja/data (JSON output) ===\n");

	ensureDir(DIST_PATH);

	// Read all source data in parallel
	console.log("Reading source data...");
	const [items, brands, series, categories, manuals] = await Promise.all([
		readJsonDirAsync<Item>(path.join(SRC_PATH, "items")),
		readJsonDirAsync<Brand>(path.join(SRC_PATH, "brands")),
		readJsonDirAsync<Series>(path.join(SRC_PATH, "series")),
		readJsonDirAsync<Category>(path.join(SRC_PATH, "categories")),
		readJsonDirAsync<Manual>(path.join(SRC_PATH, "manuals")),
	]);

	console.log(`  Items: ${items.size}`);
	console.log(`  Brands: ${brands.size}`);
	console.log(`  Series: ${series.size}`);
	console.log(`  Categories: ${categories.size}`);
	console.log(`  Manuals: ${manuals.size}`);

	// Validate item-manual relationships are 1-to-1 and bidirectional
	console.log("\nValidating item-manual relationships...");
	validateItemManualRelationships(items, manuals);
	console.log("  ✓ All relationships valid");

	// Compute displayImage for items (first image or manual fallback)
	console.log("\nComputing display images...");
	computeDisplayImages(items, manuals);
	const itemsWithDisplayImage = [...items.values()].filter(i => i.displayImage).length;
	console.log(`  Items with displayImage: ${itemsWithDisplayImage}`);

	// Compute reverse relationships (itemIds for brands/series/categories)
	console.log("\nComputing reverse relationships...");
	const brandItemIds = new Map<string, string[]>();
	const seriesItemIds = new Map<string, string[]>();
	const categoryItemIds = new Map<string, string[]>();

	for (const [itemId, item] of items) {
		for (const brandRef of item.brands ?? []) {
			const list = brandItemIds.get(brandRef.id) ?? [];
			list.push(itemId);
			brandItemIds.set(brandRef.id, list);
		}
		for (const seriesRef of item.series ?? []) {
			const list = seriesItemIds.get(seriesRef.id) ?? [];
			list.push(itemId);
			seriesItemIds.set(seriesRef.id, list);
		}
		for (const categoryRef of item.categories ?? []) {
			const list = categoryItemIds.get(categoryRef.id) ?? [];
			list.push(itemId);
			categoryItemIds.set(categoryRef.id, list);
		}
	}

	// Add itemIds to brands/series/categories
	for (const [id, brand] of brands) {
		brand.itemIds = brandItemIds.get(id) ?? [];
	}
	for (const [id, s] of series) {
		s.itemIds = seriesItemIds.get(id) ?? [];
	}
	for (const [id, category] of categories) {
		category.itemIds = categoryItemIds.get(id) ?? [];
	}

	// Build derived data
	console.log("\nBuilding derived data...");
	const grades = buildGrades(items, brands);
	console.log(`  Grades: ${grades.size}`);

	const scales = buildScales(items);
	console.log(`  Scales: ${scales.size}`);

	const tags = buildTags(items);
	console.log(`  Tags: ${tags.size}`);

	const searchData = buildSearchData(items, brands, series);
	console.log(`  Search records: ${searchData.records.length}`);

	const homepageData = buildHomepageData(items, brands, categories, series);
	console.log(`  Homepage data: ${homepageData.featuredItems.length} featured items`);

	// Write JSON files in parallel
	console.log("\nWriting JSON files...");

	await Promise.all([
		writeJsonAsync(path.join(DIST_PATH, "items.json"), Object.fromEntries(items)),
		writeJsonAsync(path.join(DIST_PATH, "brands.json"), Object.fromEntries(brands)),
		writeJsonAsync(path.join(DIST_PATH, "series.json"), Object.fromEntries(series)),
		writeJsonAsync(path.join(DIST_PATH, "categories.json"), Object.fromEntries(categories)),
		writeJsonAsync(path.join(DIST_PATH, "manuals.json"), Object.fromEntries(manuals)),
		writeJsonAsync(path.join(DIST_PATH, "grades.json"), Object.fromEntries(grades)),
		writeJsonAsync(path.join(DIST_PATH, "scales.json"), Object.fromEntries(scales)),
		writeJsonAsync(path.join(DIST_PATH, "tags.json"), Object.fromEntries(tags)),
		writeJsonAsync(path.join(DIST_PATH, "search.json"), searchData),
		writeJsonAsync(path.join(DIST_PATH, "homepage.json"), homepageData),
	]);

	console.log("  items.json, brands.json, series.json, categories.json");
	console.log("  manuals.json, grades.json, scales.json, tags.json");
	console.log("  search.json, homepage.json");

	console.log("\n=== Build Complete ===");
	console.log(`Output: ${DIST_PATH}`);
	console.log("Note: TypeScript modules should be hand-written in lib/");
}

main().catch(console.error);
