/**
 * Dictionary Builder - Programmatically builds/rebuilds the translation dictionary
 *
 * Analyzes translation cache files to extract phrase mappings, word mappings,
 * and discovered patterns. Can be called after translation runs to update
 * the dictionary with new translations.
 */

import { promises as fs } from "node:fs";
import path from "node:path";

import { TRANSLATION_CACHE_DIR, TRANSLATION_DICTIONARY_PATH } from "./constants";
import type { TranslationDictionary, PhraseMapping, WordMapping, DiscoveredPattern } from "./dictionary";

// ============================================================================
// Types
// ============================================================================

interface TranslationCacheEntry {
	key: string;
	originalText: string;
	translatedText: string;
	sourceLanguage: string;
	targetLanguage: string;
	createdAt: number;
	accessedAt: number;
	accessCount: number;
	ttl: number;
	expiresAt: number;
	compressed: boolean;
	size: number;
	apiProvider: string;
}

function isTranslationCacheEntry(value: unknown): value is TranslationCacheEntry {
	if (typeof value !== "object" || value === null) return false;
	const obj = value as Record<string, unknown>;
	return (
		typeof obj["key"] === "string" &&
		typeof obj["originalText"] === "string" &&
		typeof obj["translatedText"] === "string" &&
		typeof obj["sourceLanguage"] === "string" &&
		typeof obj["targetLanguage"] === "string"
	);
}

export interface DictionaryBuildResult {
	success: boolean;
	dictionary?: TranslationDictionary;
	error?: string;
	outputPath?: string;
}

export interface DictionaryBuildOptions {
	/** Directory containing translation cache files (default: data/translations/ja/en) */
	cacheDir?: string;
	/** Output path for dictionary.json (default: data/translations/dictionary.json) */
	outputPath?: string;
	/** Enable verbose logging */
	verbose?: boolean;
}

// ============================================================================
// Full-width normalization
// ============================================================================

function normalizeFullWidth(text: string): string {
	return text
		.replaceAll(/[\uFF21-\uFF3A]/g, (c) => String.fromCodePoint((c.codePointAt(0) ?? 0) - 0xfe_e0))
		.replaceAll(/[\uFF10-\uFF19]/g, (c) => String.fromCodePoint((c.codePointAt(0) ?? 0) - 0xfe_e0));
}

function normalizeText(text: string): string {
	return normalizeFullWidth(text);
}

// ============================================================================
// Loading
// ============================================================================

async function loadTranslationCache(cacheDir: string): Promise<TranslationCacheEntry[]> {
	const files = await fs.readdir(cacheDir);
	const entries: TranslationCacheEntry[] = [];

	for (const file of files) {
		if (!file.endsWith(".json") || file === "metadata.json") continue;
		try {
			const content = await fs.readFile(path.join(cacheDir, file), "utf8");
			const parsed: unknown = JSON.parse(content);
			if (isTranslationCacheEntry(parsed)) {
				entries.push(parsed);
			}
		} catch {
			// Skip invalid files
		}
	}

	return entries;
}

// ============================================================================
// Phrase Dictionary
// ============================================================================

function buildPhraseDictionary(entries: TranslationCacheEntry[]): PhraseMapping[] {
	const seen = new Map<string, PhraseMapping>();

	for (const entry of entries) {
		const ja = entry.originalText.trim();
		const en = entry.translatedText.trim();

		if (!seen.has(ja)) {
			seen.set(ja, { ja, en });
		}
	}

	return [...seen.values()];
}

// ============================================================================
// Japanese Tokenization
// ============================================================================

function tokenizeJapanese(text: string): string[] {
	const tokens: string[] = [];
	const normalized = normalizeText(text);

	// Katakana words
	const katakana = normalized.match(/[ァ-ヶー]{2,}/g) ?? [];
	tokens.push(...katakana);

	// Kanji compounds
	const kanji = normalized.match(/[一-龯]{2,}/g) ?? [];
	tokens.push(...kanji);

	// Single meaningful kanji
	const singleKanji = normalized.match(/[一-龯]/g) ?? [];
	for (const k of singleKanji) {
		if (["型", "機", "専", "用", "改", "量", "産"].includes(k)) {
			tokens.push(k);
		}
	}

	return [...new Set(tokens)];
}

function tokenizeEnglish(text: string): string[] {
	return text
		.split(/[\s\-\/\(\)\[\],]+/)
		.filter((t) => t.length >= 2)
		.map((t) => t.trim());
}

// ============================================================================
// Word Extraction
// ============================================================================

