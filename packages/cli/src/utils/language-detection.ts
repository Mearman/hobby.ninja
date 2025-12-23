import { LanguageCode, LanguageDetection, LanguageAnalysisResult } from "../types/language-detection.js";

interface LanguageEvidence {
  htmlLang?: string;
  contentLanguage?: string;
  urlPattern?: string;
  japaneseCharacters: string[];
  englishWords: string[];
  japaneseRatio: number;
  englishRatio: number;
}

// Language detection weights and thresholds
const HTML_LANG_WEIGHT = 0.3;
const CONTENT_LANGUAGE_WEIGHT = 0.3;
const URL_PATTERN_WEIGHT = 0.2;
const CHARACTER_RATIO_WEIGHT = 0.4;
const COMMON_WORDS_MAX_JAPANESE = 0.2;
const COMMON_WORDS_MAX_ENGLISH = 0.2;
const COMMON_WORDS_DIVISOR_JAPANESE = 10;
const COMMON_WORDS_DIVISOR_ENGLISH = 20;
const LANGUAGE_THRESHOLD = 0.6;
const MIXED_THRESHOLD = 0.4;
const LANGUAGE_DIFFERENCE_THRESHOLD = 0.2;
const STRONG_INDICATOR_WEIGHT = 0.25;
const URL_PATTERN_WEIGHT_CONF = 0.15;
const CONTENT_RATIO_WEIGHT = 0.35;
const EVIDENCE_MULTIPLIER = 0.1;
const MIN_RATIO_FOR_EVIDENCE = 0.1;

