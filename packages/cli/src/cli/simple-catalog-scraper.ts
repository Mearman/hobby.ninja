import { chromium } from 'playwright';

/**
 * Minimal catalog scraper for Bandai Hobby pages
 * Handles static HTML pages that require browser headers to bypass anti-bot protection
 */

export interface SimpleCatalogResult {
	url: string;
	range: string;
	title: string;
	productName?: string | undefined;
	price?: string | undefined;
	releaseDate?: string | undefined;
	series?: string | undefined;
	hasContent: boolean;
	html?: string;
}

export class SimpleCatalogScraper {
	private browser: any;
	private context: any;

	async initialize() {
		this.browser = await chromium.launch({
			headless: true,
			args: ['--no-sandbox', '--disable-setuid-sandbox']
		});
		this.context = await this.browser.newContext({
			userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
			extraHTTPHeaders: {
				'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
				'Accept-Language': 'en-US,en;q=0.5',
				'Accept-Encoding': 'gzip, deflate, br',
				'Connection': 'keep-alive',
				'Upgrade-Insecure-Requests': '1'
			}
		});
	}

	async cleanup() {
		if (this.context) {
			await this.context.close();
		}
		if (this.browser) {
			await this.browser.close();
		}
	}

	async extractFromPage(range: string, url: string): Promise<SimpleCatalogResult> {
		const page = await this.context.newPage();

		try {
			await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });

			const title = await page.title();
			const html = await page.content();

			// Check if this is a 404 or invalid page
			if (title.includes('404') || title.includes('NOT FOUND')) {
				return {
					url,
					range,
					title,
					hasContent: false,
					html
				};
			}

			// Extract product information using page selectors
			let productName: string | undefined;
			let price: string | undefined;
			let releaseDate: string | undefined;
			let series: string | undefined;

			try {
				// Product name (usually in h1 with product class)
				productName = await page.locator('h1.p-heading__h1-product').first().textContent().catch(() => undefined);
				if (!productName) {
					productName = await page.locator('h1').first().textContent().catch(() => undefined);
				}
			} catch {}

			try {
				// Price information
				price = await page.locator('[class*="price"]').first().textContent().catch(() => undefined);
			} catch {}

			try {
				// Release date
				releaseDate = await page.locator('[class*="release"], [class*="date"]').first().textContent().catch(() => undefined);
			} catch {}

			try {
				// Series information
				series = await page.locator('[class*="series"]').first().textContent().catch(() => undefined);
			} catch {}

			const hasContent = !!(productName || price || releaseDate || series);

			return {
				url,
				range,
				title,
				productName: productName?.trim(),
				price: price?.trim(),
				releaseDate: releaseDate?.trim(),
				series: series?.trim(),
				hasContent,
				html
			};

		} catch (error) {
			throw new Error(`Failed to extract from ${url}: ${error instanceof Error ? error.message : String(error)}`);
		} finally {
			await page.close();
		}
	}
}