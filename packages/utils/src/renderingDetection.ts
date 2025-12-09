import type { RenderingDetection, ProgressiveEnhancementResult, RenderingType } from "@hobby-ninja/types/profile";

import {
	MIN_HTML_CONTENT_LENGTH,
	MIN_TEXT_CONTENT_LENGTH,
	MAX_DOM_COMPLEXITY,
	EMPTY_DIV_THRESHOLD,
	EMPTY_SPAN_THRESHOLD,
	ADDITIONAL_CONTENT_ESTIMATE,
	NESTED_DIV_MULTIPLIER,
	DYNAMIC_MULTIPLIER_MIN,
	DYNAMIC_MULTIPLIER_RANGE,
	BASE_CONFIDENCE,
	LANG_ATTRIBUTE_INCREMENT,
	FRAMEWORK_DETECTION_INCREMENT,
	SUFFICIENT_CONTENT_INCREMENT,
	DYNAMIC_INDICATORS_INCREMENT,
} from "./constants";

const FRAMEWORK_PATTERNS: Record<string, RegExp> = {
	react: /react|React|createElement|useState|useEffect/i,
	vue: /vue|Vue|v-if|v-for|@click/i,
	angular: /angular|ng-if|ngFor|ng-model/i,
	nextjs: /next|Next\.js|getStaticProps|getServerSideProps/i,
	svelte: /svelte|Svelte|bind:/i,
};

const DYNAMIC_INDICATORS = [
	"data-reactroot",
	"ng-version",
	"v-app",
	'id="app"',
	"data-vue",
	"data-svelte",
];

const LAZY_LOADING_PATTERNS = [
	/loading|spinner|placeholder|skeleton/i,
	/lazy|defer|async/i,
	/intersectionobserver|mutationobserver/i,
];

interface StaticAnalysis {
	sufficient: boolean;
	missingFields: string[];
	minimalStaticContent: boolean;
	hasFrameworkSignals: boolean;
}

interface DynamicAnalysis {
	required: boolean;
	additionalContent: number;
	framework: string | undefined;
	waitForSelectors: string[];
}

export function detectRenderingStrategy(html: string, options: {
	testWithPlaywright?: boolean;
	timeout?: number;
} = {}): RenderingDetection {
	const startTime = Date.now();
	const initialLength = html.length;

	const staticAnalysis = analyzeStaticContent(html);
	let requiresJS = false;
	let jsExecutionTime = 0;

	if (staticAnalysis.minimalStaticContent || hasDynamicIndicators(html)) {
		requiresJS = true;

		if (options.testWithPlaywright) {
			simulateDynamicContent(html);
			jsExecutionTime = Date.now() - startTime;
		}
	}

	const renderingType = determineRenderingType(html, requiresJS);
	return {
		renderingType,
		requiresPlaywright: requiresJS,
		recommendation: renderingType === "static" ? "cheerio" : "playwright",
		evidence: [requiresJS ? "requires JavaScript" : "static content sufficient"],
		detectionMethod: "content-analysis",
		initialContentLength: initialLength,
		finalContentLength: initialLength,
		requiresJavaScript: requiresJS,
		jsExecutionTime,
		detectedAt: Date.now(),
		confidence: calculateConfidence(html),
		indicators: getIndicators(html),
		domComplexity: calculateDomComplexity(html),
	};
}

function calculateDomComplexity(html: string): number {
	// Simple heuristic based on HTML structure
	const tagCount = (html.match(/<[a-z]/gi) ?? []).length;
	const nestedDivs = (html.match(/<div[^>]*>/gi) ?? []).length;
	return Math.min(tagCount + nestedDivs * NESTED_DIV_MULTIPLIER, MAX_DOM_COMPLEXITY);
}

export function analyzeProgressiveEnhancement(html: string): ProgressiveEnhancementResult {
	const staticAnalysis = analyzeStaticContent(html);
	const dynamicAnalysis = analyzeDynamicContent(html);

	return {
		hasProgressiveEnhancement: staticAnalysis.sufficient && dynamicAnalysis.required,
		hasDynamicContent: dynamicAnalysis.required,
		renderingType: staticAnalysis.sufficient && !dynamicAnalysis.required ? "static" :
			dynamicAnalysis.required ? "dynamic" : "static",
		confidence: calculateConfidence(html),
		requiresPlaywright: dynamicAnalysis.required,
		recommendation: getRecommendation(staticAnalysis, dynamicAnalysis),
		evidence: [],
		staticAnalysis: {
			frameworkIndicators: staticAnalysis.hasFrameworkSignals ? ["detected"] : [],
			complexity: html.length,
			sufficient: staticAnalysis.sufficient,
			contentLength: html.length,
			missingFields: staticAnalysis.missingFields,
		},
		dynamicAnalysis: dynamicAnalysis.framework ? {
			required: dynamicAnalysis.required,
			additionalContent: dynamicAnalysis.additionalContent,
			frameworkDetected: dynamicAnalysis.framework,
			waitForSelectors: dynamicAnalysis.waitForSelectors,
		} : {
			required: dynamicAnalysis.required,
			additionalContent: dynamicAnalysis.additionalContent,
			waitForSelectors: dynamicAnalysis.waitForSelectors,
		},
	};
}

