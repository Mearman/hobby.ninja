#!/usr/bin/env node

/**
 * Build a reusable translation dictionary from translation cache files
 * Analyzes translation pairs to extract word-level and phrase-level mappings
 */

import { promises as fs } from "node:fs";
import path from "node:path";

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

interface WordMapping {
  ja: string;
  en: string;
  frequency: number;
  contexts: string[];
}

interface PhraseMapping {
  ja: string;
  en: string;
  category?: string;
}

interface DiscoveredPattern {
  name: string;
  pattern: string;
  examples: Array<{ ja: string; en: string }>;
  frequency: number;
}

interface DictionaryStats {
  totalFiles: number;
  uniquePhrases: number;
  uniqueWords: number;
  discoveredPatterns: number;
  processedAt: string;
}

interface TranslationDictionary {
  version: string;
  stats: DictionaryStats;
  phrases: PhraseMapping[];
  words: WordMapping[];
  patterns: DiscoveredPattern[];
}

// ============================================================================
// Full-width to half-width normalization (from json-filter.ts)
// ============================================================================

/** Unicode offset between full-width and half-width characters */
const FULLWIDTH_OFFSET = 0xfe_e0;

function normalizeFullWidth(text: string): string {
	// Full-width letters A-Z (U+FF21 to U+FF3A) -> half-width (U+0041 to U+005A)
	// Full-width digits 0-9 (U+FF10 to U+FF19) -> half-width (U+0030 to U+0039)
	return text
		.replaceAll(/[\uFF21-\uFF3A]/g, (c) => {
			const codePoint = c.codePointAt(0);
			if (codePoint === undefined) return c;
			return String.fromCodePoint(codePoint - FULLWIDTH_OFFSET);
		})
		.replaceAll(/[\uFF10-\uFF19]/g, (c) => {
			const codePoint = c.codePointAt(0);
			if (codePoint === undefined) return c;
			return String.fromCodePoint(codePoint - FULLWIDTH_OFFSET);
		});
}

function normalizeText(text: string): string {
	return normalizeFullWidth(text);
}

// ============================================================================
// Loading
// ============================================================================

function isTranslationCacheEntry(value: unknown): value is TranslationCacheEntry {
	if (typeof value !== "object" || value === null) return false;
	const obj = value as Record<string, unknown>;
	return (
		typeof obj.key === "string" &&
		typeof obj.originalText === "string" &&
		typeof obj.translatedText === "string"
	);
}

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

	// Katakana words (product names, transliterations)
	const katakana = normalized.match(/[ァ-ヶー]{2,}/g) ?? [];
	tokens.push(...katakana);

	// Kanji compounds (2+ characters)
	const kanji = normalized.match(/[一-龯]{2,}/g) ?? [];
	tokens.push(...kanji);

	// Single meaningful kanji with context
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
		.split(/[\s\-/()[\],]+/)
		.filter((t) => t.length >= 2)
		.map((t) => t.trim());
}

// ============================================================================
// Word Extraction with Co-occurrence
// ============================================================================

interface WordStats {
	translations: Map<string, number>;
	contexts: string[];
}

