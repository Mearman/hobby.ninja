/**
 * Unified Product Database Builder
 *
 * Orchestrates the matching of catalog items and manuals,
 * generating a unified product database with:
 * - Individual unified product files
 * - Index for fast lookups
 * - Orphans (unmatched items)
 * - Review queue (low-confidence matches)
 * - Statistics
 */

import * as fs from "fs";
import * as path from "path";

import type {
	UnifiedProduct,
	UnifiedIndex,
	OrphanItems,
	ReviewQueue,
	UnifyStats,
	MatchCandidate,
	UnifyOptions,
	CatalogOrphan,
	ManualOrphan,
	LocalizedText,
	UnifiedReleaseDate,
} from "@speckit/types";

import type { CatalogItem, CatalogBrand } from "@speckit/types";

import { matchAll, type CatalogMatchItem, type ManualMatchItem } from "./matcher";
import { extractGrade, normalizeGrade } from "./normalizer";

/** Manual data as stored in JSON files */
interface ManualData {
	id: string;
	name: LocalizedText;
	productNumber?: string;
	releaseDate?: {
		ja?: string;
		year?: number;
		month?: number;
		day?: number;
	};
	series?: LocalizedText;
	grade?: {
		code?: string;
		family?: string;
	};
	scale?: string;
	pdfUrl?: string;
	sourceUrl?: string;
}

/**
 * Load all catalog items from the data directory.
 */
export async function loadCatalogItems(
	itemsDir: string
): Promise<Map<string, CatalogItem>> {
	const items = new Map<string, CatalogItem>();

	const dirs = fs.readdirSync(itemsDir, { withFileTypes: true });

	for (const dir of dirs) {
		if (!dir.isDirectory()) continue;

		const jsonPath = path.join(itemsDir, dir.name, `${dir.name}.json`);
		if (!fs.existsSync(jsonPath)) continue;

		try {
			const content = fs.readFileSync(jsonPath, "utf-8");
			const item = JSON.parse(content) as CatalogItem;
			items.set(item.id, item);
		} catch {
			console.warn(`Failed to load catalog item: ${jsonPath}`);
		}
	}

	return items;
}

/**
 * Load all manuals from the data directory.
 */
export async function loadManuals(
	manualsDir: string
): Promise<Map<string, ManualData>> {
	const manuals = new Map<string, ManualData>();

	const dirs = fs.readdirSync(manualsDir, { withFileTypes: true });

	for (const dir of dirs) {
		if (!dir.isDirectory()) continue;

		const jsonPath = path.join(manualsDir, dir.name, `${dir.name}.json`);
		if (!fs.existsSync(jsonPath)) continue;

		try {
			const content = fs.readFileSync(jsonPath, "utf-8");
			const manual = JSON.parse(content) as ManualData;
			manuals.set(manual.id, manual);
		} catch {
			console.warn(`Failed to load manual: ${jsonPath}`);
		}
	}

	return manuals;
}

/**
 * Convert a catalog item to a simplified match item.
 */
function catalogToMatchItem(item: CatalogItem): CatalogMatchItem {
	// Extract grade from brands
	let grade: string | undefined;
	if (item.brands && item.brands.length > 0) {
		// Look for grade in brand names
		for (const brand of item.brands) {
			const extracted = extractGrade(brand.ja);
			if (extracted) {
				grade = extracted;
				break;
			}
		}
		// Fallback to first brand
		if (!grade && item.brands[0]) {
			grade = normalizeGrade(item.brands[0].ja);
		}
	}

	// Also try to extract grade from product name
	if (!grade) {
		grade = extractGrade(item.name.ja);
	}

	return {
		id: item.id,
		name: item.name.ja,
		series: item.series?.ja,
		scale: item.scale,
		grade,
		releaseDate: item.releaseDate
			? {
					year: item.releaseDate.year,
					month: item.releaseDate.month || undefined,
					day: item.releaseDate.day,
				}
			: undefined,
	};
}

/**
 * Convert a manual to a simplified match item.
 */
