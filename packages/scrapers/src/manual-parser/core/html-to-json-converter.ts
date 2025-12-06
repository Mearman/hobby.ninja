import { ManualDocument, ProcessingMetadata } from '@workspace/types';
import { HtmlParser } from './html-parser';
import { JsonFormatter, JsonFormatterOptions } from './json-formatter';
import { ManualDocumentValidator } from './validator';
import { ParseError, ValidationError } from './errors';
import { logger, PerformanceLogger } from '../utils';

export interface HtmlToJsonOptions {
  formatter?: JsonFormatterOptions;
  validateInput?: boolean;
  validateOutput?: boolean;
  includePerformanceMetrics?: boolean;
  strictMode?: boolean;
}

export interface ConversionResult {
  success: boolean;
  document?: ManualDocument;
  json?: string;
  errors: string[];
  warnings: string[];
  performance?: {
    parseTime: number;
    formatTime: number;
    totalTime: number;
    fileSize?: number;
    nodeCount?: number;
  };
  stats?: {
    totalBlocks: number;
    blocksByType: Record<string, number>;
    japaneseTextBlocks: number;
    englishTextBlocks: number;
  };
}

/**
 * End-to-end HTML to JSON converter for Bandai manuals
 * Combines parsing, validation, and formatting in a single interface
 */
export class HtmlToJsonConverter {
  private readonly parser: HtmlParser;
  private readonly validator: ManualDocumentValidator;
  private readonly logger: ReturnType<typeof logger.child>;
  private readonly options: Required<HtmlToJsonOptions>;

  constructor(options: HtmlToJsonOptions = {}) {
    this.options = {
      formatter: options.formatter ?? {
        indent: 2,
        validateOutput: true,
        includeMetadata: true,
        compress: false,
        sortKeys: false
      },
      validateInput: options.validateInput ?? true,
      validateOutput: options.validateOutput ?? true,
      includePerformanceMetrics: options.includePerformanceMetrics ?? true,
      strictMode: options.strictMode ?? false,
    };

    this.parser = new HtmlParser({ logger: logger.child({ component: 'HtmlParser' }) });
    this.validator = new ManualDocumentValidator();
    this.logger = logger.child({ component: 'HtmlToJsonConverter' });
  }

  /**
   * Convert HTML string to JSON with comprehensive validation and error reporting
   */
  async convert(html: string, filePath: string): Promise<ConversionResult> {
    const overallStartTime = Date.now();
    const result: ConversionResult = {
      success: false,
      errors: [],
      warnings: [],
      performance: {
        parseTime: 0,
        formatTime: 0,
        totalTime: 0
      }
    };

    try {
      // Input validation
      if (this.options.validateInput) {
        const inputValidation = this.validateInput(html, filePath);
        if (!inputValidation.valid) {
          result.errors.push(...inputValidation.errors);
          return result;
        }
      }

      // Parse HTML to ManualDocument
      const parseStartTime = Date.now();
      const parseResult = await this.parser.parse(html, filePath);
      result.performance!.parseTime = Date.now() - parseStartTime;

      if (!parseResult) {
        result.errors.push('HTML parsing failed to produce output');
        return result;
      }

      result.document = parseResult;

      // Comprehensive validation
      if (this.options.validateOutput) {
        const validationStartTime = Date.now();
        const validation = this.validator.validateComprehensive(parseResult);

        if (!validation.valid) {
          result.errors.push(...validation.errors);
          if (this.options.strictMode) {
            return result;
          }
        }

        result.warnings.push(...validation.warnings);
        result.stats = validation.stats;

        this.logger.debug('Document validation completed', {
          errors: validation.errors.length,
          warnings: validation.warnings.length,
          stats: validation.stats
        });
      }

      // Format to JSON
      const formatStartTime = Date.now();
      const formatter = new JsonFormatter(this.options.formatter);
      const formatResult = formatter.format(parseResult);
      result.performance!.formatTime = Date.now() - formatStartTime;

      if (!formatResult.success) {
        result.errors.push(...formatResult.errors);
        return result;
      }

      result.json = formatResult.json;
      result.success = true;

      // Performance metrics
      result.performance!.totalTime = Date.now() - overallStartTime;
      if (this.options.includePerformanceMetrics) {
        result.performance!.fileSize = html.length;
        result.performance!.nodeCount = result.document.content.blocks.length;
      }

      this.logger.info('HTML to JSON conversion completed successfully', {
        filePath,
        success: true,
        performance: result.performance,
        stats: result.stats,
        warningCount: result.warnings.length
      });

      return result;

    } catch (error) {
      result.errors.push(`Conversion error: ${error instanceof Error ? error.message : String(error)}`);
      result.performance!.totalTime = Date.now() - overallStartTime;

      this.logger.error('HTML to JSON conversion failed', {
        filePath,
        error: error instanceof Error ? error.message : String(error),
        performance: result.performance
      });

      return result;
    }
  }

