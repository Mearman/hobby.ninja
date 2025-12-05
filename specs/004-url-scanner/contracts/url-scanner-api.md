# URL Scanner API Contracts

**Date**: 2025-12-05
**Format**: Internal API Contracts for URL Validation Scanner

## Core Scanner Interface

```typescript
interface IURLScanner {
  /**
   * Start a new scanning session or resume existing one
   */
  scan(config: ScanConfiguration): Promise<ScanResults>;

  /**
   * Get current progress state
   */
  getProgress(): Promise<ProgressState | null>;

  /**
   * Pause current scanning session
   */
  pause(): Promise<void>;

  /**
   * Resume paused scanning session
   */
  resume(): Promise<void>;

  /**
   * Cancel scanning session
   */
  cancel(): Promise<void>;
}
```

## URL Checker Interface

```typescript
interface IURLChecker {
  /**
   * Check a single URL for validity and data availability
   */
  checkURL(url: string, options: CheckOptions): Promise<URLCheckResult>;

  /**
   * Check multiple URLs concurrently
   */
  checkURLs(urls: string[], options: CheckOptions): Promise<URLCheckResult[]>;
}

interface CheckOptions {
  timeoutMs: number;
  followRedirects: boolean;
  maxRedirects: number;
  userAgent?: string;
  retryAttempts: number;
}
```

## Static Data Detector Interface

```typescript
interface IStaticDataDetector {
  /**
   * Analyze HTML content to determine if essential data is statically available
   */
  detectStaticData(html: string, url: string, headers: Headers): Promise<DetectionResult>;
}

interface DetectionResult {
  hasStaticData: boolean;
  dataType: 'complete' | 'partial' | 'none';
  confidence: number;
  indicators: string[];
  extractedData?: {
    title?: string;
    sku?: string;
    description?: string;
    images?: string[];
  };
}
```

## Progress Manager Interface

```typescript
interface IProgressManager {
  /**
   * Save current progress state
   */
  saveProgress(state: ProgressState): Promise<void>;

  /**
   * Load existing progress state
   */
  loadProgress(): Promise<ProgressState | null>;

  /**
   * Clear progress state
   */
  clearProgress(): Promise<void>;
}
```

## Output Manager Interface

```typescript
interface IOutputManager {
  /**
   * Write URL check result to appropriate classification file
   */
  writeResult(result: URLCheckResult): Promise<void>;

  /**
   * Get current statistics
   */
  getStatistics(): Promise<ScanStatistics>;

  /**
   * Generate summary report
   */
  generateSummary(): Promise<ScanSummary>;
}

interface ScanStatistics {
  totalChecked: number;
  validStatic: number;
  validDynamic: number;
  invalid: number;
  errors: number;
  averageRequestTime: number;
}

interface ScanSummary {
  scanId: string;
  startedAt: string;
  completedAt: string;
  statistics: ScanStatistics;
  outputFiles: string[];
}
```

## File Manager Interface

```typescript
interface IFileManager {
  /**
   * Ensure output directory exists
   */
  ensureOutputDirectory(path: string): Promise<void>;

  /**
   * Write data to file atomically
   */
  writeFileAtomic(filePath: string, data: string): Promise<void>;

  /**
   * Read file contents
   */
  readFile(filePath: string): Promise<string>;

  /**
   * Check if file exists
   */
  fileExists(filePath: string): Promise<boolean>;
}
```

## Event System

```typescript
interface IScannerEvents {
  'scan:started': (scanId: string) => void;
  'scan:progress': (state: ProgressState) => void;
  'scan:paused': (scanId: string) => void;
  'scan:resumed': (scanId: string) => void;
  'scan:completed': (results: ScanResults) => void;
  'scan:failed': (scanId: string, error: Error) => void;
  'url:checked': (result: URLCheckResult) => void;
  'url:error': (url: string, error: Error) => void;
}

interface IEventEmitter {
  on<T extends keyof IScannerEvents>(event: T, listener: IScannerEvents[T]): void;
  off<T extends keyof IScannerEvents>(event: T, listener: IScannerEvents[T]): void;
  emit<T extends keyof IScannerEvents>(event: T, ...args: Parameters<IScannerEvents[T]>): void;
}
```

## Configuration Schema

```typescript
const ScanConfigurationSchema = {
  type: "object",
  required: ["urlPatterns", "outputDirectory"],
  properties: {
    urlPatterns: {
      type: "array",
      items: { $ref: "#/$defs/URLPattern" }
    },
    concurrency: { type: "number", minimum: 1, maximum: 50, default: 10 },
    timeoutMs: { type: "number", minimum: 1000, maximum: 30000, default: 5000 },
    retryAttempts: { type: "number", minimum: 0, maximum: 5, default: 3 },
    requestDelayMs: { type: "number", minimum: 0, maximum: 5000, default: 100 },
    outputDirectory: { type: "string" },
    followRedirects: { type: "boolean", default: true },
    maxRedirects: { type: "number", minimum: 1, maximum: 10, default: 5 },
    userAgent: { type: "string" }
  }
};
```