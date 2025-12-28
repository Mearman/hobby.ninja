/**
 * HTTP client utilities and browser management for scraping operations
 */

import { chromium, firefox, Browser, BrowserContext, Route } from "playwright";

import {
	BROWSER_NOT_INITIALIZED,
	CLOUDFRONT_DOMAIN,
	FETCH_TIMEOUT_MS,
	HTTP_FORBIDDEN,
	HTTP_OK,
	LAZY_LOAD_EXTRA_WAIT_MS,
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
	private capturedImages = new Map<string, Buffer>();

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
		if (!this.browser) {
			throw new Error(BROWSER_NOT_INITIALIZED);
		}

		const page = await this.browserContext!.newPage();
		try {
			await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });

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
	 * Article images use data-src for lazy loading - need to scroll and poll until loaded
	 * @param url - Page URL to extract images from
	 * @returns Array of loaded image URLs
	 */
	async extractArticleImageUrls(url: string): Promise<string[]> {
		if (!this.browserContext) {
			throw new Error(BROWSER_NOT_INITIALIZED);
		}

		const page = await this.browserContext.newPage();
		try {
			await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });

			// Extract article image URLs by scrolling and polling until lazy-load completes
			const imageUrls = await page.evaluate(async () => {
				const MAX_WAIT_MS = 5000;
				const POLL_INTERVAL_MS = 100;

				// Find article section
				const articleSection = document.querySelector(".pg-products__article");
				if (!articleSection) {
					return [];
				}

				// Find lazy-loaded images (have data-src attribute)
				const lazyImages =
					articleSection.querySelectorAll<HTMLImageElement>("img[data-src]");
				if (lazyImages.length === 0) {
					return [];
				}

				// Scroll article into view to trigger lazy loading
				articleSection.scrollIntoView({ behavior: "instant" });

				// Poll until images have loaded src URLs (not data: or empty)
				const startTime = Date.now();
				while (Date.now() - startTime < MAX_WAIT_MS) {
					const loadedUrls: string[] = [];
					for (const img of lazyImages) {
						const src = img.src;
						if (src.startsWith("http") && !src.includes("/common/")) {
							loadedUrls.push(src);
						}
					}

					// Return once we have at least one loaded image
					if (loadedUrls.length > 0) {
						return loadedUrls;
					}

					await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
				}

				return []; // Timeout - no images loaded
			});

			return imageUrls;
		} finally {
			await page.close();
		}
	}

	/**
	 * Get a captured image by filename
	 * @param filename - The image filename (without path)
	 * @returns Buffer if found, undefined otherwise
	 */
	getCapturedImage(filename: string): Buffer | undefined {
		return this.capturedImages.get(filename);
	}

	/**
	 * Clear all captured images
	 */
	clearCapturedImages(): void {
		this.capturedImages.clear();
	}

	/**
	 * Fetch page and capture CloudFront images by downloading them in the same session
	 * CloudFront signed URLs are only valid in the session that loaded the page
	 * @param url - Page URL to load
	 * @returns Page HTML content
	 */
	async fetchPageWithImageCapture(url: string): Promise<string> {
		if (!this.browser) {
			throw new Error(BROWSER_NOT_INITIALIZED);
		}

		// Use Firefox which doesn't have ORB (Opaque Response Blocking)
		// This allows images to load and be extracted via canvas
		const imageBrowser = await firefox.launch({
			headless: true,
		});

		// Create a context that allows images (main context blocks them for speed)
		// Use full browser-like headers including sec-fetch headers
		const imageContext = await imageBrowser.newContext({
			userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
			extraHTTPHeaders: {
				"Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
				"Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
				"Accept-Encoding": "gzip, deflate, br, zstd",
				"Cache-Control": "no-cache",
				"Pragma": "no-cache",
				"sec-ch-ua": "\"Google Chrome\";v=\"131\", \"Chromium\";v=\"131\", \"Not_A Brand\";v=\"24\"",
				"sec-ch-ua-mobile": "?0",
				"sec-ch-ua-platform": "\"macOS\"",
				"Upgrade-Insecure-Requests": "1",
			},
			bypassCSP: true,
		});

		const page = await imageContext.newPage();

		// Capture CloudFront image responses directly from network
		// This avoids canvas tainting issues with cross-origin images
		page.on("response", async response => {
			const responseUrl = response.url();
			if (responseUrl.includes(CLOUDFRONT_DOMAIN) && responseUrl.includes("/product/")) {
				const status = response.status();
				if (status === HTTP_OK) {
					try {
						// Extract filename from URL
						const urlObj = new URL(responseUrl);
						const filename = urlObj.pathname.split("/").pop() ?? "";
						if (filename && !this.capturedImages.has(filename)) {
							const body = await response.body();
							this.capturedImages.set(filename, body);
							console.log(`    [Captured] ${filename} (${body.length} bytes)`);
						}
					} catch (error) {
						console.log(`    [Network] Failed to capture: ${error instanceof Error ? error.message : String(error)}`);
					}
				} else if (status === HTTP_FORBIDDEN) {
					let bodyPreview = "";
					try {
						const body = await response.text();
						bodyPreview = ` - ${body.slice(0, 100)}`;
					} catch {
						// Response body may not be available
					}
					console.log(`    [Network] ${String(status)} ${responseUrl.slice(0, 70)}...${bodyPreview}`);
				}
			}
		});

		try {
			// Add cache-busting query parameter to force fresh signed URLs from origin
			// CDNs may cache pages with expired signed URLs; this bypasses that cache
			const cacheBustUrl = new URL(url);
			cacheBustUrl.searchParams.set("_t", Date.now().toString());
			console.log(`    [Cache] Bypassing CDN cache with timestamp param`);

			// Navigate and wait for DOM to be ready
			await page.goto(cacheBustUrl.toString(), { waitUntil: "domcontentloaded", timeout: 60_000 });
			// Then wait for network to settle
			await page.waitForLoadState("networkidle");

			// Scroll to trigger lazy loading
			await page.evaluate(async () => {
				const scrollStep = 500;
				const scrollDelay = 100;
				let currentPosition = 0;
				const maxScroll = document.body.scrollHeight;

				while (currentPosition < maxScroll) {
					window.scrollTo(0, currentPosition);
					currentPosition += scrollStep;
					await new Promise(r => setTimeout(r, scrollDelay));
				}
				window.scrollTo(0, 0);
			});

			// Debug: check what images are in DOM immediately after scroll
			const domInfo = await page.evaluate(() => {
				const imgs = document.querySelectorAll("img");
				const cfImages = [...imgs].filter(img =>
					(img).src.includes("cloudfront.net"),
				);
				return cfImages.map(img => ({
					src: (img).src.slice(0, 80),
					complete: (img).complete,
					naturalWidth: (img).naturalWidth,
				}));
			});
			console.log(`    [DOM] Found ${domInfo.length} CloudFront images:`);
			for (const img of domInfo.slice(0, 3)) {
				console.log(`      ${img.src}... complete=${String(img.complete)} width=${img.naturalWidth}`);
			}

			// Wait for lazy-loaded images - poll until at least one is loaded
			const maxWait = 10_000;
			const pollInterval = 500;
			let waited = 0;
			while (waited < maxWait) {
				const loadedCount = await page.evaluate(() => {
					const imgs = document.querySelectorAll("img");
					return [...imgs].filter(img => {
						const imgEl = img;
						return imgEl.src.includes("cloudfront.net") &&
							imgEl.src.includes("/product/") &&
							imgEl.complete &&
							imgEl.naturalWidth > 0;
					}).length;
				});
				if (loadedCount > 0) {
					console.log(`    [Wait] ${loadedCount} CloudFront images loaded after ${waited}ms`);
					break;
				}
				await page.waitForTimeout(pollInterval);
				waited += pollInterval;
			}

			// Extra wait for remaining lazy-loaded images to be captured via network
			await page.waitForTimeout(LAZY_LOAD_EXTRA_WAIT_MS);

			const html = await page.content();
			console.log(`    Captured ${this.capturedImages.size} CloudFront images via network interception`);

			return html;
		} finally {
			await page.close();
			await imageContext.close();
			await imageBrowser.close();
		}
	}
}
