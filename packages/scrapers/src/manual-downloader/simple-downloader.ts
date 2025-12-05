/**
 * Optimized Manual Downloader - Smart Rate Limiting + Binary Discovery + Two-Pass
 *
 * Fast discovery with adaptive rate limiting and intelligent range detection.
 */

import { HttpClient } from './services/http-client';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';

interface SimpleOptions {
  startId?: number;
  endId?: number;
  url?: string;
  output?: string;
  maxConcurrent?: number; // For parallel processing
}

interface DiscoveredRange {
  start: number;
  end: number;
  count: number;
}

export class SimpleDownloader {
  private httpClient: HttpClient;
  private adaptiveDelay: number;
  private consecutiveErrors: number;
  private consecutiveSuccesses: number;

  constructor() {
    this.httpClient = new HttpClient();
    this.adaptiveDelay = 100; // Start very fast: 100ms
    this.consecutiveErrors = 0;
    this.consecutiveSuccesses = 0;
  }

  async download(options: SimpleOptions = {}) {
    const startId = options.startId || 1;
    const endId = options.endId || 10000; // Increased default for better discovery
    const baseUrl = options.url || 'https://manual.bandai.hobby.net/menus/detail/';
    const outputDir = options.output || './data/bandai/manuals';

    console.log(`🚀 Starting OPTIMIZED download from ID ${startId} to ${endId}`);
    console.log(`📁 Output directory: ${outputDir}`);
    console.log(`⚡ Adaptive rate limiting: starts fast, slows on issues`);

    // Create output directory
    await fs.mkdir(outputDir, { recursive: true });

    console.log(`\n🔍 Phase 1: Smart discovery...`);

    let confirmedIds: number[] = [];

    try {
      // Try the optimized approach first
      const validRanges = await this.discoverValidRanges(baseUrl, startId, endId);

      if (validRanges.length > 0) {
        console.log(`🎯 Found ${validRanges.length} valid ranges`);

        // Phase 2: Quick validation pass
        console.log(`\n⚡ Phase 2: Quick validation...`);
        confirmedIds = await this.quickValidateIds(baseUrl, validRanges);

        if (confirmedIds.length > 0) {
          console.log(`✅ Confirmed ${confirmedIds.length} valid manuals`);
        }
      }
    } catch (error) {
      console.log(`⚠️  Optimized discovery failed, falling back to simple approach`);
    }

    // If optimization failed or found nothing, fall back to simple approach
    if (confirmedIds.length === 0) {
      console.log(`🔄 Phase 1: Simple linear scan...`);
      confirmedIds = [];

      for (let id = startId; id <= endId; id++) {
        const isValid = await this.simpleCheck(baseUrl, id);
        if (isValid) {
          confirmedIds.push(id);
        }

        // Show progress
        if (confirmedIds.length % 10 === 0 || id % 50 === 0) {
          process.stdout.write(`\r🔍 Scanned: ${id - startId + 1}, found: ${confirmedIds.length}`);
        }

        // Simple rate limiting for fallback
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (confirmedIds.length === 0) {
        console.log(`\n❌ No valid manuals found in range ${startId}-${endId}`);
        return;
      }

      console.log(`\n✅ Found ${confirmedIds.length} valid manuals (simple scan)`);
    }

    // Phase 3: Full download pass
    console.log(`\n📥 Phase 3: Full download...`);
    const results = await this.downloadConfirmedIds(baseUrl, outputDir, confirmedIds);

    console.log(`\n🎉 OPTIMIZED DOWNLOAD COMPLETE!`);
    console.log(`   • Successfully downloaded: ${results.successCount}`);
    console.log(`   • Failed: ${results.failCount}`);
    console.log(`   • Average adaptive delay: ${results.avgDelay}ms`);
    console.log(`📁 Files saved to: ${outputDir}`);
  }

  /**
   * Phase 1: Smart discovery with sampling to find valid ID ranges
   */
  private async discoverValidRanges(baseUrl: string, startId: number, endId: number): Promise<DiscoveredRange[]> {
    const ranges: DiscoveredRange[] = [];

    console.log(`   🔍 Sampling range ${startId}-${endId} to find valid manuals...`);

    // Sample the range to get a rough idea of where valid IDs might be
    const sampleSize = Math.min(100, Math.ceil((endId - startId + 1) / 10));
    const sampleStep = Math.ceil((endId - startId + 1) / sampleSize);

    const validSamples: number[] = [];

    for (let i = startId; i <= endId; i += sampleStep) {
      const isValid = await this.quickCheck(baseUrl, i);
      if (isValid) {
        validSamples.push(i);
      }

      // Show sampling progress
      if (i % (sampleStep * 5) === 0 || i > endId - sampleStep) {
        process.stdout.write(`\r   🔍 Sampled ${i - startId + 1}/${endId - startId + 1}, found ${validSamples.length} valid`);
      }
    }

    if (validSamples.length === 0) {
      // No valid IDs found in samples, try a broader search
      console.log(`\n   ⚠️  No valid IDs in samples, doing broader search...`);
      return await this.broadSearch(baseUrl, startId, endId);
    }

    // Create ranges around valid samples
    console.log(`\n   🎯 Found ${validSamples.length} valid samples, creating ranges...`);

    for (const sample of validSamples) {
      const rangeStart = Math.max(startId, sample - 50);
      const rangeEnd = Math.min(endId, sample + 50);
      ranges.push({
        start: rangeStart,
        end: rangeEnd,
        count: rangeEnd - rangeStart + 1
      });
    }

    return ranges;
  }

  /**
   * Fallback broader search when samples don't find valid IDs
   */
  private async broadSearch(baseUrl: string, startId: number, endId: number): Promise<DiscoveredRange[]> {
    console.log(`   🔄 Doing broader linear search every 100 IDs...`);

    const ranges: DiscoveredRange[] = [];
    let foundValid = false;

    for (let i = startId; i <= endId; i += 100) {
      const isValid = await this.quickCheck(baseUrl, i);
      if (isValid) {
        const rangeStart = i;
        const rangeEnd = Math.min(endId, i + 99);
        ranges.push({ start: rangeStart, end: rangeEnd, count: rangeEnd - rangeStart + 1 });
        foundValid = true;
      }
    }

    if (!foundValid) {
      console.log(`   ❌ No valid manuals found in range ${startId}-${endId}`);
    }

    return ranges;
  }

  
  /**
   * Quick check using HEAD request to validate if a manual exists
   */
  private async quickCheck(baseUrl: string, id: number): Promise<boolean> {
    try {
      const url = `${baseUrl}${id}/`;
      const response = await this.httpClient.head(url, { timeout: 5000 });

      if (response.statusCode === 200) {
        this.consecutiveSuccesses++;
        this.consecutiveErrors = 0;
        this.optimizeDelay(true);
        return true;
      } else {
        this.consecutiveErrors++;
        this.consecutiveSuccesses = 0;
        this.optimizeDelay(false);
        return false;
      }
    } catch (error) {
      this.consecutiveErrors++;
      this.consecutiveSuccesses = 0;
      this.optimizeDelay(false);
      return false;
    }
  }

  /**
   * Simple check using GET request for fallback
   */
  private async simpleCheck(baseUrl: string, id: number): Promise<boolean> {
    try {
      const url = `${baseUrl}${id}/`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ManualDownloader/1.0)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        timeout: 10000
      });

