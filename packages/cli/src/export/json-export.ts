import { promises as fs } from "node:fs";
import path from "node:path";

export interface JsonExporterOptions {
  outputDir: string;
  perSku?: boolean;
  generateIndex?: boolean;
  prettyPrint?: boolean;
  compression?: boolean;
}

export interface ExportMetadata {
  exportedAt: string;
  totalItems: number;
  sources: string[];
  version: string;
  format: "json";
  perSkuFiles?: string[];
}

export interface ProductIndex {
  items: Array<{
    sku: string;
    name: string;
    grade?: string;
    series?: string;
    category?: string;
    price?: string;
    imageUrl?: string;
    source: string;
  }>;
  metadata: ExportMetadata;
  categories: Record<string, number>;
  grades: Record<string, number>;
  series: Record<string, number>;
}

export class JsonExporter {
	private options: Required<JsonExporterOptions>;

	constructor(options: JsonExporterOptions) {
		this.options = {
			outputDir: options.outputDir,
			perSku: options.perSku ?? true,
			generateIndex: options.generateIndex ?? true,
			prettyPrint: options.prettyPrint ?? true,
			compression: options.compression ?? false,
		};
	}

	async exportData(data: any[], outputDir?: string): Promise<void> {
		const targetDir = outputDir || this.options.outputDir;

		// Ensure output directory exists
		await this.ensureDirectory(targetDir);

		// Deduplicate and normalize data
		const normalizedData = this.normalizeData(data);
		const uniqueData = this.deduplicateData(normalizedData);

		// Extract metadata
		const sources = [...new Set(uniqueData.map(item => item.metadata?.source || "unknown"))];

		const metadata: ExportMetadata = {
			exportedAt: new Date().toISOString(),
			totalItems: uniqueData.length,
			sources,
			version: "1.0.0",
			format: "json",
		};

		console.log(`📊 Exporting ${uniqueData.length} unique items to ${targetDir}`);

		// Export per-SKU files if enabled
		let perSkuFiles: string[] = [];
		if (this.options.perSku) {
			perSkuFiles = await this.exportPerSkuFiles(uniqueData, targetDir);
			metadata.perSkuFiles = perSkuFiles;
		}

		// Export main data file
		await this.exportMainData(uniqueData, targetDir, metadata);

		// Generate index file if enabled
		if (this.options.generateIndex) {
			await this.generateIndex(uniqueData, targetDir, metadata);
		}

		// Generate statistics file
		await this.generateStatistics(uniqueData, targetDir);

		console.log(`✅ Export completed successfully`);
		if (perSkuFiles.length > 0) {
			console.log(`📁 Created ${perSkuFiles.length} per-SKU files`);
		}
	}

	private async ensureDirectory(dirPath: string): Promise<void> {
		try {
			await fs.access(dirPath);
		} catch {
			await fs.mkdir(dirPath, { recursive: true });
		}
	}

	private normalizeData(data: any[]): any[] {
		return data.map(item => {
			const normalized = { ...item };

			// Ensure required fields exist
			if (!normalized.sku) {
				normalized.sku = this.generateSku(normalized);
			}

			if (!normalized.name) {
				normalized.name = "Unknown Product";
			}

			// Normalize price
			if (normalized.price && typeof normalized.price === "string") {
				normalized.price = normalized.price.trim();
			}

			// Normalize URLs
			if (normalized.urls) {
				if (!normalized.urls.product && item.productUrl) {
					normalized.urls.product = item.productUrl;
				}
				if (!normalized.urls.image && item.imageUrl) {
					normalized.urls.image = item.imageUrl;
				}
			}

			// Normalize metadata
			if (!normalized.metadata) {
				normalized.metadata = {
					scrapedAt: new Date().toISOString(),
					source: "unknown",
				};
			}

			return normalized;
		});
	}

	private deduplicateData(data: any[]): any[] {
		const seen = new Map<string, any>();
		const unique: any[] = [];

		for (const item of data) {
			const normalizedSku = this.normalizeSku(item.sku);

			if (seen.has(normalizedSku)) {
				// Merge with existing item if it has more complete data
				const existing = seen.get(normalizedSku);
				const merged = this.mergeProductData(existing, item);
				seen.set(normalizedSku, merged);
			} else {
				seen.set(normalizedSku, item);
				unique.push(item);
			}
		}

		return [...seen.values()];
	}

	private normalizeSku(sku: string): string {
		return sku.replaceAll(/[^a-zA-Z0-9]/g, "").toUpperCase();
	}

	private generateSku(item: any): string {
		const source = item.metadata?.source || "unknown";
		const name = item.name || "unknown";
		const hash = this.simpleHash(name);
		return `${source.toUpperCase()}-${hash}`.slice(0, 20);
	}