function extractWordMappings(entries: TranslationCacheEntry[]): WordMapping[] {
	const wordStats = new Map<
		string,
		{
			translations: Map<string, number>;
			contexts: string[];
		}
	>();

	for (const entry of entries) {
		const jaTokens = tokenizeJapanese(entry.originalText);
		const enTokens = tokenizeEnglish(entry.translatedText);

		for (const ja of jaTokens) {
			if (!wordStats.has(ja)) {
				wordStats.set(ja, { translations: new Map(), contexts: [] });
			}

			const stats = wordStats.get(ja)!;

			for (const en of enTokens) {
				stats.translations.set(en, (stats.translations.get(en) ?? 0) + 1);
			}

			if (stats.contexts.length < 3) {
				stats.contexts.push(entry.originalText);
			}
		}
	}

	const words: WordMapping[] = [];

	for (const [ja, stats] of wordStats) {
		let bestEn = "";
		let bestCount = 0;
		let totalFreq = 0;

		for (const [en, count] of stats.translations) {
			totalFreq += count;
			if (count > bestCount) {
				bestCount = count;
				bestEn = en;
			}
		}

		const isNumeric = /^\d+$/.test(bestEn);
		const lowerEn = bestEn.toLowerCase();
		const isStopWord = ["for", "the", "and", "with", "ver", "type", "of", "in"].includes(lowerEn);

		if (totalFreq >= 2 && bestEn.length >= 2 && !isNumeric && !isStopWord) {
			words.push({
				ja,
				en: bestEn,
				frequency: totalFreq,
				contexts: stats.contexts,
			});
		}
	}

	return words.toSorted((a, b) => b.frequency - a.frequency);
}

// ============================================================================
// Pattern Discovery
// ============================================================================

function discoverPatterns(entries: TranslationCacheEntry[]): DiscoveredPattern[] {
	const patterns: DiscoveredPattern[] = [];

	// Grade patterns
	const gradeCounter = new Map<string, { count: number; examples: Array<{ ja: string; en: string }> }>();
	const gradeRegex = /^(HG|MG|PG|RG|SD|EG|RE|FM|HGUC|HGCE|HGBF|HGBD|HGIBO|HGAC|HGAW|HGFC|HGWFM|HGTB|SDCS|SDEX|MGEX|30MM|30MS|30MF|ＨＧ|ＭＧ|ＰＧ|ＲＧ)/i;

	for (const entry of entries) {
		const normalized = normalizeText(entry.originalText);
		const match = gradeRegex.exec(normalized);
		if (match) {
			const grade = match[1]?.toUpperCase() ?? "";
			if (grade) {
				if (!gradeCounter.has(grade)) {
					gradeCounter.set(grade, { count: 0, examples: [] });
				}
				const data = gradeCounter.get(grade)!;
				data.count++;
				if (data.examples.length < 3) {
					data.examples.push({ ja: entry.originalText, en: entry.translatedText });
				}
			}
		}
	}

	for (const [grade, { count, examples }] of gradeCounter) {
		if (count >= 3) {
			patterns.push({
				name: `grade_${grade}`,
				pattern: String.raw`^${grade}\s`,
				examples,
				frequency: count,
			});
		}
	}

	// Scale patterns
	const scaleCounter = new Map<string, number>();
	for (const entry of entries) {
		const scaleMatch = /1\/(\d+)/.exec(entry.originalText);
		if (scaleMatch) {
			const scale = `1/${scaleMatch[1]}`;
			scaleCounter.set(scale, (scaleCounter.get(scale) ?? 0) + 1);
		}
	}

	for (const [scale, count] of scaleCounter) {
		patterns.push({
			name: `scale_${scale.replace("/", "_")}`,
			pattern: scale,
			examples: [],
			frequency: count,
		});
	}

	// Series patterns
	const seriesKeywords = new Map<string, { en: string; count: number }>();
	const seriesRegex = /機動戦士|ガンダムビルド|鉄血のオルフェンズ|水星の魔女|ガンダムSEED|ガンダム00|ガンダムW|∀ガンダム/g;

	for (const entry of entries) {
		const matches = entry.originalText.match(seriesRegex);
		if (matches) {
			for (const m of matches) {
				if (!seriesKeywords.has(m)) {
					seriesKeywords.set(m, { en: entry.translatedText, count: 0 });
				}
				seriesKeywords.get(m)!.count++;
			}
		}
	}

	for (const [ja, { en, count }] of seriesKeywords) {
		patterns.push({
			name: "series_keyword",
			pattern: ja,
			examples: [{ ja, en }],
			frequency: count,
		});
	}

	return patterns.toSorted((a, b) => b.frequency - a.frequency);
}

