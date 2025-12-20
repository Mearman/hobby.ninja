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

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import Fuse from "fuse.js";

const ROOT = path.join(import.meta.dirname, "..");
const SRC_PATH = path.join(ROOT, "src");
const DIST_PATH = path.join(ROOT, "dist");

interface LocalizedString {
	ja: string;
	en?: string;
}

interface Item {
	id: string;
	type: string;
	name: LocalizedString;
	brandIds: string[];
	seriesIds: string[];
	categoryIds: string[];
	relatedItemIds: string[];
	manualId?: string;
	scale?: string;
	// Grades - keyed by root grade, value is array of specific grades
	// e.g., { "hg": ["hg-uc"], "mg": [] }
	grades?: Record<string, string[]>;
	price?: { amount: number; currency: string };
	releaseDate?: { year?: number; month?: number; day?: number };
	images?: unknown[];
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
// Sort order by builder complexity: EG (100) → SD (200) → HG (300) → Mega Size (350) → FM (400) → Figure-rise (450) → RE/100 (500) → RG (600) → MG (700) → PG (900)
// Note: Mega Size is large (1/48) but simpler construction than FM/RG/MG, so placed after HG
const GRADE_DEFINITIONS: Record<string, { name: string; parent: string | null; children: string[]; sortOrder: number }> = {
	"eg": { name: "Entry Grade", parent: null, children: [], sortOrder: 100 },
	"sd": { name: "Super Deformed", parent: null, children: ["sd-cs", "sd-bb", "sd-bb-warrior", "sdex"], sortOrder: 200 },
	"sdex": { name: "SD EX-Standard", parent: "sd", children: [], sortOrder: 210 },
	"sd-cs": { name: "SD Cross Silhouette", parent: "sd", children: [], sortOrder: 220 },
	"sd-bb": { name: "SD BB Senshi", parent: "sd", children: [], sortOrder: 230 },
	"sd-bb-warrior": { name: "SD BB Warrior", parent: "sd", children: [], sortOrder: 240 },
	"hg": { name: "High Grade", parent: null, children: ["hg-uc", "hg-ce", "hg-ac", "hg-amplified"], sortOrder: 300 },
	"hg-uc": { name: "HG Universal Century", parent: "hg", children: [], sortOrder: 310 },
	"hg-ce": { name: "HG Cosmic Era", parent: "hg", children: [], sortOrder: 320 },
	"hg-ac": { name: "HG After Colony", parent: "hg", children: [], sortOrder: 330 },
	"hg-amplified": { name: "HG Amplified", parent: "hg", children: [], sortOrder: 340 },
	"mega-size": { name: "Mega Size Model", parent: null, children: [], sortOrder: 350 },
	"fm": { name: "Full Mechanics", parent: null, children: [], sortOrder: 400 },
	"figure-rise": { name: "Figure-rise Standard", parent: null, children: [], sortOrder: 450 },
	"re-100": { name: "RE/100", parent: null, children: [], sortOrder: 500 },
	"rg": { name: "Real Grade", parent: null, children: [], sortOrder: 600 },
	"mg": { name: "Master Grade", parent: null, children: ["mgsd", "mg-ver-ka", "mgex"], sortOrder: 700 },
	"mgsd": { name: "Master Grade SD", parent: "mg", children: [], sortOrder: 705 },
	"mg-ver-ka": { name: "MG Ver.Ka", parent: "mg", children: [], sortOrder: 710 },
	"mgex": { name: "Master Grade Extreme", parent: "mg", children: [], sortOrder: 720 },
	"pg": { name: "Perfect Grade", parent: null, children: [], sortOrder: 900 },
};

function ensureDir(dir: string) {
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}
}

function readJsonDir<T>(dirPath: string): Map<string, T> {
	const map = new Map<string, T>();
	if (!existsSync(dirPath)) return map;

	const files = readdirSync(dirPath).filter((f) => f.endsWith(".json") && f !== "index.json");
	for (const file of files) {
		const content = readFileSync(path.join(dirPath, file), "utf8");
		const data = JSON.parse(content) as T & { id: string };
		map.set(data.id, data);
	}
	return map;
}

