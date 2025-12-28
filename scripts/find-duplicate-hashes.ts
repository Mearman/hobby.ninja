/**
 * Find matching image hashes across items, manuals, and P-Bandai US
 */

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const WORKSPACE_ROOT = process.cwd();
const ITEMS_DIR = path.join(WORKSPACE_ROOT, "data/src/items");
const MANUALS_DIR = path.join(WORKSPACE_ROOT, "data/src/manuals");
const PBANDAI_DIR = path.join(WORKSPACE_ROOT, "data/src/pbandai/en/items");

const JSON_EXTENSION = ".json";
const INDEX_FILE = "index.json";
const PAD_LENGTH = 15;

interface ImageData {
	path: string;
	hash?: string;
}

interface ItemImages {
	product?: ImageData[];
	instructions?: ImageData[];
}

interface ItemData {
	id: string;
	images?: ItemImages;
}

interface ManualData {
	id: string;
	image?: {
		path: string;
		hash?: string;
	};
}

interface PBandaiData {
	id: string;
	images?: ImageData[];
}

interface HashEntry {
	source: "item" | "manual" | "pbandai";
	id: string;
	path: string;
	type?: string;
}

// Collect hashes from each source
const hashMap = new Map<string, HashEntry[]>();

// Process items
console.log("Processing items...");
const itemFiles = readdirSync(ITEMS_DIR).filter(
	(f) => f.endsWith(JSON_EXTENSION) && f !== INDEX_FILE,
);
let itemHashes = 0;

for (const file of itemFiles) {
	const data = JSON.parse(readFileSync(path.join(ITEMS_DIR, file), "utf8")) as ItemData;
	const id = data.id;

	for (const img of data.images?.product ?? []) {
		if (img.hash) {
			const existing = hashMap.get(img.hash);
			if (existing) {
				existing.push({ source: "item", id, path: img.path, type: "product" });
			} else {
				hashMap.set(img.hash, [{ source: "item", id, path: img.path, type: "product" }]);
			}
			itemHashes++;
		}
	}
	for (const img of data.images?.instructions ?? []) {
		if (img.hash) {
			const existing = hashMap.get(img.hash);
			if (existing) {
				existing.push({ source: "item", id, path: img.path, type: "instructions" });
			} else {
				hashMap.set(img.hash, [{ source: "item", id, path: img.path, type: "instructions" }]);
			}
			itemHashes++;
		}
	}
}
console.log(`  Items: ${itemFiles.length} files, ${itemHashes} hashes`);

// Process manuals
console.log("Processing manuals...");
const manualFiles = readdirSync(MANUALS_DIR).filter(
	(f) => f.endsWith(JSON_EXTENSION) && f !== INDEX_FILE,
);
let manualHashes = 0;

for (const file of manualFiles) {
	const data = JSON.parse(readFileSync(path.join(MANUALS_DIR, file), "utf8")) as ManualData;
	const id = data.id;

	if (data.image?.hash) {
		const hash = data.image.hash;
		const existing = hashMap.get(hash);
		if (existing) {
			existing.push({ source: "manual", id, path: data.image.path });
		} else {
			hashMap.set(hash, [{ source: "manual", id, path: data.image.path }]);
		}
		manualHashes++;
	}
}
console.log(`  Manuals: ${manualFiles.length} files, ${manualHashes} hashes`);

// Process P-Bandai
console.log("Processing P-Bandai US...");
let pbandaiFiles: string[] = [];
try {
	pbandaiFiles = readdirSync(PBANDAI_DIR).filter(
		(f) => f.endsWith(JSON_EXTENSION) && f !== INDEX_FILE,
	);
} catch {
	console.log("  P-Bandai directory not found");
}
let pbandaiHashes = 0;

for (const file of pbandaiFiles) {
	const data = JSON.parse(readFileSync(path.join(PBANDAI_DIR, file), "utf8")) as PBandaiData;
	const id = data.id;

	for (const img of data.images ?? []) {
		if (img.hash) {
			const existing = hashMap.get(img.hash);
			if (existing) {
				existing.push({ source: "pbandai", id, path: img.path });
			} else {
				hashMap.set(img.hash, [{ source: "pbandai", id, path: img.path }]);
			}
			pbandaiHashes++;
		}
	}
}
console.log(`  P-Bandai: ${pbandaiFiles.length} files, ${pbandaiHashes} hashes`);

// Find cross-source matches
console.log("\n=== Cross-Source Hash Matches ===\n");

const crossMatches: Array<{ hash: string; entries: HashEntry[] }> = [];
for (const [hash, entries] of hashMap) {
	const sources = new Set(entries.map((e) => e.source));
	if (sources.size > 1) {
		crossMatches.push({ hash, entries });
	}
}

console.log("Total unique hashes:", hashMap.size);
console.log("Cross-source matches:", crossMatches.length);

// Categorize matches
const matchTypes = {
	"item-manual": 0,
	"item-pbandai": 0,
	"manual-pbandai": 0,
	"all-three": 0,
};

for (const match of crossMatches) {
	const sources = new Set(match.entries.map((e) => e.source));
	if (sources.size === 3) {
		matchTypes["all-three"]++;
	} else if (sources.has("item") && sources.has("manual")) {
		matchTypes["item-manual"]++;
	} else if (sources.has("item") && sources.has("pbandai")) {
		matchTypes["item-pbandai"]++;
	} else if (sources.has("manual") && sources.has("pbandai")) {
		matchTypes["manual-pbandai"]++;
	}
}

console.log("\nMatch breakdown:");
console.log("  Item <-> Manual:", matchTypes["item-manual"]);
console.log("  Item <-> P-Bandai:", matchTypes["item-pbandai"]);
console.log("  Manual <-> P-Bandai:", matchTypes["manual-pbandai"]);
console.log("  All three:", matchTypes["all-three"]);

// Show Item <-> P-Bandai matches (most valuable)
const itemPbandaiMatches = crossMatches.filter((m) => {
	const sources = new Set(m.entries.map((e) => e.source));
	return sources.has("item") && sources.has("pbandai");
});

if (itemPbandaiMatches.length > 0) {
	console.log("\n=== Item <-> P-Bandai Matches (Cross-Site Links) ===\n");
	for (const match of itemPbandaiMatches) {
		console.log("Hash:", match.hash);
		for (const e of match.entries) {
			const typeStr = e.type ? ` (${e.type})` : "";
			console.log(`  - ${e.source.padEnd(8)} ${e.id.padEnd(PAD_LENGTH)} ${e.path}${typeStr}`);
		}
		console.log();
	}
}

// Show a sample of Item <-> Manual matches
console.log("\n=== Item <-> Manual Matches (Same File, Different References) ===\n");
const itemManualMatches = crossMatches.filter((m) => {
	const sources = new Set(m.entries.map((e) => e.source));
	return sources.has("item") && sources.has("manual") && !sources.has("pbandai");
});
console.log(`Total: ${itemManualMatches.length} matches`);
console.log("(These share the same image file - manual images stored in item folders)\n");

for (const match of itemManualMatches.slice(0, 5)) {
	console.log("Hash:", match.hash);
	for (const e of match.entries) {
		const typeStr = e.type ? ` (${e.type})` : "";
		console.log(`  - ${e.source.padEnd(8)} ${e.id.padEnd(PAD_LENGTH)} ${e.path}${typeStr}`);
	}
	console.log();
}
