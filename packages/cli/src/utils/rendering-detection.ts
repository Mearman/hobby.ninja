import { RenderingDetection, RenderingType, ProgressiveEnhancementResult } from '../types/rendering-detection.js';

export class RenderingDetector {
  private static readonly FRAMEWORK_PATTERNS = {
    react: /react|React|createElement|useState|useEffect/i,
    vue: /vue|Vue|v-if|v-for|@click/i,
    angular: /angular|ng-if|ngFor|ng-model/i,
    nextjs: /next|Next\.js|getStaticProps|getServerSideProps/i,
    svelte: /svelte|Svelte|bind:/i
  };

  private static readonly DYNAMIC_INDICATORS = [
    'data-reactroot',
    'ng-version',
    'v-app',
    'id="app"',
    'data-vue',
    'data-svelte'
  ];

  private static readonly LAZY_LOADING_PATTERNS = [
    /loading|spinner|placeholder|skeleton/i,
    /lazy|defer|async/i,
    /intersectionobserver|mutationobserver/i
  ];

  static async detectRenderingStrategy(html: string, options: {
    testWithPlaywright?: boolean;
    timeout?: number;
  } = {}): Promise<RenderingDetection> {
    const startTime = Date.now();
    const initialLength = html.length;

    const staticAnalysis = this.analyzeStaticContent(html);
    let requiresJS = false;
    let jsExecutionTime = 0;

    if (staticAnalysis.minimalStaticContent || this.hasDynamicIndicators(html)) {
      requiresJS = true;

      if (options.testWithPlaywright) {
        // In a real implementation, this would launch Playwright
        // For now, simulate based on content analysis
        await this.simulateDynamicContent(html);
        jsExecutionTime = Date.now() - startTime;
      }
    }

    return {
      renderingType: this.determineRenderingType(html, requiresJS),
      detectionMethod: 'content-analysis',
      initialContentLength: initialLength,
      finalContentLength: initialLength,
      requiresJavaScript: requiresJS,
      jsExecutionTime,
      detectedAt: Date.now(),
      confidence: this.calculateConfidence(html, staticAnalysis),
      indicators: this.getIndicators(html, staticAnalysis)
    };
  }

  static analyzeProgressiveEnhancement(html: string): ProgressiveEnhancementResult {
    const staticAnalysis = this.analyzeStaticContent(html);
    const dynamicAnalysis = this.analyzeDynamicContent(html);

    return {
      staticAnalysis: {
        sufficient: staticAnalysis.sufficient,
        contentLength: html.length,
        missingFields: staticAnalysis.missingFields
      },
      dynamicAnalysis: {
        required: dynamicAnalysis.required,
        additionalContent: dynamicAnalysis.additionalContent,
        frameworkDetected: dynamicAnalysis.framework,
        waitForSelectors: dynamicAnalysis.waitForSelectors
      },
      recommendation: this.getRecommendation(staticAnalysis, dynamicAnalysis)
    };
  }

  private static analyzeStaticContent(html: string) {
    const sufficient = !this.hasMinimalContent(html);
    const missingFields = this.identifyMissingFields(html);

    return {
      sufficient,
      missingFields,
      minimalStaticContent: html.length < 2000,
      hasFrameworkSignals: this.detectFrameworkSignals(html)
    };
  }

  private static analyzeDynamicContent(html: string) {
    const required = this.hasDynamicIndicators(html);
    const framework = this.detectFramework(html);
    const waitForSelectors = this.extractWaitForSelectors(html);

    return {
      required,
      additionalContent: required ? 5000 : 0, // Estimated additional content
      framework,
      waitForSelectors
    };
  }

  private static hasMinimalContent(html: string): boolean {
    const textContent = this.extractTextContent(html);
    return textContent.length < 500;
  }

  private static hasDynamicIndicators(html: string): boolean {
    return this.DYNAMIC_INDICATORS.some(indicator => html.includes(indicator)) ||
           this.LAZY_LOADING_PATTERNS.some(pattern => pattern.test(html)) ||
           this.hasEmptyContainers(html);
  }

  private static hasEmptyContainers(html: string): boolean {
    const emptyDivs = (html.match(/<div[^>]*>\s*<\/div>/gi) || []).length;
    const emptySpans = (html.match(/<span[^>]*>\s*<\/span>/gi) || []).length;
    return emptyDivs > 5 || emptySpans > 10;
  }

