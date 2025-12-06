#!/usr/bin/env node

/**
 * Download all images and PDFs for manuals into their corresponding folders
 */

import { promises as fs } from 'node:fs';
import { join, basename } from 'node:path';
import type { FilteredManualData } from './core/json-filter';

const CONCURRENCY = 5;
const DELAY_MS = 100;

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'image/webp,image/apng,image/*,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9,ja;q=0.8',
  Referer: 'https://bandai-hobby.net/',
};

async function fileExists(path: string): Promise<boolean> {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

async function downloadFile(url: string, destPath: string): Promise<boolean> {
  if (await fileExists(destPath)) {
    return false; // Already exists, skipped
  }

  try {
    const response = await fetch(url, { headers: HEADERS });
    if (!response.ok) {
      console.error(`  Failed to download ${url}: HTTP ${response.status}`);
      return false;
    }

    const buffer = await response.arrayBuffer();
    await fs.writeFile(destPath, Buffer.from(buffer));
    return true;
  } catch (error) {
    console.error(`  Error downloading ${url}:`, error);
    return false;
  }
}

function getImageExtension(url: string): string {
  const urlPath = new URL(url).pathname;
  const ext = urlPath.split('.').pop()?.toLowerCase();
  if (ext && ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
    return ext;
  }
  return 'jpg'; // Default
}

async function downloadManualAssets(
  manualDir: string,
  manual: FilteredManualData
): Promise<{ images: number; pdfs: number; skipped: number }> {
  const stats = { images: 0, pdfs: 0, skipped: 0 };

  // Download product image
  if (manual.productImage) {
    const ext = getImageExtension(manual.productImage);
    const imagePath = join(manualDir, `${manual.id}.${ext}`);
    const downloaded = await downloadFile(manual.productImage, imagePath);
    if (downloaded) stats.images++;
    else stats.skipped++;
  }

  // Download main PDF
  if (manual.pdfUrl) {
    const pdfPath = join(manualDir, `${manual.id}.pdf`);
    const downloaded = await downloadFile(manual.pdfUrl, pdfPath);
    if (downloaded) stats.pdfs++;
    else stats.skipped++;
  }

  // Download supplementary PDF
  if (manual.supplementaryPdfUrl) {
    const pdfPath = join(manualDir, `${manual.id}_2.pdf`);
    const downloaded = await downloadFile(manual.supplementaryPdfUrl, pdfPath);
    if (downloaded) stats.pdfs++;
    else stats.skipped++;
  }

  return stats;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log('Downloading assets for all manuals...\n');

  let manualsDir = 'data/bandai/manuals';
  if (process.cwd().endsWith('packages/scrapers')) {
    manualsDir = '../../data/bandai/manuals';
  }

  const entries = await fs.readdir(manualsDir, { withFileTypes: true });
  const ids = entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();

  console.log(`Found ${ids.length} manuals to process\n`);

  let totalImages = 0;
  let totalPdfs = 0;
  let totalSkipped = 0;
  let errors = 0;
  let processed = 0;

  // Process in batches for concurrency
  for (let i = 0; i < ids.length; i += CONCURRENCY) {
    const batch = ids.slice(i, i + CONCURRENCY);

    const results = await Promise.all(
      batch.map(async (id) => {
        const manualDir = join(manualsDir, id);
        const jsonPath = join(manualDir, `${id}.json`);

        try {
          const content = await fs.readFile(jsonPath, 'utf-8');
          const manual: FilteredManualData = JSON.parse(content);
          return await downloadManualAssets(manualDir, manual);
        } catch (error) {
          console.error(`Error processing ${id}:`, error);
          return null;
        }
      })
    );

    for (const result of results) {
      if (result) {
        totalImages += result.images;
        totalPdfs += result.pdfs;
        totalSkipped += result.skipped;
      } else {
        errors++;
      }
    }

    processed += batch.length;
    if (processed % 100 === 0 || processed === ids.length) {
      console.log(
        `Progress: ${processed}/${ids.length} | Images: ${totalImages} | PDFs: ${totalPdfs} | Skipped: ${totalSkipped}`
      );
    }

    await sleep(DELAY_MS);
  }

  console.log('\nComplete!');
  console.log(`  Images downloaded: ${totalImages}`);
  console.log(`  PDFs downloaded: ${totalPdfs}`);
  console.log(`  Skipped (already exist): ${totalSkipped}`);
  console.log(`  Errors: ${errors}`);
}

main().catch(console.error);
