import { scrapers } from '@unnamed-gunpla-app/scrapers';
import { LanguageDetection } from '@unnamed-gunpla-app/utils';
import { promises as fs } from 'fs';
import path from 'path';

export interface SingleUrlOptions {
  url: string;
  output?: string;
  verbose?: boolean;
}

export interface SingleUrlResult {
  url: string;
  success: boolean;
  data?: any;
  language?: any;
  skus?: string[];
  error?: string;
  outputFile?: string;
}

export class SingleUrlCommand {
  async execute(options: SingleUrlOptions): Promise<SingleUrlResult> {
    const { url, output = './gundam-single-scrape', verbose = false } = options;

    if (!url) {
      throw new Error('URL is required');
    }

    try {
      if (verbose) {
        console.log(`🔍 Scraping data from: ${url}`);
      }

      // Detect source from URL
      let sourceType;
      if (url.includes('bandai-hobby.net/item/')) {
        sourceType = 'bandai-hobby';
      } else if (url.includes('manual.bandai-hobby.net')) {
        sourceType = 'hobbylink'; // Reuse hobbylink scraper for manual site
      } else if (url.includes('gundam.info')) {
        sourceType = 'gundam-info';
      } else {
        throw new Error('URL not from a supported source. Supported sources: bandai-hobby.net/item/*, manual.bandai-hobby.net/*, gundam.info/*');
      }

      // Get the appropriate scraper
      const scraper = scrapers[sourceType];
      if (!scraper) {
        throw new Error(`No scraper found for source type: ${sourceType}`);
      }

      // Fetch the webpage
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'GundamDataCollector/1.0 (Single URL Scraper)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'ja,en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
        },
        redirect: 'follow'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      if (verbose) {
        console.log(`📄 Retrieved ${html.length.toLocaleString()} characters`);
      }

      // Detect language
      const language = LanguageDetection.detect(html);
      if (verbose) {
        console.log(`🌍 Language: ${language.language} (${(language.confidence * 100).toFixed(1)}% confidence)`);
      }

      // Scrape data using the appropriate scraper
      if (verbose) {
        console.log(`🛠️  Using scraper: ${sourceType}`);
      }
      const scrapedData = await scraper.scrape(html, url);

      if (!scrapedData) {
        const result: SingleUrlResult = {
          url,
          success: true,
          language,
          skus: []
        };
        if (verbose) {
          console.log('⚠️  No data extracted from this page');
        }
        return result;
      }

      // Extract SKUs from the scraped data
      const identifiedSKUs = this.extractSKUsFromData(scrapedData);

      // Display results
      if (verbose) {
        console.log('\n📋 Scraping Results:');
        console.log(`   ✅ Name: ${scrapedData.name}`);
        console.log(`   ✅ Brand: ${scrapedData.brand}`);
        console.log(`   ✅ Source: ${scrapedData.source}`);
        console.log(`   ✅ Language: ${language.language}`);

        if (scrapedData.images && scrapedData.images.length > 0) {
          console.log(`   ✅ Images: ${scrapedData.images.length} found`);
        }

        if (identifiedSKUs.length > 0) {
          console.log(`   ✅ SKUs: ${identifiedSKUs.join(', ')}`);
        } else {
          console.log(`   ⚠️  No SKUs identified`);
        }
      }

      // Save the data
      const outputFile = await this.saveScrapedData(scrapedData, url, language, identifiedSKUs, output);

      if (verbose) {
        console.log(`\n💾 Data saved to: ${outputFile}`);
      }

      return {
        url,
        success: true,
        data: scrapedData,
        language,
        skus: identifiedSKUs,
        outputFile
      };

    } catch (error) {
      return {
        url,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private extractSKUsFromData(data: any): string[] {
    const skus = new Set<string>();

    // Extract from name
    if (data.name) {
      const nameSKUs = data.name.match(/(HG|MG|PG|RG|SD|RE\/?[0-9]*|MB|EG|MGEX)[^\s]*/gi);
      if (nameSKUs) {
        nameSKUs.forEach((sku: string) => skus.add(sku.trim()));
      }
    }

    // Extract from URL path
    if (data.url) {
      const urlSKUs = data.url.match(/\/(hg|mg|pg|rg|sd|re|mb|eg|mgex)[^\/]*\/?$/i);
      if (urlSKUs) {
        urlSKUs.forEach((sku: string) => skus.add(sku.toUpperCase()));
      }
    }

    return Array.from(skus).filter(sku => sku.length > 2);
  }

  private async saveScrapedData(
    data: any,
    url: string,
    language: any,
    identifiedSKUs: string[],
    outputDir: string
  ): Promise<string> {
    const urlFilename = this.cleanUrlForFilename(url);

    // Create base directory with timestamp
    const timestampedOutputDir = `${outputDir}-${new Date().toISOString().split('T')[0]}`;
    await fs.mkdir(timestampedOutputDir, { recursive: true });

    // Save the main scraped data
    const scrapedItem = {
      ...data,
      identifiedSKUs,
      language,
      scrapedAt: new Date().toISOString(),
      fileType: 'single-url-scrape'
    };

    // Save to language-specific directory
    const languageDir = path.join(timestampedOutputDir, language.language);
    await fs.mkdir(languageDir, { recursive: true });

    const dataFile = path.join(languageDir, `${urlFilename}.json`);
    await fs.writeFile(dataFile, JSON.stringify(scrapedItem, null, 2));

    // If SKUs found, create SKU-specific files
    if (identifiedSKUs.length > 0) {
      const skuDir = path.join(timestampedOutputDir, language.language, 'skus');
      await fs.mkdir(skuDir, { recursive: true });

      for (const sku of identifiedSKUs) {
        const skuFile = path.join(skuDir, `${sku.replace(/[^a-zA-Z0-9-_]/g, '_')}.json`);
        const skuData = {
          ...scrapedItem,
          primarySKU: sku,
          fileType: 'sku-specific'
        };

        await fs.writeFile(skuFile, JSON.stringify(skuData, null, 2));
      }
    }

    return path.relative(process.cwd(), dataFile);
  }

  private cleanUrlForFilename(url: string): string {
    try {
      const urlObj = new URL(url);
      let filename = urlObj.pathname;

      // Remove leading and trailing slashes
      filename = filename.replace(/^\/+|\/+$/g, '');

      // If no pathname, use the hostname
      if (!filename) {
        filename = urlObj.hostname;
      }

      // Replace filesystem-unsafe characters with safe alternatives
      filename = filename
        .replace(/[^a-zA-Z0-9-_\/]/g, '_') // Replace special chars with underscore
        .replace(/\/+/g, '-') // Replace path separators with dash
        .replace(/_+/g, '_') // Multiple underscores to single
        .replace(/^_|_$/g, '') // Remove leading/trailing underscores
        .toLowerCase();

      // Ensure filename is not empty and reasonably short
      if (!filename || filename.length < 3) {
        filename = `page-${Date.now()}`;
      }

      // Limit length to prevent filesystem issues
      if (filename.length > 100) {
        filename = filename.substring(0, 100).replace(/_-*$/, ''); // Remove trailing dashes/underscores
      }

      return filename;
    } catch (error) {
      // Fallback to timestamp if URL parsing fails
      return `page-${Date.now()}`;
    }
  }
}