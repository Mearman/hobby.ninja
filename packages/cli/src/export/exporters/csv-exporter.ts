/**
 * CSV exporter implementation
 */

import { promises as fs } from "node:fs";
import * as path from "node:path";

import { EXPORT_CONSTANTS, DATA_PROCESSING_CONSTANTS } from "../../constants/export-constants.js";
import type { TransformedData, ExporterConfig, ExportOptions, CSVOptions } from "../types.js";

import { BaseExporter } from "./base-exporter.js";

export class CsvExporter extends BaseExporter {
	private csvOptions: CSVOptions;

	constructor(options: ExportOptions, config: ExporterConfig, csvOptions?: Partial<CSVOptions>) {
		super(options, config);
		this.csvOptions = {
			delimiter: ",",
			quoteChar: '"',
			escapeChar: '"',
			headers: true,
			lineBreaker: "\n",
			...csvOptions,
		};
	}

	/**
   * Export data to CSV format
   */
	protected async exportToFile(data: TransformedData[]): Promise<string> {
		const outputPath = this.generateOutputPath();
		await this.ensureOutputDirectory(outputPath);

		// Generate CSV content
		const csvContent = await this.generateCsv(data);

		// Handle encoding if needed
		const content = await this.handleEncoding(csvContent);

		// Write to file
		await fs.writeFile(outputPath, content, this.getEncodingOptions());

		return outputPath;
	}

	/**
   * Generate CSV content from data
   */
	private async generateCsv(data: TransformedData[]): Promise<string> {
		if (data.length === 0) {
			return "";
		}

		const columns = this.determineColumns(data);
		const lines: string[] = [];

		// Add headers if requested
		if (this.csvOptions.headers) {
			const headerLine = columns
				.map(col => this.escapeCsvValue(col.header))
				.join(this.csvOptions.delimiter);
			lines.push(headerLine);
		}

		// Add data rows
		for (let i = 0; i < data.length; i++) {
			const item = data[i];
			if (!item) continue; // Skip undefined items
			const row = columns.map((col: { key: string; header: string }) => {
				const value = this.extractValue(item, col.key);
				return this.escapeCsvValue(value);
			}).join(this.csvOptions.delimiter);

			lines.push(row);

			// Update progress
			if (i % EXPORT_CONSTANTS.CSV_PROGRESS_UPDATE_INTERVAL === 0) {
				this.updateProgress(i, data.length, "Generating CSV");
			}
		}

		return lines.join(this.csvOptions.lineBreaker);
	}

	/**
   * Determine columns for CSV export
   */
	private determineColumns(data: TransformedData[]): Array<{ key: string; header: string }> {
		const columns = new Set<string>();

		// Add standard columns
		const standardColumns = [
			"id", "name", "nameJa", "nameEn", "brand", "series", "category",
			"price", "currency", "releaseDate", "scale", "grade", "language",
			"source", "scrapedAt",
		];

		for (const col of standardColumns) columns.add(col);

		// Add specification columns if included
		if (this.options.includeSpecifications) {
			for (const item of data) {
				if (item.specifications) {
					for (const spec of Object.keys(item.specifications)) {
						// Flatten specification keys
						columns.add(`spec_${spec}`);
					}
				}
			}
		}

		// Add image columns if included
		if (this.options.includeImages) {
			columns.add("imageCount");
			columns.add("primaryImageUrl");
			columns.add("galleryImageUrls");
		}

		// Add URL column
		columns.add("url");

		// Convert to column definitions with proper headers
		return [...columns].map((key: string) => ({
			key,
			header: this.formatHeader(key),
		}));
	}

	/**
   * Format column header for display
   */
	private formatHeader(key: string): string {
		return key
			.replaceAll(/([A-Z])/g, " $1") // Add space before capital letters
			.replace(/^spec_/, "") // Remove spec_ prefix
			.replaceAll("_", " ") // Replace underscores with spaces
			.replaceAll(/\b\w/g, l => l.toUpperCase()) // Capitalize first letter of each word
			.trim();
	}

	/**
   * Extract value from item by key path
   */
	private extractValue(item: TransformedData, key: string): string {
		try {
			// Handle special keys
			if (key === "imageCount") {
				return String(item.images ? item.images.length : 0);
			}

			if (key === "primaryImageUrl") {
				const primary = item.images?.find(img => img.type === "main" || img.type === "primary");
				return primary?.url ?? "";
			}

			if (key === "galleryImageUrls") {
				const gallery = item.images?.filter(img => img.type === "gallery");
				return gallery?.map(img => img.url).join("; ") ?? "";
			}

			// Handle specification keys
			if (key.startsWith("spec_")) {
				const specKey = key.slice(Math.max(0, DATA_PROCESSING_CONSTANTS.SPECIFICATION_KEY_PREFIX_LENGTH));
				if (item.specifications?.[specKey]) {
					return String(item.specifications[specKey]);
				}
				return "";
			}

			// Handle language object
			if (key === "language") {
				return item.language.language;
			}

			// Handle nested properties
			const keys = key.split(".");
			let value: unknown = item;

			for (const k of keys) {
				if (value && typeof value === "object" && k in value) {
					value = (value as Record<string, unknown>)[k];
				} else {
					value = "";
					break;
				}
			}

			return this.formatValue(value);
		} catch (error) {
			console.warn(`Error extracting value for key ${key}:`, error);
			return "";
		}
	}

