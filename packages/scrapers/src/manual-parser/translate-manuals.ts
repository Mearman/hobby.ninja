#!/usr/bin/env node

/**
 * Translate name and series fields from Japanese to English
 * Uses the @unnamed-gunpla-app/translation package
 */

import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import {
  TranslationService,
  createServerTranslationStore,
} from '../../../translation/src/index';
import type { FilteredManualData } from './core/json-filter';

const BATCH_SIZE = 10;
const DELAY_BETWEEN_BATCHES_MS = 500;

interface TranslationProgress {
  processed: number;
  translated: number;
  skipped: number;
  errors: number;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function translateManual(
  manualPath: string,
  translator: TranslationService
): Promise<{ translated: boolean; error?: string }> {
  try {
    const content = await fs.readFile(manualPath, 'utf-8');
    const manual: FilteredManualData = JSON.parse(content);

    let updated = false;

    // Translate name if not already translated
    if (manual.name.ja && !manual.name.en) {
      try {
        const result = await translator.translateText(manual.name.ja, 'en', 'ja');
        manual.name.en = result.translated;
        updated = true;
      } catch (err) {
        console.error(`  Failed to translate name for ${manual.id}:`, err);
      }
    }

    // Translate series if not already translated
    if (manual.series.ja && !manual.series.en) {
      try {
        const result = await translator.translateText(manual.series.ja, 'en', 'ja');
        manual.series.en = result.translated;
        updated = true;
      } catch (err) {
        console.error(`  Failed to translate series for ${manual.id}:`, err);
      }
    }

    if (updated) {
      await fs.writeFile(manualPath, JSON.stringify(manual, null, 2), 'utf-8');
      return { translated: true };
    }

    return { translated: false }; // Already translated or nothing to translate
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { translated: false, error: message };
  }
}

async function main() {
  console.log('Translating manual name and series fields...\n');

  let manualsDir = 'data/bandai/manuals';
  let storeDir = 'data/translations';
  if (process.cwd().endsWith('packages/scrapers')) {
    manualsDir = '../../data/bandai/manuals';
    storeDir = '../../data/translations';
  }

  // Initialize translation service with persistent store
  console.log('Initializing translation service with persistent cache...');
  const store = await createServerTranslationStore(storeDir, {
    maxEntries: 10000,
  });
  const translator = new TranslationService({}, undefined, store);
  console.log('Translation service ready.\n');

  const entries = await fs.readdir(manualsDir, { withFileTypes: true });
  const ids = entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();

  console.log(`Found ${ids.length} manuals to process\n`);

  const progress: TranslationProgress = {
    processed: 0,
    translated: 0,
    skipped: 0,
    errors: 0,
  };

  // Process in batches
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = ids.slice(i, i + BATCH_SIZE);

    const results = await Promise.all(
      batch.map(async (id) => {
        const manualPath = join(manualsDir, id, `${id}.json`);
        return translateManual(manualPath, translator);
      })
    );

    for (const result of results) {
      progress.processed++;
      if (result.error) {
        progress.errors++;
      } else if (result.translated) {
        progress.translated++;
      } else {
        progress.skipped++;
      }
    }

    if (progress.processed % 100 === 0 || progress.processed === ids.length) {
      console.log(
        `Progress: ${progress.processed}/${ids.length} | ` +
          `Translated: ${progress.translated} | ` +
          `Skipped: ${progress.skipped} | ` +
          `Errors: ${progress.errors}`
      );
    }

    // Rate limiting between batches
    if (i + BATCH_SIZE < ids.length) {
      await sleep(DELAY_BETWEEN_BATCHES_MS);
    }
  }

  console.log('\nComplete!');
  console.log(`  Total processed: ${progress.processed}`);
  console.log(`  Translated: ${progress.translated}`);
  console.log(`  Skipped (already translated): ${progress.skipped}`);
  console.log(`  Errors: ${progress.errors}`);

  // Show cache stats
  const cacheStats = translator.getCacheStats();
  console.log(`\nCache stats: ${cacheStats.hits} hits, ${cacheStats.misses} misses`);
}

main().catch(console.error);
