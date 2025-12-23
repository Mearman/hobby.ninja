/**
 * Product name normalization for matching catalog items to manuals.
 *
 * Handles Japanese/English text normalization, grade prefix variations,
 * and Unicode inconsistencies between data sources.
 */

/** Known grade prefixes in order of specificity (most specific first) */
const GRADE_PREFIXES = [
	// Extended grades (must match before base grades)
	"HGBD:R",
	"HGBD",
	"HGBF",
	"HGBC",
	"HGUC",
	"HGCE",
	"HGAC",
	"HGAW",
	"HGCC",
	"HGFC",
	"HGIBO",
	"HGSEED",
	"HGWFM",
	"HGTWFM",
	"HGAB",
	"HGPG",
	"HGRC",
	"HGGT",
	"HG00",
	"HGORIGIN",
	// Master Grade variants
	"MGEX",
	"MGSD",
	"MGKA",
	// Base grades
	"HG",
	"MG",
	"PG",
	"RG",
	"SD",
	"RE",
	"FM",
	"EG",
	// Special product lines
	"Figure-riseBust",
	"Figure-riseLABO",
	"Figure-riseStandard",
	"Figure-riseEffect",
	"Figure-rise",
	"MODEROID",
	"30MM",
	"30MF",
	"30MS",
	"CUSTOMIZE EFFECT",
];

/**
 * Normalize a product name for matching.
 * Applies Unicode normalization, whitespace cleanup, and bracket standardization.
 */
export function normalizeProductName(name: string): string {
	return (
		name
			// Unicode NFKC normalization (converts full-width to half-width, etc.)
			.normalize("NFKC")
			// Normalize all whitespace (including full-width space) to single space
			.replaceAll(/[\s\u3000]+/g, " ")
			// Normalize Japanese brackets to ASCII
			.replaceAll("（", "(")
			.replaceAll("）", ")")
			.replaceAll("［", "[")
			.replaceAll("］", "]")
			// Normalize Japanese punctuation
			.replaceAll("、", ",")
			.replaceAll("。", ".")
			// Remove trademark/copyright symbols
			.replaceAll(/[®™©]/g, "")
			// Trim
			.trim()
	);
}

/**
 * Extract the core product name by removing grade prefix and scale.
 * This creates a more comparable string for fuzzy matching.
 *
 * Example: "HGUC 1/144 バーザム" → "バーザム"
 */
export function extractCoreName(name: string): string {
	let normalized = normalizeProductName(name);

	// Remove grade prefixes (case-insensitive)
	for (const prefix of GRADE_PREFIXES) {
		const regex = new RegExp(String.raw`^${escapeRegex(prefix)}\s*`, "i");
		normalized = normalized.replace(regex, "");
	}

	// Remove scale (1/144, 1/100, etc.)
	normalized = normalized.replaceAll(/1\/\d+\s*/g, "");

	return normalized.trim();
}

/**
 * Extract grade from a product name.
 * Returns the matched grade prefix or undefined.
 */
export function extractGrade(name: string): string | undefined {
	const normalized = normalizeProductName(name);

	for (const prefix of GRADE_PREFIXES) {
		const regex = new RegExp(String.raw`^${escapeRegex(prefix)}(?:\s|$)`, "i");
		if (regex.test(normalized)) {
			return prefix;
		}
	}

	return undefined;
}

/**
 * Extract scale from a product name.
 * Returns the scale string (e.g., "1/144") or undefined.
 */
export function extractScale(name: string): string | undefined {
	const match = /1\/(\d+)/.exec(name);
	return match ? `1/${String(match[1])}` : undefined;
}

/**
 * Normalize a grade code for comparison.
 * Handles variations like "HG［ハイグレード］" → "HG"
 */
