/**
 * Export manager that coordinates all export functionality
 */

import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import {
	EXPORT_CONSTANTS,
	ENCODING_CONSTANTS,
	FORMAT_CONSTANTS,
} from "../constants/export-constants.js";
import type { GundamData } from "../types/product-data.js";

import { DataTransformer } from "./data-transformer.js";
import { CsvExporter } from "./exporters/csv-exporter.js";
import { ExcelExporter } from "./exporters/excel-exporter.js";
import { JsonExporter } from "./exporters/json-exporter.js";
import type {
	ExportOptions,
	ExportResult,
	ProgressCallback,
	ExporterConfig,
	ValidationResult,
	ExportProgress,
	TransformedData,
} from "./types.js";


export class ExportManager {
	private config: ExporterConfig;

	constructor(config?: Partial<ExporterConfig>) {
		this.config = {
			batchSize: EXPORT_CONSTANTS.DEFAULT_BATCH_SIZE,
			maxMemoryUsage: EXPORT_CONSTANTS.MAX_MEMORY_USAGE_BYTES,
			tempDir: os.tmpdir(),
			...config,
		};
	}

	/**
   * Export data to specified format
   */
	async export(
		data: GundamData[],
		options: ExportOptions,
		progressCallback?: ProgressCallback,
	): Promise<ExportResult> {
		this.validateExportOptions(options);

		// Validate data before export
		const validation = this.validateExportData(data);
		if (!validation.valid && validation.errors.length > 0) {
			console.warn("Export data validation failed:", validation.errors);
		}

		// Create appropriate exporter
		const exporter = this.createExporter(options);

		// Set progress callback
		if (progressCallback) {
			exporter.setProgressCallback(progressCallback);
		}

		try {
			return await exporter.export(data);
		} catch (error) {
			return {
				success: false,
				filePath: options.outputPath,
				format: options.format,
				recordCount: 0,
				fileSize: 0,
				duration: 0,
				errors: [error instanceof Error ? error.message : String(error)],
			};
		}
	}

	/**
   * Export data to multiple formats simultaneously
   */
	async exportMultiple(
		data: GundamData[],
		formats: Array<{ format: ExportOptions["format"]; outputPath: string }>,
		baseOptions: Partial<ExportOptions> = {},
		progressCallback?: ProgressCallback,
	): Promise<ExportResult[]> {
		const results: ExportResult[] = [];
		const totalFormats = formats.length;

		for (const [i, formatItem] of formats.entries()) {
			if (!formatItem) continue;
			const { format, outputPath } = formatItem;

			const options: ExportOptions = {
				format,
				outputPath,
				...baseOptions,
			};

			// Update progress to show which format is being processed
			const formatProgressCallback = progressCallback
				? (progress: ExportProgress) => {
					progressCallback({
						...progress,
						stage: `${format.toUpperCase()} - ${progress.stage} (${i + 1}/${totalFormats})`,
					});
				}
				: undefined;

			const result = await this.export(data, options, formatProgressCallback);
			results.push(result);

			// Log result
			if (result.success) {
				console.log(`✓ Successfully exported to ${format.toUpperCase()}: ${result.filePath}`);
			} else {
				console.error(`✗ Failed to export to ${format.toUpperCase()}:`, result.errors);
			}
		}

		return results;
	}

	/**
   * Preview export results without actually writing files
   */
	async preview(
		data: GundamData[],
		options: ExportOptions,
		maxRecords: number = EXPORT_CONSTANTS.DEFAULT_PREVIEW_RECORDS,
	): Promise<{
    transformedData: TransformedData[];
    summary: Record<string, unknown>;
    estimatedFileSize: number;
    validation: ValidationResult;
  }> {
		// Transform and filter limited data
		const transformOptions: Parameters<typeof DataTransformer.transformData>[1] = {};
		if (options.includeImages !== undefined) transformOptions.includeImages = options.includeImages;
		if (options.includeSpecifications !== undefined) transformOptions.includeSpecifications = options.includeSpecifications;
		transformOptions.language = options.language === undefined ? "all" : options.language;

		const transformed = DataTransformer.transformData(data.slice(0, maxRecords), transformOptions);

		const filtered = options.filters
			? DataTransformer.filterData(transformed, options.filters)
			: transformed;

		// Generate summary
		const summary = DataTransformer.getDataSummary(
			DataTransformer.transformData(data, transformOptions),
		);

		// Validate data
		const validation = DataTransformer.validateData(
			DataTransformer.transformData(data, transformOptions),
		);

		// Estimate file size
		const estimatedFileSize = this.estimateFileSize(filtered, options.format);

		return {
			transformedData: filtered,
			summary,
			estimatedFileSize,
			validation,
		};
	}

