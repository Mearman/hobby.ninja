#!/usr/bin/env tsx
/**
 * Migration script to transform data from edges format to canonical format
 *
 * Transforms:
 * - Items: edges.outbound → brandIds, seriesIds, categoryIds, relatedItemIds
 * - Items: edges.inbound (MANUAL_FOR) → manualIds
 * - Brands/Series/Categories: Remove edges (will be derived during build)
 * - Manuals: edges.outbound → brandIds, seriesIds
 *
 * Usage:
 *   pnpm tsx data/scripts/migrate.ts
 *   pnpm tsx data/scripts/migrate.ts --dry-run
 */

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "../..");
const DATA_ROOT = join(ROOT, "data");
const GRAPH_PATH = join(DATA_ROOT, "api/graph");
const SRC_PATH = join(DATA_ROOT, "src");
const RAW_PATH = join(DATA_ROOT, "raw");

const DRY_RUN = process.argv.includes("--dry-run");

interface Edge {
	type: string;
	targetId: string;
	targetType: string;
}

interface GraphEntity {
	id: string;
	type: string;
	name: { ja: string; en: string };
	edges?: {
		inbound?: Edge[];
		outbound?: Edge[];
	};
	[key: string]: unknown;
}

interface CanonicalItem {
	id: string;
	type: string;
	name: { ja: string; en: string };
	brandIds: string[];
	seriesIds: string[];
	categoryIds: string[];
	relatedItemIds: string[];
	manualIds: string[];
	[key: string]: unknown;
}

interface CanonicalBrandOrSeries {
	id: string;
	type: string;
	name: { ja: string; en: string };
	url?: string;
	[key: string]: unknown;
}

interface CanonicalManual {
	id: string;
	type: string;
	name: { ja: string; en: string };
	brandIds: string[];
	seriesIds: string[];
	[key: string]: unknown;
}

function log(message: string) {
	console.log(DRY_RUN ? `[DRY-RUN] ${message}` : message);
}

function ensureDir(dir: string) {
	if (!DRY_RUN && !existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}
}

function transformItem(data: GraphEntity): CanonicalItem {
	const brandIds: string[] = [];
	const seriesIds: string[] = [];
	const categoryIds: string[] = [];
	const relatedItemIds: string[] = [];
	const manualIds: string[] = [];

	// Extract from outbound edges
	if (data.edges?.outbound) {
		for (const edge of data.edges.outbound) {
			switch (edge.type) {
				case "BELONGS_TO_BRAND":
					brandIds.push(edge.targetId);
					break;
				case "BELONGS_TO_SERIES":
					seriesIds.push(edge.targetId);
					break;
				case "BELONGS_TO_CATEGORY":
					categoryIds.push(edge.targetId);
					break;
				case "RELATED_TO":
					if (edge.targetType === "item") {
						relatedItemIds.push(edge.targetId);
					}
					break;
			}
		}
	}

	// Extract manuals from inbound edges
	if (data.edges?.inbound) {
		for (const edge of data.edges.inbound) {
			if (edge.type === "MANUAL_FOR" && edge.targetType === "manual") {
				manualIds.push(edge.targetId);
			}
		}
	}

	// Create new object without edges, preserving all other fields
	const { edges, ...rest } = data;
	return {
		...rest,
		brandIds,
		seriesIds,
		categoryIds,
		relatedItemIds,
		manualIds,
	} as CanonicalItem;
}

function transformBrandOrSeries(data: GraphEntity): CanonicalBrandOrSeries {
	// Remove edges - itemIds will be derived during build
	const { edges, ...rest } = data;
	return rest as CanonicalBrandOrSeries;
}

function transformManual(data: GraphEntity): CanonicalManual {
	const brandIds: string[] = [];
	const seriesIds: string[] = [];

	// Extract from outbound edges
	if (data.edges?.outbound) {
		for (const edge of data.edges.outbound) {
			if (edge.type === "BELONGS_TO_BRAND") {
				brandIds.push(edge.targetId);
			} else if (edge.type === "BELONGS_TO_SERIES") {
				seriesIds.push(edge.targetId);
			}
		}
	}

	const { edges, ...rest } = data;
	return {
		...rest,
		brandIds,
		seriesIds,
	} as CanonicalManual;
}