export function normalizeGrade(grade: string): string {
	// Remove Japanese descriptions in brackets
	let normalized = grade.replaceAll(/［[^\］]+］/g, "").trim();

	// Normalize to uppercase
	normalized = normalized.toUpperCase();

	// Map extended grades to base grades for loose matching
	const baseGradeMap: Record<string, string> = {
		HGUC: "HG",
		HGCE: "HG",
		HGAC: "HG",
		HGAW: "HG",
		HGCC: "HG",
		HGFC: "HG",
		HGBF: "HG",
		HGBC: "HG",
		HGBD: "HG",
		"HGBD:R": "HG",
		HGIBO: "HG",
		HGSEED: "HG",
		HGWFM: "HG",
		HGTWFM: "HG",
		HGAB: "HG",
		HGPG: "HG",
		HGRC: "HG",
		HGGT: "HG",
		HG00: "HG",
		HGORIGIN: "HG",
		MGEX: "MG",
		MGSD: "MG",
		MGKA: "MG",
	};

	return baseGradeMap[normalized] ?? normalized;
}

/**
 * Calculate Jaro-Winkler similarity between two strings.
 * Returns a value between 0 (no similarity) and 1 (identical).
 */
export function jaroWinklerSimilarity(s1: string, s2: string): number {
	if (s1 === s2) return 1;
	if (s1.length === 0 || s2.length === 0) return 0;

	const matchDistance = Math.floor(Math.max(s1.length, s2.length) / 2) - 1;
	const s1Matches = Array.from({length: s1.length}).fill(false);
	const s2Matches = Array.from({length: s2.length}).fill(false);

	let matches = 0;
	let transpositions = 0;

	// Find matches
	for (const [i, element] of [...s1].entries()) {
		const start = Math.max(0, i - matchDistance);
		const end = Math.min(i + matchDistance + 1, s2.length);

		for (let j = start; j < end; j++) {
			if (s2Matches[j] || element !== s2[j]) continue;
			s1Matches[i] = true;
			s2Matches[j] = true;
			matches++;
			break;
		}
	}

	if (matches === 0) return 0;

	// Count transpositions
	let k = 0;
	for (const [i, element] of [...s1].entries()) {
		if (!s1Matches[i]) continue;
		while (!s2Matches[k]) k++;
		if (element !== s2[k]) transpositions++;
		k++;
	}

	const jaro =
		(matches / s1.length +
			matches / s2.length +
			(matches - transpositions / 2) / matches) /
		3;

	// Calculate common prefix (up to 4 characters)
	let prefix = 0;
	for (let i = 0; i < Math.min(s1.length, s2.length, 4); i++) {
		if (s1[i] === s2[i]) prefix++;
		else break;
	}

	// Jaro-Winkler with scaling factor 0.1
	return jaro + prefix * 0.1 * (1 - jaro);
}

/**
 * Calculate similarity between two product names.
 * Uses core name extraction and Jaro-Winkler similarity.
 */
export function productNameSimilarity(name1: string, name2: string): number {
	const core1 = extractCoreName(name1);
	const core2 = extractCoreName(name2);

	return jaroWinklerSimilarity(core1, core2);
}

/**
 * Check if two series names match (with normalization).
 */
export function seriesMatch(series1?: string, series2?: string): boolean {
	if (!series1 || !series2) return false;

	const normalized1 = normalizeProductName(series1);
	const normalized2 = normalizeProductName(series2);

	return normalized1 === normalized2;
}

/**
 * Check if two scales match.
 */
export function scaleMatch(scale1?: string, scale2?: string): boolean {
	if (!scale1 || !scale2) return false;

	// Extract just the number for comparison
	const num1 = (/\d+/.exec(scale1))?.[0];
	const num2 = (/\d+/.exec(scale2))?.[0];

	return num1 === num2;
}

/**
 * Check if two grades match (with normalization to base grades).
 */
export function gradeMatch(grade1?: string, grade2?: string): boolean {
	if (!grade1 || !grade2) return false;

	return normalizeGrade(grade1) === normalizeGrade(grade2);
}

// Helper to escape regex special characters
function escapeRegex(str: string): string {
	return str.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}
