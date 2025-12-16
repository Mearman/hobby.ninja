#!/usr/bin/env node

/**
 * Identify and optionally remove incorrectly downloaded preview/thumbnail images
 * based on their resolution characteristics.
 */

import { promises as fs } from "node:fs";
import path from "node:path";

// Image dimensions configuration
const THUMBNAIL_MAX_SIZE = 300; // Images smaller than 300x300 are likely thumbnails
const TYPICAL_PRODUCT_MIN_SIZE = 800; // Product images are typically larger than 800x800
const PREVIEW_ASPECT_RATIOS = [
  { width: 200, height: 200 },  // Square thumbnails
  { width: 150, height: 150 },  // Small squares
  { width: 100, height: 100 },  // Tiny squares
];

interface ImageInfo {
  path: string;
  itemId: string;
  imageNumber: number;
  width: number;
  height: number;
  size: number; // file size in bytes
  isThumbnail: boolean;
  isPreview: boolean;
}

interface ScanResults {
  total: number;
  thumbnails: ImageInfo[];
  previews: ImageInfo[];
  legitimate: ImageInfo[];
  errors: string[];
}

/**
 * Extract image dimensions using Node.js built-in image processing
 * This is a simplified approach that checks file headers
 */
async function getImageDimensions(filePath: string): Promise<{ width: number; height: number } | null> {
  try {
    const buffer = await fs.readFile(filePath);

    // JPEG format check
    if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
      // Parse JPEG header for dimensions
      let offset = 2;
      while (offset < buffer.length) {
        if (buffer[offset] !== 0xFF) return null;
        const marker = buffer[offset + 1];
        offset += 2;

        // SOF (Start of Frame) markers contain dimensions
        if ((marker >= 0xC0 && marker <= 0xC3) || (marker >= 0xC5 && marker <= 0xC7) ||
            (marker >= 0xC9 && marker <= 0xCB) || (marker >= 0xCD && marker <= 0xCF)) {
          const height = (buffer[offset + 3] << 8) | buffer[offset + 4];
          const width = (buffer[offset + 5] << 8) | buffer[offset + 6];
          return { width, height };
        }

        // Skip to next marker
        const segmentLength = (buffer[offset] << 8) | buffer[offset + 1];
        offset += segmentLength;
      }
    }

    // PNG format check
    if (buffer.toString('ascii', 1, 8) === 'PNG\r\n\x1a\n') {
      const width = (buffer[16] << 24) | (buffer[17] << 16) | (buffer[18] << 8) | buffer[19];
      const height = (buffer[20] << 24) | (buffer[21] << 16) | (buffer[22] << 8) | buffer[23];
      return { width, height };
    }

    // WebP format check (simplified)
    if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
      // This is simplified - full WebP parsing is more complex
      return null;
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Parse filename to extract item ID and image number
 */
function parseImageFilename(filename: string): { itemId: string; imageNumber: number } | null {
  const match = filename.match(/^(\d{2}_\d{4})_(\d+)\.(jpg|jpeg|png|webp)$/i);
  if (!match) return null;

  return {
    itemId: match[1],
    imageNumber: parseInt(match[2], 10)
  };
}

/**
 * Determine if an image is likely a thumbnail or preview based on dimensions
 */
function classifyImage(width: number, height: number): { isThumbnail: boolean; isPreview: boolean } {
  // Very small images are thumbnails
  const isThumbnail = width <= THUMBNAIL_MAX_SIZE && height <= THUMBNAIL_MAX_SIZE;

  // Check for known preview aspect ratios
  const isPreview = PREVIEW_ASPECT_RATIOS.some(ratio =>
    width === ratio.width && height === ratio.height
  );

  // Also consider very small square images as previews
  const isSmallSquare = width === height && width <= 250;

  return { isThumbnail, isPreview: isPreview || isSmallSquare };
}

/**
 * Scan a directory for images and analyze their dimensions
 */
async function scanImageDirectory(directory: string): Promise<ScanResults> {
  const results: ScanResults = {
    total: 0,
    thumbnails: [],
    previews: [],
    legitimate: [],
    errors: []
  };

  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    const imageFiles = entries
      .filter(e => e.isFile())
      .filter(e => /\.(jpg|jpeg|png|webp)$/i.test(e.name))
      .map(e => e.name)
      .sort();

    for (const filename of imageFiles) {
      results.total++;
      const filePath = path.join(directory, filename);

      try {
        const parsed = parseImageFilename(filename);
        if (!parsed) {
          results.errors.push(`Invalid filename format: ${filename}`);
          continue;
        }

        const stats = await fs.stat(filePath);
        const dimensions = await getImageDimensions(filePath);

        if (!dimensions) {
          results.errors.push(`Could not read dimensions: ${filename}`);
          continue;
        }

        const { isThumbnail, isPreview } = classifyImage(dimensions.width, dimensions.height);

        const imageInfo: ImageInfo = {
          path: filePath,
          itemId: parsed.itemId,
          imageNumber: parsed.imageNumber,
          width: dimensions.width,
          height: dimensions.height,
          size: stats.size,
          isThumbnail,
          isPreview
        };

        if (isThumbnail || isPreview) {
          if (isThumbnail) results.thumbnails.push(imageInfo);
          if (isPreview) results.previews.push(imageInfo);
        } else {
          results.legitimate.push(imageInfo);
        }

      } catch (error) {
        results.errors.push(`Error processing ${filename}: ${error}`);
      }
    }

  } catch (error) {
    results.errors.push(`Failed to read directory: ${error}`);
  }

  return results;
}

