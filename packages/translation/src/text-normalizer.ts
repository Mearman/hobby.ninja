/**
 * Text normalizer for Gundam-related content
 *
 * Ensures consistent spacing around brand names, product codes,
 * and common terms in both Japanese and English text.
 */

export interface NormalizerOptions {
	/** Normalize spacing around "Gundam" (English) */
	normalizeGundam?: boolean;
	/** Normalize spacing around "ガンダム" (Japanese) */
	normalizeGundamJa?: boolean;
	/** Normalize spacing around quoted text */
	normalizeQuotes?: boolean;
}

const DEFAULT_OPTIONS: NormalizerOptions = {
	normalizeGundam: true,
	normalizeGundamJa: true,
	normalizeQuotes: true,
};

/**
 * Normalize text with proper spacing around "Gundam"/"ガンダム" and related terms
 *
 * English examples:
 * - "ZGundam" → "Z Gundam"
 * - "SDGundamBB" → "SD Gundam BB"
 * - "GundamMk-II" → "Gundam Mk-II"
 * - "Gundam0083" → "Gundam 0083"
 * - "\"Gundam\"BB" → "\"Gundam\" BB"
 *
 * Japanese examples:
 * - "SDガンダムBB戦士" → "SD ガンダム BB戦士"
 * - "機動戦士ガンダム0083" → "機動戦士ガンダム 0083"
 */
export function normalizeText(
	text: string,
	options: NormalizerOptions = DEFAULT_OPTIONS
): string {
	if (!text) return text;

	let result = text;

	if (options.normalizeGundam) {
		result = normalizeGundamSpacing(result);
	}

	if (options.normalizeGundamJa) {
		result = normalizeGundamJaSpacing(result);
	}

	if (options.normalizeQuotes) {
		result = normalizeQuoteSpacing(result);
	}

	return result;
}

/**
 * English "Gundam" spacing normalization
 *
 * Rules:
 * 1. Add space BEFORE "Gundam" if preceded by letter/number (not already spaced)
 * 2. Add space AFTER "Gundam" if followed by letter/number (not already spaced)
 * 3. Preserve existing proper spacing
 */
function normalizeGundamSpacing(text: string): string {
	let result = text;

	// Add space BEFORE "Gundam" if preceded by alphanumeric
	// Negative lookbehind for space, positive lookbehind for alphanumeric
	result = result.replace(/([A-Za-z0-9])Gundam/g, '$1 Gundam');

	// Add space AFTER "Gundam" if followed by alphanumeric
	// But not if it's part of a hyphenated word that starts with letter (like Mk-II)
	result = result.replace(/Gundam([A-Za-z0-9])/g, 'Gundam $1');

	// Clean up any double spaces created
	result = result.replace(/ {2,}/g, ' ');

	return result;
}

/**
 * Japanese "ガンダム" spacing normalization
 *
 * Rules:
 * 1. Add space BEFORE "ガンダム" if preceded by ASCII alphanumeric
 * 2. Add space AFTER "ガンダム" if followed by ASCII alphanumeric
 * 3. Don't add spaces around Japanese characters (kanji, hiragana, other katakana)
 */
function normalizeGundamJaSpacing(text: string): string {
	let result = text;

	// Add space BEFORE "ガンダム" if preceded by ASCII letter/number
	result = result.replace(/([A-Za-z0-9])ガンダム/g, '$1 ガンダム');

	// Add space AFTER "ガンダム" if followed by ASCII letter/number
	result = result.replace(/ガンダム([A-Za-z0-9])/g, 'ガンダム $1');

	// Clean up any double spaces created
	result = result.replace(/ {2,}/g, ' ');

	return result;
}

/**
 * Normalize spacing around quoted text
 *
 * Ensures quotes have proper spacing:
 * - '"Gundam"BB' → '"Gundam" BB'
 * - 'SD"Gundam"BB' → 'SD "Gundam" BB'
 */
function normalizeQuoteSpacing(text: string): string {
	let result = text;

	// Add space after closing quote if followed by alphanumeric
	result = result.replace(/"([^"]+)"([A-Za-z0-9])/g, '"$1" $2');

	// Add space before opening quote if preceded by alphanumeric
	result = result.replace(/([A-Za-z0-9])"([^"]*")/g, '$1 "$2');

	// Clean up any double spaces created
	result = result.replace(/ {2,}/g, ' ');

	return result;
}

/**
 * Batch normalize an array of texts
 */
export function normalizeTexts(
	texts: string[],
	options?: NormalizerOptions
): string[] {
	return texts.map((t) => normalizeText(t, options));
}
