import { LanguageCode, LanguageDetection, LanguageAnalysisResult } from '../types/language-detection.js';

export class LanguageDetector {
  private static readonly JAPANESE_CHARACTER_PATTERN = /[\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf]/g;
  private static readonly ENGLISH_WORD_PATTERN = /[a-zA-Z]+/g;
  private static readonly COMMON_JAPANESE_WORDS = ['です', 'ます', 'です', 'ある', 'ない', 'ください', 'ありがとうございます'];
  private static readonly COMMON_ENGLISH_WORDS = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];

  static detectFromHtml(html: string, url: string, headers: Record<string, string> = {}): LanguageDetection {
    const analysis = this.analyze(html, url, headers);
    return {
      language: analysis.detectedLanguage,
      confidence: analysis.confidence,
      method: 'hybrid',
      evidence: this.buildEvidence(analysis)
    };
  }

  static analyze(html: string, url: string, headers: Record<string, string> = {}): LanguageAnalysisResult {
    const evidence = this.gatherEvidence(html, url, headers);
    const languageScore = this.calculateLanguageScore(evidence);
    const confidence = this.calculateConfidence(languageScore, evidence);

    return {
      detectedLanguage: this.determineLanguage(languageScore),
      confidence,
      method: 'content-analysis',
      evidence
    };
  }

  private static gatherEvidence(html: string, url: string, headers: Record<string, string>) {
    const evidence: {
      htmlLang?: string;
      contentLanguage?: string;
      urlPattern?: string;
      japaneseRatio: number;
      englishRatio: number;
      japaneseCharacters: string[];
      englishWords: string[];
    } = {
      japaneseRatio: this.calculateJapaneseRatio(html),
      englishRatio: this.calculateEnglishRatio(html),
      japaneseCharacters: this.extractJapaneseCharacters(html),
      englishWords: this.extractEnglishWords(html)
    };

    const htmlLang = this.extractHtmlLang(html);
    if (htmlLang) evidence.htmlLang = htmlLang;

    const contentLanguage = this.extractContentLanguage(headers);
    if (contentLanguage) evidence.contentLanguage = contentLanguage;

    const urlPattern = this.extractUrlPattern(url);
    if (urlPattern && urlPattern !== 'unknown') evidence.urlPattern = urlPattern;

    return evidence;
  }

  private static extractHtmlLang(html: string): string | undefined {
    const langMatch = html.match(/<html[^>]+lang=["']([^"']+)["']/i);
    return langMatch ? langMatch[1] : undefined;
  }

  private static extractContentLanguage(headers: Record<string, string>): string | undefined {
    return headers['content-language'] || headers['Content-Language'];
  }

  private static extractUrlPattern(url: string): string {
    const urlLower = url.toLowerCase();
    if (urlLower.includes('/ja/') || urlLower.includes('/jp/')) return 'ja';
    if (urlLower.includes('/en/') || urlLower.includes('/eng/')) return 'en';
    return 'unknown';
  }

  private static calculateJapaneseRatio(html: string): number {
    const japaneseChars = (html.match(this.JAPANESE_CHARACTER_PATTERN) || []).length;
    const totalChars = html.replace(/\s/g, '').length;
    return totalChars > 0 ? japaneseChars / totalChars : 0;
  }

  private static calculateEnglishRatio(html: string): number {
    const englishWords = html.match(this.ENGLISH_WORD_PATTERN) || [];
    const totalWords = html.split(/\s+/).filter(word => word.length > 0).length;
    return totalWords > 0 ? englishWords.length / totalWords : 0;
  }

  private static extractJapaneseCharacters(html: string): string[] {
    const matches = html.match(this.JAPANESE_CHARACTER_PATTERN) || [];
    return [...new Set(matches)];
  }

  private static extractEnglishWords(html: string): string[] {
    const matches = html.match(this.ENGLISH_WORD_PATTERN) || [];
    return [...new Set(matches.map(word => word.toLowerCase()))];
  }

  private static calculateLanguageScore(evidence: any): { ja: number; en: number; mixed: number } {
    let jaScore = 0;
    let enScore = 0;

    // HTML lang attribute
    if (evidence.htmlLang === 'ja') jaScore += 0.3;
    if (evidence.htmlLang === 'en') enScore += 0.3;

    // Content-Language header
    if (evidence.contentLanguage === 'ja') jaScore += 0.3;
    if (evidence.contentLanguage === 'en') enScore += 0.3;

    // URL pattern
    if (evidence.urlPattern === 'ja') jaScore += 0.2;
    if (evidence.urlPattern === 'en') enScore += 0.2;

    // Content analysis
    jaScore += evidence.japaneseRatio * 0.4;
    enScore += evidence.englishRatio * 0.4;

    // Common words
    const japaneseCommonWords = evidence.japaneseCharacters.filter((char: string) =>
      this.COMMON_JAPANESE_WORDS.includes(char)
    ).length;
    const englishCommonWords = evidence.englishWords.filter((word: string) =>
      this.COMMON_ENGLISH_WORDS.includes(word)
    ).length;

    jaScore += Math.min(japaneseCommonWords / 10, 0.2);
    enScore += Math.min(englishCommonWords / 20, 0.2);

    return {
      ja: Math.min(jaScore, 1.0),
      en: Math.min(enScore, 1.0),
      mixed: Math.min((jaScore + enScore) / 2, 1.0)
    };
  }

  private static determineLanguage(score: { ja: number; en: number; mixed: number }): LanguageCode {
    const threshold = 0.6;
    const mixedThreshold = 0.4;

    if (score.ja >= threshold && score.ja > score.en) return 'ja';
    if (score.en >= threshold && score.en > score.ja) return 'en';
    if (score.mixed >= mixedThreshold && Math.abs(score.ja - score.en) < 0.2) return 'mixed';

    return 'unknown';
  }

  private static calculateConfidence(score: { ja: number; en: number; mixed: number }, evidence: any): number {
    let confidence = 0;
    let evidenceCount = 0;

    // Strong indicators
    if (evidence.htmlLang) { confidence += 0.25; evidenceCount++; }
    if (evidence.contentLanguage) { confidence += 0.25; evidenceCount++; }
    if (evidence.urlPattern !== 'unknown') { confidence += 0.15; evidenceCount++; }

    // Content analysis
    const maxContentRatio = Math.max(score.ja, score.en);
    confidence += maxContentRatio * 0.35;

    // Normalize by evidence count
    return Math.min(confidence * (1 + evidenceCount * 0.1), 1.0);
  }

  private static buildEvidence(analysis: LanguageAnalysisResult): string[] {
    const evidence: string[] = [];

    if (analysis.evidence.htmlLang) evidence.push(`HTML lang="${analysis.evidence.htmlLang}"`);
    if (analysis.evidence.contentLanguage) evidence.push(`Content-Language: ${analysis.evidence.contentLanguage}`);
    if (analysis.evidence.urlPattern && analysis.evidence.urlPattern !== 'unknown') evidence.push(`URL pattern indicates ${analysis.evidence.urlPattern}`);

    if (analysis.evidence.japaneseRatio && analysis.evidence.japaneseRatio > 0.1) {
      evidence.push(`Japanese character ratio: ${(analysis.evidence.japaneseRatio * 100).toFixed(1)}%`);
    }

    if (analysis.evidence.englishRatio && analysis.evidence.englishRatio > 0.1) {
      evidence.push(`English word ratio: ${(analysis.evidence.englishRatio * 100).toFixed(1)}%`);
    }

    return evidence;
  }

  static getFileExtension(language: LanguageCode): string {
    switch (language) {
      case 'ja': return '.jp.json';
      case 'en': return '.en.json';
      case 'mixed': return '.multi.json';
      default: return '.json';
    }
  }
}