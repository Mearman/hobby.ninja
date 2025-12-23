import { promises as fs } from "node:fs";
import path from "node:path";

 
import { PageTypeProfile, ProfileCache, ProfileGenerationResult } from "../types/profile-types.js";

import { CacheManager } from "./cache-manager.js";
import { LanguageDetector } from "./language-detection.js";
import { RenderingDetector, RenderingDetection } from "./rendering-detection.js";

export interface ProfileManagerOptions {
  profileCachePath?: string;
  enableAutoUpdate?: boolean;
  updateInterval?: number; // hours
  fallbackToPlaywright?: boolean;
}

// Constants
const DEFAULT_UPDATE_INTERVAL_HOURS = 24;
const MIN_TIMEOUT_MS = 5000;
const BASE_CONFIDENCE = 0.5;
const CONFIDENCE_INCREASE_RENDERING = 0.2;
const CONFIDENCE_INCREASE_LANGUAGE = 0.2;
const CONFIDENCE_INCREASE_SAMPLES = 0.1;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const MILLISECONDS_PER_SECOND = 1000;
const MILLISECONDS_PER_HOUR = SECONDS_PER_MINUTE * MINUTES_PER_HOUR * MILLISECONDS_PER_SECOND;
const HOURS_PER_ATTEMPT_ESTIMATE = 2;
const LANGUAGE_THRESHOLD = 0.8;
const TIMEOUT_MULTIPLIER = 2;

export class ProfileManager {
	private profileCachePath: string;
	private enableAutoUpdate: boolean;
	private updateInterval: number;
	private fallbackToPlaywright: boolean;
	private cacheManager: CacheManager;
	private profileCache: ProfileCache;

	constructor(options: ProfileManagerOptions = {}) {
		this.profileCachePath = options.profileCachePath ??
      path.join(process.cwd(), ".gundam-scraper-profiles.json");
		this.enableAutoUpdate = options.enableAutoUpdate ?? true;
		this.updateInterval = options.updateInterval ?? DEFAULT_UPDATE_INTERVAL_HOURS;
		this.fallbackToPlaywright = options.fallbackToPlaywright ?? true;
		this.cacheManager = new CacheManager();
		this.profileCache = this.initializeProfileCache();
	}

	private initializeProfileCache(): ProfileCache {
		return {
			profiles: new Map(),
			globalConfig: {
				enableAutoUpdate: this.enableAutoUpdate,
				updateInterval: this.updateInterval,
				fallbackToPlaywright: this.fallbackToPlaywright,
				performanceTracking: true,
			},
			statistics: {
				totalProfiles: 0,
				staticOnlyProfiles: 0,
				dynamicProfiles: 0,
				lastUpdated: Date.now(),
			},
		};
	}

	async loadProfiles(): Promise<void> {
		try {
			const data = await fs.readFile(this.profileCachePath, "utf8");
			const cacheData: unknown = JSON.parse(data);

			// Convert profiles object back to Map
			if (typeof cacheData === "object" && cacheData !== null && "profiles" in cacheData) {
				const profilesData = (cacheData as { profiles?: Record<string, PageTypeProfile> }).profiles ?? {};
				this.profileCache = {
					...(cacheData as unknown as Omit<ProfileCache, "profiles">),
					profiles: new Map(Object.entries(profilesData)),
				};
			} else {
				this.profileCache = this.initializeProfileCache();
			}

			console.log(`✅ Loaded ${this.profileCache.profiles.size} profiles from cache`);
		} catch {
			console.log("📝 No existing profile cache found, starting fresh");
			this.profileCache = this.initializeProfileCache();
		}
	}

	async saveProfiles(): Promise<void> {
		try {
			const cacheData = {
				...this.profileCache,
				profiles: Object.fromEntries(this.profileCache.profiles),
			};

			await fs.writeFile(this.profileCachePath, JSON.stringify(cacheData, null, 2));
			console.log(`💾 Saved ${this.profileCache.profiles.size} profiles to cache`);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			console.error(`❌ Failed to save profile cache: ${errorMessage}`);
		}
	}