function extractWordMappings(entries: TranslationCacheEntry[]): WordMapping[] {
	const wordStats = new Map<string, WordStats>();

	for (const entry of entries) {
		const jaTokens = tokenizeJapanese(entry.originalText);
		const enTokens = tokenizeEnglish(entry.translatedText);

		// Track co-occurrence: Japanese token appears with English tokens
		for (const ja of jaTokens) {
			let stats = wordStats.get(ja);
			if (!stats) {
				stats = { translations: new Map(), contexts: [] };
				wordStats.set(ja, stats);
			}

			// Count each English token as potential translation
			for (const en of enTokens) {
				stats.translations.set(en, (stats.translations.get(en) ?? 0) + 1);
			}

			if (stats.contexts.length < 3) {
				stats.contexts.push(entry.originalText);
			}
		}
	}

	// Convert to output format, selecting best translation
	const words: WordMapping[] = [];

	for (const [ja, stats] of wordStats) {
		// Find most frequent co-occurring translation
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

		// Filter low-frequency, numeric-only, and noise
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

interface GradeData {
	count: number;
	examples: Array<{ ja: string; en: string }>;
}

interface SeriesData {
	en: string;
	count: number;
}

function discoverPatterns(entries: TranslationCacheEntry[]): DiscoveredPattern[] {
	const patterns: DiscoveredPattern[] = [];

	// Grade patterns
	const gradeCounter = new Map<string, GradeData>();
	const gradeRegex = /^(HG|MG|PG|RG|SD|EG|RE|FM|HGUC|HGCE|HGBF|HGBD|HGIBO|HGAC|HGAW|HGFC|HGWFM|HGTB|SDCS|SDEX|MGEX|30MM|30MS|30MF|ＨＧ|ＭＧ|ＰＧ|ＲＧ)/i;

	for (const entry of entries) {
		const normalized = normalizeText(entry.originalText);
		const match = gradeRegex.exec(normalized);
		if (match) {
			const grade = match[1].toUpperCase();
			let data = gradeCounter.get(grade);
			if (!data) {
				data = { count: 0, examples: [] };
				gradeCounter.set(grade, data);
			}
			data.count++;
			if (data.examples.length < 3) {
				data.examples.push({ ja: entry.originalText, en: entry.translatedText });
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

	// Series patterns (detect from content)
	const seriesKeywords = new Map<string, SeriesData>();
	const seriesRegex = /機動戦士|ガンダムビルド|鉄血のオルフェンズ|水星の魔女|ガンダムSEED|ガンダム00|ガンダムW|∀ガンダム/g;

	for (const entry of entries) {
		const matches = entry.originalText.match(seriesRegex);
		if (matches) {
			for (const m of matches) {
				let seriesData = seriesKeywords.get(m);
				if (!seriesData) {
					seriesData = { en: entry.translatedText, count: 0 };
					seriesKeywords.set(m, seriesData);
				}
				seriesData.count++;
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

		// Check for grade prefix -> kit name
		for (const gp of gradePatterns) {
			const gradeCode = gp.name.replace("grade_", "");
			if (normalized.startsWith(gradeCode)) {
				phrase.category = "kit_name";
				break;
			}
		}

		// Check for series keywords -> series name
		if (!phrase.category) {
			for (const sp of seriesPatterns) {
				if (phrase.ja.includes(sp.pattern)) {
					phrase.category = "series_name";
					break;
				}
			}
		}

		// Check for accessory indicators
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
// Summary
// ============================================================================

function printSummary(dict: TranslationDictionary): void {
	console.log("\nTranslation Dictionary Built");
	console.log("============================");
	console.log(`Total Files Processed: ${dict.stats.totalFiles}`);
	console.log(`Unique Phrases: ${dict.stats.uniquePhrases}`);
	console.log(`Extracted Words: ${dict.stats.uniqueWords}`);
	console.log(`Discovered Patterns: ${dict.stats.discoveredPatterns}`);

	console.log(`\nTop 20 Word Mappings by Frequency:`);
	for (const word of dict.words.slice(0, 20)) {
		console.log(`  ${word.ja} -> ${word.en} (${word.frequency}x)`);
	}

	console.log(`\nDiscovered Pattern Types:`);
	const patternTypes = new Map<string, number>();
	for (const p of dict.patterns) {
		const type = p.name.split("_")[0];
		patternTypes.set(type, (patternTypes.get(type) ?? 0) + 1);
	}
	for (const [type, count] of patternTypes) {
		console.log(`  ${type}: ${count} patterns`);
	}

	console.log(`\nPhrase Categories:`);
	const categories = new Map<string, number>();
	for (const p of dict.phrases) {
		const cat = p.category ?? "uncategorized";
		categories.set(cat, (categories.get(cat) ?? 0) + 1);
	}
	for (const [cat, count] of categories) {
		console.log(`  ${cat}: ${count}`);
	}
}

// ============================================================================
// Main
// ============================================================================

async function main() {
	console.log("Building translation dictionary from cache files...\n");

	let cacheDir = "data/translations/ja/en";
	let outputDir = "data/src/translations";
	if (process.cwd().endsWith("packages/scrapers")) {
		cacheDir = "../../data/translations/ja/en";
		outputDir = "../../data/src/translations";
	}

	// 1. Load all translation cache files
	console.log("Loading translation cache files...");
	const entries = await loadTranslationCache(cacheDir);
	console.log(`Loaded ${entries.length} translation entries`);

	// 2. Build phrase dictionary
	console.log("Building phrase dictionary...");
	const phrases = buildPhraseDictionary(entries);

	// 3. Extract word mappings
	console.log("Extracting word mappings...");
	const words = extractWordMappings(entries);

	// 4. Discover patterns
	console.log("Discovering patterns...");
	const patterns = discoverPatterns(entries);

	// 5. Auto-categorize phrases
	console.log("Categorizing phrases...");
	categorizePhrases(phrases, patterns);

	// 6. Build final dictionary
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

	// 7. Write output
	const outputPath = path.join(outputDir, "dictionary.json");
	await fs.writeFile(outputPath, JSON.stringify(dictionary, null, 2), "utf8");
	console.log(`\nDictionary written to: ${outputPath}`);

	// 8. Print summary
	printSummary(dictionary);
}

await main();
