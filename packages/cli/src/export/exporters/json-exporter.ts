/**
 * JSON exporter implementation
 */

import { promises as fs } from "node:fs";
import path from "node:path";

import type { TransformedData } from "../types.js";

import { BaseExporter } from "./base-exporter.js";

export class JsonExporter extends BaseExporter {
	// Constructor intentionally empty - calls parent constructor only

	/**
   * Export data to JSON format
   */
	protected async exportToFile(data: TransformedData[]): Promise<string> {
		const outputPath = this.generateOutputPath();
		await this.ensureOutputDirectory(outputPath);

		// Create export data structure
		const exportData = this.createExportData(data);

		// Handle content differently for NDJSON vs regular JSON
		let content: string | Buffer;
		if (typeof exportData === "string") {
			// NDJSON format - already a string
			content = await this.handleEncoding(exportData);
		} else {
			// Regular JSON format
			const jsonString = this.options.prettyPrint
				? JSON.stringify(exportData, null, 2)
				: JSON.stringify(exportData);
			content = await this.handleEncoding(jsonString);
		}

		// Write to file
		await fs.writeFile(outputPath, content, this.getEncodingOptions());

		return outputPath;
	}

	/**
   * Create JSON export data structure
   */
	private createExportData(data: TransformedData[]): Record<string, unknown> | string {
		const exportData: Record<string, unknown> = {
			data,
			...this.createSummary(data),
		};

		// Add NDJSON format option
		if (this.options.format === "ndjson") {
			return this.createNdJsonData(data);
		}

		return exportData;
	}

	/**
   * Create NDJSON (Newline Delimited JSON) format
   */
	private createNdJsonData(data: TransformedData[]): string {
		// NDJSON doesn't need the wrapper structure
		// Each line is a separate JSON object
		return data.map(item => JSON.stringify(item)).join("\n");
	}

	/**
   * Generate appropriate output path based on format
   */
	private generateOutputPath(): string {
		const extension = this.options.format === "ndjson" ? ".ndjson" : ".json";

		// If path already has extension, use it, otherwise add extension
		return path.extname(this.options.outputPath)
			? this.options.outputPath
			: `${this.options.outputPath}${extension}`;
	}

	/**
   * Validate JSON data structure
   */
	protected validateJsonData(exportData: Record<string, unknown>): void {
		// Basic validation
		if (!exportData["data"] || !Array.isArray(exportData["data"])) {
			throw new Error("Export data must contain a data array");
		}

		// Validate each item
		for (const [index, item] of (exportData["data"] as TransformedData[]).entries()) {
			if (!item.id) {
				throw new Error(`Item at index ${index} is missing required field: id`);
			}
			if (!item.name) {
				throw new Error(`Item at index ${index} is missing required field: name`);
			}
		}
	}

	/**
   * Create optimized JSON for large datasets
   */
	protected createOptimizedJson(data: TransformedData[]): Record<string, unknown> {
		// For large datasets, we can optimize by:
		// 1. Removing undefined values
		// 2. Using arrays for repeated data
		// 3. Creating lookup tables

		const optimizedData = data.map(item => {
			const optimized: Record<string, unknown> = {};

			// Only include defined values
			for (const [key, value] of Object.entries(item)) {
				if (value !== undefined && value !== null) {
					optimized[key] = value;
				}
			}

			return optimized;
		});

		return {
			data: optimizedData,
			...this.createSummary(data),
			optimized: true,
			timestamp: new Date().toISOString(),
		};
	}

	/**
   * Export with streaming for very large datasets
   */
	protected async exportStreaming(data: TransformedData[]): Promise<string> {
		const outputPath = this.generateOutputPath();
		await this.ensureOutputDirectory(outputPath);

		const fileHandle = await fs.open(outputPath, "w");

		try {
			// Write opening bracket for data array
			await fileHandle.write('{"data":[\n');

			// Write each item
			for (let i = 0; i < data.length; i++) {
				const item = data[i];
				const jsonString = JSON.stringify(item, null, this.options.prettyPrint ? 2 : 0);

				await fileHandle.write(jsonString);

				// Add comma except for last item
				if (i < data.length - 1) {
					await fileHandle.write(",\n");
				}

				// Update progress
				this.updateProgress(i + 1, data.length, "Streaming data");
			}

			// Write closing and metadata
			await fileHandle.write("\n],");
			await fileHandle.write(JSON.stringify(this.createSummary(data), null, 2));
			await fileHandle.write("}");

		} finally {
			await fileHandle.close();
		}

		return outputPath;
	}

	/**
   * Create separate JSON files for each category
   */
	protected async exportByCategories(data: TransformedData[]): Promise<string> {
		const categories = [...new Set(data.map(item => item.category).filter(Boolean))];
		const baseDir = path.dirname(this.options.outputPath);
		const baseName = path.basename(this.options.outputPath, ".json");

		const exportPaths: string[] = [];

		for (const category of categories) {
			const categoryData = data.filter(item => item.category === category);
			const sanitizedCategory = String(category);
			const categoryPath = path.join(baseDir, `${baseName}-${sanitizedCategory}.json`);

			const categoryExportData = {
				category,
				data: categoryData,
				...this.createSummary(categoryData),
			};

			const jsonString = this.options.prettyPrint
				? JSON.stringify(categoryExportData, null, 2)
				: JSON.stringify(categoryExportData);

			const content = await this.handleEncoding(jsonString);
			await fs.writeFile(categoryPath, content, this.getEncodingOptions());

			exportPaths.push(categoryPath);
		}

		// Create index file
		const indexData = {
			categories,
			files: exportPaths,
			totalRecords: data.length,
			...this.createSummary(data),
		};

		const indexPath = path.join(baseDir, `${baseName}-index.json`);
		const indexJson = this.options.prettyPrint
			? JSON.stringify(indexData, null, 2)
			: JSON.stringify(indexData);

		const indexContent = await this.handleEncoding(indexJson);
		await fs.writeFile(indexPath, indexContent, this.getEncodingOptions());

		return indexPath;
	}

	/**
   * Export with minification for production use
   */
	protected async exportMinified(data: TransformedData[]): Promise<string> {
		const outputPath = this.generateOutputPath().replace(".json", ".min.json");
		await this.ensureOutputDirectory(outputPath);

		// Remove all unnecessary whitespace
		const exportData = this.createOptimizedJson(data);
		const jsonString = JSON.stringify(exportData);

		const content = await this.handleEncoding(jsonString);
		await fs.writeFile(outputPath, content, this.getEncodingOptions());

		return outputPath;
	}
}