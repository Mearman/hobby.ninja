#!/usr/bin/env tsx
/**
 * Pre-migration validation script
 * Generates a manifest with counts, hashes, and field names for data loss prevention
 *
 * Usage:
 *   pnpm tsx data/scripts/validate.ts --mode=pre-migration
 *   pnpm tsx data/scripts/validate.ts --mode=post-migration
 */

import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

const ROOT = join(import.meta.dirname, "../..");
const DATA_ROOT = join(ROOT, "data");
const MANIFEST_PATH = join(DATA_ROOT, ".migration-manifest.json");

interface EntityStats {
	count: number;
	fieldNames: string[];
	sampleIds: string[];
	contentHash: string;
}

interface LocationStats {
	items: EntityStats;
	brands: EntityStats;
	series: EntityStats;
	categories: EntityStats;
	manuals: EntityStats;
}

interface MigrationManifest {
	timestamp: string;
	mode: "pre-migration" | "post-migration";
	locations: {
		"data/api/graph": LocationStats;
		"apps/next/public/data"?: LocationStats;
		"apps/next/src/data"?: LocationStats;
		"data/src"?: LocationStats;
	};
}

function collectFieldNames(obj: Record<string, unknown>, prefix = ""): string[] {
	const fields: string[] = [];
	for (const [key, value] of Object.entries(obj)) {
		const fieldPath = prefix ? `${prefix}.${key}` : key;
		fields.push(fieldPath);
		if (value && typeof value === "object" && !Array.isArray(value)) {
			fields.push(...collectFieldNames(value as Record<string, unknown>, fieldPath));
		}
	}
	return fields;
}

function hashContent(content: string): string {
	return createHash("sha256").update(content).digest("hex").slice(0, 16);
}

function getEntityStats(dirPath: string, entityType: string): EntityStats {
	if (!existsSync(dirPath)) {
		return {
			count: 0,
			fieldNames: [],
			sampleIds: [],
			contentHash: "",
		};
	}

	const files = readdirSync(dirPath).filter((f) => f.endsWith(".json"));
	const allFieldNames = new Set<string>();
	const sampleIds: string[] = [];
	const contentParts: string[] = [];

	for (const file of files) {
		try {
			const content = readFileSync(join(dirPath, file), "utf-8");
			const data = JSON.parse(content) as Record<string, unknown>;

			// Collect field names from first 10 files
			if (sampleIds.length < 10) {
				const fields = collectFieldNames(data);
				for (const field of fields) {
					allFieldNames.add(field);
				}
				sampleIds.push(data.id as string || basename(file, ".json"));
			}

			// Hash core identifying fields for integrity check
			const coreContent = JSON.stringify({
				id: data.id,
				name: data.name,
				type: data.type,
			});
			contentParts.push(coreContent);
		} catch {
			console.warn(`Warning: Could not parse ${file}`);
		}
	}

	return {
		count: files.length,
		fieldNames: Array.from(allFieldNames).sort(),
		sampleIds,
		contentHash: hashContent(contentParts.sort().join("|")),
	};
}

function getLocationStats(basePath: string): LocationStats {
	return {
		items: getEntityStats(join(basePath, "items"), "items"),
		brands: getEntityStats(join(basePath, "brands"), "brands"),
		series: getEntityStats(join(basePath, "series"), "series"),
		categories: getEntityStats(join(basePath, "categories"), "categories"),
		manuals: getEntityStats(join(basePath, "manuals"), "manuals"),
	};
}

function runValidation(mode: "pre-migration" | "post-migration"): MigrationManifest {
	console.log(`Running ${mode} validation...`);

	const manifest: MigrationManifest = {
		timestamp: new Date().toISOString(),
		mode,
		locations: {
			"data/api/graph": getLocationStats(join(DATA_ROOT, "api/graph")),
		},
	};

	// Check additional locations based on mode
	if (mode === "pre-migration") {
		const publicDataPath = join(ROOT, "apps/next/public/data");
		const srcDataPath = join(ROOT, "apps/next/src/data");

		if (existsSync(publicDataPath)) {
			manifest.locations["apps/next/public/data"] = getLocationStats(publicDataPath);
		}
		if (existsSync(srcDataPath)) {
			manifest.locations["apps/next/src/data"] = getLocationStats(srcDataPath);
		}
	} else {
		const srcPath = join(DATA_ROOT, "src");
		if (existsSync(srcPath)) {
			manifest.locations["data/src"] = getLocationStats(srcPath);
		}
	}

	return manifest;
}

function compareManifests(pre: MigrationManifest, post: MigrationManifest): boolean {
	console.log("\n=== Migration Validation Report ===\n");

	let allPassed = true;
	const preStats = pre.locations["data/api/graph"];
	const postStats = post.locations["data/src"];

	if (!postStats) {
		console.error("ERROR: data/src not found in post-migration manifest");
		return false;
	}

	const entityTypes = ["items", "brands", "series", "categories", "manuals"] as const;

	for (const entity of entityTypes) {
		const preCount = preStats[entity].count;
		const postCount = postStats[entity].count;
		const passed = preCount === postCount;

		console.log(
			`${passed ? "PASS" : "FAIL"} ${entity}: ${preCount} → ${postCount} ${passed ? "" : `(MISSING: ${preCount - postCount})`}`
		);

		if (!passed) allPassed = false;
	}

	console.log("\n=== Content Hash Comparison ===\n");

	for (const entity of entityTypes) {
		const preHash = preStats[entity].contentHash;
		const postHash = postStats[entity].contentHash;
		const passed = preHash === postHash;

		console.log(`${passed ? "PASS" : "WARN"} ${entity} hash: ${passed ? "matches" : `${preHash} → ${postHash}`}`);
	}

	return allPassed;
}

// Main execution
const args = process.argv.slice(2);
const modeArg = args.find((a) => a.startsWith("--mode="));
const mode = (modeArg?.split("=")[1] || "pre-migration") as "pre-migration" | "post-migration";

if (mode === "pre-migration") {
	const manifest = runValidation("pre-migration");
	writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
	console.log(`\nManifest saved to: ${MANIFEST_PATH}`);

	console.log("\n=== Pre-Migration Summary ===\n");
	const stats = manifest.locations["data/api/graph"];
	console.log(`Items:      ${stats.items.count}`);
	console.log(`Brands:     ${stats.brands.count}`);
	console.log(`Series:     ${stats.series.count}`);
	console.log(`Categories: ${stats.categories.count}`);
	console.log(`Manuals:    ${stats.manuals.count}`);
} else if (mode === "post-migration") {
	if (!existsSync(MANIFEST_PATH)) {
		console.error("ERROR: No pre-migration manifest found. Run with --mode=pre-migration first.");
		process.exit(1);
	}

	const preManifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf-8")) as MigrationManifest;
	const postManifest = runValidation("post-migration");

	const passed = compareManifests(preManifest, postManifest);
	console.log(`\n${passed ? "VALIDATION PASSED" : "VALIDATION FAILED"}`);

	if (!passed) {
		process.exit(1);
	}
}
