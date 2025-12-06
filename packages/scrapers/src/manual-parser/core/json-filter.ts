/**
 * JSON Filter - Extracts clean product data from raw parsed HTML JSON
 *
 * Transforms noisy .html.json → clean .json with only meaningful fields
 */

import { promises as fs } from 'node:fs';
import type { LocalizedText } from '@hobby-ninja/types';

/**
 * Raw parsed HTML JSON structure (from SimpleHtmlParser)
 */
interface RawParsedJson {
  title?: string;
  metadata: {
    language: string;
    encoding: string;
    extractedAt: string;
  };
  content: {
    blocks: Array<{
      type: string;
      content: Record<string, string>;
    }>;
  };
  assets: {
    images: string[];
    links: string[];
  };
}

/**
 * Localized date with parsed components
 * year/month/day omitted for special cases like 非公開 (undisclosed)
 */
export interface LocalizedDate extends LocalizedText {
  year?: number;
  month?: number;
  day?: number;
}

/**
 * Grade information with code and family
 */
export interface GradeInfo {
  code: string; // Specific grade code (e.g., "HGUC", "SDCS", "30MM")
  family: string; // Grade family (e.g., "HG", "SD", "30MM")
}

/**
 * Clean filtered output structure
 * Uses LocalizedText for fields that can be translated
 */
export interface FilteredManualData {
  id: string;
  name: LocalizedText;
  productNumber: string;
  releaseDate: LocalizedDate;
  grade?: GradeInfo;
  scale?: string;
  series: LocalizedText;
  productImage: string;
  thumbnailImage: string;
  sourceUrl: string;
  extractedAt: string;
  pdfUrl?: string;
  supplementaryPdfUrl?: string;
}

/**
 * Patterns to filter out (noise/boilerplate)
 */
const NOISE_PATTERNS = [
  /JavaScriptの設定を有効/, // JS error message
  /googletagmanager\.com/, // GTM
  /利用規約/, // Terms of service
  /©.*BANDAI/, // Copyright
  /PAGE TOP/i,
  /同意する|同意しない/, // Consent buttons
  /推奨環境について/, // Recommended environment
  /iOS.*safari|Android.*Chrome/, // Browser requirements
  /Cookies\.get|Cookies\.set/, // Cookie code
  /検索/, // Just "Search"
  /戻る/, // Just "Back"
  /取扱説明書$/, // Just "Manual"
  /ご意見フォーム/, // Feedback form
];

/**
 * Check if text is noise/boilerplate
 */