// ============================================================================
// Auto-categorization
// ============================================================================

function categorizePhrases(phrases: PhraseMapping[], patterns: DiscoveredPattern[]): void {
	const gradePatterns = patterns.filter((p) => p.name.startsWith("grade_"));
	const seriesPatterns = patterns.filter((p) => p.name === "series_keyword");

	for (const phrase of phrases) {
		const normalized = normalizeText(phrase.ja);

		for (const gp of gradePatterns) {
			const gradeCode = gp.name.replace("grade_", "");
			if (normalized.startsWith(gradeCode)) {
				phrase.category = "kit_name";
				break;
			}
		}

		if (!phrase.category) {
			for (const sp of seriesPatterns) {
				if (phrase.ja.includes(sp.pattern)) {
					phrase.category = "series_name";
					break;
				}
			}
		}

		if (!phrase.category && (
			phrase.ja.includes("オプション") ||
				phrase.ja.includes("ウェポン") ||
				phrase.ja.includes("パーツセット") ||
				phrase.ja.includes("アクションベース") ||
				phrase.ja.includes("ディスプレイ")
		)) {
			phrase.category = "accessory";
		}
	}
}

// ============================================================================
// Main Builder Function
// ============================================================================

/**
 * Build or rebuild the translation dictionary from cache files
 *
 * @param options - Build options
 * @returns Build result with dictionary and stats
 */
export async function buildDictionary(options: DictionaryBuildOptions = {}): Promise<DictionaryBuildResult> {
	const {
		cacheDir = TRANSLATION_CACHE_DIR,
		outputPath = TRANSLATION_DICTIONARY_PATH,
		verbose = false,
	} = options;

	try {
		// Resolve paths relative to cwd if not absolute
		const resolvedCacheDir = cacheDir.startsWith("/") ? cacheDir : path.join(process.cwd(), cacheDir);
		const resolvedOutputPath = outputPath.startsWith("/") ? outputPath : path.join(process.cwd(), outputPath);

		if (verbose) {
			console.log("[DictionaryBuilder] Loading translation cache...");
		}

		// Check if cache directory exists
		try {
			await fs.access(resolvedCacheDir);
		} catch {
			return {
				success: false,
				error: `Cache directory not found: ${resolvedCacheDir}`,
			};
		}

		// Load cache entries
		const entries = await loadTranslationCache(resolvedCacheDir);

		if (entries.length === 0) {
			return {
				success: false,
				error: "No translation cache entries found",
			};
		}

		if (verbose) {
			console.log(`[DictionaryBuilder] Loaded ${entries.length} cache entries`);
		}

		// Build components
		const phrases = buildPhraseDictionary(entries);
		const words = extractWordMappings(entries);
		const patterns = discoverPatterns(entries);

		// Auto-categorize
		categorizePhrases(phrases, patterns);

		// Create dictionary
		const dictionary: TranslationDictionary = {
			version: "1.0.0",
			stats: {
				totalFiles: entries.length,
				uniquePhrases: phrases.length,
				uniqueWords: words.length,
				discoveredPatterns: patterns.length,
				processedAt: new Date().toISOString(),
			},
			phrases,
			words,
			patterns,
		};

		// Write output
		await fs.writeFile(resolvedOutputPath, JSON.stringify(dictionary, null, 2), "utf8");

		if (verbose) {
			console.log(`[DictionaryBuilder] Dictionary written to: ${resolvedOutputPath}`);
			console.log(`[DictionaryBuilder] Stats: ${phrases.length} phrases, ${words.length} words, ${patterns.length} patterns`);
		}

		return {
			success: true,
			dictionary,
			outputPath: resolvedOutputPath,
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return {
			success: false,
			error: message,
		};
	}
}

/**
 * Rebuild dictionary and reload it into memory
 * Convenience function for use after translation runs
 */
export async function rebuildAndReloadDictionary(options: DictionaryBuildOptions = {}): Promise<DictionaryBuildResult> {
	const { clearDictionaryCache, loadDictionary } = await import("./dictionary");

	// Build the dictionary
	const result = await buildDictionary(options);

	if (result.success) {
		// Clear the cached dictionary so it gets reloaded
		clearDictionaryCache();

		// Reload the dictionary
		try {
			await loadDictionary(options.outputPath);
			if (options.verbose) {
				console.log("[DictionaryBuilder] Dictionary reloaded into memory");
			}
		} catch {
			// Not critical if reload fails - will load on next use
		}
	}

	return result;
}
