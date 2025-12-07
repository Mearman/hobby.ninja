import type { LanguageDetection, LanguageAnalysisResult, LanguageCode } from "@hobby-ninja/types/language";

const JAPANESE_CHARACTER_PATTERN = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g;
const ENGLISH_CHARACTER_PATTERN = /[a-zA-Z]/g;

export function detectFromHtml(html: string, url: string, headers: Record<string, string> = {}): LanguageDetection {
	const analysis = analyze(html, url, headers);
	return {
		language: analysis.detectedLanguage,
		confidence: analysis.confidence,
		method: "hybrid",
		evidence: buildEvidence(analysis),
	};
}

export function analyze(html: string, url: string, headers: Record<string, string> = {}): LanguageAnalysisResult {
	const evidence = gatherEvidence(html, url, headers);
	const languageScore = calculateLanguageScore(evidence);
	const confidence = calculateConfidence(languageScore);

	return {
		detectedLanguage: determineLanguage(languageScore),
		confidence,
		method: "content-analysis",
		evidence,
	};
}

function gatherEvidence(html: string, url: string, headers: Record<string, string>) {
	const evidence: {
		htmlLang?: string;
		contentLanguage?: string;
		urlPattern?: string;
		japaneseRatio: number;
		englishRatio: number;
		japaneseCharacters: string[];
		englishWords: string[];
	} = {
		japaneseRatio: calculateJapaneseRatio(html),
		englishRatio: calculateEnglishRatio(html),
		japaneseCharacters: extractJapaneseCharacters(html),
		englishWords: extractEnglishWords(html),
	};

	const htmlLang = extractHtmlLang(html);
	if (htmlLang) evidence.htmlLang = htmlLang;

	const contentLanguage = extractContentLanguage(headers);
	if (contentLanguage) evidence.contentLanguage = contentLanguage;

	const urlPattern = extractUrlPattern(url);
	if (urlPattern && urlPattern !== "unknown") evidence.urlPattern = urlPattern;

	return evidence;
}

function extractHtmlLang(html: string): string | undefined {
	const langMatch = /<html[^>]+lang=["']([^"']+)["']/i.exec(html);
	return langMatch ? langMatch[1] : undefined;
}

function extractContentLanguage(headers: Record<string, string>): string | undefined {
	return headers["content-language"] ?? headers["Content-Language"];
}

function extractUrlPattern(url: string): string {
	const urlLower = url.toLowerCase();
	if (urlLower.includes("/ja/") || urlLower.includes("/jp/")) return "ja";
	if (urlLower.includes("/en/") || urlLower.includes("/eng/")) return "en";
	return "unknown";
}

function calculateJapaneseRatio(html: string): number {
	const japaneseChars = (html.match(JAPANESE_CHARACTER_PATTERN) ?? []).length;
	const totalChars = html.replaceAll(/\s/g, "").length;
	return totalChars > 0 ? japaneseChars / totalChars : 0;
}

function calculateEnglishRatio(html: string): number {
	const englishChars = html.match(ENGLISH_CHARACTER_PATTERN) ?? [];
	const totalChars = html.replaceAll(/\s/g, "").length;
	return totalChars > 0 ? englishChars.length / totalChars : 0;
}

function extractJapaneseCharacters(html: string): string[] {
	const matches = html.match(JAPANESE_CHARACTER_PATTERN) ?? [];
	return [...new Set(matches)];
}

function extractEnglishWords(html: string): string[] {
	const matches = html.match(ENGLISH_CHARACTER_PATTERN) ?? [];
	return [...new Set(matches)];
}

function calculateLanguageScore(evidence: { japaneseRatio: number; englishRatio: number }): { ja: number; en: number; mixed: number } {
	const jaScore = evidence.japaneseRatio;
	const enScore = evidence.englishRatio;

	return {
		ja: Math.min(jaScore, 1),
		en: Math.min(enScore, 1),
		mixed: Math.min((jaScore + enScore) / 2, 1),
	};
}

function determineLanguage(score: { ja: number; en: number; mixed: number }): LanguageCode {
	const threshold = 0.6;
	const mixedThreshold = 0.4;

	if (score.ja >= threshold && score.ja > score.en) return "ja";
	if (score.en >= threshold && score.en > score.ja) return "en";
	if (score.mixed >= mixedThreshold && Math.abs(score.ja - score.en) < 0.2) return "mixed";

	return "unknown";
}

function calculateConfidence(score: { ja: number; en: number; mixed: number }): number {
	const maxContentRatio = Math.max(score.ja, score.en);
	const minContentRatio = Math.min(score.ja, score.en);
	const confidence = maxContentRatio * (1 - minContentRatio);
	return Math.min(confidence, 1);
}

function buildEvidence(analysis: LanguageAnalysisResult): string[] {
	const evidence: string[] = [];

	if (analysis.evidence.japaneseRatio > 0.01) {
		evidence.push(`Japanese character ratio: ${(analysis.evidence.japaneseRatio * 100).toFixed(1)}%`);
	}

	if (analysis.evidence.englishRatio > 0.01) {
		evidence.push(`English character ratio: ${(analysis.evidence.englishRatio * 100).toFixed(1)}%`);
	}

	return evidence;
}

export function getFileExtension(language: LanguageCode): string {
	switch (language) {
		case "ja": { return ".jp.json"; }
		case "en": { return ".en.json"; }
		case "mixed": { return ".multi.json"; }
		default: { return ".json"; }
	}
}