function manualToMatchItem(manual: ManualData): ManualMatchItem {
	return {
		id: manual.id,
		name: manual.name.ja,
		productNumber: manual.productNumber,
		series: manual.series?.ja,
		scale: manual.scale,
		grade: manual.grade?.code,
		releaseDate: manual.releaseDate?.year
			? {
					year: manual.releaseDate.year,
					month: manual.releaseDate.month,
					day: manual.releaseDate.day,
				}
			: undefined,
	};
}

/**
 * Generate a unified product ID.
 */
function generateUnifiedId(index: number): string {
	return `up_${index.toString().padStart(5, "0")}`;
}

/**
 * Create a unified product from a match.
 */
function createUnifiedProduct(
	id: string,
	catalog: CatalogItem,
	manual: ManualData,
	match: MatchCandidate
): UnifiedProduct {
	const now = new Date().toISOString();

	return {
		id,
		name: {
			ja: catalog.name.ja,
			en: catalog.name.en || manual.name.en,
		},
		series: catalog.series
			? { ja: catalog.series.ja, en: catalog.series.en }
			: manual.series
				? { ja: manual.series.ja, en: manual.series.en }
				: undefined,
		grade: manual.grade?.code || extractGrade(catalog.name.ja),
		scale: catalog.scale || manual.scale,
		releaseDate: catalog.releaseDate
			? {
					year: catalog.releaseDate.year,
					month: catalog.releaseDate.month || undefined,
					day: catalog.releaseDate.day,
				}
			: manual.releaseDate?.year
				? {
						year: manual.releaseDate.year,
						month: manual.releaseDate.month,
						day: manual.releaseDate.day,
					}
				: undefined,
		sources: {
			catalog: {
				id: catalog.id,
				confidence: match.confidence,
				linkedAt: now,
			},
			manual: {
				id: manual.id,
				productNumber: manual.productNumber,
				pdfUrl: manual.pdfUrl,
				confidence: match.confidence,
				linkedAt: now,
			},
		},
		matchMethod: match.stage === 1 ? "exact" : "fuzzy",
		matchStage: match.stage,
		createdAt: now,
		updatedAt: now,
	};
}

/**
 * Create a unified product from a catalog-only item.
 */
function createCatalogOnlyProduct(
	id: string,
	catalog: CatalogItem
): UnifiedProduct {
	const now = new Date().toISOString();

	return {
		id,
		name: catalog.name,
		series: catalog.series
			? { ja: catalog.series.ja, en: catalog.series.en }
			: undefined,
		grade: extractGrade(catalog.name.ja),
		scale: catalog.scale,
		releaseDate: catalog.releaseDate
			? {
					year: catalog.releaseDate.year,
					month: catalog.releaseDate.month || undefined,
					day: catalog.releaseDate.day,
				}
			: undefined,
		sources: {
			catalog: {
				id: catalog.id,
				confidence: 1.0,
				linkedAt: now,
			},
		},
		matchMethod: "exact",
		createdAt: now,
		updatedAt: now,
	};
}

/**
 * Create a unified product from a manual-only item.
 */
function createManualOnlyProduct(
	id: string,
	manual: ManualData
): UnifiedProduct {
	const now = new Date().toISOString();

	return {
		id,
		name: manual.name,
		series: manual.series,
		grade: manual.grade?.code,
		scale: manual.scale,
		releaseDate: manual.releaseDate?.year
			? {
					year: manual.releaseDate.year,
					month: manual.releaseDate.month,
					day: manual.releaseDate.day,
				}
			: undefined,
		sources: {
			manual: {
				id: manual.id,
				productNumber: manual.productNumber,
				pdfUrl: manual.pdfUrl,
				confidence: 1.0,
				linkedAt: now,
			},
		},
		matchMethod: "exact",
		createdAt: now,
		updatedAt: now,
	};
}

/**
 * Run the full unification process.
 */