export const LanguageDetector = {
	JAPANESE_CHARACTER_PATTERN: /[\u3040-\u309F\u30A0-\u30FF\uFF00-\uFF9F\u4E00-\u9FAF]/g,
	ENGLISH_WORD_PATTERN: /[a-zA-Z]+/g,
	COMMON_JAPANESE_WORDS: ["です", "ます", "です", "ある", "ない", "ください", "ありがとうございます"],
	COMMON_ENGLISH_WORDS: ["the", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by"],

	detectFromHtml(html: string, url: string, headers: Record<string, string> = {}): LanguageDetection {
		const analysis = this.analyze(html, url, headers);
		return {
			language: analysis.detectedLanguage,
			confidence: analysis.confidence,
			method: "hybrid",
			evidence: this.buildEvidence(analysis),
		};
	},

	analyze(html: string, url: string, headers: Record<string, string> = {}): LanguageAnalysisResult {
		const evidence = this.gatherEvidence(html, url, headers);
		const languageScore = this.calculateLanguageScore(evidence);
		const confidence = this.calculateConfidence(languageScore, evidence);

		return {
			detectedLanguage: this.determineLanguage(languageScore),
			confidence,
			method: "content-analysis",
			evidence,
		};
	},

	gatherEvidence(html: string, url: string, headers: Record<string, string>): LanguageEvidence {
		const evidence: LanguageEvidence = {
			japaneseRatio: this.calculateJapaneseRatio(html),
			englishRatio: this.calculateEnglishRatio(html),
			japaneseCharacters: this.extractJapaneseCharacters(html),
			englishWords: this.extractEnglishWords(html),
		};

		const htmlLang = this.extractHtmlLang(html);
		if (htmlLang) evidence.htmlLang = htmlLang;

		const contentLanguage = this.extractContentLanguage(headers);
		if (contentLanguage) evidence.contentLanguage = contentLanguage;

		const urlPattern = this.extractUrlPattern(url);
		if (urlPattern && urlPattern !== "unknown") evidence.urlPattern = urlPattern;

		return evidence;
	},

	extractHtmlLang(html: string): string | undefined {
		const langMatch = /<html[^>]+lang=["']([^"']+)["']/i.exec(html);
		return langMatch ? langMatch[1] : undefined;
	},

	extractContentLanguage(headers: Record<string, string>): string | undefined {
		return headers["content-language"] ?? headers["Content-Language"];
	},

	extractUrlPattern(url: string): string {
		const urlLower = url.toLowerCase();
		if (urlLower.includes("/ja/") || urlLower.includes("/jp/")) return "ja";
		if (urlLower.includes("/en/") || urlLower.includes("/eng/")) return "en";
		return "unknown";
	},

	calculateJapaneseRatio(html: string): number {
		const japaneseChars = (html.match(this.JAPANESE_CHARACTER_PATTERN) ?? []).length;
		const totalChars = html.replaceAll(/\s/g, "").length;
		return totalChars > 0 ? japaneseChars / totalChars : 0;
	},

	calculateEnglishRatio(html: string): number {
		const englishWords = html.match(this.ENGLISH_WORD_PATTERN) ?? [];
		const totalWords = html.split(/\s+/).filter(word => word.length > 0).length;
		return totalWords > 0 ? englishWords.length / totalWords : 0;
	},

	extractJapaneseCharacters(html: string): string[] {
		const matches = html.match(this.JAPANESE_CHARACTER_PATTERN) ?? [];
		return [...new Set(matches)];
	},

	extractEnglishWords(html: string): string[] {
		const matches = html.match(this.ENGLISH_WORD_PATTERN) ?? [];
		return [...new Set(matches.map(word => word.toLowerCase()))];
	},

	calculateLanguageScore(evidence: LanguageEvidence): { ja: number; en: number; mixed: number } {
		let jaScore = 0;
		let enScore = 0;

		// HTML lang attribute
		if (evidence.htmlLang === "ja") jaScore += HTML_LANG_WEIGHT;
		if (evidence.htmlLang === "en") enScore += HTML_LANG_WEIGHT;

		// Content-Language header
		if (evidence.contentLanguage === "ja") jaScore += CONTENT_LANGUAGE_WEIGHT;
		if (evidence.contentLanguage === "en") enScore += CONTENT_LANGUAGE_WEIGHT;

		// URL pattern
		if (evidence.urlPattern === "ja") jaScore += URL_PATTERN_WEIGHT;
		if (evidence.urlPattern === "en") enScore += URL_PATTERN_WEIGHT;

		// Content analysis
		jaScore += evidence.japaneseRatio * CHARACTER_RATIO_WEIGHT;
		enScore += evidence.englishRatio * CHARACTER_RATIO_WEIGHT;

		// Common words
		const japaneseCommonWords = evidence.japaneseCharacters.filter((char: string) =>
			this.COMMON_JAPANESE_WORDS.includes(char),
		).length;
		const englishCommonWords = evidence.englishWords.filter((word: string) =>
			this.COMMON_ENGLISH_WORDS.includes(word),
		).length;

		jaScore += Math.min(japaneseCommonWords / COMMON_WORDS_DIVISOR_JAPANESE, COMMON_WORDS_MAX_JAPANESE);
		enScore += Math.min(englishCommonWords / COMMON_WORDS_DIVISOR_ENGLISH, COMMON_WORDS_MAX_ENGLISH);

		return {
			ja: Math.min(jaScore, 1),
			en: Math.min(enScore, 1),
			mixed: Math.min((jaScore + enScore) / 2, 1),
		};
	},

	determineLanguage(score: { ja: number; en: number; mixed: number }): LanguageCode {
		if (score.ja >= LANGUAGE_THRESHOLD && score.ja > score.en) return "ja";
		if (score.en >= LANGUAGE_THRESHOLD && score.en > score.ja) return "en";
		if (score.mixed >= MIXED_THRESHOLD && Math.abs(score.ja - score.en) < LANGUAGE_DIFFERENCE_THRESHOLD) return "mixed";

		return "unknown";
	},

	calculateConfidence(score: { ja: number; en: number; mixed: number }, evidence: LanguageEvidence): number {
		let confidence = 0;
		let evidenceCount = 0;

		// Strong indicators
		if (evidence.htmlLang) { confidence += STRONG_INDICATOR_WEIGHT; evidenceCount++; }
		if (evidence.contentLanguage) { confidence += STRONG_INDICATOR_WEIGHT; evidenceCount++; }
		if (evidence.urlPattern !== "unknown") { confidence += URL_PATTERN_WEIGHT_CONF; evidenceCount++; }

		// Content analysis
		const maxContentRatio = Math.max(score.ja, score.en);
		confidence += maxContentRatio * CONTENT_RATIO_WEIGHT;

		// Normalize by evidence count
		return Math.min(confidence * (1 + evidenceCount * EVIDENCE_MULTIPLIER), 1);
	},

	buildEvidence(analysis: LanguageAnalysisResult): string[] {
		const evidence: string[] = [];

		if (analysis.evidence.htmlLang) evidence.push(`HTML lang="${analysis.evidence.htmlLang}"`);
		if (analysis.evidence.contentLanguage) evidence.push(`Content-Language: ${analysis.evidence.contentLanguage}`);
		if (analysis.evidence.urlPattern && analysis.evidence.urlPattern !== "unknown") evidence.push(`URL pattern indicates ${analysis.evidence.urlPattern}`);

		if (analysis.evidence.japaneseRatio && analysis.evidence.japaneseRatio > MIN_RATIO_FOR_EVIDENCE) {
			evidence.push(`Japanese character ratio: ${(analysis.evidence.japaneseRatio * 100).toFixed(1)}%`);
		}

		if (analysis.evidence.englishRatio && analysis.evidence.englishRatio > MIN_RATIO_FOR_EVIDENCE) {
			evidence.push(`English word ratio: ${(analysis.evidence.englishRatio * 100).toFixed(1)}%`);
		}

		return evidence;
	},

	getFileExtension(language: LanguageCode): string {
		switch (language) {
			case "ja": { return ".jp.json";
			}
			case "en": { return ".en.json";
			}
			case "mixed": { return ".multi.json";
			}
			default: { return ".json";
			}
		}
	},
};