      if (response.ok) {
        const data = await response.text();
        return data.length > 1000; // Valid manual has substantial content
      } else {
        return false;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Phase 2: Quick validation with parallel HEAD requests
   */
  private async quickValidateIds(baseUrl: string, ranges: DiscoveredRange[]): Promise<number[]> {
    const confirmedIds: number[] = [];
    const maxConcurrent = 10; // Parallel validation

    for (const range of ranges) {
      console.log(`   🔍 Validating range ${range.start}-${range.end}...`);

      for (let id = range.start; id <= range.end; id++) {
        const isValid = await this.quickCheck(baseUrl, id);
        if (isValid) {
          confirmedIds.push(id);
        }

        // Show progress for validation
        if (confirmedIds.length % 50 === 0) {
          process.stdout.write(`\r⚡ Validated: ${confirmedIds.length} confirmed`);
        }
      }
    }

    return confirmedIds;
  }

  /**
   * Phase 3: Full download of confirmed valid IDs
   */
  private async downloadConfirmedIds(baseUrl: string, outputDir: string, ids: number[]): Promise<{successCount: number, failCount: number, avgDelay: number}> {
    let successCount = 0;
    let failCount = 0;
    let totalDelay = 0;
    let currentPadding = 1;

    for (const id of ids) {
      try {
        const url = `${baseUrl}${id}/`;

        // Show progress
        process.stdout.write(`\r📥 Downloading ${id}/${ids[ids.length - 1]}... ✓${successCount} ✗${failCount}`);

        // Adaptive wait
        const delayStart = Date.now();
        await this.adaptiveWait();
        totalDelay += Date.now() - delayStart;

        // Full download using direct fetch
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; ManualDownloader/1.0)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          },
          timeout: 15000
        });