export async function runUnification(
	dataDir: string,
	options: UnifyOptions
): Promise<UnifyStats> {
	const startTime = Date.now();
	const itemsDir = path.join(dataDir, "items");
	const manualsDir = path.join(dataDir, "manuals");
	const outputDir = options.outputDir;

	console.log("Loading data...");

	// Load all data
	const catalogItems = await loadCatalogItems(itemsDir);
	const manuals = await loadManuals(manualsDir);

	console.log(`Loaded ${catalogItems.size} catalog items`);
	console.log(`Loaded ${manuals.size} manuals`);

	// Convert to match items
	const catalogMatchItems = Array.from(catalogItems.values()).map(
		catalogToMatchItem
	);
	const manualMatchItems = Array.from(manuals.values()).map(manualToMatchItem);

	console.log("Running matching algorithm...");

	// Run matching
	const { matches, unmatchedCatalogIds, unmatchedManualIds } = matchAll(
		catalogMatchItems,
		manualMatchItems
	);

	console.log(`Found ${matches.length} matches`);
	console.log(`Unmatched catalog items: ${unmatchedCatalogIds.size}`);
	console.log(`Unmatched manuals: ${unmatchedManualIds.size}`);

	// Separate matches by confidence
	const highConfidenceMatches = matches.filter(
		(m) => m.confidence >= options.thresholds.autoAccept
	);
	const reviewQueueMatches = matches.filter(
		(m) =>
			m.confidence >= options.thresholds.reviewCutoff &&
			m.confidence < options.thresholds.autoAccept
	);

	console.log(`High confidence matches: ${highConfidenceMatches.length}`);
	console.log(`Review queue: ${reviewQueueMatches.length}`);

	// Create output directory if not dry run
	if (!options.dryRun) {
		const productsDir = path.join(outputDir, "products");
		fs.mkdirSync(productsDir, { recursive: true });
	}

	// Generate unified products
	const unifiedProducts: UnifiedProduct[] = [];
	const index: UnifiedIndex = {
		generatedAt: new Date().toISOString(),
		byCatalogId: {},
		byManualId: {},
		byProductNumber: {},
		totalUnified: 0,
		sourceCounts: { catalog: 0, manual: 0 },
	};

	let productIndex = 1;

	// Process high-confidence matches
	for (const match of highConfidenceMatches) {
		const catalog = catalogItems.get(match.catalogId);
		const manual = manuals.get(match.manualId);

		if (!catalog || !manual) continue;

		const id = generateUnifiedId(productIndex++);
		const product = createUnifiedProduct(id, catalog, manual, match);
		unifiedProducts.push(product);

		// Update index
		index.byCatalogId[catalog.id] = id;
		index.byManualId[manual.id] = id;
		if (manual.productNumber) {
			index.byProductNumber[manual.productNumber] = id;
		}
		index.sourceCounts.catalog++;
		index.sourceCounts.manual++;
	}

	// Process unmatched catalog items (create catalog-only products)
	for (const catalogId of unmatchedCatalogIds) {
		const catalog = catalogItems.get(catalogId);
		if (!catalog) continue;

		const id = generateUnifiedId(productIndex++);
		const product = createCatalogOnlyProduct(id, catalog);
		unifiedProducts.push(product);

		index.byCatalogId[catalog.id] = id;
		index.sourceCounts.catalog++;
	}

	// Process unmatched manuals (create manual-only products)
	for (const manualId of unmatchedManualIds) {
		const manual = manuals.get(manualId);
		if (!manual) continue;

		const id = generateUnifiedId(productIndex++);
		const product = createManualOnlyProduct(id, manual);
		unifiedProducts.push(product);

		index.byManualId[manual.id] = id;
		if (manual.productNumber) {
			index.byProductNumber[manual.productNumber] = id;
		}
		index.sourceCounts.manual++;
	}

	index.totalUnified = unifiedProducts.length;

	// Build review queue
	const reviewQueue: ReviewQueue = {
		generatedAt: new Date().toISOString(),
		items: reviewQueueMatches.map((match) => ({
			suggestedUnifiedId: "", // Will be assigned if confirmed
			catalogId: match.catalogId,
			manualId: match.manualId,
			confidence: match.confidence,
			matchStage: match.stage,
			matchedFields: match.matchedFields,
			action: "pending" as const,
		})),
	};

	// Build orphans (now empty since we create products for all items)
	const orphans: OrphanItems = {
		generatedAt: new Date().toISOString(),
		catalog: [],
		manual: [],
	};

	// Calculate stats
	const stats: UnifyStats = {
		generatedAt: new Date().toISOString(),
		totals: {
			catalogItems: catalogItems.size,
			manuals: manuals.size,
		},
		results: {
			unified: unifiedProducts.length,
			reviewQueue: reviewQueue.items.length,
			orphanedCatalog: 0,
			orphanedManuals: 0,
		},
		byStage: {},
		byConfidence: {
			high: highConfidenceMatches.length,
			medium: matches.filter((m) => m.confidence >= 0.7 && m.confidence < 0.8)
				.length,
			low: reviewQueueMatches.length,
		},
		processingTime: Date.now() - startTime,
	};

	// Count by stage
	for (const match of matches) {
		stats.byStage[match.stage] = (stats.byStage[match.stage] || 0) + 1;
	}

	// Write output if not dry run
	if (!options.dryRun) {
		console.log(`Writing ${unifiedProducts.length} unified products...`);

		// Write individual product files
		const productsDir = path.join(outputDir, "products");
		for (const product of unifiedProducts) {
			const filePath = path.join(productsDir, `${product.id}.json`);
			fs.writeFileSync(filePath, JSON.stringify(product, null, 2));
		}

		// Write index
		fs.writeFileSync(
			path.join(outputDir, "index.json"),
			JSON.stringify(index, null, 2)
		);

		// Write review queue
		fs.writeFileSync(
			path.join(outputDir, "review-queue.json"),
			JSON.stringify(reviewQueue, null, 2)
		);

		// Write orphans
		fs.writeFileSync(
			path.join(outputDir, "orphans.json"),
			JSON.stringify(orphans, null, 2)
		);

		// Write stats
		fs.writeFileSync(
			path.join(outputDir, "stats.json"),
			JSON.stringify(stats, null, 2)
		);

		console.log(`Output written to ${outputDir}`);
	} else {
		console.log("\n[DRY RUN] Would write:");
		console.log(`  - ${unifiedProducts.length} unified products`);
		console.log(`  - index.json`);
		console.log(`  - review-queue.json (${reviewQueue.items.length} items)`);
		console.log(`  - orphans.json`);
		console.log(`  - stats.json`);
	}

	return stats;
}

