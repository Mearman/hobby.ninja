import { CONTENT_DETECTION, RENDERING_DETECTION } from "../constants/index.js";
import { RenderingType, ProgressiveEnhancementResult, RenderingDetection } from "../types/rendering-detection.js";


// Framework detection patterns
const FRAMEWORK_PATTERNS = {
	react: /react|React|createElement|useState|useEffect/i,
	vue: /vue|Vue|v-if|v-for|@click/i,
	angular: /angular|ng-if|ngFor|ng-model/i,
	nextjs: /next|Next\.js|getStaticProps|getServerSideProps/i,
	svelte: /svelte|Svelte|bind:/i,
};

// Dynamic rendering indicators
const DYNAMIC_INDICATORS = [
	"data-reactroot",
	"ng-version",
	"v-app",
	'id="app"',
	"data-vue",
	"data-svelte",
];

// Lazy loading patterns
const LAZY_LOADING_PATTERNS = [
	/loading|spinner|placeholder|skeleton/i,
	/lazy|defer|async/i,
	/intersectionobserver|mutationobserver/i,
];

function analyzeStaticContent(html: string) {
	const sufficient = !hasMinimalContent(html);
	const missingFields = identifyMissingFields(html);

	return {
		sufficient,
		missingFields,
		minimalStaticContent: html.length < CONTENT_DETECTION.MIN_CONTENT_LENGTH,
		hasFrameworkSignals: detectFrameworkSignals(html),
	};
}

function analyzeDynamicContent(html: string) {
	const required = hasDynamicIndicators(html);
	const framework = detectFramework(html);
	const waitForSelectors = extractWaitForSelectors(html);

	return {
		required,
		additionalContent: required ? CONTENT_DETECTION.DYNAMIC_CONTENT_TIMEOUT : 0,
		framework,
		waitForSelectors,
	};
}

function hasMinimalContent(html: string): boolean {
	const textContent = extractTextContent(html);
	return textContent.length < CONTENT_DETECTION.MIN_TEXT_CONTENT_LENGTH;
}

function hasDynamicIndicators(html: string): boolean {
	return DYNAMIC_INDICATORS.some(indicator => html.includes(indicator)) ||
           LAZY_LOADING_PATTERNS.some(pattern => pattern.test(html)) ||
           hasEmptyContainers(html);
}

function hasEmptyContainers(html: string): boolean {
	const emptyDivs = (html.match(/<div[^>]*>\s*<\/div>/gi) ?? []).length;
	const emptySpans = (html.match(/<span[^>]*>\s*<\/span>/gi) ?? []).length;
	return emptyDivs > RENDERING_DETECTION.MIN_UNIQUE_SELECTORS || emptySpans > RENDERING_DETECTION.MAX_UNIQUE_SELECTORS;
}

function detectFramework(html: string): string | undefined {
	for (const [framework, pattern] of Object.entries(FRAMEWORK_PATTERNS)) {
		if (pattern.test(html)) {
			return framework;
		}
	}
	return undefined;
}

function detectFrameworkSignals(html: string): boolean {
	return Object.values(FRAMEWORK_PATTERNS).some(pattern => pattern.test(html));
}

function extractWaitForSelectors(html: string): string[] {
	// Extract common selectors that might need waiting for
	const selectors: string[] = [];

	// Look for common dynamic content selectors
	const commonSelectors = [
		".loading",
		".spinner",
		"[data-loading]",
		".lazy-load",
		".dynamic-content",
	];

	for (const selector of commonSelectors) {
		if (html.includes(selector)) {
			selectors.push(selector);
		}
	}

	return selectors;
}

function identifyMissingFields(html: string): string[] {
	const missing: string[] = [];

	// Check for common missing indicators
	if (!html.includes("<img")) missing.push("images");
	if (!/<h[1-6]/i.test(html)) missing.push("headings");
	if (!html.includes("<p")) missing.push("paragraphs");

	return missing;
}

function extractTextContent(html: string): string {
	// Simple text extraction - remove HTML tags
	return html.replaceAll(/<[^>]*>/g, "").trim();
}

