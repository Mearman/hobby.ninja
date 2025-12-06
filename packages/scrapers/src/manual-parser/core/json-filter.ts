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
 * Clean filtered output structure
 * Uses LocalizedText for fields that can be translated
 */
export interface FilteredManualData {
  id: string;
  name: LocalizedText;
  productNumber: string;
  releaseDate: string;
  releaseDateRaw: string;
  grade: string;
  scale: string;
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
  return '';
}

/**
 * Extract release date (発売日) from text
 */
function extractReleaseDate(blocks: RawParsedJson['content']['blocks']): {
  raw: string;
  formatted: string;
} {
  for (const block of blocks) {
    const text = block.content?.text || block.content?.ja || '';
    // Look for pattern: 発売日 followed by date (e.g., 2002年11月16日発売)
    const match = text.match(/発売日[^\d]*(\d{4})年(\d{1,2})月(\d{1,2})日/);
    if (match) {
      const [, year, month, day] = match;
      return {
        raw: `${year}年${month}月${day}日`,
        formatted: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
      };
    }
  }
  return { raw: '', formatted: '' };
}

/**
 * Extract grade/brand (ブランド) from text
 */
function extractGrade(blocks: RawParsedJson['content']['blocks']): { grade: string; scale: string } {
  const gradePatterns = ['HG', 'MG', 'PG', 'RG', 'EG', 'SD', 'RE', 'HGUC', 'HGCE', 'HGAC', 'HGAW', 'HGFC', 'HGCC'];
  const scalePatterns = ['1/144', '1/100', '1/60', '1/48'];

  let grade = '';
  let scale = '';

  for (const block of blocks) {
    const text = block.content?.text || block.content?.ja || '';

    // Look for grade after ブランド
    const gradeMatch = text.match(/ブランド[^\w]*(HG|MG|PG|RG|EG|SD|RE)/i);
    if (gradeMatch) {
      grade = gradeMatch[1].toUpperCase();
    }

    // Also check for grade in product name
    if (!grade) {
      for (const g of gradePatterns) {
        if (text.includes(g)) {
          grade = g;
          break;
        }
      }
    }

    // Extract scale from product name
    if (!scale) {
      for (const s of scalePatterns) {
        if (text.includes(s)) {
          scale = s;
          break;
        }
      }
    }
  }

  return { grade, scale };
}

/**
 * Extract series/work (作品) from text
 */
function extractSeries(blocks: RawParsedJson['content']['blocks']): LocalizedText {
  for (const block of blocks) {
    const text = block.content?.text || block.content?.ja || '';
    // Look for pattern: 作品 followed by series name
    const match = text.match(/作品[^\u4E00-\u9FAF\u3040-\u309F\u30A0-\u30FF]*([\u4E00-\u9FAF\u3040-\u309F\u30A0-\u30FF\s]+(?:SEED|DESTINY|00|OO|UC|AGE|Build|G|W|X|V|F91|ZZ|Z|Victory)?[\u4E00-\u9FAF\u3040-\u309F\u30A0-\u30FF]*)/);
    if (match) {
      return { ja: match[1].trim() };
    }
  }
  return { ja: '' };
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

  return { ja: '' };
}

/**
 * Extract product image URL
 */
function extractProductImage(
  blocks: RawParsedJson['content']['blocks'],
  assets: RawParsedJson['assets']
): { productImage: string; thumbnailImage: string } {
  // Look for bandai-hobby.net product images
  const productImages = assets.images.filter(
    (img) => img.includes('bandai-hobby.net/images/') && !img.includes('/common/')
  );

  // Also check img blocks
  for (const block of blocks) {
    if (block.type === 'img' && block.content?.src) {
      const src = block.content.src;
      if (src.includes('bandai-hobby.net/images/') && !src.includes('/common/')) {
        if (!productImages.includes(src)) {
          productImages.push(src);
        }
      }
    }
  }

  return {
    productImage: productImages[0] || '',
    thumbnailImage: productImages[0] || '',
  };
}

/**
 * Build source URL from manual ID
 */
function buildSourceUrl(manualId: string): string {
  return `https://manual.bandai-hobby.net/${manualId}.html`;
}

/**
 * Filter raw parsed JSON to clean product data
 */
export function filterManualJson(rawJson: RawParsedJson, manualId: string): FilteredManualData {
  const blocks = rawJson.content?.blocks || [];
  const assets = rawJson.assets || { images: [], links: [] };

  const { name, nameJa } = extractProductName(rawJson.title, blocks);
  const productNumber = extractProductNumber(blocks);
  const { raw: releaseDateRaw, formatted: releaseDate } = extractReleaseDate(blocks);
  const { grade, scale } = extractGrade(blocks);
  const series = extractSeries(blocks);
  const { productImage, thumbnailImage } = extractProductImage(blocks, assets);

  return {
    id: manualId,
    name,
    nameJa,
    productNumber,
    releaseDate,
    releaseDateRaw,
    grade,
    scale,
    series,
    seriesJa: series,
    productImage,
    thumbnailImage,
    sourceUrl: buildSourceUrl(manualId),
    extractedAt: rawJson.metadata?.extractedAt || new Date().toISOString(),
  };
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
  const rawJson = JSON.parse(rawContent) as RawParsedJson;

  const filtered = filterManualJson(rawJson, manualId);

  await fs.writeFile(outputPath, JSON.stringify(filtered, null, 2), 'utf-8');

  return filtered;
}
