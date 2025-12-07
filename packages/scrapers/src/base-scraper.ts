import type { GundamData } from "@hobby-ninja/types";
import { LanguageDetector, ProfileManager, RenderingDetector } from "@hobby-ninja/utils";
import type { CheerioAPI, Cheerio } from "cheerio";
import type { Element } from "domhandler";

const profileManager = new ProfileManager();


interface Logger {
  warn(message: string, ...args: unknown[]): void;
  log(message: string, ...args: unknown[]): void;
}

const logger: Logger = {
	warn: (message: string, ...args: unknown[]): void => {
		// In a real implementation, this would use a proper logging library
		 
		console.warn(message, ...args);
	},
	log: (message: string, ...args: unknown[]): void => {
		// In a real implementation, this would use a proper logging library
		 
		console.log(message, ...args);
	},
};

export abstract class BaseScraper {
	protected baseUrl: string;
	protected userAgent: string;
	protected delayMs: number;
	protected cacheEnabled: boolean;

	constructor(config: {
    baseUrl: string;
    userAgent?: string;
    delayMs?: number;
    cacheEnabled?: boolean;
  }) {
		this.baseUrl = config.baseUrl;
		this.userAgent = config.userAgent || "GundamDataScraper/1.0";
		this.delayMs = config.delayMs || 2000;
		this.cacheEnabled = config.cacheEnabled ?? true;

		// Initialize profile manager asynchronously
		this.initializeProfileManager().catch(error => {
			logger.warn("⚠️  Profile manager initialization failed:", error);
		});
	}

	private async initializeProfileManager(): Promise<void> {
		try {
			await profileManager.loadProfiles();
			logger.log("📊 Profile manager initialized");
		} catch (error) {
			logger.warn("⚠️  Profile manager initialization failed:", error);
		}
	}

  abstract extractFromPage(html: string, url: string): Promise<GundamData>;

  protected async fetchPage(url: string, options: {
    method?: "cheerio" | "playwright";
    useCache?: boolean;
  } = {}): Promise<{ html: string; method: "cheerio" | "playwright" }> {
  	const method = options.method || await this.determineOptimalMethod(url);
  	const useCache = options.useCache ?? this.cacheEnabled;

  	if (useCache) {
  		const cached = await this.getCachedPage(url);
  		if (cached) {
  			return { html: cached, method: "cheerio" };
  		}
  	}

  	const html = await (method === "playwright" ? this.fetchWithPlaywright(url) : this.fetchWithCheerio(url));

  	if (useCache) {
  		await this.cachePage(url, html, method);
  	}

  	await this.delay();

  	return { html, method };
  }

  protected async determineOptimalMethod(url: string): Promise<"cheerio" | "playwright"> {
  	// Check if we have a cached profile for this URL pattern
  	const profile = profileManager.getProfileForUrl(url);
  	if (profile) {
  		logger.log(`✅ Using cached profile: ${profile.name} (extraction: ${profile.extractionMethod})`);

  		// Update the profile to indicate we've used it
  		const profilePattern = profileManager.getProfileForUrl(url)?.urlPattern;
  		const profileKey = typeof profilePattern === "string" ? profilePattern : String(profilePattern);
  		await profileManager.updateProfilePerformance(
  			profileKey,
  			true,
  			Date.now(), // This will be updated after actual extraction
  		);

  		return profile.requiresPlaywright ? "playwright" : "cheerio";
  	}

  	// Perform progressive enhancement analysis and build a new profile
  	try {
  		logger.log(`🔍 Analyzing ${url} to build profile...`);
  		const sampleHtml = await this.fetchWithCheerio(url);
  		const analysis = RenderingDetector.analyzeProgressiveEnhancement(sampleHtml);

  		if (analysis.recommendation === "dynamic-required") {
  			// Build profile for this URL pattern
  			await profileManager.buildProfileForUrl(url, [url]);
  			return "playwright";
  		} else if (analysis.recommendation === "hybrid-approach") {
  			// For hybrid, test with Playwright to be safe
  			await profileManager.buildProfileForUrl(url, [url]);
  			return "playwright";
  		}

  		// Build profile for static content
  		await profileManager.buildProfileForUrl(url, [url]);
  		return "cheerio";
  	} catch (error) {
  		logger.warn(`Error determining method for ${url}, falling back to Cheerio:`, error);
  		return "cheerio";
  	}
  }