/**
 * Print statistics summary.
 */
export function printStats(stats: UnifyStats): void {
	console.log("\n=== Unification Statistics ===\n");
	console.log(`Total catalog items: ${stats.totals.catalogItems}`);
	console.log(`Total manuals: ${stats.totals.manuals}`);
	console.log(`\nResults:`);
	console.log(`  Unified products: ${stats.results.unified}`);
	console.log(`  Review queue: ${stats.results.reviewQueue}`);
	console.log(`\nMatches by stage:`);

	for (const [stage, count] of Object.entries(stats.byStage)) {
		const stageNames: Record<string, string> = {
			"1": "Exact name",
			"2": "Fuzzy name + series",
			"3": "Fuzzy name + scale + date",
			"4": "Series + scale + grade + date",
			"5": "Fuzzy name only",
		};
		console.log(`  Stage ${stage} (${stageNames[stage] || "unknown"}): ${count}`);
	}

	console.log(`\nConfidence distribution:`);
	console.log(`  High (≥0.80): ${stats.byConfidence.high}`);
	console.log(`  Medium (0.70-0.79): ${stats.byConfidence.medium}`);
	console.log(`  Low (0.50-0.69): ${stats.byConfidence.low}`);
	console.log(`\nProcessing time: ${stats.processingTime}ms`);
}
