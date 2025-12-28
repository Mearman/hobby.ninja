/**
 * Generate image-lookup.json by matching series/brand IDs to existing image files
 *
 * Uses pattern-based matching to connect database IDs to sanitized filenames:
 * - Direct match: `gundam` -> `gundam.jpg`
 * - Strip `mobile-suit-gundam-`: `mobile-suit-gundam-seed` -> `seed.jpg`
 * - Strip `gundam-`: `gundam-build-divers` -> `build-divers.jpg`
 * - Strip `-series` suffix: `digimon-series` -> `digimon.jpg`
 *
 * Usage: pnpm tsx scripts/generate-image-lookup.ts
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const SERIES_JSON_PATH = "data/dist/series.json";
const BRANDS_JSON_PATH = "data/dist/brands.json";
const SERIES_IMAGES_DIR = "apps/next/public/images/series";
const BRANDS_IMAGES_DIR = "apps/next/public/images/brands";
const OUTPUT_PATH = "apps/next/src/data/image-lookup.json";
const EXISTING_LOOKUP_PATH = "apps/next/src/data/image-lookup.json";

const MOBILE_SUIT_GUNDAM_PREFIX = "mobile-suit-gundam-";
const MOBILE_SUIT_PREFIX = "mobile-suit-";
const GUNDAM_PREFIX = "gundam-";
const SERIES_SUFFIX = "-series";
const SUMMARY_WIDTH = 50;

interface EntityNode {
	id: string;
	type: string;
	name: { ja?: string; en?: string } | string;
}

type EntityMap = Record<string, EntityNode>;

interface ImageLookup {
	brands: Record<string, string>;
	grades: Record<string, string>;
	series: Record<string, string>;
}

/**
 * Scan a directory for image files and return a map of base name -> full filename
 */
function scanImageDirectory(dir: string): Map<string, string> {
	const imageMap = new Map<string, string>();

	if (!existsSync(dir)) {
		console.warn(`Directory does not exist: ${dir}`);
		return imageMap;
	}

	const files = readdirSync(dir);
	for (const file of files) {
		// Skip non-image files
		if (!/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file)) {
			continue;
		}

		// Extract base name without extension
		const baseName = file.replace(/\.[^.]+$/, "").toLowerCase();
		imageMap.set(baseName, file);
	}

	return imageMap;
}

/**
 * Manual overrides for special naming cases that can't be pattern-matched
 */