	/**
   * Get export statistics
   */
	getExportStatistics(results: ExportResult[]): {
    totalExports: number;
    successfulExports: number;
    totalRecords: number;
    totalFileSize: number;
    averageDuration: number;
    formatBreakdown: Record<string, { count: number; size: number }>;
  } {
		const successful = results.filter(r => r.success);
		const totalRecords = successful.reduce((sum, r) => sum + r.recordCount, 0);
		const totalSize = successful.reduce((sum, r) => sum + r.fileSize, 0);
		const avgDuration = successful.length > 0
			? successful.reduce((sum, r) => sum + r.duration, 0) / successful.length
			: 0;

		const formatBreakdown: Record<string, { count: number; size: number }> = {};
		for (const result of successful) {
			if (!formatBreakdown[result.format]) {
				formatBreakdown[result.format] = { count: 0, size: 0 };
			}
			const breakdown = formatBreakdown[result.format];
			if (breakdown) {
				breakdown.count++;
				breakdown.size += result.fileSize;
			}
		}

		return {
			totalExports: results.length,
			successfulExports: successful.length,
			totalRecords,
			totalFileSize: totalSize,
			averageDuration: avgDuration,
			formatBreakdown,
		};
	}

	/**
   * Validate export options
   */
	private validateExportOptions(options: ExportOptions): void {
		if (!options.outputPath) {
			throw new Error("Output path is required");
		}

		if (!FORMAT_CONSTANTS.SUPPORTED_FORMATS.includes(options.format)) {
			throw new Error(`Invalid format: ${options.format}. Supported formats: ${FORMAT_CONSTANTS.SUPPORTED_FORMATS.join(", ")}`);
		}

		if (options.encoding && !ENCODING_CONSTANTS.SUPPORTED_ENCODINGS.includes(options.encoding)) {
			throw new Error(`Invalid encoding: ${options.encoding}. Supported encodings: ${ENCODING_CONSTANTS.SUPPORTED_ENCODINGS.join(", ")}`);
		}
	}

	/**
   * Validate export data
   */
	private validateExportData(data: GundamData[]): ValidationResult {
		if (!Array.isArray(data)) {
			return {
				valid: false,
				errors: [{
					field: "data",
					message: "Data must be an array",
					value: data,
				}],
				warnings: [],
			};
		}

		if (data.length === 0) {
			return {
				valid: false,
				errors: [{
					field: "data",
					message: "Data array is empty",
					value: data,
				}],
				warnings: [],
			};
		}

		return {
			valid: true,
			errors: [],
			warnings: [],
		};
	}

	/**
   * Create appropriate exporter based on format
   */
	private createExporter(options: ExportOptions) {
		switch (options.format) {
			case "json":
			case "ndjson": {
				return new JsonExporter(options, this.config);
			}

			case "csv": {
				return new CsvExporter(options, this.config);
			}

			case "excel": {
				return new ExcelExporter(options, this.config);
			}

			default: {
				throw new Error(`Unsupported format: ${options.format}`);
			}
		}
	}

