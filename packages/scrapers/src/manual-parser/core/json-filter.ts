/**
 * JSON Filter - Extracts clean product data from raw parsed HTML JSON
 *
 * Transforms noisy .html.json → clean .json with only meaningful fields
 */

import { promises as fs } from 'node:fs';
import type { LocalizedText } from '@unnamed-gunpla-app/types';

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
 * Clean filtered output structure
 * Uses LocalizedText for fields that can be translated
 */
export interface FilteredManualData {
  id: string;
  name: LocalizedText;
  productNumber: string;
  releaseDate: LocalizedDate;
  grade: string;
  scale?: string;
  series: LocalizedText;
  productImage: string;
  thumbnailImage: string;
  sourceUrl: string;
  extractedAt: string;
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
 * Extract grade/brand (ブランド) from text
 */
function extractGrade(blocks: RawParsedJson['content']['blocks']): { grade: string; scale?: string } {
  const gradePatterns = ['HGUC', 'HGCE', 'HGAC', 'HGAW', 'HGFC', 'HGCC', 'HG', 'MG', 'PG', 'RG', 'EG', 'SD', 'RE'];
  const scalePatterns = ['1/144', '1/100', '1/60', '1/48'];

  let grade = '';
  let scale: string | undefined;

  for (const block of blocks) {
    const text = block.content?.text || block.content?.ja || '';

    // Look for grade after ブランド
    if (!grade) {
      const gradeMatch = text.match(/ブランド[^\w]*(\w+)/i);
      if (gradeMatch) {
        grade = gradeMatch[1].toUpperCase();
      }
    }

    // Also check for grade in product name (longer patterns first)
    if (!grade) {
      for (const g of gradePatterns) {
        if (text.includes(g)) {
          grade = g;
          break;
        }
      }
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

  if (!grade) {
    throw new Error('Failed to extract grade (ブランド) from manual');
  }

  return { grade, scale };
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
export function filterManualJson(rawJson: unknown, manualId: string): FilteredManualData {
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
    grade,
    series,
    productImage,
    thumbnailImage,
    sourceUrl: buildSourceUrl(manualId),
    extractedAt: rawJson.metadata?.extractedAt || new Date().toISOString(),
  };

  if (scale) {
    result.scale = scale;
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

  const filtered = filterManualJson(rawJson, manualId);

  await fs.writeFile(outputPath, JSON.stringify(filtered, null, 2), 'utf-8');

  return filtered;
}
