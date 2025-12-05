import { promises as fs } from 'fs';
import * as path from 'path';
import { PageTypeProfile, ProfileCache, ProfileGenerationResult, CacheManager } from '@unnamed-gunpla-app/types';
import { LanguageDetector } from './language-detection';
import { RenderingDetector } from './rendering-detection';
import { cacheManager } from './cache-manager';

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
    this.profileCachePath = options.profileCachePath ||
      path.join(process.cwd(), '.gundam-scraper-profiles.json');
    this.enableAutoUpdate = options.enableAutoUpdate ?? true;
    this.updateInterval = options.updateInterval || 24; // 24 hours
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
        lastUpdated: Date.now()
      }
    };
  }

  async loadProfiles(): Promise<void> {
    try {
      const data = await fs.readFile(this.profileCachePath, 'utf-8');
      const cacheData = JSON.parse(data);

      // Convert profiles object back to Map
      this.profileCache = {
        ...cacheData,
        profiles: new Map(Object.entries(cacheData.profiles || {}))
      };

      console.log(`✅ Loaded ${this.profileCache.profiles.size} profiles from cache`);
    } catch (error) {
      console.log('📝 No existing profile cache found, starting fresh');
      this.profileCache = this.initializeProfileCache();
    }
  }

  async saveProfiles(): Promise<void> {
    try {
      const cacheData = {
        ...this.profileCache,
        profiles: Object.fromEntries(this.profileCache.profiles)
      };

      await fs.writeFile(this.profileCachePath, JSON.stringify(cacheData, null, 2));
      console.log(`💾 Saved ${this.profileCache.profiles.size} profiles to cache`);
    } catch (error) {
      console.error('❌ Failed to save profile cache:', error);
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
          extractionFailures: 0
        },
        confidence: 0.9,
        recommendations: ['Existing profile is still valid']
      };
    }

    // Perform progressive enhancement analysis
    const sampleHtmls = await this.fetchSampleHtmls(sampleUrls.length > 0 ? sampleUrls : [url]);
    const languageDetections = sampleHtmls.map(html =>
      LanguageDetector.detectFromHtml(html, url)
    );

    const renderingAnalyses = await Promise.all(
      sampleHtmls.map(html =>
        RenderingDetector.detectRenderingStrategy(html, { testWithPlaywright: false })
      )
    );

    // Determine optimal extraction strategy
    const requiresPlaywright = renderingAnalyses.some(analysis =>
      analysis.requiresJavaScript || analysis.renderingType === 'dynamic'
    );

    const extractionMethod = requiresPlaywright ?
      (renderingAnalyses.every(analysis => analysis.renderingType === 'dynamic') ? 'playwright' : 'hybrid')
      : 'cheerio';

    // Build the profile
    const profile: PageTypeProfile = {
      urlPattern,
      name: this.generateProfileName(urlPattern),
      requiresPlaywright,
      extractionMethod,
      selectors: await this.extractSelectors(sampleHtmls[0] || ''),
      waitForSelectors: this.extractWaitForSelectors(renderingAnalyses),
      timeout: this.calculateOptimalTimeout(renderingAnalyses),
      retryCount: 3,
      performance: {
        averageExtractionTime: this.estimateExtractionTime(renderingAnalyses),
        successRate: 0.95, // Initial estimate
        lastAnalyzed: Date.now()
      },
      language: {
        defaultLanguage: this.inferDefaultLanguage(languageDetections),
        detectionPatterns: this.extractLanguagePatterns(languageDetections)
      },
      metadata: {
        source: 'bandai-hobby',
        contentType: this.inferContentType(url),
        version: '1.0',
        lastUpdated: Date.now()
      }
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
        extractionFailures: 0
      },
      confidence: this.calculateConfidence(renderingAnalyses, languageDetections),
      recommendations: this.generateRecommendations(profile, renderingAnalyses)
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
            'User-Agent': 'GundamDataScraper/1.0 (Profile Analysis)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'ja,en-US,en;q=0.9',
            'Cache-Control': 'no-cache'
          }
        });

        if (response.ok) {
          const html = await response.text();
          htmls.push(html);

          // Cache for future use
          await this.cacheManager.setByUrl(url, html, 'profile-analysis');
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
    pattern = pattern.replace(/\/site\/[^\/]+-[^\/]+-[^\/]+\//, '/site/{grade-scale}/{product-name}/');
    pattern = pattern.replace(/\/category\/[^\/]+/, '/category/{category}');
    pattern = pattern.replace(/\/[^\/]*\d+[^\/]*\//, '/{id}/');

    return pattern;
  }

  private generateProfileKey(urlPattern: string): string {
    return urlPattern.replace(/[^a-zA-Z0-9]/g, '_');
  }

  private generateProfileName(urlPattern: string): string {
    if (urlPattern.includes('site')) return 'Bandai Product Detail Page';
    if (urlPattern.includes('category')) return 'Bandai Category Page';
    if (urlPattern.includes('search')) return 'Bandai Search Results';
    return 'Bandai Generic Page';
  }

  private async extractSelectors(_html: string): Promise<Record<string, string>> {
    // This would normally use more sophisticated analysis
    // For now, return common selectors for bandai-hobby.net
    return {
      productName: '.product-title, .item-title, h1',
      productSku: '.product-sku, .item-sku, .sku',
      price: '.price, .product-price, .item-price',
      description: '.product-description, .item-description, .description',
      specifications: '.specifications table, .spec-table, .product-specs table',
      images: '.product-image img, .item-image img, .main-image img',
      categories: '.breadcrumb a, .category a, .product-category a'
    };
  }

  private extractWaitForSelectors(analyses: any[]): string[] {
    // Extract selectors that might need to wait for dynamic content
    const waitForSelectors: string[] = [];

    analyses.forEach(analysis => {
      if (analysis.indicators?.hasDynamicContent) {
        waitForSelectors.push('.content', '.main', '#app');
      }
      if (analysis.indicators?.hasLazyLoading) {
        waitForSelectors.push('[data-loaded]', '.loaded');
      }
    });

    return [...new Set(waitForSelectors)];
  }

  private calculateOptimalTimeout(analyses: any[]): number {
    const avgJsTime = analyses.reduce((sum, analysis) => sum + (analysis.jsExecutionTime || 0), 0) / analyses.length;
    return Math.max(5000, avgJsTime * 2); // At least 5 seconds, or 2x average JS time
  }

  private estimateExtractionTime(analyses: any[]): number {
    const totalTime = analyses.reduce((sum, analysis) => sum + (analysis.jsExecutionTime || 1000), 0);
    return totalTime / analyses.length;
  }

  private inferDefaultLanguage(detections: any[]): 'ja' | 'en' | 'mixed' {
    const langCounts = detections.reduce((counts, detection) => {
      const lang = detection.primaryLanguage?.code || 'unknown';
      counts[lang] = (counts[lang] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    const totalDetections = detections.length;
    const jaCount = langCounts['ja'] || 0;
    const enCount = langCounts['en'] || 0;

    if (jaCount / totalDetections > 0.8) return 'ja';
    if (enCount / totalDetections > 0.8) return 'en';
    return 'mixed';
  }

  private extractLanguagePatterns(detections: any[]): string[] {
    // Extract common language detection patterns
    return detections.map(detection => detection.confidence).filter(Boolean);
  }

  private inferContentType(url: string): 'product' | 'manual' | 'series' | 'character' | 'mecha' {
    if (url.includes('/site/')) return 'product';
    if (url.includes('manual')) return 'manual';
    if (url.includes('series')) return 'series';
    return 'product';
  }

  private calculateConfidence(renderingAnalyses: any[], languageDetections: any[]): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence based on consistent analysis results
    const consistentRendering = renderingAnalyses.every(analysis =>
      analysis.renderingType === renderingAnalyses[0].renderingType
    );
    if (consistentRendering) confidence += 0.2;

    const consistentLanguage = languageDetections.every(detection =>
      detection.primaryLanguage?.code === languageDetections[0].primaryLanguage?.code
    );
    if (consistentLanguage) confidence += 0.2;

    // High confidence if we have multiple samples
    if (renderingAnalyses.length > 1) confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  private generateRecommendations(profile: PageTypeProfile, analyses: any[]): string[] {
    const recommendations: string[] = [];

    if (profile.requiresPlaywright) {
      recommendations.push('Use Playwright for optimal extraction');
    } else {
      recommendations.push('Static extraction with Cheerio is sufficient');
    }

    if (profile.waitForSelectors && profile.waitForSelectors.length > 0) {
      recommendations.push('Wait for dynamic content to load');
    }

    if (analyses.some(analysis => analysis.indicators?.hasLazyLoading)) {
      recommendations.push('Consider implementing lazy loading handling');
    }

    return recommendations;
  }

  private isProfileExpired(profile: PageTypeProfile): boolean {
    const ageHours = (Date.now() - profile.metadata.lastUpdated) / (1000 * 60 * 60);
    return ageHours > this.updateInterval;
  }

  private estimateTotalAttempts(profile: PageTypeProfile): number {
    // Rough estimate based on when the profile was last updated
    const ageHours = (Date.now() - profile.performance.lastAnalyzed) / (1000 * 60 * 60);
    return Math.max(1, ageHours / 2); // Assume 1 attempt every 2 hours
  }

  private updateStatistics(): void {
    const profiles = Array.from(this.profileCache.profiles.values());

    this.profileCache.statistics.totalProfiles = profiles.length;
    this.profileCache.statistics.staticOnlyProfiles =
      profiles.filter(p => !p.requiresPlaywright).length;
    this.profileCache.statistics.dynamicProfiles =
      profiles.filter(p => p.requiresPlaywright).length;
    this.profileCache.statistics.lastUpdated = Date.now();
  }

  // Utility methods
  async getStatistics(): Promise<ProfileCache['statistics']> {
    return this.profileCache.statistics;
  }

  async getAllProfiles(): Promise<PageTypeProfile[]> {
    return Array.from(this.profileCache.profiles.values());
  }

  async clearExpiredProfiles(): Promise<void> {
    const expiredKeys: string[] = [];

    for (const [key, profile] of this.profileCache.profiles.entries()) {
      if (this.isProfileExpired(profile)) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.profileCache.profiles.delete(key));

    if (expiredKeys.length > 0) {
      this.updateStatistics();
      await this.saveProfiles();
      console.log(`🗑️  Cleared ${expiredKeys.length} expired profiles`);
    }
  }
}

// Export singleton instance for convenience
export const profileManager = new ProfileManager();