function isNoise(text: string): boolean {
  if (!text || text.trim().length < 2) return true;
  return NOISE_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * Extract product number (品番) from text
 */
function extractProductNumber(blocks: RawParsedJson['content']['blocks']): string {
  for (const block of blocks) {
    const text = block.content?.text || block.content?.ja || '';
    // Look for pattern: 品番 followed by number
    const match = text.match(/品番[^\d]*(\d+)/);
    if (match) {
      return match[1];
    }
  }
  throw new Error('Failed to extract product number (品番) from manual');
}

/**
 * Extract release date (発売日) from text
 */
function extractReleaseDate(blocks: RawParsedJson['content']['blocks']): LocalizedDate {
  for (const block of blocks) {
    const text = block.content?.text || block.content?.ja || '';

    // Try full date first: 2002年11月16日
    const fullMatch = text.match(/発売日[^\d]*(\d{4})年(\d{1,2})月(\d{1,2})日/);
    if (fullMatch) {
      const [, year, month, day] = fullMatch;
      return {
        ja: `${year}年${month}月${day}日`,
        year: parseInt(year, 10),
        month: parseInt(month, 10),
        day: parseInt(day, 10),
      };
    }

    // Try month-only date: 2022年2月発売
    const monthMatch = text.match(/発売日[^\d]*(\d{4})年(\d{1,2})月/);
    if (monthMatch) {
      const [, year, month] = monthMatch;
      return {
        ja: `${year}年${month}月`,
        year: parseInt(year, 10),
        month: parseInt(month, 10),
      };
    }

    // Handle 非公開 (undisclosed) - special releases without public date
    const undisclosedMatch = text.match(/発売日[\s\n]*非公開/);
    if (undisclosedMatch) {
      return {
        ja: '非公開',
      };
    }
  }
  throw new Error('Failed to extract release date (発売日) from manual');
}

/**
 * Base grades - the fundamental grade families
 * Order matters: longer bases first to avoid partial matches (e.g., "RE" before "R")
 */
const BASE_GRADES = ['HG', 'MG', 'PG', 'RG', 'SD', 'EG', 'RE', 'FM'] as const;

/**
 * Special grade patterns that don't follow the {BASE}{SUFFIX} pattern
 */
const SPECIAL_GRADES: Record<string, string> = {
  'FIGURE-RISE': 'FIGURE-RISE',
};

/**
 * Regex to match compound grades: base grade followed by 1-4 uppercase letters
 * Must be at word boundary (not preceded by letter) and not followed by hyphen (model numbers)
 * Examples: HGUC, SDCS, MGEX, HGTWFM (4 letters max for suffix)
 * Excludes: RGM-79, RGZ-91 (model numbers), REVIVAL (5 letter suffix = word, not grade)
 */
const COMPOUND_GRADE_REGEX = new RegExp(
  `(?<![A-Za-z])(${BASE_GRADES.join('|')})([A-Z]{1,4})(?![a-z-])`,
  'g'
);

/**
 * Regex to match 30 Minutes series: 30MM, 30MF, 30MS
 */
const THIRTY_MINUTES_REGEX = /30M[MFS]/g;

/**
 * Derive base grade from a grade string
 * - Compound grades (HGUC, SDCS) → extract prefix (HG, SD)
 * - Base grades (HG, MG) → return as-is
 * - 30 Minutes (30MM) → return as-is (its own family)
 * - Special grades → use mapping
 */
function deriveBaseGrade(grade: string): string {
  // Check special grades first
  if (SPECIAL_GRADES[grade]) {
    return SPECIAL_GRADES[grade];
  }

  // 30 Minutes series - they are their own base
  if (/^30M[MFS]$/.test(grade)) {
    return grade;
  }

  // Check if it starts with a known base grade
  for (const base of BASE_GRADES) {
    if (grade.startsWith(base)) {
      return base;
    }
  }

  // Unknown grade - return as-is
  return grade;
}

/**
 * Map ブランド (Brand) field values to grades
 * Only needed for brands that don't match standard patterns
 */
const BRAND_TO_GRADE: Record<string, string | null> = {
  '30 MINUTES MISSIONS': '30MM',
  '30 MINUTES SISTERS': '30MS',
  '30 MINUTES LABEL': '30MM',
  '30 MINUTES FANTASY': '30MF',
  'ENTRY GRADE': 'EG',
  'FULL MECHANICS': 'FM',
  アクションベース: null, // Accessories - no grade
  その他: null, // Other - check product name
};

/**
 * Map full-width characters to half-width for grade matching
 */
const FULLWIDTH_TO_HALFWIDTH: Record<string, string> = {
  Ａ: 'A', Ｂ: 'B', Ｃ: 'C', Ｄ: 'D', Ｅ: 'E', Ｆ: 'F', Ｇ: 'G', Ｈ: 'H',
  Ｉ: 'I', Ｊ: 'J', Ｋ: 'K', Ｌ: 'L', Ｍ: 'M', Ｎ: 'N', Ｏ: 'O', Ｐ: 'P',
  Ｑ: 'Q', Ｒ: 'R', Ｓ: 'S', Ｔ: 'T', Ｕ: 'U', Ｖ: 'V', Ｗ: 'W', Ｘ: 'X',
  Ｙ: 'Y', Ｚ: 'Z',
};

/**
 * Normalize text by converting full-width letters to half-width
 */
function normalizeForGradeMatch(text: string): string {
  return text.replace(/[Ａ-Ｚ]/g, (char) => FULLWIDTH_TO_HALFWIDTH[char] || char);
}

/**
 * Find grade in text using dynamic pattern matching
 * Returns the first grade found
 */
function findGradeInText(text: string): string | undefined {
  // Normalize full-width characters
  const normalizedText = normalizeForGradeMatch(text);

  // Check special grades first
  for (const special of Object.keys(SPECIAL_GRADES)) {
    if (normalizedText.includes(special)) {
      return special;
    }
  }

  // Check for 30 Minutes series
  const thirtyMatch = normalizedText.match(/30M[MFS]/);
  if (thirtyMatch) {
    return thirtyMatch[0];
  }

  // Find all grade candidates with their positions
  const candidates: Array<{ grade: string; position: number }> = [];

  // Find compound grades (e.g., HGUC, SDCS, MGEX)
  COMPOUND_GRADE_REGEX.lastIndex = 0;
  let compoundMatch = COMPOUND_GRADE_REGEX.exec(normalizedText);
  while (compoundMatch) {
    const fullMatch = compoundMatch[0];
    const afterMatch = normalizedText.substring(compoundMatch.index + fullMatch.length);
    // Only accept if followed by space (grade prefix pattern)
    if (/^\s/.test(afterMatch)) {
      candidates.push({ grade: fullMatch, position: compoundMatch.index });
    }
    compoundMatch = COMPOUND_GRADE_REGEX.exec(normalizedText);
  }

  // Find base grades (e.g., HG, MG)
  for (const base of BASE_GRADES) {
    const baseRegex = new RegExp(`(?<![A-Za-z])${base}\\s`, 'g');
    let baseMatch = baseRegex.exec(normalizedText);
    while (baseMatch) {
      candidates.push({ grade: base, position: baseMatch.index });
      baseMatch = baseRegex.exec(normalizedText);
    }
  }

  // Return the grade that appears earliest in the text
  if (candidates.length > 0) {
    candidates.sort((a, b) => a.position - b.position);
    return candidates[0].grade;
  }

  return undefined;
}

/**
 * Extract grade/brand (ブランド) from text
 */
function extractGrade(blocks: RawParsedJson['content']['blocks']): {
  grade?: GradeInfo;
  scale?: string;
} {
  const scalePatterns = ['1/144', '1/100', '1/60', '1/48'];

  let grade: string | undefined;
  let scale: string | undefined;
  let brandValue: string | undefined;

  for (const block of blocks) {
    const text = block.content?.text || block.content?.ja || '';

    // Extract ブランド field value for later use
    if (!brandValue) {
      const brandMatch = text.match(/ブランド[\s\n]*([^\n品発作取]+)/);
      if (brandMatch) {
        brandValue = brandMatch[1].trim();
      }
    }

    // Check product name for grade (priority - most accurate)
    if (!grade) {
      grade = findGradeInText(text);
    }

    // Extract scale from product name (optional)
    if (!scale) {
      for (const s of scalePatterns) {
        if (text.includes(s)) {
          scale = s;
          break;
        }
      }
    }
  }

  // If no grade found in product name, try mapping from brand
  if (!grade && brandValue) {
    // Check if brand is a known mapping
    for (const [brand, mappedGrade] of Object.entries(BRAND_TO_GRADE)) {
      if (brandValue.includes(brand)) {
        if (mappedGrade) {
          grade = mappedGrade;
        }
        break;
      }
    }

    // Try to find grade pattern in brand value itself
    if (!grade) {
      grade = findGradeInText(brandValue);
    }
  }

  // Return with grade info if we found a grade
  if (grade) {
    const family = deriveBaseGrade(grade);
    return { grade: { code: grade, family }, scale };
  }

  // No grade found - this is OK for accessories and older kits
  return { scale };
}

/**
 * Extract series/work (作品) from text
 */
function extractSeries(blocks: RawParsedJson['content']['blocks']): LocalizedText {
  for (const block of blocks) {
    const text = block.content?.text || block.content?.ja || '';
    // Look for pattern: 作品 followed by any text (Japanese + alphanumeric)
    const match = text.match(/作品[\s\n]*([^\n取]{2,})/);
    if (match) {
      const series = match[1].trim();
      if (series) {
        return { ja: series };
      }
    }
  }
  throw new Error('Failed to extract series (作品) from manual');
}

/**
 * Extract product name from title or h2
 */
function extractProductName(
  title: string | undefined,
  blocks: RawParsedJson['content']['blocks']
): LocalizedText {
  // First try h2 blocks (most accurate)
  for (const block of blocks) {
    if (block.type === 'h2') {
      const text = (block.content?.text || block.content?.ja || '').trim();
      if (text && !isNoise(text) && text.length > 3) {
        return { ja: text };
      }
    }
  }

  // Fall back to title (remove site suffix)
  if (title) {
    const cleanTitle = title
      .replace(/ - バンダイプラモデルWEB取説.*$/, '')
      .replace(/ \| バンダイ.*$/, '')
      .trim();
    if (cleanTitle) {
      return { ja: cleanTitle };
    }
  }

  throw new Error('Failed to extract product name from manual');
}

/**
 * Check if URL is a product image (not a common/logo image)
 */
function isProductImage(url: string): boolean {
  // Exclude common assets
  if (url.includes('/common/')) return false;
  if (url.includes('logo_')) return false;
  if (url.includes('bnr_')) return false;

  // Include bandai-hobby.net product images (various paths)
  if (url.includes('bandai-hobby.net/images/')) return true;
  if (url.includes('bandai-hobby.net/temp/')) return true;
  if (url.includes('bandai-hobby.net/ecms_img/')) return true;

  // Akamai CDN for Bandai images
  if (url.includes('bandai-a.akamaihd.net/')) return true;

  return false;
}

/**
 * Extract product image URL
 */
function extractProductImage(
  blocks: RawParsedJson['content']['blocks'],
  assets: RawParsedJson['assets']
): { productImage: string; thumbnailImage: string } {
  const productImages = assets.images.filter(isProductImage);

  // Also check img blocks
  for (const block of blocks) {
    if (block.type === 'img' && block.content?.src) {
      const src = block.content.src;
      if (isProductImage(src) && !productImages.includes(src)) {
        productImages.push(src);
      }
    }
  }

  if (productImages.length === 0) {
    throw new Error('Failed to extract product image from manual');
  }

  return {
    productImage: productImages[0],
    thumbnailImage: productImages[0],
  };
}

/**
 * Build source URL from manual ID
 */
function buildSourceUrl(manualId: string): string {
  const numericId = parseInt(manualId, 10);
  return `https://manual.bandai-hobby.net/menus/detail/${numericId}/`;
}

/**
 * Check if raw content contains 補足説明書 (supplementary manual)
 */
function hasSupplementaryManual(blocks: RawParsedJson['content']['blocks']): boolean {
  for (const block of blocks) {
    const text = block.content?.text || block.content?.ja || '';
    if (text.includes('補足説明書')) {
      return true;
    }
  }
  return false;
}

/**
 * Build PDF URL from manual ID
 * Pattern: https://manual.bandai-hobby.net/pdf/{id}.pdf
 */
function buildPdfUrl(manualId: string): string {
  const numericId = parseInt(manualId, 10);
  return `https://manual.bandai-hobby.net/pdf/${numericId}.pdf`;
}

/**
 * Build supplementary PDF URL from manual ID
 * Pattern: https://manual.bandai-hobby.net/pdf/{id}_2.pdf
 */
function buildSupplementaryPdfUrl(manualId: string): string {
  const numericId = parseInt(manualId, 10);
  return `https://manual.bandai-hobby.net/pdf/${numericId}_2.pdf`;
}

/**
 * Check if a PDF URL exists (returns 200 OK)
 */
async function checkPdfExists(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Check if raw JSON has expected parsed HTML structure
 */
function isValidParsedHtml(rawJson: unknown): rawJson is RawParsedJson {
  if (!rawJson || typeof rawJson !== 'object') return false;
  const obj = rawJson as Record<string, unknown>;
  return (
    obj.content !== undefined &&
    typeof obj.content === 'object' &&
    obj.content !== null &&
    'blocks' in obj.content &&
    Array.isArray((obj.content as Record<string, unknown>).blocks)
  );
}

/**
 * Filter raw parsed JSON to clean product data
 */
export async function filterManualJson(
  rawJson: unknown,
  manualId: string
): Promise<FilteredManualData> {
  if (!isValidParsedHtml(rawJson)) {
    throw new Error('Invalid structure: not a parsed HTML JSON file');
  }

  const blocks = rawJson.content.blocks;
  const assets = rawJson.assets;

  if (blocks.length === 0) {
    throw new Error('No content blocks found in raw JSON');
  }
  if (!assets) {
    throw new Error('No assets found in raw JSON');
  }

  const name = extractProductName(rawJson.title, blocks);
  const productNumber = extractProductNumber(blocks);
  const releaseDate = extractReleaseDate(blocks);
  const { grade, scale } = extractGrade(blocks);
  const series = extractSeries(blocks);
  const { productImage, thumbnailImage } = extractProductImage(blocks, assets);

  const result: FilteredManualData = {
    id: manualId,
    name,
    productNumber,
    releaseDate,
    series,
    productImage,
    thumbnailImage,
    sourceUrl: buildSourceUrl(manualId),
    extractedAt: rawJson.metadata?.extractedAt || new Date().toISOString(),
  };

  if (grade) {
    result.grade = grade;
  }
  if (scale) {
    result.scale = scale;
  }

  // All manuals have a PDF available
  result.pdfUrl = buildPdfUrl(manualId);

  // Only add supplementary PDF if text indicates it AND the PDF actually exists
  if (hasSupplementaryManual(blocks)) {
    const supplementaryUrl = buildSupplementaryPdfUrl(manualId);
    if (await checkPdfExists(supplementaryUrl)) {
      result.supplementaryPdfUrl = supplementaryUrl;
    } else {
      throw new Error(
        `Supplementary manual indicated in HTML but PDF not found: ${supplementaryUrl}`
      );
    }
  }

  return result;
}

/**
 * Read raw JSON file and filter to clean output
 */
export async function filterJsonFile(
  inputPath: string,
  outputPath: string,
  manualId: string
): Promise<FilteredManualData> {
  const rawContent = await fs.readFile(inputPath, 'utf-8');
  const rawJson: unknown = JSON.parse(rawContent);

  const filtered = await filterManualJson(rawJson, manualId);

  await fs.writeFile(outputPath, JSON.stringify(filtered, null, 2), 'utf-8');

  return filtered;
}