function analyzeStaticContent(html: string): StaticAnalysis {
	const sufficient = !hasMinimalContent(html);
	const missingFields = identifyMissingFields(html);

	return {
		sufficient,
		missingFields,
		minimalStaticContent: html.length < MIN_HTML_CONTENT_LENGTH,
		hasFrameworkSignals: detectFrameworkSignals(html),
	};
}

function analyzeDynamicContent(html: string): DynamicAnalysis {
	const required = hasDynamicIndicators(html);
	const framework = detectFramework(html);
	const waitForSelectors = extractWaitForSelectors(html);

	return {
		required,
		additionalContent: required ? ADDITIONAL_CONTENT_ESTIMATE : 0,
		framework,
		waitForSelectors,
	};
}

function hasMinimalContent(html: string): boolean {
	const textContent = extractTextContent(html);
	return textContent.length < MIN_TEXT_CONTENT_LENGTH;
}

function hasDynamicIndicators(html: string): boolean {
	return DYNAMIC_INDICATORS.some(indicator => html.includes(indicator)) ||
		LAZY_LOADING_PATTERNS.some(pattern => pattern.test(html)) ||
		hasEmptyContainers(html);
}

function hasEmptyContainers(html: string): boolean {
	const emptyDivs = (html.match(/<div[^>]*>\s*<\/div>/gi) ?? []).length;
	const emptySpans = (html.match(/<span[^>]*>\s*<\/span>/gi) ?? []).length;
	return emptyDivs > EMPTY_DIV_THRESHOLD || emptySpans > EMPTY_SPAN_THRESHOLD;
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
	const selectors: string[] = [];

	const commonSelectors = [
		".content",
		".main",
		"#app",
		".products",
		".items",
		"[data-loaded]",
		".loaded",
	];

	for (const selector of commonSelectors) {
		const element = html.match(new RegExp(selector.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`), "g"));
		if (element && element.length > 0) {
			selectors.push(selector);
		}
	}

	return selectors;
}

function identifyMissingFields(html: string): string[] {
	const missing: string[] = [];
	const lowerHtml = html.toLowerCase();

	if (!lowerHtml.includes("price") || !lowerHtml.includes("¥") || !lowerHtml.includes("$")) {
		missing.push("price");
	}

	if (!lowerHtml.includes("description") && !lowerHtml.includes("詳細")) {
		missing.push("description");
	}

	if (!lowerHtml.includes("specification") && !lowerHtml.includes("仕様")) {
		missing.push("specifications");
	}

	if (!lowerHtml.includes("image") && !lowerHtml.includes("img")) {
		missing.push("images");
	}

	return missing;
}

function extractTextContent(html: string): string {
	const cleanHtml = html
		.replaceAll(/<script[^>]*>.*?<\/script>/gis, "")
		.replaceAll(/<style[^>]*>.*?<\/style>/gis, "")
		.replaceAll(/<[^>]+>/g, " ")
		.replaceAll(/\s+/g, " ")
		.trim();

	return cleanHtml;
}

function determineRenderingType(html: string, requiresJS: boolean): RenderingType {
	if (!requiresJS) {
		return "static";
	}

	const framework = detectFramework(html);
	if (framework) {
		return "dynamic";
	}

	const hasSubstantialStaticContent = !hasMinimalContent(html);
	const hasDynamicEnhancements = hasDynamicIndicators(html);

	if (hasSubstantialStaticContent && hasDynamicEnhancements) {
		return "hybrid";
	}

	return "dynamic";
}

function calculateConfidence(html: string): number {
	let confidence = BASE_CONFIDENCE;

	if (html.includes('lang="') || html.includes("lang='")) confidence += LANG_ATTRIBUTE_INCREMENT;
	if (detectFramework(html)) confidence += FRAMEWORK_DETECTION_INCREMENT;
	if (!hasMinimalContent(html)) confidence += SUFFICIENT_CONTENT_INCREMENT;
	if (hasDynamicIndicators(html)) confidence += DYNAMIC_INDICATORS_INCREMENT;

	return Math.min(confidence, 1);
}

function getIndicators(html: string): string[] {
	const indicators: string[] = [];

	if (hasDynamicIndicators(html)) indicators.push("hasDynamicContent");
	if (LAZY_LOADING_PATTERNS.some(pattern => pattern.test(html))) indicators.push("hasLazyLoading");
	if (html.includes("fetch(") || html.includes("axios") || html.includes("XMLHttpRequest")) indicators.push("hasAjaxCalls");
	if (detectFrameworkSignals(html)) indicators.push("hasFrameworkSignals");
	if (html.includes("Content-Security-Policy")) indicators.push("hasCSPRestrictions");
	if (hasMinimalContent(html)) indicators.push("minimalStaticContent");

	return indicators;
}

function getRecommendation(staticAnalysis: { sufficient: boolean }, dynamicAnalysis: { required: boolean }): "static-only" | "dynamic-required" | "hybrid-approach" {
	if (staticAnalysis.sufficient && !dynamicAnalysis.required) {
		return "static-only";
	}

	if (!staticAnalysis.sufficient || dynamicAnalysis.required) {
		return "dynamic-required";
	}

	return "hybrid-approach";
}

function simulateDynamicContent(html: string): number {
	const baseLength = html.length;
	const dynamicMultiplier = Math.random() * DYNAMIC_MULTIPLIER_RANGE + DYNAMIC_MULTIPLIER_MIN;
	return Math.floor(baseLength * dynamicMultiplier);
}