function hasAjaxCalls(html: string): boolean {
	return /fetch\(|XMLHttpRequest|\.ajax\(|axios\./i.test(html);
}

function hasCSPRestrictions(html: string): boolean {
	return /content-security-policy|CSP|script-src/i.test(html);
}

function determineRenderingType(html: string, requiresJS: boolean): RenderingType {
	const framework = detectFramework(html);

	if (framework === "nextjs") {
		return "ssr-with-hydration";
	}

	if (requiresJS) {
		return framework ? "csr-with-framework" : "vanilla-csr";
	}

	return "static-html";
}

function getIndicators(html: string, staticAnalysis: { minimalStaticContent: boolean }) {
	return {
		hasDynamicContent: hasDynamicIndicators(html),
		hasLazyLoading: LAZY_LOADING_PATTERNS.some(pattern => pattern.test(html)),
		hasAjaxCalls: hasAjaxCalls(html),
		hasFrameworkSignals: detectFrameworkSignals(html),
		hasCSPRestrictions: hasCSPRestrictions(html),
		minimalStaticContent: staticAnalysis.minimalStaticContent,
	};
}

function getRecommendation(staticAnalysis: { minimalStaticContent: boolean }, dynamicAnalysis: { required: boolean }): ProgressiveEnhancementResult["recommendation"] {
	if (dynamicAnalysis.required && staticAnalysis.minimalStaticContent) {
		return "requires-javascript-first";
	}

	if (dynamicAnalysis.required) {
		return "dynamic-required";
	}

	if (staticAnalysis.minimalStaticContent) {
		return "hybrid-approach";
	}

	return "static-only";
}

function calculateConfidence(html: string, _analysis: RenderingDetection): number {
	let confidence = 0.5; // Base confidence

	// High confidence indicators
	if (html.includes('lang="') || html.includes("lang='")) confidence += RENDERING_DETECTION.CONTENT_SIMILARITY_THRESHOLD;
	if (detectFramework(html)) confidence += RENDERING_DETECTION.STRUCTURE_SIMILARITY_THRESHOLD;
	if (!hasMinimalContent(html)) confidence += RENDERING_DETECTION.INTERACTION_THRESHOLD;
	if (hasDynamicIndicators(html)) confidence += RENDERING_DETECTION.LAZY_LOAD_THRESHOLD;

	return Math.min(confidence, 1);
}

function simulateDynamicContent(html: string): number {
	// Simulate dynamic content loading
	// In a real implementation, this would use Playwright
	const baseLength = html.length;
	const dynamicMultiplier = Math.random() * 2 + 1; // 1-3x increase
	return Math.floor(baseLength * dynamicMultiplier);
}

export function detectRenderingStrategy(html: string, options: {
    testWithPlaywright?: boolean;
    timeout?: number;
  } = {}): RenderingDetection {
	const startTime = Date.now();

	const staticAnalysis = analyzeStaticContent(html);
	let requiresJS = false;

	if (staticAnalysis.minimalStaticContent || hasDynamicIndicators(html)) {
		requiresJS = true;

		if (options.testWithPlaywright) {
			// In a real implementation, this would launch Playwright
			// For now, simulate based on content analysis
			simulateDynamicContent(html);
		}
	}

	const detectionTime = Date.now() - startTime;

	return {
		renderingType: determineRenderingType(html, requiresJS),
		detectionMethod: "content-analysis",
		initialContentLength: html.length,
		finalContentLength: html.length,
		requiresJavaScript: requiresJS,
		jsExecutionTime: requiresJS ? detectionTime : 0,
		detectedAt: Date.now(),
		confidence: calculateConfidence(html, {
			renderingType: determineRenderingType(html, requiresJS),
			detectionMethod: "content-analysis",
			initialContentLength: html.length,
			finalContentLength: html.length,
			requiresJavaScript: requiresJS,
			jsExecutionTime: 0,
			detectedAt: Date.now(),
			confidence: 0,
			indicators: getIndicators(html, staticAnalysis),
		}),
		indicators: getIndicators(html, staticAnalysis),
	};
}

export function analyzeProgressiveEnhancement(html: string): ProgressiveEnhancementResult {
	const staticAnalysis = analyzeStaticContent(html);
	const dynamicAnalysis = analyzeDynamicContent(html);

	return {
		staticAnalysis: {
			sufficient: staticAnalysis.sufficient,
			missingFields: staticAnalysis.missingFields,
			contentLength: html.length,
		},
		dynamicAnalysis: {
			required: dynamicAnalysis.required,
			additionalContent: dynamicAnalysis.additionalContent,
			waitForSelectors: dynamicAnalysis.waitForSelectors,
		},
		recommendation: getRecommendation(staticAnalysis, dynamicAnalysis),
	};
}

export class RenderingDetector {
	detect(html: string, options?: { testWithPlaywright?: boolean; timeout?: number }): RenderingDetection {
		return detectRenderingStrategy(html, options);
	}

	detectRenderingStrategy(html: string, options?: { testWithPlaywright?: boolean; timeout?: number }): RenderingDetection {
		return detectRenderingStrategy(html, options);
	}

	analyzeProgressiveEnhancement(html: string): ProgressiveEnhancementResult {
		return analyzeProgressiveEnhancement(html);
	}
}

// Export the type for use in other modules
export type { RenderingDetection } from "../types/rendering-detection.js";