	/**
   * Format value for CSV output
   */
	private formatValue(value: unknown): string {
		if (value === null || value === undefined) {
			return "";
		}

		if (typeof value === "string") {
			return value;
		}

		if (typeof value === "number") {
			return value.toString();
		}

		if (typeof value === "boolean") {
			return value ? "true" : "false";
		}

		if (value instanceof Date) {
			return value.toISOString();
		}

		if (Array.isArray(value)) {
			return value.join("; ");
		}

		if (typeof value === "object") {
			return JSON.stringify(value);
		}

		return String(value);
	}

	/**
   * Escape CSV value according to RFC 4180
   */
	private escapeCsvValue(value: string): string {
		const stringValue = String(value);

		// Check if value needs quoting
		const needsQuoting = stringValue.includes(this.csvOptions.delimiter) ||
                         stringValue.includes(this.csvOptions.quoteChar) ||
                         stringValue.includes("\n") ||
                         stringValue.includes("\r") ||
                         stringValue.startsWith(" ") ||
                         stringValue.endsWith(" ");

		if (needsQuoting) {
			// Escape quotes by doubling them
			const escaped = stringValue.replaceAll(
				new RegExp(this.csvOptions.quoteChar, "g"),
				this.csvOptions.quoteChar + this.csvOptions.quoteChar,
			);
			return `${this.csvOptions.quoteChar}${escaped}${this.csvOptions.quoteChar}`;
		}

		return stringValue;
	}

	/**
   * Generate output path for CSV file
   */
	private generateOutputPath(): string {
		if (path.extname(this.options.outputPath)) {
			// If path already has extension, ensure it's .csv
			return this.options.outputPath.replace(/\.[^.]+$/, ".csv");
		} else {
			// Add .csv extension
			return `${this.options.outputPath}.csv`;
		}
	}

	/**
   * Export multiple CSV files by category
   */
	protected async exportByCategories(data: TransformedData[]): Promise<string> {
		const categories = [...new Set(data.map(item => item.category).filter(Boolean))];
		const baseDir = path.dirname(this.options.outputPath);
		const baseName = path.basename(this.options.outputPath, ".csv");

		const exportPaths: string[] = [];

		for (const category of categories) {
			const categoryData = data.filter(item => item.category === category);
			const categoryPath = path.join(baseDir, `${baseName}-${category}.csv`);

			// Generate CSV for this category
			const csvContent = await this.generateCsv(categoryData);
			const content = await this.handleEncoding(csvContent);
			await fs.writeFile(categoryPath, content, this.getEncodingOptions());

			exportPaths.push(categoryPath);
		}

		// Create summary file with statistics
		const summaryPath = path.join(baseDir, `${baseName}-summary.csv`);
		await this.createSummaryCsv(categories, data.length, summaryPath);
		exportPaths.push(summaryPath);

		return exportPaths[0]; // Return the first file as primary
	}

	/**
   * Create summary CSV with category statistics
   */
	private async createSummaryCsv(categories: string[], totalRecords: number, summaryPath: string): Promise<void> {
		const lines: string[] = [ `Category${this.csvOptions.delimiter}Record Count${this.csvOptions.delimiter}Percentage`];

		// Headers

		// Calculate stats for each category
		for (const category of categories) {
			const count = 0; // Would need to recalculate with filtered data
			const percentage = totalRecords > 0 ? ((count / totalRecords) * 100).toFixed(2) : "0.00";
			lines.push(`${category}${this.csvOptions.delimiter}${count}${this.csvOptions.delimiter}${percentage}%`);
		}

		// Total line
		lines.push(`Total${this.csvOptions.delimiter}${totalRecords}${this.csvOptions.delimiter}100.00%`);

		const content = await this.handleEncoding(lines.join(this.csvOptions.lineBreaker));
		await fs.writeFile(summaryPath, content, this.getEncodingOptions());
	}

	/**
   * Export data with custom column mapping
   */
	protected async exportWithCustomColumns(
		data: TransformedData[],
		columnMapping: Record<string, string>,
	): Promise<string> {
		const outputPath = this.generateOutputPath();
		await this.ensureOutputDirectory(outputPath);

		const lines: string[] = [];

		// Custom headers
		const headers = Object.values(columnMapping);
		lines.push(headers.map(h => this.escapeCsvValue(h)).join(this.csvOptions.delimiter));

		// Data rows
		for (const item of data) {
			const row = Object.keys(columnMapping).map(key => {
				const value = this.extractValue(item, key);
				return this.escapeCsvValue(value);
			});
			lines.push(row.join(this.csvOptions.delimiter));
		}

		const content = await this.handleEncoding(lines.join(this.csvOptions.lineBreaker));
		await fs.writeFile(outputPath, content, this.getEncodingOptions());

		return outputPath;
	}
}