	private simpleHash(str: string): string {
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			const char = str.charCodeAt(i);
			hash = ((hash << 5) - hash) + char;
			hash = hash & hash; // Convert to 32-bit integer
		}
		return Math.abs(hash).toString(36);
	}

	private mergeProductData(existing: any, newItem: any): any {
		const merged = { ...existing };

		// Merge fields that might be missing or incomplete
		const fieldsToMerge = [
			"name", "price", "category", "grade", "series", "scale",
			"imageUrl", "description", "specifications", "releaseDate",
		];

		for (const field of fieldsToMerge) {
			if (!merged[field] && newItem[field]) {
				merged[field] = newItem[field];
			}
		}

		// Merge URLs
		if (newItem.urls) {
			merged.urls = { ...merged.urls, ...newItem.urls };
		}

		// Use most recent metadata
		if (newItem.metadata && newItem.metadata.scrapedAt) {
			merged.metadata = { ...merged.metadata, ...newItem.metadata };
		}

		return merged;
	}

	private async exportPerSkuFiles(data: any[], outputDir: string): Promise<string[]> {
		const skuDir = path.join(outputDir, "sku");
		await this.ensureDirectory(skuDir);

		const files: string[] = [];

		for (const item of data) {
			const normalizedSku = this.normalizeSku(item.sku);
			const fileName = `${normalizedSku}.json`;
			const filePath = path.join(skuDir, fileName);

			const fileContent = JSON.stringify(item, null, this.options.prettyPrint ? 2 : 0);
			await fs.writeFile(filePath, fileContent, "utf8");

			files.push(fileName);
		}

		return files;
	}

	private async exportMainData(data: any[], outputDir: string, metadata: ExportMetadata): Promise<void> {
		const mainData = {
			items: data,
			metadata,
		};

		const filePath = path.join(outputDir, "products.json");
		const fileContent = JSON.stringify(mainData, null, this.options.prettyPrint ? 2 : 0);
		await fs.writeFile(filePath, fileContent, "utf8");
	}

	private async generateIndex(data: any[], outputDir: string, metadata: ExportMetadata): Promise<void> {
		// Create searchable index
		const categories: Record<string, number> = {};
		const grades: Record<string, number> = {};
		const series: Record<string, number> = {};

		const indexItems = data.map(item => {
			// Count categories
			if (item.category) {
				categories[item.category] = (categories[item.category] || 0) + 1;
			}

			// Count grades
			if (item.grade) {
				grades[item.grade] = (grades[item.grade] || 0) + 1;
			}

			// Count series
			if (item.series) {
				series[item.series] = (series[item.series] || 0) + 1;
			}

			return {
				sku: item.sku,
				name: item.name,
				grade: item.grade,
				series: item.series,
				category: item.category,
				price: item.price,
				imageUrl: item.imageUrl,
				source: item.metadata?.source || "unknown",
			};
		});

		const index: ProductIndex = {
			items: indexItems,
			metadata,
			categories,
			grades,
			series,
		};

		const filePath = path.join(outputDir, "index.json");
		const fileContent = JSON.stringify(index, null, this.options.prettyPrint ? 2 : 0);
		await fs.writeFile(filePath, fileContent, "utf8");
	}

	private async generateStatistics(data: any[], outputDir: string): Promise<void> {
		const stats = {
			overview: {
				totalProducts: data.length,
				exportDate: new Date().toISOString(),
				sources: [...new Set(data.map(item => item.metadata?.source || "unknown"))],
			},
			categories: this.calculateCategoryStats(data),
			grades: this.calculateGradeStats(data),
			series: this.calculateSeriesStats(data),
			priceRanges: this.calculatePriceStats(data),
			completeness: this.calculateCompletenessStats(data),
		};

		const filePath = path.join(outputDir, "statistics.json");
		const fileContent = JSON.stringify(stats, null, this.options.prettyPrint ? 2 : 0);
		await fs.writeFile(filePath, fileContent, "utf8");
	}

	private calculateCategoryStats(data: any[]): Record<string, any> {
		const stats: Record<string, any> = {};

		for (const item of data) {
			const category = item.category || "Unknown";

			if (!stats[category]) {
				stats[category] = { count: 0, grades: {} as Record<string, number> };
			}

			stats[category].count++;

			if (item.grade) {
				stats[category].grades[item.grade] = (stats[category].grades[item.grade] || 0) + 1;
			}
		}

		return stats;
	}

	private calculateGradeStats(data: any[]): Record<string, any> {
		const stats: Record<string, any> = {};

		for (const item of data) {
			const grade = item.grade || "Unknown";

			if (!stats[grade]) {
				stats[grade] = { count: 0, priceRange: { min: null, max: null, avg: 0 } };
			}

			stats[grade].count++;

			// Extract numeric price for statistics
			if (item.price) {
				const numericPrice = this.extractNumericPrice(item.price);
				if (numericPrice !== null) {
					const current = stats[grade].priceRange;
					if (current.min === null || numericPrice < current.min) {
						current.min = numericPrice;
					}
					if (current.max === null || numericPrice > current.max) {
						current.max = numericPrice;
					}
				}
			}
		}

		// Calculate averages
		for (const grade in stats) {
			const priceRange = stats[grade].priceRange;
			if (priceRange.min !== null && priceRange.max !== null) {
				priceRange.avg = (priceRange.min + priceRange.max) / 2;
			}
		}

		return stats;
	}

	private calculateSeriesStats(data: any[]): Record<string, number> {
		const stats: Record<string, number> = {};

		for (const item of data) {
			const series = item.series || "Unknown";
			stats[series] = (stats[series] || 0) + 1;
		}

		return stats;
	}

	private calculatePriceStats(data: any[]): any {
		const prices: number[] = [];

		for (const item of data) {
			if (item.price) {
				const numericPrice = this.extractNumericPrice(item.price);
				if (numericPrice !== null) {
					prices.push(numericPrice);
				}
			}
		}

		if (prices.length === 0) {
			return { count: 0, min: null, max: null, avg: null };
		}

		prices.sort((a, b) => a - b);

		return {
			count: prices.length,
			min: prices[0],
			max: prices.at(-1),
			avg: prices.reduce((sum, price) => sum + price, 0) / prices.length,
			median: prices[Math.floor(prices.length / 2)],
		};
	}

	private calculateCompletenessStats(data: any[]): any {
		let completeCount = 0;
		let partialCount = 0;
		let minimalCount = 0;

		for (const item of data) {
			const hasBasic = item.sku && item.name;
			const hasDetails = item.description && item.grade && item.series;
			const hasImages = item.imageUrl && item.urls?.image;
			const hasSpecs = item.specifications && Object.keys(item.specifications).length > 0;

			if (hasBasic && hasDetails && hasImages && hasSpecs) {
				completeCount++;
			} else if (hasBasic && hasDetails) {
				partialCount++;
			} else if (hasBasic) {
				minimalCount++;
			}
		}

		return {
			complete: completeCount,
			partial: partialCount,
			minimal: minimalCount,
			total: data.length,
			completenessPercentage: ((completeCount * 3 + partialCount * 2 + minimalCount) / (data.length * 3)) * 100,
		};
	}

	private extractNumericPrice(priceStr: string): number | null {
		// Extract numeric value from price string
		const match = priceStr.match(/[\d,]+\.?\d*/);
		if (match) {
			const cleaned = match[0].replaceAll(",", "");
			const num = Number.parseFloat(cleaned);
			return isNaN(num) ? null : num;
		}
		return null;
	}

	// Additional utility methods
	async validateExport(outputDir?: string): Promise<{ valid: boolean; issues: string[] }> {
		const targetDir = outputDir || this.options.outputDir;
		const issues: string[] = [];

		try {
			// Check if directory exists
			await fs.access(targetDir);

			// Check required files
			const requiredFiles = ["products.json", "index.json", "statistics.json"];

			for (const file of requiredFiles) {
				try {
					await fs.access(path.join(targetDir, file));
				} catch {
					issues.push(`Missing required file: ${file}`);
				}
			}

			// Validate JSON structure
			try {
				const productsPath = path.join(targetDir, "products.json");
				const productsData = JSON.parse(await fs.readFile(productsPath, "utf8"));

				if (!productsData.items || !Array.isArray(productsData.items)) {
					issues.push("products.json has invalid structure");
				}

				if (!productsData.metadata) {
					issues.push("products.json missing metadata");
				}
			} catch (error) {
				issues.push(`products.json is invalid JSON: ${error}`);
			}

		} catch (error) {
			issues.push(`Cannot access output directory: ${error}`);
		}

		return {
			valid: issues.length === 0,
			issues,
		};
	}

	async getExportSize(outputDir?: string): Promise<number> {
		const targetDir = outputDir || this.options.outputDir;
		let totalSize = 0;

		try {
			const files = await fs.readdir(targetDir);

			for (const file of files) {
				const filePath = path.join(targetDir, file);
				const stats = await fs.stat(filePath);
				if (stats.isFile()) {
					totalSize += stats.size;
				}
			}
		} catch {
			// Return 0 if directory doesn't exist or is inaccessible
		}

		return totalSize;
	}
}

// Factory function
export function createJsonExporter(options: JsonExporterOptions): JsonExporter {
	return new JsonExporter(options);
}