  private static detectFramework(html: string): string | undefined {
    for (const [framework, pattern] of Object.entries(this.FRAMEWORK_PATTERNS)) {
      if (pattern.test(html)) {
        return framework;
      }
    }
    return undefined;
  }

  private static detectFrameworkSignals(html: string): boolean {
    return Object.values(this.FRAMEWORK_PATTERNS).some(pattern => pattern.test(html));
  }

  private static extractWaitForSelectors(html: string): string[] {
    const selectors: string[] = [];

    // Common selectors that might indicate dynamic content
    const commonSelectors = [
      '.content',
      '.main',
      '#app',
      '.products',
      '.items',
      '[data-loaded]',
      '.loaded'
    ];

    for (const selector of commonSelectors) {
      const element = html.match(new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'));
      if (element && element.length > 0) {
        selectors.push(selector);
      }
    }

    return selectors;
  }

  private static identifyMissingFields(html: string): string[] {
    const missing: string[] = [];
    const lowerHtml = html.toLowerCase();

    // Check for common missing content indicators
    if (!lowerHtml.includes('price') || !lowerHtml.includes('¥') || !lowerHtml.includes('$')) {
      missing.push('price');
    }

    if (!lowerHtml.includes('description') && !lowerHtml.includes('詳細')) {
      missing.push('description');
    }

    if (!lowerHtml.includes('specification') && !lowerHtml.includes('仕様')) {
      missing.push('specifications');
    }

    if (!lowerHtml.includes('image') && !lowerHtml.includes('img')) {
      missing.push('images');
    }

    return missing;
  }

  private static extractTextContent(html: string): string {
    // Remove scripts and styles, then extract text
    const cleanHtml = html
      .replace(/<script[^>]*>.*?<\/script>/gis, '')
      .replace(/<style[^>]*>.*?<\/style>/gis, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return cleanHtml;
  }

  private static determineRenderingType(html: string, requiresJS: boolean): RenderingType {
    if (!requiresJS) {
      return 'static';
    }

    const framework = this.detectFramework(html);
    if (framework) {
      return 'dynamic';
    }

    // Check if it's a hybrid case (some static content but requires JS for completeness)
    const hasSubstantialStaticContent = !this.hasMinimalContent(html);
    const hasDynamicEnhancements = this.hasDynamicIndicators(html);

    if (hasSubstantialStaticContent && hasDynamicEnhancements) {
      return 'hybrid';
    }

    return 'dynamic';
  }

  private static calculateConfidence(html: string, _analysis: any): number {
    let confidence = 0.5; // Base confidence

    // High confidence indicators
    if (html.includes('lang="') || html.includes("lang='")) confidence += 0.2;
    if (this.detectFramework(html)) confidence += 0.15;
    if (!this.hasMinimalContent(html)) confidence += 0.1;
    if (this.hasDynamicIndicators(html)) confidence += 0.05;

    return Math.min(confidence, 1.0);
  }

  private static getIndicators(html: string, _analysis: any) {
    return {
      hasDynamicContent: this.hasDynamicIndicators(html),
      hasLazyLoading: this.LAZY_LOADING_PATTERNS.some(pattern => pattern.test(html)),
      hasAjaxCalls: html.includes('fetch(') || html.includes('axios') || html.includes('XMLHttpRequest'),
      hasFrameworkSignals: this.detectFrameworkSignals(html),
      hasCSPRestrictions: html.includes('Content-Security-Policy'),
      minimalStaticContent: this.hasMinimalContent(html)
    };
  }

  private static getRecommendation(staticAnalysis: any, dynamicAnalysis: any): 'static-only' | 'dynamic-required' | 'hybrid-approach' {
    if (staticAnalysis.sufficient && !dynamicAnalysis.required) {
      return 'static-only';
    }

    if (!staticAnalysis.sufficient || dynamicAnalysis.required) {
      return 'dynamic-required';
    }

    return 'hybrid-approach';
  }

  private static async simulateDynamicContent(html: string): Promise<number> {
    // Simulate dynamic content loading
    // In a real implementation, this would use Playwright
    const baseLength = html.length;
    const dynamicMultiplier = Math.random() * 2 + 1; // 1-3x increase
    return Math.floor(baseLength * dynamicMultiplier);
  }
}