export type RenderingType = "static" | "dynamic" | "hybrid" | "unknown";

export type RenderingDetectionMethod =
  | "content-analysis"
  | "network-analysis"
  | "dom-monitoring"
  | "heuristic";

export interface RenderingDetection {
  renderingType: RenderingType;
  detectionMethod: RenderingDetectionMethod;
  initialContentLength: number;
  finalContentLength: number;
  requiresJavaScript: boolean;
  jsExecutionTime: number; // milliseconds
  detectedAt: number; // Unix timestamp
  confidence: number; // 0.0 - 1.0
  indicators: {
    hasDynamicContent: boolean;
    hasLazyLoading: boolean;
    hasAjaxCalls: boolean;
    hasFrameworkSignals: boolean;
    hasCSPRestrictions: boolean;
    minimalStaticContent: boolean;
  };
}

export interface ProgressiveEnhancementResult {
  staticAnalysis: {
    sufficient: boolean;
    contentLength: number;
    missingFields: string[];
  };
  dynamicAnalysis: {
    required: boolean;
    additionalContent: number;
    frameworkDetected?: string;
    waitForSelectors: string[];
  };
  recommendation: "static-only" | "dynamic-required" | "hybrid-approach";
}

export interface RenderingConfig {
  enableProgressiveEnhancement: boolean;
  staticContentThreshold: number; // bytes
  dynamicContentThreshold: number; // bytes
  jsExecutionTimeout: number; // milliseconds
  frameworkDetection: boolean;
}