/**
 * Format file size for human reading
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Display scan results
 */
function displayResults(results: ScanResults): void {
  console.log('\n🔍 Image Scan Results');
  console.log('====================');
  console.log(`Total images scanned: ${results.total}`);
  console.log(`Legitimate product images: ${results.legitimate.length}`);
  console.log(`Thumbnail images: ${results.thumbnails.length}`);
  console.log(`Preview images: ${results.previews.length}`);
  console.log(`Errors: ${results.errors.length}`);

  if (results.thumbnails.length > 0) {
    console.log('\n📏 Thumbnail Images (likely incorrect):');
    console.log('----------------------------------------');
    results.thumbnails.forEach(img => {
      console.log(`${img.itemId}_${img.imageNumber}: ${img.width}x${img.height} (${formatFileSize(img.size)})`);
    });
  }

  if (results.previews.length > 0) {
    console.log('\n🖼️  Preview Images (likely incorrect):');
    console.log('-------------------------------------');
    results.previews.forEach(img => {
      console.log(`${img.itemId}_${img.imageNumber}: ${img.width}x${img.height} (${formatFileSize(img.size)})`);
    });
  }

  if (results.errors.length > 0) {
    console.log('\n❌ Errors:');
    console.log('-----------');
    results.errors.forEach(error => console.log(error));
  }
}

/**
 * Remove incorrectly sized images
 */
async function removeIncorrectImages(results: ScanResults, dryRun: boolean = true): Promise<void> {
  const imagesToRemove = [...results.thumbnails, ...results.previews];
  const uniqueImages = imagesToRemove.filter((img, index, self) =>
    index === self.findIndex(i => i.path === img.path)
  );

  if (uniqueImages.length === 0) {
    console.log('\n✅ No incorrect images found to remove.');
    return;
  }

  console.log(`\n🗑️  ${dryRun ? 'DRY RUN: Would remove' : 'Removing'} ${uniqueImages.length} incorrect images:`);
  console.log('-------------------------------------------------');

  for (const img of uniqueImages) {
    console.log(`${img.itemId}_${img.imageNumber}: ${img.width}x${img.height} (${formatFileSize(img.size)})`);
    if (!dryRun) {
      try {
        await fs.unlink(img.path);
        console.log(`  ✅ Deleted: ${img.path}`);
      } catch (error) {
        console.log(`  ❌ Failed to delete: ${error}`);
      }
    }
  }
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const imageDir = args[0] || 'apps/next/public/images/items';
  const dryRun = !args.includes('--remove');

  console.log(`🔍 Scanning directory: ${imageDir}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN (no files will be removed)' : 'REMOVE mode'}`);

  const results = await scanImageDirectory(imageDir);
  displayResults(results);

  if (dryRun && (results.thumbnails.length > 0 || results.previews.length > 0)) {
    console.log('\n💡 To remove these images, run with --remove flag');
    await removeIncorrectImages(results, true); // Show what would be removed
  } else if (!dryRun) {
    await removeIncorrectImages(results, false); // Actually remove
  }

  if (results.errors.length > 0) {
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}