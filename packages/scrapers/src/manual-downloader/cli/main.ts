/**
 * Simple CLI for Manual Downloader
 */

import { Downloader } from '../downloader';

export class ManualDownloaderCLI {
  private downloader: Downloader;

  constructor() {
    this.downloader = new Downloader();
  }

  async run(args: string[]): Promise<void> {
    const options: any = {};

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
Bandai Manual Content Downloader - Simple Version

USAGE:
  manual-downloader [OPTIONS]

OPTIONS:
  -s, --start <id>      Start from this ID (default: 1)
  -e, --end <id>        End at this ID (default: 1000)
  -u, --url <url>       Base URL for manual pages
  -o, --output <dir>    Output directory (default: ./data/bandai/manuals)
  -h, --help            Show this help

EXAMPLES:
  manual-downloader --start 650 --end 700
  manual-downloader --start 1 --end 100 --output ./manuals

FEATURES:
  • Simple ID incrementing - no complex sessions
  • Real-time progress display
  • Automatic rate limiting for Japanese sites
  • Continue from any ID by specifying --start
          `);
          return;
      }
    }

    await this.downloader.download(options);
  }
}

export async function main(): Promise<void> {
  const cli = new ManualDownloaderCLI();
  const args = process.argv.slice(2);

  try {
    await cli.run(args);
  } catch (error) {
    console.error('❌ Download failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}