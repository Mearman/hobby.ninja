/**
 * Smart Manual Downloader - One Implementation That Handles Everything
 *
 * Combines optimization logic with fallback - no complexity, just works.
 */

import { promises as fs } from 'node:fs';
import { join } from 'node:path';

interface DownloaderOptions {
  startId?: number;
  endId?: number;
  url?: string;
  output?: string;
}

export class Downloader {
  private adaptiveDelay: number;
  private consecutiveErrors: number;
  private consecutiveSuccesses: number;

  constructor() {
    this.adaptiveDelay = 100; // Start fast
    this.consecutiveErrors = 0;
    this.consecutiveSuccesses = 0;
  }

  async download(options: DownloaderOptions = {}) {
    const startId = options.startId || 1;
    const endId = options.endId || 10000;
    const baseUrl = options.url || 'https://manual.bandai-hobby.net/menus/detail/';
    const outputDir = options.output || './data/bandai/manuals';

    console.log(`🚀 Smart download from ID ${startId} to ${endId}`);
    console.log(`📁 Output: ${outputDir}`);
    console.log(`⚡ Adaptive speed: starts fast, slows on issues`);

    await fs.mkdir(outputDir, { recursive: true });

    const confirmedIds: number[] = [];

    // Phase 1: Smart discovery
    console.log(`\n🔍 Phase 1: Finding valid IDs...`);

    // Check for existing files first to use as seed points
    const existingFiles = new Set<number>();
    const existingFilesInRange = new Set<number>();
    const allExistingFiles = new Set<number>(); // For expansion seeds

    try {
      const files = await fs.readdir(outputDir);
      for (const file of files) {
        if (file.endsWith('.html')) {
          const idStr = file.replace('.html', '');
          const id = parseInt(idStr, 10);
          if (!isNaN(id)) {
            allExistingFiles.add(id);

            // Only add to range set if within bounds
            if (id >= startId && id <= endId) {
              existingFilesInRange.add(id);
            }
          }
        }
      }
    } catch (error) {
      // Directory might not exist yet
    }

    if (allExistingFiles.size > 0) {
      console.log(`📁 Found ${existingFilesInRange.size} existing manuals in range ${startId}-${endId}, plus ${allExistingFiles.size - existingFilesInRange.size} outside range to use as seed points`);

      // Add existing files within range to confirmed IDs
      confirmedIds.push(...Array.from(existingFilesInRange));

      // Use only boundary points of contiguous ranges as expansion seeds
      // This dramatically reduces redundant seed points while maintaining coverage
      const { boundaries: expansionSeeds, ranges } = this.getBoundarySeeds(Array.from(allExistingFiles));
      const expandedIds = await this.expandAroundSamples(baseUrl, startId, endId, ranges, existingFilesInRange);
      confirmedIds.push(...expandedIds.filter(id => !existingFilesInRange.has(id)));
    } else {
      // No existing files, fall back to random sampling
      console.log(`📁 No existing files found, trying random sampling...`);
      const samples = this.sampleRange(startId, endId, 100); // Sample 100 IDs

      // Check if any samples are valid
      let foundValid = false;
      for (const sample of samples) {
        if (await this.testUrl(baseUrl + sample + '/')) {
          foundValid = true;
          break;
        }
      }

      if (foundValid) {
        console.log(`✅ Smart scan viable - found valid IDs in samples`);
        confirmedIds.push(...await this.expandAroundSamples(baseUrl, startId, endId, samples, existingFilesInRange));
      } else {
        // Fall back to linear scan if no valid samples found
        console.log(`🔄 No valid samples found, falling back to linear scan...`);
        for (let id = startId; id <= endId; id++) {
          const isValid = await this.testUrl(baseUrl + id + '/');
          if (isValid) {
            confirmedIds.push(id);
          }

          // Show progress and recent finds every 20 IDs
          if (id % 20 === 0) {
            const recentFinds = confirmedIds.slice(-5); // Last 5 found
            console.log(`🔍 Scanned ${id - startId + 1}/${endId - startId + 1}, total found: ${confirmedIds.length}`);
            if (recentFinds.length > 0) {
              console.log(`   Recent finds: [${recentFinds.join(', ')}]`);
            }
          }

          // Small delay to be reasonable
          await this.smartWait();
        }
      }
    }

    if (confirmedIds.length === 0) {
      console.log(`\n❌ No valid manuals found in range ${startId}-${endId}`);
      return;
    }

    console.log(`\n✅ Found ${confirmedIds.length} valid manuals`);

    // Phase 3: Download confirmed IDs (skipping existing)
    console.log(`\n📥 Phase 2: Downloading ${confirmedIds.length} manuals...`);

    let successCount = 0;
    let failCount = 0;
    let skippedCount = 0;
    let currentPadding = 1;

    // Reuse existingFilesInRange from discovery phase
    console.log(`📁 Found ${existingFilesInRange.size} existing manuals, will skip these`);

    for (const id of confirmedIds) {
      try {
        const url = `${baseUrl}${id}/`;

        // Check if file already exists
        if (existingFilesInRange.has(id)) {
          skippedCount++;
          const paddedId = id.toString().padStart(currentPadding, '0');
          console.log(`⏭ Skipped: ${paddedId}.html (already exists)`);
          continue;
        }

        // Show progress
        const currentIndex = confirmedIds.indexOf(id) + 1;
        process.stdout.write(`\r📥 ${currentIndex}/${confirmedIds.length} ✓${successCount} ✗${failCount} ⏭${skippedCount}`);

        // Adaptive wait
        await this.smartWait();

        // Download
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; ManualDownloader/1.0)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          }
        });

        if (response.ok) {
          const data = await response.text();

          if (data.length > 1000 && (data.includes('<html') || data.includes('<!DOCTYPE'))) {
            // Save with padding
            const paddedId = id.toString().padStart(currentPadding, '0');
            const filePath = join(outputDir, `${paddedId}.html`);
            await fs.writeFile(filePath, data, 'utf8');
            successCount++;
            console.log(`\n✅ Downloaded: ${paddedId}.html (${data.length.toLocaleString()} bytes)`);

            // Handle padding for new power of 10
            const newPadding = id.toString().length;
            if (newPadding > currentPadding) {
              console.log(`\n📝 Padding files to ${newPadding} digits...`);
              await this.padExistingFiles(outputDir, currentPadding, newPadding);
              currentPadding = newPadding;
            }

            this.consecutiveSuccesses++;
            this.consecutiveErrors = 0;
            this.optimizeDelay(true);
          } else {
            failCount++;
            this.consecutiveErrors++;
            this.consecutiveSuccesses = 0;
            this.optimizeDelay(false);
          }
        } else {
          failCount++;
          this.consecutiveErrors++;
          this.consecutiveSuccesses = 0;
          this.optimizeDelay(false);
        }

      } catch (error) {
        failCount++;
        this.consecutiveErrors++;
        this.consecutiveSuccesses = 0;
        this.optimizeDelay(false);
      }
    }

    console.log(`\n🎉 COMPLETE!`);
    console.log(`   • Downloaded: ${successCount}`);
    if (skippedCount > 0) {
      console.log(`   • Skipped (already exist): ${skippedCount}`);
    }
    console.log(`   • Failed: ${failCount}`);
    console.log(`   • Average delay: ${Math.round(this.getAverageDelay())}ms`);
    console.log(`📁 Files: ${outputDir}`);
  }

  /**
   * Get only boundary points of contiguous ranges as efficient seeds
   * Instead of using every existing file, only use the ends of continuous ranges
   */
  private getBoundarySeeds(sortedIds: number[]): { boundaries: number[], ranges: Array<{start: number, end: number}> } {
    if (sortedIds.length === 0) return { boundaries: [], ranges: [] };

    const boundaries: number[] = [];
    const ranges: Array<{start: number, end: number}> = [];
    sortedIds.sort((a, b) => a - b);

    let rangeStart = sortedIds[0];
    let prevId = sortedIds[0];

    for (let i = 1; i < sortedIds.length; i++) {
      const currentId = sortedIds[i];

      // Gap of more than 1 indicates end of contiguous range
      if (currentId > prevId + 1) {
        // Add boundaries of completed range
        boundaries.push(rangeStart);
        boundaries.push(prevId);
        ranges.push({ start: rangeStart, end: prevId });
        rangeStart = currentId;
      }

      prevId = currentId;
    }

    // Add boundaries of final range
    boundaries.push(rangeStart);
    boundaries.push(prevId);
    ranges.push({ start: rangeStart, end: prevId });

    // Remove redundant boundaries when ranges are adjacent
    const optimizedBoundaries = [];
    const sortedBoundaries = [...new Set(boundaries)].sort((a, b) => a - b);

    for (let i = 0; i < sortedBoundaries.length; i++) {
      const boundary = sortedBoundaries[i];
      const isRedundant = (i > 0 && sortedBoundaries[i - 1] + 1 === boundary) ||
                        (i < sortedBoundaries.length - 1 && sortedBoundaries[i + 1] - 1 === boundary);

      if (!isRedundant) {
        optimizedBoundaries.push(boundary);
      }
    }

    // Log the ranges being represented
    if (ranges.length > 0) {
      const rangeStrings = ranges.map(r => `${r.start}-${r.end}`);
      console.log(`   📊 Contiguous ranges detected: [${rangeStrings.join(', ')}]`);
      console.log(`   📍 Optimized boundaries: [${optimizedBoundaries.join(', ')}] (removed ${sortedBoundaries.length - optimizedBoundaries.length} redundant points)`);
    }

    return { boundaries: optimizedBoundaries, ranges };
  }

  /**
   * Sample range to find promising areas
   */
  private sampleRange(startId: number, endId: number, sampleCount: number): number[] {
    const samples: number[] = [];
    const step = Math.ceil((endId - startId + 1) / sampleCount);

    for (let i = startId; i <= endId; i += step) {
      samples.push(i);
    }

    return samples;
  }

  /**
   * Intelligent range discovery using binary search from gaps between existing ranges
   */
  private async expandAroundSamples(baseUrl: string, startId: number, endId: number, ranges: Array<{start: number, end: number}>, existingFilesInRange: Set<number>): Promise<number[]> {
    const found: number[] = [];
    const checked = new Set<number>(); // Track checked IDs to avoid duplicates

    // Identify gaps between existing ranges where we should search
    const gapSeeds = this.getGapBasedSeeds(ranges, startId, endId);

    if (gapSeeds.length === 0) {
      console.log(`   ✅ No gaps found - all ranges already covered`);
      return found;
    }

    console.log(`   🔍 Binary search discovery from ${gapSeeds.length} gap-based seed points...`);

    for (let i = 0; i < gapSeeds.length; i++) {
      const sample = gapSeeds[i];

      console.log(`   🔍 Gap Seed ${i + 1}/${gapSeeds.length}: ID ${sample}`);

      // Binary search for range boundaries
      const range = await this.findValidRange(baseUrl, sample, startId, endId, existingFilesInRange, checked);

      for (const id of range) {
        if (!existingFilesInRange.has(id)) {
          found.push(id);
          console.log(`   ✅ Found new manual: ${id}`);
        }
      }
    }

    console.log(`\n   ✅ Binary search complete: discovered ${found.length} new manuals`);
    return found.sort((a, b) => a - b);
  }

  /**
   * Generate seed points only at gaps between existing ranges
   */
  private getGapBasedSeeds(ranges: Array<{start: number, end: number}>, startId: number, endId: number): number[] {
    const gapSeeds: number[] = [];

    // Sort ranges by start ID
    const sortedRanges = [...ranges].sort((a, b) => a.start - b.start);

    // Find gaps between existing ranges
    for (let i = 0; i < sortedRanges.length - 1; i++) {
      const currentRange = sortedRanges[i];
      const nextRange = sortedRanges[i + 1];

      // If there's a gap between this range and the next
      if (nextRange.start > currentRange.end + 1) {
        const gapStart = currentRange.end + 1;
        const gapEnd = nextRange.start - 1;

        // Check if this gap overlaps with our target range
        if (gapEnd >= startId && gapStart <= endId) {
          // Add a seed point in the middle of the gap
          const gapMiddle = Math.floor((gapStart + gapEnd) / 2);
          gapSeeds.push(gapMiddle);
        }
      }
    }

    // Check gap before first range
    if (sortedRanges.length > 0) {
      const firstRange = sortedRanges[0];
      if (firstRange.start > startId) {
        const gapStart = startId;
        const gapEnd = firstRange.start - 1;
        const gapMiddle = Math.floor((gapStart + gapEnd) / 2);
        gapSeeds.push(gapMiddle);
      }
    }

    // Check gap after last range
    if (sortedRanges.length > 0) {
      const lastRange = sortedRanges[sortedRanges.length - 1];
      if (lastRange.end < endId) {
        const gapStart = lastRange.end + 1;
        const gapEnd = endId;
        const gapMiddle = Math.floor((gapStart + gapEnd) / 2);
        gapSeeds.push(gapMiddle);
      }
    } else {
      // No ranges at all - seed the middle of the entire target range
      const gapMiddle = Math.floor((startId + endId) / 2);
      gapSeeds.push(gapMiddle);
    }

    return gapSeeds.filter(seed => seed >= startId && seed <= endId);
  }

  /**
   * Find contiguous range of valid manuals using binary search
   */
  private async findValidRange(baseUrl: string, seedId: number, minId: number, maxId: number, existingFiles: Set<number>, checked: Set<number>): Promise<number[]> {
    // Binary search to find the lower bound
    let lowerBound = minId;
    let upperBound = Math.min(seedId, maxId);

    // Find start of range (search downwards from seed)
    while (lowerBound <= upperBound) {
      const mid = Math.floor((lowerBound + upperBound) / 2);
      if (mid <= 0 || existingFiles.has(mid) || checked.has(mid)) {
        lowerBound = mid + 1;
        continue;
      }

      checked.add(mid);
      if (await this.testUrl(baseUrl + mid + '/')) {
        upperBound = mid - 1;
      } else {
        lowerBound = mid + 1;
      }
    }
    const rangeStart = lowerBound;

    // Find end of range (search upwards from seed)
    lowerBound = Math.max(seedId, minId);
    upperBound = maxId;

    while (lowerBound <= upperBound) {
      const mid = Math.floor((lowerBound + upperBound) / 2);
      if (mid > maxId || existingFiles.has(mid) || checked.has(mid)) {
        upperBound = mid - 1;
        continue;
      }

      checked.add(mid);
      if (await this.testUrl(baseUrl + mid + '/')) {
        lowerBound = mid + 1;
      } else {
        upperBound = mid - 1;
      }
    }
    const rangeEnd = upperBound;

    // Collect all IDs in the found range
    const range: number[] = [];
    for (let id = Math.max(rangeStart, minId); id <= Math.min(rangeEnd, maxId); id++) {
      if (!existingFiles.has(id) && !checked.has(id)) {
        checked.add(id);
        if (await this.testUrl(baseUrl + id + '/')) {
          range.push(id);
        }
      }
    }

    if (range.length > 0) {
      console.log(`   📍 Found range ${range[0]}-${range[range.length - 1]} (${range.length} manuals)`);
    }

    return range;
  }

  /**
   * Test if URL contains valid manual content
   */
  private async testUrl(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, {
        method: 'HEAD', // Fast check first
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ManualDownloader/1.0)'
        }
      });

      if (response.ok) {
        return true;
      }

      // If HEAD fails, try GET (some servers don't support HEAD)
      const getResponse = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ManualDownloader/1.0)',
          'Accept': 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8'
        }
      });

      if (getResponse.ok) {
        const data = await getResponse.text();
        return data.length > 1000 && (data.includes('<html') || data.includes('<!DOCTYPE'));
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Smart adaptive waiting
   */
  private async smartWait(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, this.adaptiveDelay));
  }

  /**
   * Optimize delay based on success/failure patterns
   */
  private optimizeDelay(success: boolean): void {
    if (success) {
      // On success, gradually reduce delay
      if (this.consecutiveSuccesses >= 3 && this.adaptiveDelay > 50) {
        this.adaptiveDelay = Math.max(50, this.adaptiveDelay * 0.9);
      }
    } else {
      // On error, increase delay
      if (this.consecutiveErrors >= 2) {
        this.adaptiveDelay = Math.min(8000, this.adaptiveDelay * 1.5);
      }
    }
  }

  /**
   * Get current average delay
   */
  private getAverageDelay(): number {
    return this.adaptiveDelay;
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

          if (idStr.length === oldPadding && /^\d+$/.test(idStr)) {
            const paddedId = idStr.padStart(newPadding, '0');
            const oldPath = join(outputDir, file);
            const newPath = join(outputDir, `${paddedId}.html`);

            await fs.rename(oldPath, newPath);
          }
        }
      }
    } catch (error) {
      console.log(`⚠️ Error padding files: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// CLI usage
if (require.main === module) {
  const downloader = new Downloader();
  const args = process.argv.slice(2);
  const options: DownloaderOptions = {};

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
Smart Manual Downloader - Intelligent Bandai Manual Discovery and Download

USAGE:
  downloader [OPTIONS]

OPTIONS:
  -s, --start <id>      Start from this ID (default: 1)
  -e, --end <id>        End at this ID (default: 10000)
  -u, --url <url>       Base URL for manual pages
  -o, --output <dir>    Output directory (default: ./data/bandai/manuals)
  -h, --help            Show this help

EXAMPLES:
  downloader --start 650 --end 700
  downloader --end 100 --output ./manuals
  downloader --start 1 --end 10000 --url https://example.com/detail/

FEATURES:
  • Gap-based discovery: only searches between existing manual ranges
  • Binary search expansion: finds new ranges efficiently from gap seed points
  • Adaptive speed: starts fast, slows on issues automatically
  • Zero-padding: files sort correctly (099.html, 100.html, 101.html)
  • Real-time progress: see current ID and success/failure counts
  • Self-optimizing: learns optimal delays based on server response

INTELLIGENCE:
  • Analyzes existing files to identify contiguous ranges
  • Places search seeds only in gaps between known ranges
  • Eliminates redundant searches over already-downloaded content
  • Falls back to linear scan only when no existing files found
  • Much faster than brute force by focusing on unknown territories
        `);
        process.exit(0);
    }
  }

  downloader.download(options).catch(console.error);
}

