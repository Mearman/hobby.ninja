import { promises as fs } from "node:fs";
import path from "node:path";

import type { LanguageDetection } from "@hobby-ninja/types/language";
import type { CacheManager, ProfileCache, ProfileGenerationResult, PageTypeProfile, RenderingDetection } from "@hobby-ninja/types/profile";

import { cacheManager } from "./cache-manager";
import { detectFromHtml } from "./languageDetection";
import { logger } from "./logger";
import { detectRenderingStrategy } from "./renderingDetection";

export interface ProfileManagerOptions {
  profileCachePath?: string;
  enableAutoUpdate?: boolean;
  updateInterval?: number; // hours
  fallbackToPlaywright?: boolean;
}

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
		this.updateInterval = options.updateInterval ?? 24; // 24 hours
		this.fallbackToPlaywright = options.fallbackToPlaywright ?? true;
		this.cacheManager = cacheManager;
		this.profileCache = this.initializeProfileCache();
	}

	private initializeProfileCache(): ProfileCache {
		return {
			profiles: new Map(),
			version: "1.0.0",
			lastUpdated: new Date().toISOString(),
			statistics: {
				totalProfiles: 0,
				playwrightProfiles: 0,
				cheerioProfiles: 0,
				lastUpdated: Date.now(),
			},
		};
	}

	async loadProfiles(): Promise<void> {
		try {
			const data = await fs.readFile(this.profileCachePath, "utf8");
			const cacheData = JSON.parse(data) as {
				profiles?: Record<string, PageTypeProfile>;
				version?: string;
				lastUpdated?: string;
				statistics?: ProfileCache["statistics"];
			};

			// Convert profiles object back to Map
			this.profileCache = {
				version: cacheData.version ?? "1.0.0",
				lastUpdated: cacheData.lastUpdated ?? new Date().toISOString(),
				statistics: cacheData.statistics ?? this.initializeProfileCache().statistics,
				profiles: new Map(Object.entries(cacheData.profiles ?? {})),
			};

			logger.info(`Loaded ${this.profileCache.profiles.size} profiles from cache`);
		} catch {
			logger.info("No existing profile cache found, starting fresh");
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
			logger.info(`Saved ${this.profileCache.profiles.size} profiles to cache`);
		} catch (error) {
			logger.error("Failed to save profile cache:", error);
		}
	}

	async buildProfileForUrl(url: string, sampleUrls: string[] = []): Promise<ProfileGenerationResult> {
		logger.info(`Building profile for: ${url}`);

		// Analyze the URL pattern
		const urlPattern = this.extractUrlPattern(url);
		const profileKey = this.generateProfileKey(urlPattern);

		// Check if profile already exists and is still valid
		const existingProfile = this.profileCache.profiles.get(profileKey);
		if (existingProfile && !this.isProfileExpired(existingProfile)) {
			logger.info(`Using existing profile for ${urlPattern}`);
			return {
				success: true,
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
				requiresPlaywright: existingProfile.requiresPlaywright,
				sampleUrls,
			};
		}

		// Perform progressive enhancement analysis
		const sampleHtmls = await this.fetchSampleHtmls(sampleUrls.length > 0 ? sampleUrls : [url]);
		const languageDetections = sampleHtmls.map(html =>
			detectFromHtml(html, url),
		);

		const renderingAnalyses = sampleHtmls.map(html =>
			detectRenderingStrategy(html, { testWithPlaywright: false }),
		);

		// Determine optimal extraction strategy
		const requiresPlaywright = renderingAnalyses.some(analysis =>
			(analysis.requiresJavaScript ?? false) || analysis.renderingType === "dynamic",
		);

		const extractionMethod = requiresPlaywright ?
			(renderingAnalyses.every(analysis => analysis.renderingType === "dynamic") ? "playwright" : "hybrid")
			: "cheerio";

		// Build the profile
		const profile: PageTypeProfile = {
			urlPattern,
			name: this.generateProfileName(urlPattern),
			requiresPlaywright,
			extractionMethod,
			confidence: this.calculateConfidence(renderingAnalyses, languageDetections),
			lastUpdated: new Date().toISOString(),
			sampleUrls: sampleUrls.length > 0 ? sampleUrls : [url],
			selectors: this.extractSelectors(sampleHtmls[0] ?? ""),
			waitForSelectors: this.extractWaitForSelectors(renderingAnalyses),
			timeout: this.calculateOptimalTimeout(renderingAnalyses),
			retryCount: 3,
			performance: {
				estimatedLoadTime: this.calculateOptimalTimeout(renderingAnalyses),
				averageJsExecutionTime: this.calculateMaxJsExecutionTime(renderingAnalyses),
				averageExtractionTime: this.estimateExtractionTime(renderingAnalyses),
				successRate: 0.95, // Initial estimate
				memoryUsage: 50_000, // Estimated memory usage in bytes
				domComplexity: this.calculateDomComplexity(renderingAnalyses),
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
			success: true,
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
			requiresPlaywright,
			sampleUrls: sampleUrls.length > 0 ? sampleUrls : [url],
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
		if (!profile?.performance) return;

		// Update performance metrics
		const currentAvg = profile.performance.averageExtractionTime ?? 0;
		const currentSuccessRate = profile.performance.successRate ?? 0;
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
				const cached = await this.cacheManager.getByUrl?.(url);
				if (cached && typeof cached === "object" && "rawHtml" in cached) {
					htmls.push(cached.rawHtml as string);
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
					await this.cacheManager.setByUrl?.(url, html, "profile-analysis");
				}
			} catch (error) {
				logger.warn(`Failed to fetch ${url}:`, error);
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

	private extractWaitForSelectors(analyses: RenderingDetection[]): string[] {
		// Extract selectors that might need to wait for dynamic content
		const waitForSelectors: string[] = [];

		for (const analysis of analyses) {
			if (analysis.indicators?.includes("hasDynamicContent")) {
				waitForSelectors.push(".content", ".main", "#app");
			}
			if (analysis.indicators?.includes("hasLazyLoading")) {
				waitForSelectors.push("[data-loaded]", ".loaded");
			}
		}

		return [...new Set(waitForSelectors)];
	}

	private calculateOptimalTimeout(analyses: RenderingDetection[]): number {
		if (analyses.length === 0) return 5000;
		let sum = 0;
		for (const analysis of analyses) {
			sum += analysis.jsExecutionTime ?? 0;
		}
		const avgJsTime = sum / analyses.length;
		return Math.max(5000, avgJsTime * 2); // At least 5 seconds, or 2x average JS time
	}

	private calculateMaxJsExecutionTime(analyses: RenderingDetection[]): number {
		if (analyses.length === 0) return 1000;
		let maxTime = 0;
		for (const analysis of analyses) {
			const time = analysis.jsExecutionTime ?? 1000;
			if (time > maxTime) maxTime = time;
		}
		return maxTime;
	}

	private estimateExtractionTime(analyses: RenderingDetection[]): number {
		if (analyses.length === 0) return 1000;
		let totalTime = 0;
		for (const analysis of analyses) {
			totalTime += analysis.jsExecutionTime ?? 1000;
		}
		return totalTime / analyses.length;
	}

	private inferDefaultLanguage(detections: LanguageDetection[]): "ja" | "en" | "mixed" {
		if (detections.length === 0) return "mixed";

		const langCounts: Record<string, number> = {};
		for (const detection of detections) {
			const lang = detection.language;
			langCounts[lang] = (langCounts[lang] ?? 0) + 1;
		}

		const totalDetections = detections.length;
		const jaCount = langCounts["ja"] ?? 0;
		const enCount = langCounts["en"] ?? 0;

		if (jaCount / totalDetections > 0.8) return "ja";
		if (enCount / totalDetections > 0.8) return "en";
		return "mixed";
	}

	private extractLanguagePatterns(detections: LanguageDetection[]): string[] {
		// Extract common language detection patterns
		return detections.map(detection => String(detection.confidence)).filter(Boolean);
	}

	private inferContentType(url: string): "product" | "manual" | "series" | "character" | "mecha" {
		if (url.includes("/site/")) return "product";
		if (url.includes("manual")) return "manual";
		if (url.includes("series")) return "series";
		return "product";
	}

	private calculateConfidence(renderingAnalyses: RenderingDetection[], languageDetections: LanguageDetection[]): number {
		let confidence = 0.5; // Base confidence

		// Increase confidence based on consistent analysis results
		const consistentRendering = renderingAnalyses.every(analysis =>
			analysis.renderingType === renderingAnalyses[0]?.renderingType,
		);
		if (consistentRendering) confidence += 0.2;

		const consistentLanguage = languageDetections.every(detection =>
			detection.language === languageDetections[0]?.language,
		);
		if (consistentLanguage) confidence += 0.2;

		// High confidence if we have multiple samples
		if (renderingAnalyses.length > 1) confidence += 0.1;

		return Math.min(confidence, 1);
	}

  
	private isProfileExpired(profile: PageTypeProfile): boolean {
		const ageHours = (Date.now() - (profile.metadata?.lastUpdated ?? 0)) / (1000 * 60 * 60);
		return ageHours > this.updateInterval;
	}

	private estimateTotalAttempts(profile: PageTypeProfile): number {
		// Rough estimate based on when the profile was last updated
		const ageHours = (Date.now() - (profile.performance?.lastAnalyzed ?? 0)) / (1000 * 60 * 60);
		return Math.max(1, ageHours / 2); // Assume 1 attempt every 2 hours
	}

	private updateStatistics(): void {
		const profiles = [...this.profileCache.profiles.values()];

		if (this.profileCache.statistics) {
			this.profileCache.statistics.totalProfiles = profiles.length;
			this.profileCache.statistics.staticOnlyProfiles =
        profiles.filter(p => !p.requiresPlaywright).length;
			this.profileCache.statistics.dynamicProfiles =
        profiles.filter(p => p.requiresPlaywright).length;
			this.profileCache.statistics.lastUpdated = Date.now();
		}
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
			logger.info(`Cleared ${expiredKeys.length} expired profiles`);
		}
	}

	private calculateDomComplexity(renderingAnalyses: RenderingDetection[]): number {
		// Simple heuristic based on analysis complexity
		let complexity = 0;
		for (const analysis of renderingAnalyses) {
			complexity += analysis.domComplexity ?? 50;
		}
		return complexity;
	}

	private generateRecommendations(profile: PageTypeProfile, renderingAnalyses: RenderingDetection[]): string[] {
		const recommendations: string[] = [];

		if (renderingAnalyses.some(a => a.requiresJavaScript)) {
			recommendations.push("Consider using Playwright for dynamic content");
		}

		if (profile.confidence < 0.8) {
			recommendations.push("Profile confidence is low, consider manual review");
		}

		return recommendations;
	}
}

// Export singleton instance for convenience
export const profileManager = new ProfileManager();