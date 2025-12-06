import { languageDetection } from '@unnamed-gunpla-app/types';

export class LanguageDetector {
  private static readonly JAPANESE_CHARACTER_PATTERN = /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/g;
  private static readonly ENGLISH_CHARACTER_PATTERN = /[a-zA-Z]/g;

  static detectFromHtml(html: string, url: string, headers: Record<string, string> = {}): languageDetection.LanguageDetection {
    const analysis = this.analyze(html, url, headers);
    return {
      language: analysis.detectedLanguage,
      confidence: analysis.confidence,
      method: 'hybrid',
      evidence: this.buildEvidence(analysis)
    };
  }

  static analyze(html: string, url: string, headers: Record<string, string> = {}): languageDetection.LanguageAnalysisResult {
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
    const englishChars = html.match(this.ENGLISH_CHARACTER_PATTERN) || [];
    const totalChars = html.replace(/\s/g, '').length;
    return totalChars > 0 ? englishChars.length / totalChars : 0;
  }

  private static extractJapaneseCharacters(html: string): string[] {
    const matches = html.match(this.JAPANESE_CHARACTER_PATTERN) || [];
    return [...new Set(matches)];
  }

  private static extractEnglishWords(html: string): string[] {
    const matches = html.match(this.ENGLISH_CHARACTER_PATTERN) || [];
    return [...new Set(matches)];
  }

  private static calculateLanguageScore(evidence: any): { ja: number; en: number; mixed: number } {
    // Content analysis based purely on character percentages
    const jaScore = evidence.japaneseRatio;
    const enScore = evidence.englishRatio;

    return {
      ja: Math.min(jaScore, 1.0),
      en: Math.min(enScore, 1.0),
      mixed: Math.min((jaScore + enScore) / 2, 1.0)
    };
  }

  private static determineLanguage(score: { ja: number; en: number; mixed: number }): languageDetection.LanguageCode {
    const threshold = 0.6;
    const mixedThreshold = 0.4;

    if (score.ja >= threshold && score.ja > score.en) return 'ja';
    if (score.en >= threshold && score.en > score.ja) return 'en';
    if (score.mixed >= mixedThreshold && Math.abs(score.ja - score.en) < 0.2) return 'mixed';

    return 'unknown';
  }

  private static calculateConfidence(score: { ja: number; en: number; mixed: number }, evidence: any): number {
    // Confidence based on how strong the character percentage signal is
    const maxContentRatio = Math.max(score.ja, score.en);
    const minContentRatio = Math.min(score.ja, score.en);

    // Higher confidence when one language dominates
    const confidence = maxContentRatio * (1 - minContentRatio);
    return Math.min(confidence, 1.0);
  }

  private static buildEvidence(analysis: languageDetection.LanguageAnalysisResult): string[] {
    const evidence: string[] = [];

    if (analysis.evidence.japaneseRatio > 0.01) {
      evidence.push(`Japanese character ratio: ${(analysis.evidence.japaneseRatio * 100).toFixed(1)}%`);
    }

    if (analysis.evidence.englishRatio > 0.01) {
      evidence.push(`English character ratio: ${(analysis.evidence.englishRatio * 100).toFixed(1)}%`);
    }

    return evidence;
  }

  static getFileExtension(language: languageDetection.LanguageCode): string {
    switch (language) {
      case 'ja': return '.jp.json';
      case 'en': return '.en.json';
      case 'mixed': return '.multi.json';
      default: return '.json';
    }
  }
}