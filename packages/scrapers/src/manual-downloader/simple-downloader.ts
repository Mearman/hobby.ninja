/**
 * Simple Manual Downloader - No Sessions, Just IDs
 *
 * Start from an ID, increment, download if exists. That's it.
 */

import { HttpClient } from './services/http-client';
import { RateLimiterService } from './services/rate-limiter-service';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';

interface SimpleOptions {
  startId?: number;
  endId?: number;
  url?: string;
  output?: string;
}

export class SimpleDownloader {
  private httpClient: HttpClient;
  private rateLimiter: RateLimiterService;

  constructor() {
    this.httpClient = new HttpClient();
    this.rateLimiter = new RateLimiterService();
  }

  async download(options: SimpleOptions = {}) {
    const startId = options.startId || 1;
    const endId = options.endId || 1000; // Reasonable default
    const baseUrl = options.url || 'https://manual.bandai-hobby.net/menus/detail/';
    const outputDir = options.output || './data/bandai/manuals';

    console.log(`🚀 Starting simple download from ID ${startId} to ${endId}`);
    console.log(`📁 Output directory: ${outputDir}`);

    // Create output directory
    await fs.mkdir(outputDir, { recursive: true });

    let successCount = 0;
    let failCount = 0;
    let currentPadding = 1; // Start with 1 digit (1-9)

    for (let id = startId; id <= endId; id++) {
      try {
        const url = `${baseUrl}${id}/`;

        // Show progress
        process.stdout.write(`\r⏳ Checking ID ${id}... ✓${successCount} ✗${failCount}`);

        // Rate limit
        await this.rateLimiter.wait();

        // Check if manual exists
        const response = await this.httpClient.get(url, { timeout: 10000 });

        if (response.statusCode === 200 && response.data && response.data.length > 1000) {
          // Success! Save the file with current padding
          const paddedId = id.toString().padStart(currentPadding, '0');
          const filePath = join(outputDir, `${paddedId}.html`);
          await fs.writeFile(filePath, response.data, 'utf8');
          successCount++;

          // Check if we hit a new power of 10 and need to pad existing files
          const newPadding = id.toString().length;
          if (newPadding > currentPadding) {
            console.log(`\n📝 Padding existing files to ${newPadding} digits...`);
            await this.padExistingFiles(outputDir, currentPadding, newPadding);
            currentPadding = newPadding;
          }
        } else {
          failCount++;
        }

      } catch (error) {
        failCount++;
        // Don't log every single 404, that's normal
        if (!error.message.includes('404') && !error.message.includes('Not Found')) {
          console.log(`\n⚠️  Error checking ID ${id}: ${error.message}`);
        }
      }
    }

    console.log(`\n✅ Complete! Found ${successCount} manuals, ${failCount} not found`);
    console.log(`📁 Files saved to: ${outputDir}`);
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