const SERIES_OVERRIDES: Record<string, string> = {
	"armor-shinden-samurai-trooper": "samurai-trooper",
	"armored-core-fires-of-rubicon": "armoredcore",
	"armored-senki-dragonar": "dragonar",
	"armored-trooper-votoms": "votoms",
	"bocchi-the-rock": "bocchi-rocks",
	"cca-msv": "gundam-cca",
	"code-geass-series": "geass",
	"danball-senki": "lbx",
	"demon-slayer": "kimetsu",
	"digimon-series": "digimon",
	"dragon-ball-series": "dragonball",
	"fategrand-order": "fate",
	"galaxy-drifting-vifam": "vifam",
	"godzilla-x-kong-new-empire": "godzilla",
	"gundam-breaker-battlogue": "gundam_breaker_battlogue",
	"gundam-build-metaverse": "gundambuildmetaverse",
	"gundam-sentinel": "sentinel",
	"gunpla-kun": "gunplakun",
	"gunpla": "gunpla-series",
	"heavy-fighter-l-gaim": "lgaim",
	"holy-warrior-dunbine": "dunbine",
	"hot-blooded-strongest-gozaurer": "hot-blooded-strongest-gozaurer",
	"idolmaster-series": "idolmaster",
	"iron-blooded-orphans-1100-full-mechanics": "tekketsu",
	"iron-blooded-orphans-hg": "tekketsu",
	"kaiju-no-8": "kaiju-no8",
	"kamen-rider-series": "rider",
	"king-of-braves-gaogaigar": "gaogaigar",
	"kyoukai-senki": "kyoukaisenki",
	"macross-series": "macross",
	"mobile-fighter-g-gundam": "ggundam",
	"mobile-new-century-gundam-x": "x",
	"mobile-police-patlabor": "patlabor",
	"mobile-report-gundam-w-dual-story-g-unit": "g-unit",
	"nausicaa-of-the-valley-of-the-wind": "nausicaa",
	"mobile-suit-crossbone-gundam-seven-of-steel": "crossbone-gundam",
	"mobile-suit-crossbone-gundam": "crossbone-gundam",
	"mobile-suit-gundam-00-double-o": "g-00",
	"mobile-suit-gundam-00": "g-00",
	"mobile-suit-gundam-0080-war-in-the-pocket": "g-0080",
	"mobile-suit-gundam-0083-stardust-memory": "g-0083",
	"mobile-suit-gundam-00f": "g-00",
	"mobile-suit-gundam-00p": "g-00",
	"mobile-suit-gundam-00v-senki": "g-00",
	"mobile-suit-gundam-age": "age",
	"mobile-suit-gundam-chars-counterattack": "gundam-cca",
	"mobile-suit-gundam-cucurrus-doan-island": "g-doan",
	"mobile-suit-gundam-f91": "f91",
	"mobile-suit-gundam-flash-hathaway": "hathaway",
	"mobile-suit-gundam-gaiden-missing-link": "gaiden-missing-link",
	"mobile-suit-gundam-gs-reconguista": "g-reco",
	"mobile-suit-gundam-gquuuuuux": "gquuuuuux",
	"mobile-suit-gundam-iron-blooded-orphans": "tekketsu",
	"mobile-suit-gundam-ms-igloo": "ms-igloo",
	"mobile-suit-gundam-msv-r": "msv",
	"mobile-suit-gundam-nt-narrative": "narrative",
	"mobile-suit-gundam-requiem-of-vengeance": "requiem",
	"mobile-suit-gundam-seed-astray": "seed-astray",
	"mobile-suit-gundam-seed-destiny-astray-r": "seed-d",
	"mobile-suit-gundam-seed-destiny-astray": "seed-d",
	"mobile-suit-gundam-seed-destiny": "seed-d",
	"mobile-suit-gundam-seed-freedom": "seed-freedom",
	"mobile-suit-gundam-seed": "seed",
	"mobile-suit-gundam-senki": "senki",
	"mobile-suit-gundam-the-origin-msd": "origin",
	"mobile-suit-gundam-the-origin": "origin",
	"mobile-suit-gundam-thunderbolt": "thunderbolt",
	"mobile-suit-gundam-uc": "unicorn",
	"mobile-suit-gundam-uc-unicorn": "unicorn",
	"mobile-suit-gundam-unicorn": "unicorn",
	"mobile-suit-gundam-wing-endless-waltz": "endlesswaltz",
	"mobile-suit-gundam-wing": "endlesswaltz",
	"new-mobile-report-gundam-w": "endlesswaltz",
	"mobile-suit-gundam-zz": "gundam-zz",
	"mobile-suit-gundam": "gundam",
	"mobile-suit-victory-gundam": "v-gundam",
	"mobile-suit-z-gundam": "z-gundam",
	"puella-magi-madoka-magica": "madoka-magica",
	"planosaurus": "plannosaurus",
	"pocket-monster": "pokemon",
	"sd-gundam-world-heroes": "sdgundamworld_heroes",
	"sergeant-keroro": "keroro",
	"space-battleship-yamato-series": "yamato",
	"super-robot-wars-og": "superrobot_og",
	"symphonic-psalm-eureka-seven": "eureka-seven",
	"synduality": "synduality",
	"umamusume-pretty-derby": "umamusume",
	"yu-gi-oh-duel-monsters": "yugioh",
	"yugioh-series": "yugioh",
	"the-idolmster-shiny-colors": "idolmaster",
	"the-witch-from-mercury": "g-witch",
	"mobile-suit-gundam-witch-of-mercury": "g-witch",
	"mobile-suit-gundam-witch-of-mercury-gaiden": "g-witch",
	"turn-a-gundam": "turn-a",
};

