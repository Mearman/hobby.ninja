/**
 * Basic Manual Downloader - No Complexities
 *
 * Just linear scan with basic fetch - this should work.
 */

import { promises as fs } from 'node:fs';
import { join } from 'node:path';

interface BasicOptions {
  startId?: number;
  endId?: number;
  url?: string;
  output?: string;
}

export class BasicDownloader {
  async download(options: BasicOptions = {}) {
    const startId = options.startId || 1;
    const endId = options.endId || 1000;
    const baseUrl = options.url || 'https://manual.bandai.hobby.net/menus/detail/';
    const outputDir = options.output || './data/bandai/manuals';

    console.log(`🚀 Starting BASIC download from ID ${startId} to ${endId}`);
    console.log(`📁 Output directory: ${outputDir}`);

    // Create output directory
    await fs.mkdir(outputDir, { recursive: true });

    let successCount = 0;
    let failCount = 0;
    let currentPadding = 1;

    for (let id = startId; id <= endId; id++) {
      try {
        const url = `${baseUrl}${id}/`;

        // Show progress
        process.stdout.write(`\r⏳ ID ${id}: ✓${successCount} ✗${failCount}`);

        // Basic fetch - no rate limiting, just direct requests
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          }
        });

        if (response.ok) {
          const data = await response.text();

          // Check if it's a real manual page (has substantial HTML content)
          if (data.length > 1000 && (data.includes('<html') || data.includes('<!DOCTYPE'))) {
            // Save with padding
            const paddedId = id.toString().padStart(currentPadding, '0');
            const filePath = join(outputDir, `${paddedId}.html`);
            await fs.writeFile(filePath, data, 'utf8');
            successCount++;

            // Handle padding for new power of 10
            const newPadding = id.toString().length;
            if (newPadding > currentPadding) {
              console.log(`\n📝 Padding files to ${newPadding} digits...`);
              await this.padExistingFiles(outputDir, currentPadding, newPadding);
              currentPadding = newPadding;
            }
          } else {
            failCount++;
          }
        } else {
          failCount++;
        }

      } catch (error) {
        failCount++;
        // Show real errors, not 404s
        if (!error.message.includes('404')) {
          console.log(`\n💥 Error on ID ${id}: ${error.message}`);
        }
      }
    }

    console.log(`\n✅ COMPLETE! Found ${successCount} manuals, ${failCount} not found`);
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
      console.log(`⚠️ Error padding files: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// CLI usage
if (require.main === module) {
  const downloader = new BasicDownloader();
  const args = process.argv.slice(2);
  const options: BasicOptions = {};

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
Basic Manual Downloader - Most Reliable Version

USAGE:
  basic-downloader [OPTIONS]

OPTIONS:
  -s, --start <id>      Start from this ID (default: 1)
  -e, --end <id>        End at this ID (default: 1000)
  -u, --url <url>       Base URL for manual pages
  -o, --output <dir>    Output directory (default: ./data/bandai/manuals)
  -h, --help            Show this help

EXAMPLES:
  basic-downloader --start 650 --end 700
  basic-downloader --end 100 --output ./manuals

FEATURES:
  • Simple direct fetch - no complex logic
  • Real-time progress display
  • Zero-padding for proper sorting
  • Most reliable approach
        `);
        process.exit(0);
    }
  }

  downloader.download(options).catch(console.error);
}