	async buildProfileForUrl(url: string, sampleUrls: string[] = []): Promise<ProfileGenerationResult> {
		console.log(`🔍 Building profile for: ${url}`);

		// Analyze the URL pattern
		const urlPattern = this.extractUrlPattern(url);
		const profileKey = this.generateProfileKey(urlPattern);

		// Check if profile already exists and is still valid
		const existingProfile = this.profileCache.profiles.get(profileKey);
		if (existingProfile && !this.isProfileExpired(existingProfile)) {
			console.log(`✅ Using existing profile for ${urlPattern}`);
			return {
				urlPattern,
				profile: existingProfile,
				analysis: {
					sampleUrls,
					languageDetection: [],
					extractionSuccess: 0,
					extractionFailures: 0,
				},
				confidence: 0.9,
				recommendations: ["Existing profile is still valid"],
			};
		}

		// Perform progressive enhancement analysis
		const sampleHtmls = await this.fetchSampleHtmls(sampleUrls.length > 0 ? sampleUrls : [url]);
		const languageDetections = sampleHtmls.map(html =>
			LanguageDetector.detectFromHtml(html, url),
		);

		const detector = new RenderingDetector();
		const renderingAnalyses = sampleHtmls.map(html =>
			detector.detectRenderingStrategy(html, { testWithPlaywright: false }),
		);

		// Determine optimal extraction strategy
		const requiresPlaywright = renderingAnalyses.some((analysis: RenderingDetection) =>
			analysis.requiresJavaScript || analysis.renderingType === "dynamic",
		);

		const extractionMethod = requiresPlaywright ?
			(renderingAnalyses.every((analysis: RenderingDetection) => analysis.renderingType === "dynamic") ? "playwright" : "hybrid")
			: "cheerio";

		// Build the profile
		const profile: PageTypeProfile = {
			urlPattern,
			name: this.generateProfileName(urlPattern),
			requiresPlaywright,
			extractionMethod,
			selectors: this.extractSelectors(sampleHtmls[0] ?? ""),
			waitForSelectors: this.extractWaitForSelectors(renderingAnalyses),
			timeout: this.calculateOptimalTimeout(renderingAnalyses),
			retryCount: 3,
			performance: {
				averageExtractionTime: this.estimateExtractionTime(renderingAnalyses),
				successRate: 0.95, // Initial estimate
				lastAnalyzed: Date.now(),
			},
			language: {
				defaultLanguage: this.inferDefaultLanguage(languageDetections),
				detectionPatterns: this.extractLanguagePatterns(languageDetections),
			},
			metadata: {
				source: "bandai-hobby",
				contentType: this.inferContentType(url),
				version: "1.0",
				lastUpdated: Date.now(),
			},
		};

		// Cache the profile
		this.profileCache.profiles.set(profileKey, profile);
		this.updateStatistics();

		return {
			urlPattern,
			profile,
			analysis: {
				sampleUrls: sampleUrls.length > 0 ? sampleUrls : [url],
				languageDetection: languageDetections,
				extractionSuccess: sampleHtmls.length,
				extractionFailures: 0,
			},
			confidence: this.calculateConfidence(renderingAnalyses, languageDetections),
			recommendations: this.generateRecommendations(profile, renderingAnalyses),
		};
	}

	getProfileForUrl(url: string): PageTypeProfile | null {
		const urlPattern = this.extractUrlPattern(url);
		const profileKey = this.generateProfileKey(urlPattern);

		const profile = this.profileCache.profiles.get(profileKey);

		if (profile && !this.isProfileExpired(profile)) {
			return profile;
		}

		return null;
	}

	async updateProfilePerformance(profileKey: string, success: boolean, extractionTime: number): Promise<void> {
		const profile = this.profileCache.profiles.get(profileKey);
		if (!profile) return;

		// Update performance metrics
		const currentAvg = profile.performance.averageExtractionTime;
		const currentSuccessRate = profile.performance.successRate;
		const totalAttempts = this.estimateTotalAttempts(profile);

		profile.performance.averageExtractionTime =
      (currentAvg * totalAttempts + extractionTime) / (totalAttempts + 1);
		profile.performance.successRate =
      (currentSuccessRate * totalAttempts + (success ? 1 : 0)) / (totalAttempts + 1);
		profile.performance.lastAnalyzed = Date.now();

		// Save updated profile
		await this.saveProfiles();
	}