const BRAND_OVERRIDES: Record<string, string> = {
	"action-base": "actionbase",
	"bandai-spirits-tools": "tool",
	"best-hit-chronicle": "besthit_chronicle",
	"clay-modelkit": "claymodelkit",
	"customized-scene-baseeffectsmaterialsweapons": "customize_scenebase",
	"eco-plastic-project": "ecoplaproject_g",
	"eg": "entry_grade",
	"entry-grade": "entry_grade",
	"figure-rise-standard-amplified": "figurerise-standard-amp",
	"figure-rise-standard": "figurerise-standard",
	"fm": "fullmechanics",
	"full-mechanics": "fullmechanics",
	"gundam-decal": "gundam_decal",
	"gundam-next-future-pavilion": "expo2025-gunpla",
	"hg": "hg",
	"hg-after-colony": "hg",
	"hg-amplified-imgn": "hgamplifiedimgn",
	"hg-cosmic-era": "hgce",
	"hg-high-grade": "hg",
	"hg-high-gradepreban-gunpla": "hg",
	"hg-universal-century": "hguc",
	"hi-resolution-model": "hirm",
	"limex": "limex",
	"master-grade-sd": "mgsd",
	"mecha-collection": "mecha-colle",
	"mega-size-model": "megasize",
	"mg": "mg",
	"mg-master-grade": "mg",
	"mg-master-gradepreban-gunpla": "mg",
	"mg-verka-master-grade-version-katoki": "mgka",
	"mgex-master-grade-extreme": "mgex",
	"optional-parts-set": "optionpartsset",
	"pg": "pg",
	"pg-perfect-grade": "pg",
	"pg-perfect-gradepreban-gunpla": "pg",
	"re100-reborn-one-hundred": "re100",
	"rg": "rg",
	"rg-real-grade": "rg",
	"rg-real-gradepreban-gunpla": "rg",
	"sd": "SDEX",
	"sd-cross-silhouette": "sdcs",
	"sd-gundam-bb-senshi": "bb",
	"sd-gundam-bb-senshipreban-gunpla": "bb",
	"sd-gundam-bb-warrior": "bb",
	"sd-gundam-bb-warriorpreban-gunpla": "bb",
	"sd-gundam-cross-silhouette": "sdcs",
	"sd-gundam-series": "SDEX",
	"sdex-standard": "SDEX",
	"ultimagear": "ultimagear",
};

/**
 * Generate candidate file names from an entity ID using sanitization patterns
 */
function generateCandidates(id: string, overrides: Record<string, string>): string[] {
	// Check overrides first
	if (overrides[id]) {
		return [overrides[id].toLowerCase()];
	}

	const candidates: string[] = [id];

	// Pattern 1: Strip `mobile-suit-gundam-` prefix
	if (id.startsWith(MOBILE_SUIT_GUNDAM_PREFIX)) {
		candidates.push(id.replace(MOBILE_SUIT_GUNDAM_PREFIX, ""));
	}

	// Pattern 2: Strip `gundam-` prefix
	if (id.startsWith(GUNDAM_PREFIX)) {
		candidates.push(id.replace(GUNDAM_PREFIX, ""));
	}

	// Pattern 3: Strip `mobile-suit-` prefix
	if (id.startsWith(MOBILE_SUIT_PREFIX)) {
		candidates.push(id.replace(MOBILE_SUIT_PREFIX, ""));
	}

	// Pattern 4: Strip `-series` suffix
	if (id.endsWith(SERIES_SUFFIX)) {
		const withoutSuffix = id.replace(/-series$/, "");
		candidates.push(withoutSuffix);
		// Also try with prefix stripping
		if (withoutSuffix.startsWith(GUNDAM_PREFIX)) {
			candidates.push(withoutSuffix.replace(GUNDAM_PREFIX, ""));
		}
	}

	// Pattern 5: Strip both prefix and suffix combinations
	let stripped = id;
	if (stripped.startsWith(MOBILE_SUIT_GUNDAM_PREFIX)) {
		stripped = stripped.replace(MOBILE_SUIT_GUNDAM_PREFIX, "");
	} else if (stripped.startsWith(GUNDAM_PREFIX)) {
		stripped = stripped.replace(GUNDAM_PREFIX, "");
	} else if (stripped.startsWith(MOBILE_SUIT_PREFIX)) {
		stripped = stripped.replace(MOBILE_SUIT_PREFIX, "");
	}
	if (stripped.endsWith(SERIES_SUFFIX)) {
		stripped = stripped.replace(/-series$/, "");
	}
	if (stripped !== id && !candidates.includes(stripped)) {
		candidates.push(stripped);
	}

	// Pattern 6: Remove hyphens entirely
	const noHyphens = id.replaceAll("-", "");
	if (!candidates.includes(noHyphens)) {
		candidates.push(noHyphens);
	}

	// Pattern 7: Replace hyphens with underscores
	const underscored = id.replaceAll("-", "_");
	if (!candidates.includes(underscored)) {
		candidates.push(underscored);
	}

	return candidates.map((c) => c.toLowerCase());
}

