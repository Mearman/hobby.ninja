/**
 * HTTP client utilities and browser management for scraping operations
 */

import { chromium, Browser, BrowserContext, Route } from "playwright";

import {
	FETCH_TIMEOUT_MS,
	MAX_FETCH_RETRIES,
	RETRY_DELAY_MS,
	UNKNOWN_ERROR,
} from "./types.js";

// ============================================================================
// HTTP Utilities
// ============================================================================

/**
 * Execute a promise with a hard timeout
 * @param promise - The promise to execute
 * @param timeoutMs - Timeout in milliseconds
 * @param timeoutMsg - Error message on timeout
 * @returns The promise result or throws on timeout
 */
export async function withTimeout<T>(
	promise: Promise<T>,
	timeoutMs: number,
	timeoutMsg = "Operation timed out",
): Promise<T> {
	let timeoutId: ReturnType<typeof setTimeout>;
	const timeoutPromise = new Promise<never>((_, reject) => {
		timeoutId = setTimeout(() => { reject(new Error(timeoutMsg)); }, timeoutMs);
	});

	try {
		return await Promise.race([promise, timeoutPromise]);
	} finally {
		clearTimeout(timeoutId!);
	}
}

/**
 * Fetch with timeout and retry logic
 * Uses hard timeout that covers the entire operation including body reading
 * @param url - URL to fetch
 * @param options - Fetch options
 * @param maxRetries - Maximum number of retries (default: MAX_FETCH_RETRIES)
 * @returns Response object
 * @throws Error if all retries fail
 */
export async function fetchWithRetry(
	url: string,
	options: RequestInit,
	maxRetries = MAX_FETCH_RETRIES,
): Promise<Response> {
	let lastError: Error | undefined;

	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			const response = await withTimeout(
				fetch(url, options),
				FETCH_TIMEOUT_MS,
				`Fetch timeout after ${FETCH_TIMEOUT_MS}ms`,
			);
			return response;
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(UNKNOWN_ERROR);
			const isTimeout = lastError.message.includes("timeout") || lastError.message.includes("Timeout");
			const isAbort = lastError.name === "AbortError";

			if (attempt < maxRetries && (isTimeout || isAbort)) {
				const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1); // Exponential backoff
				console.log(`    Retry ${attempt}/${maxRetries} after ${delay}ms (${lastError.message})`);
				await new Promise(resolve => setTimeout(resolve, delay));
			} else {
				// Throw on final attempt OR non-retryable errors
				throw lastError;
			}
		}
	}

	throw lastError ?? new Error("Fetch failed after retries");
}

// ============================================================================
// Browser Management
// ============================================================================

/**
 * Manages Playwright browser instance lifecycle for scraping operations
 */
export class BrowserManager {
	private browser: Browser | null = null;
	private browserContext: BrowserContext | null = null;

	/**
	 * Initialize Playwright browser with configured settings
	 * - Headless mode enabled
	 * - Resource blocking for images, stylesheets, fonts, media
	 * - Japanese language preference
	 */
	async initializeBrowser(): Promise<void> {
		this.browser = await chromium.launch({
			headless: true,
			args: ["--no-sandbox", "--disable-setuid-sandbox"],
		});
		this.browserContext = await this.browser.newContext({
			userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
			extraHTTPHeaders: {
				"Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
				"Accept-Language": "ja,en-US,en;q=0.5",
			},
		});

		// Block unnecessary resources to speed up page loads
		await this.browserContext.route("**/*", (route: Route) => {
			const resourceType = route.request().resourceType();
			if (["image", "stylesheet", "font", "media"].includes(resourceType)) {
				return route.abort();
			}
			return route.continue();
		});
	}

	/**
	 * Clean up browser resources
	 * Closes browser context and browser instance
	 */
	async cleanupBrowser(): Promise<void> {
		if (this.browserContext) {
			await this.browserContext.close();
			this.browserContext = null;
		}
		if (this.browser) {
			await this.browser.close();
			this.browser = null;
		}
	}

	/**
	 * Get the current browser context
	 * @returns BrowserContext instance or null if not initialized
	 */
	getBrowserContext(): BrowserContext | null {
		return this.browserContext;
	}

	/**
	 * Fetch page content using Playwright
	 * Handles JavaScript-rendered pages that regular fetch cannot handle
	 * @param url - URL to fetch
	 * @returns Page HTML content
	 * @throws Error if browser not initialized or page not found
	 */
	async fetchPageWithPlaywright(url: string): Promise<string> {
		if (!this.browserContext) {
			throw new Error("Browser not initialized. Call initializeBrowser() first.");
		}

		const page = await this.browserContext.newPage();
		try {
			await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });

			// Check for 404 page
			const title = await page.title();
			if (title.includes("404") || title.includes("NOT FOUND")) {
				throw new Error("Page not found (404)");
			}

			return await page.content();
		} finally {
			await page.close();
		}
	}

	/**
	 * Extract article image URLs after triggering lazy-load
	 * Article images use data-src for lazy loading - need to scroll and wait
	 * @param url - Page URL to extract images from
	 * @returns Array of loaded image URLs
	 */
	async extractArticleImageUrls(url: string): Promise<string[]> {
		if (!this.browserContext) {
			throw new Error("Browser not initialized. Call initializeBrowser() first.");
		}

		const page = await this.browserContext.newPage();
		try {
			await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });

			// Extract article image URLs after scrolling to trigger lazy-load
			const imageUrls = await page.evaluate(async () => {
				const LAZY_LOAD_WAIT_MS = 2000;
				const urls: string[] = [];

				// Find article section and scroll to it
				const articleSection = document.querySelector(".pg-products__article");
				if (!articleSection) {
					return urls;
				}

				// Scroll article into view to trigger lazy loading
				articleSection.scrollIntoView({ behavior: "instant" });
				await new Promise(resolve => setTimeout(resolve, LAZY_LOAD_WAIT_MS));

				// Extract loaded image URLs (src, not data-src)
				const images = articleSection.querySelectorAll("img");
				for (const img of images) {
					const src = img.src;
					// Only include fully loaded http URLs (not data: or relative paths)
					if (src && src.startsWith("http") && !src.includes("/common/")) {
						urls.push(src);
					}
				}

				return urls;
			});

			return imageUrls;
		} finally {
			await page.close();
		}
	}
}