  protected async fetchWithCheerio(url: string): Promise<string> {
  	try {
  		const response = await fetch(url, {
  			headers: {
  				"User-Agent": this.userAgent,
  				"Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  				"Accept-Language": "ja,en-US,en;q=0.9",
  				"Cache-Control": "no-cache",
  			},
  		});

  		if (!response.ok) {
  			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  		}

  		return await response.text();
  	} catch (error) {
  		throw new Error(`Failed to fetch ${url}: ${error instanceof Error ? error.message : "Unknown error"}`);
  	}
  }

  protected async fetchWithPlaywright(url: string): Promise<string> {
  	// Placeholder for Playwright implementation
  	// In a real implementation, this would use Playwright to fetch and render the page
  	logger.log(`Playwright fetch not yet implemented for: ${url}`);
  	return this.fetchWithCheerio(url);
  }

  protected parseLanguage(html: string, url: string, headers?: Record<string, string>) {
  	return LanguageDetector.detectFromHtml(html, url, headers);
  }

  protected async cachePage(_url: string, _html: string, _method: "cheerio" | "playwright"): Promise<void> {
  	// Placeholder for caching implementation
  	// Will be implemented in the cache manager utility
  }

  protected async getCachedPage(_url: string): Promise<string | null> {
  	// Placeholder for cache retrieval
  	// Will be implemented in the cache manager utility
  	return null;
  }

  
  protected generateId(source: string, identifier: string): string {
  	const hash = this.simpleHash(`${source}:${identifier}`);
  	return `${source}:${identifier}:${hash}`;
  }

  protected simpleHash(str: string): string {
  	let hash = 0;
  	for (let i = 0; i < str.length; i++) {
  		const char = str.codePointAt(i) ?? 0;
  		hash = ((hash << 5) - hash) + char;
  		hash = hash & hash; // Convert to 32-bit integer
  	}
  	return Math.abs(hash).toString(16);
  }

  protected delay(): Promise<void> {
  	return new Promise(resolve => {
  		setTimeout(resolve, this.delayMs);
  	});
  }

  protected extractTextContent($: CheerioAPI, selector: string): string {
  	const element = $(selector);
  	return element.length > 0 ? element.first().text().trim() : "";
  }

  protected extractTextContentFromElement($: Cheerio<Element>): string {
  	return $?.text()?.trim() || "";
  }

  protected extractAttribute($: CheerioAPI, selector: string, attribute: string): string {
  	const element = $(selector);
  	return element.length > 0 ? element.first().attr(attribute) || "" : "";
  }

  protected extractAttributeFromElement($: Cheerio<Element>, attribute: string): string {
  	return $?.first()?.attr(attribute) || "";
  }

  protected extractNumber($: CheerioAPI, selector: string): number | null {
  	const text = this.extractTextContent($, selector);
  	const match = text.match(/[\d,]+/g);
  	if (match) {
  		const clean = match[0].replaceAll(/[^\d]/g, "");
  		return Number.parseInt(clean, 10);
  	}
  	return null;
  }

  protected extractPrice($: CheerioAPI, selector: string): { amount: number; currency: string; originalText: string } | null {
  	const text = this.extractTextContent($, selector);
  	const priceMatch = /([¥$£€])\s*([\d,]+)/.exec(text);

  	if (priceMatch) {
  		const [, currency, amountStr] = priceMatch;
  		const amount = Number.parseInt(amountStr?.replaceAll(/[^\d]/g, "") || "", 10);
  		return {
  			amount,
  			currency: currency === "¥" ? "JPY" : "USD",
  			originalText: text,
  		};
  	}

  	return null;
  }
}