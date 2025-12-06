// Japanese Text Processing Utilities

export const JAPANESE_PATTERNS = {
  hiragana: /[\u3040-\u309F]/g,
  katakana: /[\u30A0-\u30FF]/g,
  kanji: /[\u4E00-\u9FAF]/g,
  fullWidth: /[\uFF00-\uFFEF]/g,
  japanese: /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3000-\u303F\uFF00-\uFFEF]/g,
  japaneseText: /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3000-\u303F\uFF00-\uFFEF\w\s\-\.,()]+/
};

/**
 * Check if text contains Japanese characters
 */
export function containsJapaneseText(text: string): boolean {
  return JAPANESE_PATTERNS.japanese.test(text);
}

/**
 * Count Japanese characters in text
 */
export function countJapaneseCharacters(text: string): number {
  const matches = text.match(JAPANESE_PATTERNS.japanese);
  return matches ? matches.length : 0;
}

/**
 * Normalize Japanese text using Unicode Normalization Form C (NFC)
 */
export function normalizeJapaneseText(text: string): string {
  return text.normalize('NFC');
}

/**
 * Validate that text contains Japanese characters
 */
export function validateJapaneseText(text: string): boolean {
  if (!text || text.length === 0) {
    return false;
  }

  const normalizedText = normalizeJapaneseText(text);
  return JAPANESE_PATTERNS.japaneseText.test(normalizedText);
}

/**
 * Extract Japanese text from mixed content
 */
export function extractJapaneseText(text: string): string[] {
  const matches = text.match(JAPANESE_PATTERNS.japanese);
  return matches || [];
}

/**
 * Detect if text is primarily Japanese
 */
export function isPrimarilyJapanese(text: string): boolean {
  if (!text || text.length === 0) {
    return false;
  }

  const japaneseChars = countJapaneseCharacters(text);
  const totalChars = text.replace(/\s/g, '').length;

  // Consider primarily Japanese if >30% of non-whitespace characters are Japanese
  return totalChars > 0 && (japaneseChars / totalChars) > 0.3;
}

/**
 * Clean and normalize Japanese text for processing
 */
export function cleanJapaneseText(text: string): string {
  if (!text) {
    return '';
  }

  return text
    .normalize('NFC')
    .trim()
    .replaceAll(/\s+/g, ' ');
}

/**
 * Detect language of text (Japanese, English, or mixed)
 */
export function detectLanguage(text: string): 'ja' | 'en' | 'mixed' {
  if (!text || text.length === 0) {
    return 'en'; // Default to English for empty text
  }

  const japaneseChars = countJapaneseCharacters(text);
  const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;

  if (japaneseChars === 0) {
    return 'en';
  }

  if (englishWords === 0) {
    return 'ja';
  }

  return 'mixed';
}

/**
 * Split text by Japanese character boundaries
 */
export function splitByJapaneseBoundaries(text: string): string[] {
  const segments: string[] = [];
  let currentSegment = '';

  for (const char of text) {
    if (JAPANESE_PATTERNS.japanese.test(char)) {
      if (currentSegment && !containsJapaneseText(currentSegment)) {
        segments.push(currentSegment);
        currentSegment = '';
      }
      currentSegment += char;
    } else {
      if (currentSegment && containsJapaneseText(currentSegment)) {
        segments.push(currentSegment);
        currentSegment = '';
      }
      currentSegment += char;
    }
  }

  if (currentSegment) {
    segments.push(currentSegment);
  }

  return segments;
}