function migrateDirectory(
	entityType: "items" | "brands" | "series" | "categories" | "manuals",
	transformer: (data: GraphEntity) => unknown
) {
	const srcDir = join(GRAPH_PATH, entityType);
	const destDir = join(SRC_PATH, entityType);

	if (!existsSync(srcDir)) {
		log(`Skipping ${entityType} - source directory not found`);
		return { processed: 0, errors: 0 };
	}

	ensureDir(destDir);

	const files = readdirSync(srcDir).filter((f) => f.endsWith(".json"));
	let processed = 0;
	let errors = 0;

	for (const file of files) {
		try {
			const content = readFileSync(join(srcDir, file), "utf-8");
			const data = JSON.parse(content) as GraphEntity;
			const transformed = transformer(data);

			if (!DRY_RUN) {
				writeFileSync(join(destDir, file), JSON.stringify(transformed, null, "\t"));
			}
			processed++;
		} catch (err) {
			console.error(`Error processing ${file}:`, err);
			errors++;
		}
	}

	log(`${entityType}: ${processed} files migrated, ${errors} errors`);
	return { processed, errors };
}

function moveTranslations() {
	const srcDir = join(DATA_ROOT, "translations");
	const destDir = join(SRC_PATH, "translations");

	if (!existsSync(srcDir)) {
		log("Skipping translations - source directory not found");
		return;
	}

	ensureDir(destDir);

	if (!DRY_RUN) {
		cpSync(srcDir, destDir, { recursive: true });
	}
	log("Translations copied to data/src/translations/");
}

function moveBandaiRaw() {
	const srcDir = join(DATA_ROOT, "bandai");
	const destDir = join(RAW_PATH, "bandai");

	if (!existsSync(srcDir)) {
		log("Skipping bandai raw data - source directory not found");
		return;
	}

	ensureDir(RAW_PATH);

	if (!DRY_RUN) {
		// Use rename for efficiency on same filesystem
		cpSync(srcDir, destDir, { recursive: true });
	}
	log("Bandai raw data copied to data/raw/bandai/");
}

async function main() {
	console.log("=== Data Migration ===\n");
	if (DRY_RUN) {
		console.log("Running in DRY-RUN mode - no files will be modified\n");
	}

	// Create directories
	ensureDir(SRC_PATH);
	ensureDir(RAW_PATH);

	// Migrate each entity type
	const results = {
		items: migrateDirectory("items", transformItem),
		brands: migrateDirectory("brands", transformBrandOrSeries),
		series: migrateDirectory("series", transformBrandOrSeries),
		categories: migrateDirectory("categories", transformBrandOrSeries),
		manuals: migrateDirectory("manuals", transformManual),
	};

	// Move translations
	moveTranslations();

	// Move bandai raw data
	moveBandaiRaw();

	// Summary
	console.log("\n=== Migration Summary ===\n");
	let totalProcessed = 0;
	let totalErrors = 0;
	for (const [type, { processed, errors }] of Object.entries(results)) {
		console.log(`${type}: ${processed} processed, ${errors} errors`);
		totalProcessed += processed;
		totalErrors += errors;
	}
	console.log(`\nTotal: ${totalProcessed} files processed, ${totalErrors} errors`);

	if (!DRY_RUN) {
		console.log("\n=== Next Steps ===");
		console.log("1. Run: pnpm tsx data/scripts/validate.ts --mode=post-migration");
		console.log("2. If validation passes, delete: data/api/graph/");
		console.log("3. Delete: data/bandai/ (now in data/raw/bandai/)");
		console.log("4. Delete: data/translations/ (now in data/src/translations/)");
	}
}

main().catch(console.error);