  /**
   * Convert with pretty formatting
   */
  async convertPretty(html: string, filePath: string): Promise<ConversionResult> {
    const prettyOptions = {
      ...this.options,
      formatter: { ...this.options.formatter, compress: false, indent: 2 }
    };

    const converter = new HtmlToJsonConverter(prettyOptions);
    return converter.convert(html, filePath);
  }

  /**
   * Convert with compressed JSON output
   */
  async convertCompressed(html: string, filePath: string): Promise<ConversionResult> {
    const compressedOptions = {
      ...this.options,
      formatter: { ...this.options.formatter, compress: true, indent: 0 }
    };

    const converter = new HtmlToJsonConverter(compressedOptions);
    return converter.convert(html, filePath);
  }

  /**
   * Convert with file-ready output (includes metadata header)
   */
  async convertForFile(html: string, filePath: string, includeComments: boolean = true): Promise<ConversionResult> {
    const result = await this.convert(html, filePath);

    if (result.success && result.document) {
      try {
        const formatter = new JsonFormatter(this.options.formatter);
        const fileResult = formatter.formatForFile(result.document, includeComments);

        if (!fileResult.success) {
          result.errors.push(...fileResult.errors);
          result.success = false;
          result.json = null;
        } else {
          result.json = fileResult.content;
        }
      } catch (error) {
        result.errors.push(`File formatting error: ${error instanceof Error ? error.message : String(error)}`);
        result.success = false;
        result.json = null;
      }
    }

    return result;
  }

  /**
   * Batch convert multiple HTML files
   */
  async convertBatch(htmlInputs: Array<{ html: string; filePath: string }>): Promise<{
    success: boolean;
    results: ConversionResult[];
    summary: {
      total: number;
      successful: number;
      failed: number;
      totalErrors: number;
      totalWarnings: number;
      averageParseTime: number;
      averageFormatTime: number;
    };
  }> {
    const results: ConversionResult[] = [];
    const summary = {
      total: htmlInputs.length,
      successful: 0,
      failed: 0,
      totalErrors: 0,
      totalWarnings: 0,
      averageParseTime: 0,
      averageFormatTime: 0
    };

    const totalParseTime = htmlInputs.reduce((sum, input) => {
      const result = this.convert(input.html, input.filePath);
      results.push(result);

      if (result.success) {
        summary.successful++;
      } else {
        summary.failed++;
      }

      summary.totalErrors += result.errors.length;
      summary.totalWarnings += result.warnings.length;

      return sum + (result.performance?.parseTime || 0);
    }, 0);

    const totalFormatTime = results.reduce((sum, result) =>
      sum + (result.performance?.formatTime || 0), 0
    );

    summary.averageParseTime = summary.total > 0 ? Math.round(totalParseTime / summary.total) : 0;
    summary.averageFormatTime = summary.total > 0 ? Math.round(totalFormatTime / summary.total) : 0;

    const overallSuccess = summary.failed === 0;

    this.logger.info('Batch conversion completed', {
      summary,
      overallSuccess
    });

    return {
      success: overallSuccess,
      results,
      summary
    };
  }

  /**
   * Validate input HTML before processing
   */
  private validateInput(html: string, filePath: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Basic checks
    if (typeof html !== 'string') {
      errors.push('Input must be a string');
      return { valid: false, errors };
    }

    if (html.length === 0) {
      errors.push('HTML input is empty');
      return { valid: false, errors };
    }

    // Size check (prevent memory issues)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (html.length > maxSize) {
      errors.push(`HTML input too large: ${html.length} bytes (max: ${maxSize})`);
      return { valid: false, errors };
    }

    // Basic structure check
    if (!html.includes('<') || !html.includes('>')) {
      errors.push('Input does not appear to be valid HTML');
      return { valid: false, errors };
    }

    // Encoding check (should be UTF-8)
    try {
      const encoder = new TextEncoder();
      const encoded = encoder.encode(html);
      const decoder = new TextDecoder('utf-8', { fatal: true });
      decoder.decode(encoded);
    } catch {
      errors.push('HTML input contains invalid UTF-8 characters');
      return { valid: false, errors };
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Get converter capabilities and configuration
   */
  getCapabilities(): {
    version: string;
    features: string[];
    supportedFormats: string[];
    options: HtmlToJsonOptions;
    performance: {
      maxFileSize: number;
      recommendedMaxSize: number;
      maxConcurrentConversions: number;
    };
  } {
    return {
      version: '1.0.0',
      features: [
        'html-parsing',
        'japanese-text-preservation',
        'schema-validation',
        'json-formatting',
        'error-reporting',
        'performance-tracking',
        'batch-processing',
        'file-output'
      ],
      supportedFormats: [
        'html',
        'json',
        'manual-document-v1'
      ],
      options: this.options,
      performance: {
        maxFileSize: 50 * 1024 * 1024, // 50MB
        recommendedMaxSize: 5 * 1024 * 1024, // 5MB
        maxConcurrentConversions: 10
      }
    };
  }

  /**
   * Update converter options
   */
  updateOptions(newOptions: Partial<HtmlToJsonOptions>): HtmlToJsonConverter {
    const updatedOptions = { ...this.options, ...newOptions };
    return new HtmlToJsonConverter(updatedOptions);
  }
}