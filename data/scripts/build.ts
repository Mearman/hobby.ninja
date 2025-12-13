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
	en: string;
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
	price?: { amount: number; currency: string };
	releaseDate?: { year?: number; month?: number; day?: number };
	images?: unknown[];
	displayImage?: string;
	[key: string]: unknown;
}

interface Brand {
	id: string;
	type: string;
	name: LocalizedString;
	url?: string;
	itemIds?: string[];
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
}

interface ScaleData {
	id: string;
	type: "scale";
	name: string;
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

// Grade definitions with hierarchy
const GRADE_DEFINITIONS: Record<string, { name: string; parent: string | null; children: string[] }> = {
	"hg": { name: "HG", parent: null, children: ["hg-uc", "hg-ce", "hg-ac", "hg-amplified"] },
	"hg-uc": { name: "HG UC", parent: "hg", children: [] },
	"hg-ce": { name: "HG CE", parent: "hg", children: [] },
	"hg-ac": { name: "HG AC", parent: "hg", children: [] },
	"hg-amplified": { name: "HG Amplified", parent: "hg", children: [] },
	"mg": { name: "MG", parent: null, children: ["mg-ver-ka", "mgex"] },
	"mg-ver-ka": { name: "MG Ver.Ka", parent: "mg", children: [] },
	"mgex": { name: "MGEX", parent: "mg", children: [] },
	"rg": { name: "RG", parent: null, children: [] },
	"pg": { name: "PG", parent: null, children: [] },
	"eg": { name: "EG", parent: null, children: [] },
	"sd": { name: "SD", parent: null, children: ["sd-cs", "sd-bb", "sd-bb-warrior", "sdex"] },
	"sd-cs": { name: "SD CS", parent: "sd", children: [] },
	"sd-bb": { name: "SD BB Senshi", parent: "sd", children: [] },
	"sd-bb-warrior": { name: "SD BB Warrior", parent: "sd", children: [] },
	"sdex": { name: "SDEX", parent: "sd", children: [] },
	"re-100": { name: "RE/100", parent: null, children: [] },
	"mega-size": { name: "Mega Size", parent: null, children: [] },
	"fm": { name: "FM", parent: null, children: [] },
	"figure-rise": { name: "Figure-rise", parent: null, children: [] },
};

function ensureDir(dir: string) {
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}
}

function readJsonDir<T>(dirPath: string): Map<string, T> {
	const map = new Map<string, T>();
	if (!existsSync(dirPath)) return map;

	const files = readdirSync(dirPath).filter((f) => f.endsWith(".json"));
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

// Extract grade from item name and brand names
function extractGradeFromItem(item: Item, brands: Map<string, Brand>): string | null {
	const itemName = (item.name.en || item.name.ja || "").toLowerCase();

	// Grade patterns in order of specificity (most specific first)
	const gradePatterns: Array<{ pattern: RegExp; grade: string }> = [
		{ pattern: /\bhg\s*uc\b|\bhguc\b|\bhigh grade universal century\b/, grade: "hg-uc" },
		{ pattern: /\bhg\s*ce\b|\bhgce\b|\bhigh grade cosmic era\b/, grade: "hg-ce" },
		{ pattern: /\bhg\s*ac\b|\bhgac\b|\bhigh grade after colony\b/, grade: "hg-ac" },
		{ pattern: /\bhg\s*amplified\b/, grade: "hg-amplified" },
		{ pattern: /\bmg\s*ver\.?\s*ka\b|\bver\.?\s*ka\b/, grade: "mg-ver-ka" },
		{ pattern: /\bmgex\b/, grade: "mgex" },
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

	// Check item name first
	for (const { pattern, grade } of gradePatterns) {
		if (pattern.test(itemName)) {
			return grade;
		}
	}

	// Check brand names
	for (const brandId of item.brandIds) {
		const brand = brands.get(brandId);
		if (brand) {
			const brandName = (brand.name.en || brand.name.ja || "").toLowerCase();
			for (const { pattern, grade } of gradePatterns) {
				if (pattern.test(brandName)) {
					return grade;
				}
			}
		}
	}

	return null;
}

// Build grades data from items
function buildGrades(items: Map<string, Item>, brands: Map<string, Brand>): Map<string, GradeData> {
	const gradeItemIds = new Map<string, string[]>();

	// Extract grade from each item
	for (const [itemId, item] of items) {
		const gradeId = extractGradeFromItem(item, brands);
		if (gradeId) {
			if (!gradeItemIds.has(gradeId)) {
				gradeItemIds.set(gradeId, []);
			}
			gradeItemIds.get(gradeId)!.push(itemId);
		}
	}

	// Build GradeData objects
	const grades = new Map<string, GradeData>();
	for (const [gradeId, definition] of Object.entries(GRADE_DEFINITIONS)) {
		const itemIds = gradeItemIds.get(gradeId) ?? [];
		grades.set(gradeId, {
			id: gradeId,
			type: "grade",
			name: definition.name,
			parent: definition.parent,
			children: definition.children,
			itemIds,
			itemCount: itemIds.length,
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
			name: item.name.en,
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

	// Get featured items (items with most images and price info)
	const itemsArray = [...items.values()];
	const scoredItems = itemsArray.map(item => {
		let score = 0;
		if (item.images && item.images.length > 0) score += item.images.length;
		if (item.price) score += 2;
		if (item.releaseDate?.year && item.releaseDate.year > 2020) score += 3;
		if (item.name.en) score += 1;
		return { item, score };
	});
	scoredItems.sort((a, b) => b.score - a.score);
	const featuredItems = scoredItems.slice(0, 12).map(({ item }) => item);

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
			if (!brandItemIds.has(brandId)) brandItemIds.set(brandId, []);
			brandItemIds.get(brandId)!.push(itemId);
		}
		for (const seriesId of item.seriesIds) {
			if (!seriesItemIds.has(seriesId)) seriesItemIds.set(seriesId, []);
			seriesItemIds.get(seriesId)!.push(itemId);
		}
		for (const categoryId of item.categoryIds) {
			if (!categoryItemIds.has(categoryId)) categoryItemIds.set(categoryId, []);
			categoryItemIds.get(categoryId)!.push(itemId);
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

	writeJson(path.join(DIST_PATH, "search.json"), searchData);
	console.log("  search.json");

	writeJson(path.join(DIST_PATH, "homepage.json"), homepageData);
	console.log("  homepage.json");

	console.log("\n=== Build Complete ===");
	console.log(`Output: ${DIST_PATH}`);
	console.log("Note: TypeScript modules should be hand-written in lib/");
}

main();
