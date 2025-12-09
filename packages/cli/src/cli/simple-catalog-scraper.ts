import { chromium, Browser, BrowserContext, Route } from "playwright";

/**
 * Minimal catalog scraper for Bandai Hobby pages
 * Handles static HTML pages that require browser headers to bypass anti-bot protection
 */

export interface SimpleCatalogResult {
	url: string;
	range: string;
	title: string;
	hasContent: boolean;
	html: string;
}

export class SimpleCatalogScraper {
	private browser: Browser | null = null;
	private context: BrowserContext | null = null;

	async initialize() {
		this.browser = await chromium.launch({
			headless: true,
			args: ["--no-sandbox", "--disable-setuid-sandbox"],
		});
		this.context = await this.browser.newContext({
			userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
			extraHTTPHeaders: {
				"Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
				"Accept-Language": "en-US,en;q=0.5",
				"Accept-Encoding": "gzip, deflate, br",
				"Connection": "keep-alive",
				"Upgrade-Insecure-Requests": "1",
			},
		});

		// Block unnecessary resources to speed up page loads (we only need HTML)
		// Note: Don't block 'script' as some pages need JS for initial render
		await this.context.route("**/*", (route: Route) => {
			const resourceType = route.request().resourceType();
			if (["image", "stylesheet", "font", "media"].includes(resourceType)) {
				return route.abort();
			}
			return route.continue();
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
		if (!this.context) {
			throw new Error("Browser context not initialized. Call initialize() first.");
		}
		const page = await this.context.newPage();

		try {
			await page.goto(url, { waitUntil: "domcontentloaded", timeout: 10_000 });

			const title = await page.title();
			const html = await page.content();

			// Check if this is a 404 or invalid page
			const hasContent = !title.includes("404") && !title.includes("NOT FOUND");

			return {
				url,
				range,
				title,
				hasContent,
				html,
			};

		} catch (error) {
			throw new Error(`Failed to extract from ${url}: ${error instanceof Error ? error.message : String(error)}`);
		} finally {
			await page.close();
		}
	}
}