function writeJson(filePath: string, data: unknown): void {
	writeFileSync(filePath, JSON.stringify(data, null, "\t"), "utf8");
}

// Compute displayImage for each item (first image or manual.productImage fallback)
function computeDisplayImages(items: Map<string, Item>, manuals: Map<string, Manual>): void {
	for (const [, item] of items) {
		// Get first item image if available
		if (item.images && item.images.length > 0) {
			const firstImage = item.images[0];
			item.displayImage = typeof firstImage === "string" ? firstImage : (firstImage as { url: string }).url;
		} else if (item.manualId) {
			// Fall back to manual's productImage
			const manual = manuals.get(item.manualId);
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
	for (const brandId of item.brandIds) {
		const brand = brands.get(brandId);
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
		const brandNames = item.brandIds
			.map((bid) => brands.get(bid)?.name.en ?? bid)
			.join(", ");
		const seriesNames = item.seriesIds
			.map((sid) => series.get(sid)?.name.en ?? sid)
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

	const featuredItems = [...items.values()]
		.filter(item =>
			item.images && item.images.length > 0 &&
			item.categoryIds?.includes("gunpla") &&
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

function main() {
	console.log("=== Building @hobby-ninja/data (JSON output) ===\n");

	ensureDir(DIST_PATH);

	// Read all source data
	console.log("Reading source data...");
	const items = readJsonDir<Item>(path.join(SRC_PATH, "items"));
	const brands = readJsonDir<Brand>(path.join(SRC_PATH, "brands"));
	const series = readJsonDir<Series>(path.join(SRC_PATH, "series"));
	const categories = readJsonDir<Category>(path.join(SRC_PATH, "categories"));
	const manuals = readJsonDir<Manual>(path.join(SRC_PATH, "manuals"));

	console.log(`  Items: ${items.size}`);
	console.log(`  Brands: ${brands.size}`);
	console.log(`  Series: ${series.size}`);
	console.log(`  Categories: ${categories.size}`);
	console.log(`  Manuals: ${manuals.size}`);

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
		for (const brandId of item.brandIds) {
			const list = brandItemIds.get(brandId) ?? [];
			list.push(itemId);
			brandItemIds.set(brandId, list);
		}
		for (const seriesId of item.seriesIds) {
			const list = seriesItemIds.get(seriesId) ?? [];
			list.push(itemId);
			seriesItemIds.set(seriesId, list);
		}
		for (const categoryId of item.categoryIds) {
			const list = categoryItemIds.get(categoryId) ?? [];
			list.push(itemId);
			categoryItemIds.set(categoryId, list);
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

	// Write JSON files
	console.log("\nWriting JSON files...");

	writeJson(path.join(DIST_PATH, "items.json"), Object.fromEntries(items));
	console.log("  items.json");

	writeJson(path.join(DIST_PATH, "brands.json"), Object.fromEntries(brands));
	console.log("  brands.json");

	writeJson(path.join(DIST_PATH, "series.json"), Object.fromEntries(series));
	console.log("  series.json");

	writeJson(path.join(DIST_PATH, "categories.json"), Object.fromEntries(categories));
	console.log("  categories.json");

	writeJson(path.join(DIST_PATH, "manuals.json"), Object.fromEntries(manuals));
	console.log("  manuals.json");

	writeJson(path.join(DIST_PATH, "grades.json"), Object.fromEntries(grades));
	console.log("  grades.json");

	writeJson(path.join(DIST_PATH, "scales.json"), Object.fromEntries(scales));
	console.log("  scales.json");

	writeJson(path.join(DIST_PATH, "tags.json"), Object.fromEntries(tags));
	console.log("  tags.json");

	writeJson(path.join(DIST_PATH, "search.json"), searchData);
	console.log("  search.json");

	writeJson(path.join(DIST_PATH, "homepage.json"), homepageData);
	console.log("  homepage.json");

	console.log("\n=== Build Complete ===");
	console.log(`Output: ${DIST_PATH}`);
	console.log("Note: TypeScript modules should be hand-written in lib/");
}

main();