	/**
   * Estimate file size for preview
   */
	private estimateFileSize(data: TransformedData[], format: string): number {
		if (data.length === 0) return 0;

		// Sample size estimation
		const sampleSize = Math.min(data.length, EXPORT_CONSTANTS.SIZE_ESTIMATION_SAMPLE_SIZE);
		const sample = data.slice(0, sampleSize);
		const firstRecord = sample[0];

		// Should always have first record since we checked data.length > 0
		if (!firstRecord) return EXPORT_CONSTANTS.CONSERVATIVE_BYTES_PER_RECORD * data.length;

		let bytesPerRecord = 0;

		switch (format) {
			case "json":
			case "ndjson": {
				const jsonString = JSON.stringify(firstRecord);
				bytesPerRecord = jsonString.length + EXPORT_CONSTANTS.CSV_NEWLINE_BYTES;
				break;
			}

			case "csv": {
				const csvString = Object.values(firstRecord).join(",") + "\n";
				bytesPerRecord = csvString.length;
				break;
			}

			case "excel": {
				// Rough estimation: Excel is more memory intensive
				bytesPerRecord = JSON.stringify(firstRecord).length * EXPORT_CONSTANTS.EXCEL_SIZE_MULTIPLIER;
				break;
			}

			default: {
				bytesPerRecord = EXPORT_CONSTANTS.CONSERVATIVE_BYTES_PER_RECORD;
			}
		}

		const estimatedSize = bytesPerRecord * data.length;

		// Add overhead for metadata and structure
		const overhead = format === "excel" ? EXPORT_CONSTANTS.EXCEL_OVERHEAD_BYTES : EXPORT_CONSTANTS.DEFAULT_OVERHEAD_BYTES;

		return estimatedSize + overhead;
	}

	/**
   * Cleanup temporary files
   */
	async cleanup(): Promise<void> {
		try {
			const tempFiles = await fs.readdir(this.config.tempDir);
			const exportTempFiles = tempFiles.filter(file =>
				file.startsWith("gundam-export-") || file.includes("-temp-"),
			);

			for (const file of exportTempFiles) {
				const filePath = path.join(this.config.tempDir, file);
				try {
					await fs.unlink(filePath);
				} catch (error) {
					// Ignore cleanup errors
					const errorMessage = error instanceof Error ? error.message : String(error);
					console.warn(`Failed to cleanup temp file ${filePath}:`, errorMessage);
				}
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			console.warn("Failed to cleanup temp directory:", errorMessage);
		}
	}

	/**
   * Get supported formats
   */
	getSupportedFormats(): Array<{ format: string; description: string; extensions: string[] }> {
		return [
			{
				format: "json",
				description: "JSON format with metadata and statistics",
				extensions: [".json"],
			},
			{
				format: "ndjson",
				description: "Newline Delimited JSON for streaming",
				extensions: [".ndjson", ".jsonl"],
			},
			{
				format: "csv",
				description: "Comma Separated Values for spreadsheet applications",
				extensions: [".csv"],
			},
			{
				format: "excel",
				description: "Excel XLSX format with multiple worksheets and styling",
				extensions: [".xlsx"],
			},
		];
	}

	/**
   * Get export recommendations based on data
   */
	getExportRecommendations(data: GundamData[]): {
    bestFormat: string;
    reason: string;
    alternatives: Array<{ format: string; reason: string }>;
  } {
		const recordCount = data.length;
		const hasImages = data.some(item => item.images && item.images.length > 0);
		const hasSpecifications = data.some(item => item.specifications && Object.keys(item.specifications).length > 0);
		const hasMultipleLanguages = new Set(data.map(item => item.language.language)).size > 1;

		let bestFormat = "json";
		let reason = "Flexible format with full data preservation and easy processing";

		if (recordCount > EXPORT_CONSTANTS.LARGE_DATASET_THRESHOLD) {
			bestFormat = "csv";
			reason = "Large dataset - CSV is memory efficient and widely supported";
		} else if (hasSpecifications && hasImages && recordCount < EXPORT_CONSTANTS.EXCEL_RICH_DATA_THRESHOLD) {
			bestFormat = "excel";
			reason = "Rich data with images and specifications - Excel provides best visualization";
		} else if (hasMultipleLanguages && hasSpecifications) {
			bestFormat = "json";
			reason = "Complex data structure - JSON preserves all relationships and metadata";
		}

		const alternatives = [];

		if (bestFormat !== "json") {
			alternatives.push({
				format: "json",
				reason: "Complete data preservation with metadata and structure",
			});
		}

		if (bestFormat !== "csv" && recordCount < EXPORT_CONSTANTS.CSV_ALTERNATIVE_THRESHOLD) {
			alternatives.push({
				format: "csv",
				reason: "Easy to open in spreadsheet applications",
			});
		}

		if (bestFormat !== "excel" && recordCount < EXPORT_CONSTANTS.EXCEL_ALTERNATIVE_THRESHOLD) {
			alternatives.push({
				format: "excel",
				reason: "Rich formatting and analysis capabilities",
			});
		}

		return {
			bestFormat,
			reason,
			alternatives,
		};
	}
}