	private async fetchSampleHtmls(urls: string[]): Promise<string[]> {
		const htmls: string[] = [];

		for (const url of urls) {
			try {
				// Try to get from cache first
				const cached = await this.cacheManager.getByUrl(url);
				if (cached?.rawHtml) {
					htmls.push(cached.rawHtml);
					continue;
				}

				// Fetch fresh content
				const response = await fetch(url, {
					headers: {
						"User-Agent": "GundamDataScraper/1.0 (Profile Analysis)",
						"Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
						"Accept-Language": "ja,en-US,en;q=0.9",
						"Cache-Control": "no-cache",
					},
				});

				if (response.ok) {
					const html = await response.text();
					htmls.push(html);

					// Cache for future use
					await this.cacheManager.setByUrl(url, html, "profile-analysis");
				}
			} catch (error) {
				console.warn(`⚠️  Failed to fetch ${url}:`, error);
			}
		}

		return htmls;
	}

	private extractUrlPattern(url: string): string {
		// Extract pattern from URL (e.g., /site/hg-1-144-*/ becomes /site/hg-1-144-{product}/)
		const urlObj = new URL(url);
		let pattern = urlObj.pathname;

		// Replace product-specific parts with placeholders
		pattern = pattern.replace(/\/site\/[^/]+-[^/]+-[^/]+\//, "/site/{grade-scale}/{product-name}/");
		pattern = pattern.replace(/\/category\/[^/]+/, "/category/{category}");
		pattern = pattern.replace(/\/[^/]*\d+[^/]*\//, "/{id}/");

		return pattern;
	}

	private generateProfileKey(urlPattern: string): string {
		return urlPattern.replaceAll(/[^a-zA-Z0-9]/g, "_");
	}

	private generateProfileName(urlPattern: string): string {
		if (urlPattern.includes("site")) return "Bandai Product Detail Page";
		if (urlPattern.includes("category")) return "Bandai Category Page";
		if (urlPattern.includes("search")) return "Bandai Search Results";
		return "Bandai Generic Page";
	}

	private extractSelectors(_html: string): Record<string, string> {
		// This would normally use more sophisticated analysis
		// For now, return common selectors for bandai-hobby.net
		return {
			productName: ".product-title, .item-title, h1",
			productSku: ".product-sku, .item-sku, .sku",
			price: ".price, .product-price, .item-price",
			description: ".product-description, .item-description, .description",
			specifications: ".specifications table, .spec-table, .product-specs table",
			images: ".product-image img, .item-image img, .main-image img",
			categories: ".breadcrumb a, .category a, .product-category a",
		};
	}

	private extractWaitForSelectors(analyses: Array<Awaited<ReturnType<typeof RenderingDetector.prototype.detectRenderingStrategy>>>): string[] {
		// Extract selectors that might need to wait for dynamic content
		const waitForSelectors: string[] = [];

		for (const analysis of analyses) {
			if (analysis.indicators.hasDynamicContent) {
				waitForSelectors.push(".content", ".main", "#app");
			}
			if (analysis.indicators.hasLazyLoading) {
				waitForSelectors.push("[data-loaded]", ".loaded");
			}
		}

		return [...new Set(waitForSelectors)];
	}

	private calculateOptimalTimeout(analyses: Array<Awaited<ReturnType<typeof RenderingDetector.prototype.detectRenderingStrategy>>>): number {
		let totalJsTime = 0;
		for (const analysis of analyses) {
			totalJsTime += analysis.jsExecutionTime;
		}
		const avgJsTime = totalJsTime / analyses.length;
		return Math.max(MIN_TIMEOUT_MS, avgJsTime * TIMEOUT_MULTIPLIER);
	}

	private estimateExtractionTime(analyses: Array<Awaited<ReturnType<typeof RenderingDetector.prototype.detectRenderingStrategy>>>): number {
		let totalTime = 0;
		for (const analysis of analyses) {
			totalTime += analysis.jsExecutionTime;
		}
		return totalTime / analyses.length;
	}

	private inferDefaultLanguage(detections: Array<ReturnType<typeof LanguageDetector.detectFromHtml>>): "ja" | "en" | "mixed" {
		const langCounts: Record<string, number> = {};

		for (const detection of detections) {
			const lang = detection.language;
			langCounts[lang] = (langCounts[lang] ?? 0) + 1;
		}

		const totalDetections = detections.length;
		const jaCount = langCounts["ja"] ?? 0;
		const enCount = langCounts["en"] ?? 0;

		if (jaCount / totalDetections > LANGUAGE_THRESHOLD) return "ja";
		if (enCount / totalDetections > LANGUAGE_THRESHOLD) return "en";
		return "mixed";
	}

	private extractLanguagePatterns(detections: Array<ReturnType<typeof LanguageDetector.detectFromHtml>>): string[] {
		// Extract common language detection patterns
		return detections.map(detection => detection.method).filter(Boolean);
	}

	private inferContentType(url: string): "product" | "manual" | "series" | "character" | "mecha" {
		if (url.includes("/site/")) return "product";
		if (url.includes("manual")) return "manual";
		if (url.includes("series")) return "series";
		return "product";
	}

	private calculateConfidence(renderingAnalyses: Array<Awaited<ReturnType<typeof RenderingDetector.prototype.detectRenderingStrategy>>>, languageDetections: Array<ReturnType<typeof LanguageDetector.detectFromHtml>>): number {
		let confidence = BASE_CONFIDENCE;

		// Increase confidence based on consistent analysis results
		const consistentRendering = renderingAnalyses.length > 0 && renderingAnalyses.every((analysis: RenderingDetection) =>
			analysis.renderingType === renderingAnalyses[0]?.renderingType,
		);
		if (consistentRendering) confidence += CONFIDENCE_INCREASE_RENDERING;

		const consistentLanguage = languageDetections.length > 0 && languageDetections.every(detection =>
			detection.language === languageDetections[0]?.language,
		);
		if (consistentLanguage) confidence += CONFIDENCE_INCREASE_LANGUAGE;

		// High confidence if we have multiple samples
		if (renderingAnalyses.length > 1) confidence += CONFIDENCE_INCREASE_SAMPLES;

		return Math.min(confidence, 1);
	}

	private generateRecommendations(profile: PageTypeProfile, analyses: Array<Awaited<ReturnType<typeof RenderingDetector.prototype.detectRenderingStrategy>>>): string[] {
		const recommendations: string[] = [];

		if (profile.requiresPlaywright) {
			recommendations.push("Use Playwright for optimal extraction");
		} else {
			recommendations.push("Static extraction with Cheerio is sufficient");
		}

		if (profile.waitForSelectors && profile.waitForSelectors.length > 0) {
			recommendations.push("Wait for dynamic content to load");
		}

		if (analyses.some(analysis => analysis.indicators.hasLazyLoading)) {
			recommendations.push("Consider implementing lazy loading handling");
		}

		return recommendations;
	}

	private isProfileExpired(profile: PageTypeProfile): boolean {
		const ageHours = (Date.now() - profile.metadata.lastUpdated) / MILLISECONDS_PER_HOUR;
		return ageHours > this.updateInterval;
	}

	private estimateTotalAttempts(profile: PageTypeProfile): number {
		// Rough estimate based on when the profile was last updated
		const ageHours = (Date.now() - profile.performance.lastAnalyzed) / MILLISECONDS_PER_HOUR;
		return Math.max(1, ageHours / HOURS_PER_ATTEMPT_ESTIMATE);
	}

	private updateStatistics(): void {
		const profiles = [...this.profileCache.profiles.values()];

		this.profileCache.statistics.totalProfiles = profiles.length;
		this.profileCache.statistics.staticOnlyProfiles =
      profiles.filter(p => !p.requiresPlaywright).length;
		this.profileCache.statistics.dynamicProfiles =
      profiles.filter(p => p.requiresPlaywright).length;
		this.profileCache.statistics.lastUpdated = Date.now();
	}

	// Utility methods
	getStatistics(): ProfileCache["statistics"] {
		return this.profileCache.statistics;
	}

	getAllProfiles(): PageTypeProfile[] {
		return [...this.profileCache.profiles.values()];
	}

	async clearExpiredProfiles(): Promise<void> {
		const expiredKeys: string[] = [];

		for (const [key, profile] of this.profileCache.profiles.entries()) {
			if (this.isProfileExpired(profile)) {
				expiredKeys.push(key);
			}
		}

		for (const key of expiredKeys) this.profileCache.profiles.delete(key);

		if (expiredKeys.length > 0) {
			this.updateStatistics();
			await this.saveProfiles();
			console.log(`🗑️  Cleared ${expiredKeys.length} expired profiles`);
		}
	}
}

// Export singleton instance for convenience
export const profileManager = new ProfileManager();