        if (response.ok) {
          const data = await response.text();
          if (data.length > 1000) {
            // Save with padding
            const paddedId = id.toString().padStart(currentPadding, '0');
            const filePath = join(outputDir, `${paddedId}.html`);
            await fs.writeFile(filePath, data, 'utf8');
            successCount++;
          } else {
            failCount++;
          }
        } else {
          failCount++;
        }

        // Handle padding for new power of 10
        const newPadding = id.toString().length;
        if (newPadding > currentPadding) {
          console.log(`\n📝 Padding existing files to ${newPadding} digits...`);
          await this.padExistingFiles(outputDir, currentPadding, newPadding);
          currentPadding = newPadding;
        }

        this.consecutiveSuccesses++;
        this.consecutiveErrors = 0;
        this.optimizeDelay(true);

      } catch (error) {
        failCount++;
        this.consecutiveErrors++;
        this.consecutiveSuccesses = 0;
        this.optimizeDelay(false);
      }
    }

    return {
      successCount,
      failCount,
      avgDelay: Math.round(totalDelay / ids.length)
    };
  }

  /**
   * Adaptive rate limiting based on success/failure patterns
   */
  private adaptiveWait(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, this.adaptiveDelay));
  }

  /**
   * Optimize delay based on response patterns
   */
  private optimizeDelay(success: boolean): void {
    if (success) {
      // On success, gradually reduce delay
      if (this.consecutiveSuccesses >= 5 && this.adaptiveDelay > 50) {
        this.adaptiveDelay = Math.max(50, this.adaptiveDelay * 0.8);
      }
    } else {
      // On error, increase delay exponentially
      if (this.consecutiveErrors >= 2) {
        this.adaptiveDelay = Math.min(8000, this.adaptiveDelay * 2);
      }
    }
  }

  /**
   * Pad existing files with zeros when hitting a new power of 10
   */
  private async padExistingFiles(outputDir: string, oldPadding: number, newPadding: number): Promise<void> {
    try {
      const files = await fs.readdir(outputDir);

      for (const file of files) {
        if (file.endsWith('.html')) {
          const idStr = file.replace('.html', '');

          // Only rename files that match the old padding length
          if (idStr.length === oldPadding && /^\d+$/.test(idStr)) {
            const paddedId = idStr.padStart(newPadding, '0');
            const oldPath = join(outputDir, file);
            const newPath = join(outputDir, `${paddedId}.html`);

            await fs.rename(oldPath, newPath);
          }
        }
      }
    } catch (error) {
      console.log(`⚠️  Error padding files: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const options: SimpleOptions = {};

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--start':
      case '-s':
        options.startId = parseInt(args[++i]);
        break;
      case '--end':
      case '-e':
        options.endId = parseInt(args[++i]);
        break;
      case '--url':
      case '-u':
        options.url = args[++i];
        break;
      case '--output':
      case '-o':
        options.output = args[++i];
        break;
      case '--help':
      case '-h':
        console.log(`
Simple Manual Downloader

USAGE:
  simple-downloader [OPTIONS]

OPTIONS:
  -s, --start <id>      Start from this ID (default: 1)
  -e, --end <id>        End at this ID (default: 1000)
  -u, --url <url>       Base URL for manual pages
  -o, --output <dir>    Output directory (default: ./data/bandai/manuals)
  -h, --help            Show this help

EXAMPLES:
  simple-downloader --start 650 --end 700
  simple-downloader --start 1 --end 100 --url https://example.com/detail/ --output ./manuals

FEATURES:
  • Simple ID incrementing - no complex sessions
  • Real-time progress display
  • Automatic rate limiting for Japanese sites
  • Continues from any ID you specify
        `);
        process.exit(0);
    }
  }

  const downloader = new SimpleDownloader();
  downloader.download(options).catch(console.error);
}