/**
 * Static data detector for analyzing HTML content and determining data extraction viability
 */

import { DetectionResult, ExtractedData, StructuredDataResult } from "./types.js";

// Indicator string constants to avoid duplicates
const INDICATOR_STATIC_TITLE = "static-title";
const INDICATOR_META_DESCRIPTION = "meta-description";
const INDICATOR_STRUCTURED_DATA = "structured-data";
const INDICATOR_SKU_PATTERN_FOUND = "sku-pattern-found";
const INDICATOR_IMAGE_ELEMENTS = "image-elements";
const INDICATOR_EMPTY_CONTENT = "empty-content";
const INDICATOR_LOADING_PLACEHOLDER = "loading-placeholder";
const INDICATOR_SCRIPT_DATA_SOURCE = "script-data-source";

export class StaticDataDetector {
	private static readonly INDICATOR_PATTERNS = {
		// Static content indicators
		staticTitle: [
			/<title[^>]*>([^<]+)<\/title>/gi,
			/<h1[^>]*>([^<]{5,})<\/h1>/gi,
			/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']{10,})["']/gi,
		],
		metaDescription: [
			/<meta[^>]*name=["']description["'][^>]*content=["']([^"']{20,})["']/gi,
			/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']{20,})["']/gi,
		],
		structuredData: [
			/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
		],
		skuPatterns: [
			/(?:^|\s)[A-Z]{0,2}(?:HG|MG|PG|RG|SD|RE\/100|MGEX|EG|MB|HY2M)(?:\s+|[_-])[\dA-Za-z]+/gi,
			/(?:^|\s)1\/(?:100|144|60|48|550)\s+(?:HG|MG|PG|RG|SD|HGUC|HY2M)/gi,
			/ガンダム[\s-_]*[^\s<]*\((?:HG|MG|PG|RG|SD|HY2M)/gi,
			/機動戦士[\s-_]*[^\s<]*\((?:HG|MG|PG|RG|SD|HY2M)/gi,
		],
		imageElements: [
			/<img[^>]*(?:src|srcset)=["']([^"']+)["'][^>]*(?:alt=["']([^"']+)["'])?/gi,
		],

		// Dynamic content indicators
		loadingPlaceholders: [
			/loading/i,
			/spinner/i,
			/<div[^>]*class=["'][^"']*loading[^"']*["']/gi,
			/読み込み中/gi,
			/ローディング/gi,
		],
		scriptDataSources: [
			/<script[^>]*>[\s\S]*?(?:productData|var\s+\w+.*?=.*?=|const\s+\w+.*?=.*?=|let\s+\w+.*?=.*?=)[\s\S]*?<\/script>/gi,
		],
		emptyContainers: [
			/<div[^>]*>\s*<\/div>/gi,
			/<div[^>]*class=["'][^"']*content[^"']*["'][^>]*>\s*<\/div>/gi,
			/<div[^>]*class=["'][^"']*empty[^"']*["'][^>]*>\s*<\/div>/gi,
		],
		spaFrameworks: [
			/data-reactroot/gi,
			/ng-app/gi,
			/data-vue-/gi,
			/data-svelte-/gi,
			/id=["']app["']/gi,
			/<div[^>]*id=["']root["'][^>]*>/gi,
		],
		clientSideScripts: [
			/<script[^>]*src=["'](?:https?:\/\/)?(?:cdnjs|cdn\.jsdelivr|unpkg)\//gi,
			/<script[^>]*crossorigin=["']anonymous["'][^>]*>/gi,
		],
		minimalContent: [
			/<body><\/body>/gi,
			/<html><\/html>/gi,
			/<html><head><\/head><body><\/body><\/html>/gi,
		],
	};

	/**
   * Analyze HTML content to determine if essential Gundam data is statically available
   */
	detectStaticData(html: string, _url: string, headers: Headers): DetectionResult {
		if (!html || html.trim().length === 0) {
			return {
				hasStaticData: false,
				dataType: "none",
				confidence: 0,
				indicators: [INDICATOR_EMPTY_CONTENT],
				extractedData: undefined,
			};
		}

		const indicators: string[] = [];
		const extractedData: ExtractedData = {};

		// Check content type
		const contentType = headers.get("content-type") ?? "";
		if (!contentType.includes("text/html")) {
			indicators.push("non-html-content");
			return {
				hasStaticData: false,
				dataType: "none",
				confidence: 0.2,
				indicators,
				extractedData: undefined,
			};
		}

		// Extract static title
		const titles = this.extractAllPatterns(html, StaticDataDetector.INDICATOR_PATTERNS.staticTitle);
		if (titles.length > 0) {
			indicators.push(INDICATOR_STATIC_TITLE);
			extractedData.title = this.cleanText(titles[0]);

			// Check if this is a 404 error page
			if (extractedData.title.toLowerCase().includes("404") ||
          extractedData.title.toLowerCase().includes("not found")) {
				indicators.push("404-error");
			}
		}

		// Extract meta description
		const descriptions = this.extractAllPatterns(html, StaticDataDetector.INDICATOR_PATTERNS.metaDescription);
		if (descriptions.length > 0) {
			indicators.push(INDICATOR_META_DESCRIPTION);
			extractedData.description = this.cleanText(descriptions[0]);
		}

		// Extract structured data (JSON-LD)
		const structuredDataResults = this.extractAllPatterns(html, StaticDataDetector.INDICATOR_PATTERNS.structuredData);
		if (structuredDataResults.length > 0) {
			indicators.push(INDICATOR_STRUCTURED_DATA);
			const structuredData = this.parseStructuredData(structuredDataResults[0]);
			if (structuredData) {
				extractedData.title ??= structuredData.title;
				extractedData.description ??= structuredData.description;
				if (structuredData.sku) {
					extractedData.sku = structuredData.sku;
				}
				if (structuredData.image) {
					extractedData.images = [structuredData.image];
				}
			}
		}

		// Extract SKU patterns
		const skuPatterns = this.extractAllPatterns(html, StaticDataDetector.INDICATOR_PATTERNS.skuPatterns);
		if (skuPatterns.length > 0) {
			indicators.push(INDICATOR_SKU_PATTERN_FOUND);
			extractedData.sku ??= skuPatterns[0].trim();
		}

		// Extract images - extractAllPatterns returns src URLs from the first capture group
		const imageUrls = this.extractAllPatterns(html, StaticDataDetector.INDICATOR_PATTERNS.imageElements);
		if (imageUrls.length > 0) {
			indicators.push(INDICATOR_IMAGE_ELEMENTS);
			extractedData.images = imageUrls;
		}

		// Check for dynamic indicators
		if (this.hasAnyPattern(html, StaticDataDetector.INDICATOR_PATTERNS.loadingPlaceholders)) {
			indicators.push(INDICATOR_LOADING_PLACEHOLDER);
		}

		if (this.hasAnyPattern(html, StaticDataDetector.INDICATOR_PATTERNS.scriptDataSources)) {
			indicators.push(INDICATOR_SCRIPT_DATA_SOURCE);
		}

		if (this.hasAnyPattern(html, StaticDataDetector.INDICATOR_PATTERNS.emptyContainers)) {
			indicators.push(INDICATOR_EMPTY_CONTENT);
		}

		if (this.hasAnyPattern(html, StaticDataDetector.INDICATOR_PATTERNS.spaFrameworks)) {
			indicators.push("spa-framework");
		}

		if (this.hasAnyPattern(html, StaticDataDetector.INDICATOR_PATTERNS.clientSideScripts)) {
			indicators.push("client-side-scripts");
		}

		if (this.hasAnyPattern(html, StaticDataDetector.INDICATOR_PATTERNS.minimalContent)) {
			indicators.push("minimal-content");
		}

		// Determine data type and confidence
		const hasStaticData = this.hasEssentialGundamData(extractedData, indicators);
		const dataType = this.determineDataType(indicators, hasStaticData);
		const confidence = this.calculateConfidence(indicators, hasStaticData);

		return {
			hasStaticData,
			dataType,
			confidence,
			indicators,
			extractedData: hasStaticData ? extractedData : undefined,
		};
	}

	/**
   * Extract all matches for a given pattern array
   */
	private extractAllPatterns(html: string, patterns: RegExp[]): string[] {
		const results: string[] = [];

		for (const pattern of patterns) {
			const matches = [...html.matchAll(pattern)];
			for (const match of matches) {
				if (match[1]) {
					results.push(match[1]);
				} else if (match[0]) {
					results.push(match[0]);
				}
			}
		}

		return results;
	}

	/**
   * Check if any pattern matches
   */
	private hasAnyPattern(html: string, patterns: RegExp[]): boolean {
		return patterns.some(pattern => pattern.test(html));
	}

	/**
   * Parse structured data from JSON-LD
   */
	private parseStructuredData(jsonStr: string): StructuredDataResult | null {
		try {
			const data: unknown = JSON.parse(jsonStr);

			// Check if it's relevant Gundam/product data
			if (this.isGundamProductData(data)) {
				return {
					title: this.getStringProperty(data, "name") ?? this.getStringProperty(data, "title"),
					description: this.getStringProperty(data, "description"),
					sku: this.extractSkuFromStructuredData(data),
					brand: this.getStringProperty(data, "brand") ?? this.getStringProperty(data, "manufacturer"),
					image: this.getImageFromStructuredData(data),
				};
			}
			return null;
		} catch {
			return null;
		}
	}

	/**
   * Safely get a string property from an unknown object
   */
	private getStringProperty(obj: unknown, key: string): string | undefined {
		if (typeof obj === "object" && obj !== null && key in obj) {
			const value = (obj as Record<string, unknown>)[key];
			return typeof value === "string" ? value : undefined;
		}
		return undefined;
	}

	/**
   * Extract image URL from structured data
   */
	private getImageFromStructuredData(data: unknown): string | undefined {
		if (typeof data !== "object" || data === null) return undefined;

		const obj = data as Record<string, unknown>;
		const imageField = obj.image;
		const imageUrlField = obj.imageUrl;

		if (typeof imageField === "string") return imageField;
		if (Array.isArray(imageField) && typeof imageField[0] === "string") return imageField[0];
		if (typeof imageUrlField === "string") return imageUrlField;

		return undefined;
	}

	/**
   * Check if structured data represents Gundam product information
   */
	private isGundamProductData(data: unknown): data is Record<string, unknown> {
		if (typeof data !== "object" || data === null) return false;

		const obj = data as Record<string, unknown>;
		const nameValue = obj.name ?? obj.title;
		const name = (typeof nameValue === "string" ? nameValue : "").toLowerCase();
		const descValue = obj.description;
		const description = (typeof descValue === "string" ? descValue : "").toLowerCase();

		return name.includes("gundam") ||
           name.includes("ガンダム") ||
           name.includes("gunpla") ||
           description.includes("gundam") ||
           description.includes("ガンダム") ||
           description.includes("gunpla");
	}

	/**
   * Extract SKU information from structured data
   */
	private extractSkuFromStructuredData(data: unknown): string | undefined {
		if (typeof data !== "object" || data === null) return undefined;

		const obj = data as Record<string, unknown>;

		// Check primary SKU fields
		for (const field of ["sku", "model", "identifier", "productId", "itemNumber", "partNumber", "catalogNumber"]) {
			const value = obj[field];
			if (typeof value === "string") {
				return value;
			}
		}

		return undefined;
	}

	/**
   * Determine if essential Gundam data is available
   */
	private hasEssentialGundamData(extractedData: ExtractedData, indicators: string[]): boolean {
		// Must have a title or description
		const hasTitle = extractedData.title !== undefined && extractedData.title.length > 0;
		const hasDescription = extractedData.description !== undefined && extractedData.description.length > 0;

		// Consider content valuable if it has either title/description OR structured data
		return hasTitle || hasDescription || indicators.includes(INDICATOR_STRUCTURED_DATA);
	}

	/**
   * Determine the type of data availability
   */
	private determineDataType(indicators: string[], hasStaticData: boolean): "complete" | "partial" | "none" {
		if (!hasStaticData) {
			return "none";
		}

		const hasStructuredData = indicators.includes(INDICATOR_STRUCTURED_DATA);
		const hasAllKeyIndicators = [
			INDICATOR_STATIC_TITLE,
			INDICATOR_META_DESCRIPTION,
			INDICATOR_IMAGE_ELEMENTS,
		].every(indicator => indicators.includes(indicator));

		const hasBasicIndicators = [
			INDICATOR_STATIC_TITLE,
			INDICATOR_META_DESCRIPTION,
		].every(indicator => indicators.includes(indicator));

		if (hasStructuredData && hasAllKeyIndicators) {
			return "complete";
		}

		if (hasStructuredData || hasBasicIndicators) {
			return "complete";
		}

		return "partial";
	}

	/**
   * Calculate confidence score
   */
	private calculateConfidence(indicators: string[], hasStaticData: boolean): number {
		let confidence = 0.3; // Base confidence

		// Check for 404 error pages (which should have very low confidence)
		const is404Page = indicators.some(indicator =>
			indicator.toLowerCase().includes("404") ||
      indicator.toLowerCase().includes("not found"),
		);

		// Add for strong positive indicators
		if (indicators.includes(INDICATOR_STRUCTURED_DATA)) confidence += 0.4;
		if (indicators.includes(INDICATOR_STATIC_TITLE) && !is404Page) confidence += 0.3;
		if (indicators.includes(INDICATOR_META_DESCRIPTION)) confidence += 0.2;
		if (indicators.includes(INDICATOR_IMAGE_ELEMENTS) && !is404Page) confidence += 0.1;
		if (indicators.includes(INDICATOR_SKU_PATTERN_FOUND)) confidence += 0.1;

		// Subtract for negative indicators
		if (indicators.includes(INDICATOR_LOADING_PLACEHOLDER)) confidence -= 0.3;
		if (indicators.includes(INDICATOR_SCRIPT_DATA_SOURCE)) confidence -= 0.2;
		if (indicators.includes("spa-framework")) confidence -= 0.2;
		if (indicators.includes("client-side-scripts")) confidence -= 0.1;
		if (indicators.includes("minimal-content")) confidence -= 0.4;
		if (indicators.includes(INDICATOR_EMPTY_CONTENT)) confidence -= 0.3;
		if (indicators.includes("non-html-content")) confidence -= 0.5;

		// Heavy penalty for 404 pages - they need JavaScript
		if (is404Page) {
			confidence = Math.min(confidence, 0.2);
		}

		// Heavy penalty for script-data-source without other real content
		if (indicators.includes(INDICATOR_SCRIPT_DATA_SOURCE) &&
        !indicators.includes(INDICATOR_STRUCTURED_DATA) &&
        !indicators.includes(INDICATOR_SKU_PATTERN_FOUND)) {
			confidence = Math.min(confidence, 0.3);
		}

		// Don't artificially inflate confidence - remove minimum threshold
		if (!hasStaticData && confidence > 0.7) {
			confidence = 0.7;
		}

		return Math.max(0, Math.min(1, confidence));
	}

	/**
   * Clean text content by removing HTML tags and normalizing whitespace
   */
	private cleanText(text: string): string {
		return text
			.replaceAll(/<[^>]*>/g, "") // Remove HTML tags
			.replaceAll(/\s+/g, " ") // Normalize whitespace
			.trim();
	}
}