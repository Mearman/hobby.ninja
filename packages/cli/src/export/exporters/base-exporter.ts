/**
 * Base exporter class with common functionality
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { pipeline } from 'stream';
import { createGzip } from 'zlib';
import type { GundamData } from '../../types/product-data.js';
import type {
  ExportOptions,
  ExportResult,
  ProgressCallback,
  TransformedData,
  ExporterConfig
} from '../types.js';
import { DataTransformer } from '../data-transformer.js';

const pipelineAsync = promisify(pipeline);

export abstract class BaseExporter {
  protected options: ExportOptions;
  protected config: ExporterConfig;
  protected progressCallback?: ProgressCallback;

  constructor(options: ExportOptions, config: ExporterConfig) {
    this.options = options;
    this.config = config;
  }

  /**
   * Set progress callback for monitoring export progress
   */
  setProgressCallback(callback: ProgressCallback): void {
    this.progressCallback = callback;
  }

  /**
   * Export data to the specified format
   */
  async export(data: GundamData[]): Promise<ExportResult> {
    const startTime = Date.now();

    try {
      this.updateProgress(0, data.length, 'Preparing data');

      // Transform and filter data
      const transformedData = this.prepareData(data);
      this.updateProgress(data.length * 0.2, data.length, 'Exporting data');

      // Export to format
      const outputPath = await this.exportToFile(transformedData);
      this.updateProgress(data.length * 0.9, data.length, 'Finalizing');

      // Apply compression if requested
      const finalPath = this.options.compression
        ? await this.compressFile(outputPath)
        : outputPath;

      // Get file stats
      const stats = await fs.stat(finalPath);
      const duration = Date.now() - startTime;

      this.updateProgress(data.length, data.length, 'Complete');

      return {
        success: true,
        filePath: finalPath,
        format: this.options.format,
        recordCount: transformedData.length,
        fileSize: stats.size,
        ...(this.options.compression && { compressed: finalPath !== outputPath }),
        duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        success: false,
        filePath: this.options.outputPath,
        format: this.options.format,
        recordCount: 0,
        fileSize: 0,
        duration,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * Prepare data for export (transform, filter, validate)
   */
  protected prepareData(data: GundamData[]): TransformedData[] {
    // Transform data
    const transformOptions: { includeImages?: boolean; includeSpecifications?: boolean; language?: 'ja' | 'en' | 'all' } = {};
    if (this.options.includeImages !== undefined) transformOptions.includeImages = this.options.includeImages;
    if (this.options.includeSpecifications !== undefined) transformOptions.includeSpecifications = this.options.includeSpecifications;
    if (this.options.language !== undefined) transformOptions.language = this.options.language;

    const transformed = DataTransformer.transformData(data, transformOptions);

    // Apply filters if provided
    const filtered = this.options.filters
      ? DataTransformer.filterData(transformed, this.options.filters)
      : transformed;

    // Validate data
    const validation = DataTransformer.validateData(filtered);
    if (!validation.valid) {
      console.warn('Export data has validation errors:', validation.errors);
    }

    if (validation.warnings.length > 0) {
      console.warn('Export data has warnings:', validation.warnings);
    }

    return filtered;
  }

  /**
   * Abstract method for format-specific export implementation
   */
  protected abstract exportToFile(data: TransformedData[]): Promise<string>;

  /**
   * Compress exported file
   */
  protected async compressFile(filePath: string): Promise<string> {
    const compressedPath = `${filePath}.gz`;
    const readStream = await fs.open(filePath, 'r');
    const writeStream = await fs.open(compressedPath, 'w');
    const gzip = createGzip();

    await pipelineAsync(
      readStream.createReadStream(),
      gzip,
      writeStream.createWriteStream()
    );

    await readStream.close();
    await writeStream.close();

    // Remove original file
    await fs.unlink(filePath);

    return compressedPath;
  }

  /**
   * Update progress if callback is provided
   */
  protected updateProgress(current: number, total: number, stage: string, message?: string): void {
    if (this.progressCallback) {
      const progress: any = {
        current,
        total,
        stage
      };
      if (message !== undefined) {
        progress.message = message;
      }
      this.progressCallback(progress);
    }
  }

  /**
   * Ensure output directory exists
   */
  protected async ensureOutputDirectory(filePath: string): Promise<void> {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
  }

  /**
   * Generate unique filename to avoid conflicts
   */
  protected generateFileName(basePath: string, extension: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const parsedPath = path.parse(basePath);

    if (parsedPath.ext) {
      // If path already has extension, replace it
      return path.join(parsedPath.dir, `${parsedPath.name}-${timestamp}${extension}`);
    } else {
      // If no extension, add one
      return path.join(parsedPath.dir, `${parsedPath.name}-${timestamp}${extension}`);
    }
  }

  /**
   * Get encoding options for file writing
   */
  protected getEncodingOptions(): { encoding: BufferEncoding } {
    return {
      encoding: this.options.encoding === 'shift-jis' ? 'binary' : 'utf8'
    };
  }

  /**
   * Handle encoding conversion for Japanese text
   */
  protected async handleEncoding(content: string): Promise<string | Buffer> {
    if (this.options.encoding === 'shift-jis') {
      // Convert to Shift-JIS for Japanese Windows compatibility
      try {
        const iconv = await import('iconv-lite');
        return iconv.encode(content, 'Shift_JIS');
      } catch (error) {
        console.warn('iconv-lite not available, falling back to UTF-8');
        return content;
      }
    }

    return content;
  }

  /**
   * Format file size for display
   */
  protected formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  /**
   * Create summary metadata for export
   */
  protected createSummary(data: TransformedData[]): Record<string, unknown> {
    const summary = DataTransformer.getDataSummary(data);

    return {
      exportInfo: {
        timestamp: new Date().toISOString(),
        format: this.options.format,
        version: '1.0.0'
      },
      options: {
        includeImages: this.options.includeImages,
        includeSpecifications: this.options.includeSpecifications,
        language: this.options.language,
        compression: this.options.compression,
        filters: this.options.filters
      },
      statistics: summary
    };
  }

  /**
   * Clean up temporary files and resources
   */
  protected async cleanup(tempPath: string): Promise<void> {
    try {
      await fs.unlink(tempPath);
    } catch (error) {
      // Ignore cleanup errors
      console.warn('Failed to cleanup temporary file:', tempPath);
    }
  }
}