/**
 * Find an image file for an entity ID
 */
function findImageForId(
	id: string,
	imageMap: Map<string, string>,
	imageDir: string,
	overrides: Record<string, string>,
): string | null {
	const candidates = generateCandidates(id, overrides);

	for (const candidate of candidates) {
		const filename = imageMap.get(candidate);
		if (filename) {
			return `/images/${path.basename(imageDir)}/${filename}`;
		}
	}

	return null;
}

function main() {
	// Load existing lookup to preserve grades (manually curated)
	let existingLookup: ImageLookup = { brands: {}, grades: {}, series: {} };
	if (existsSync(EXISTING_LOOKUP_PATH)) {
		existingLookup = JSON.parse(
			readFileSync(EXISTING_LOOKUP_PATH, "utf8"),
		) as ImageLookup;
	}

	// Load entity data (stored as id-keyed objects)
	const seriesMap = JSON.parse(readFileSync(SERIES_JSON_PATH, "utf8")) as EntityMap;
	const brandsMap = JSON.parse(readFileSync(BRANDS_JSON_PATH, "utf8")) as EntityMap;

	// Convert to arrays for iteration
	const seriesData = Object.values(seriesMap);
	const brandsData = Object.values(brandsMap);

	// Scan image directories
	const seriesImages = scanImageDirectory(SERIES_IMAGES_DIR);
	const brandsImages = scanImageDirectory(BRANDS_IMAGES_DIR);

	console.log(`Found ${seriesImages.size} series image files`);
	console.log(`Found ${brandsImages.size} brand image files`);
	console.log("");

	// Generate series mappings
	const seriesMappings: Record<string, string> = {};
	const unmappedSeries: string[] = [];

	for (const series of seriesData) {
		const imagePath = findImageForId(series.id, seriesImages, SERIES_IMAGES_DIR, SERIES_OVERRIDES);
		if (imagePath) {
			seriesMappings[series.id] = imagePath;
		} else {
			unmappedSeries.push(series.id);
		}
	}

	// Generate brand mappings
	const brandMappings: Record<string, string> = {};
	const unmappedBrands: string[] = [];

	for (const brand of brandsData) {
		const imagePath = findImageForId(brand.id, brandsImages, BRANDS_IMAGES_DIR, BRAND_OVERRIDES);
		if (imagePath) {
			brandMappings[brand.id] = imagePath;
		} else {
			unmappedBrands.push(brand.id);
		}
	}

	// Create output with preserved grades
	const output: ImageLookup = {
		brands: Object.fromEntries(
			Object.entries(brandMappings).toSorted(([a], [b]) => a.localeCompare(b)),
		),
		grades: existingLookup.grades, // Preserve manually curated grade mappings
		series: Object.fromEntries(
			Object.entries(seriesMappings).toSorted(([a], [b]) => a.localeCompare(b)),
		),
	};

	// Write output
	writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, "\t") + "\n");

	// Print summary
	console.log("=".repeat(SUMMARY_WIDTH));
	console.log("SUMMARY");
	console.log("=".repeat(SUMMARY_WIDTH));
	console.log(`Series: ${Object.keys(seriesMappings).length}/${seriesData.length} mapped`);
	console.log(`Brands: ${Object.keys(brandMappings).length}/${brandsData.length} mapped`);
	console.log(`Grades: ${Object.keys(existingLookup.grades).length} preserved`);
	console.log("");
	console.log(`Output written to: ${OUTPUT_PATH}`);

	if (unmappedSeries.length > 0) {
		console.log("");
		console.log(`Unmapped series (${unmappedSeries.length}):`);
		for (const id of unmappedSeries.slice(0, 20)) {
			console.log(`  - ${id}`);
		}
		if (unmappedSeries.length > 20) {
			console.log(`  ... and ${unmappedSeries.length - 20} more`);
		}
	}

	if (unmappedBrands.length > 0) {
		console.log("");
		console.log(`Unmapped brands (${unmappedBrands.length}):`);
		for (const id of unmappedBrands) {
			console.log(`  - ${id}`);
		}
	}
}

main();
