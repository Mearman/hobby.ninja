/**
 * Excel exporter implementation using XLSX library
 */

import * as path from "node:path";

import type { TransformedData, ExporterConfig, ExportOptions, ExcelColumn } from "../types.js";
import type { WorkBook, WorkSheet, XLSXLibrary } from "../xlsx-types.js";

import { BaseExporter } from "./base-exporter.js";

export class ExcelExporter extends BaseExporter {
	constructor(options: ExportOptions, config: ExporterConfig) {
		super(options, config);
	}

	/**
   * Export data to Excel format
   */
	protected async exportToFile(data: TransformedData[]): Promise<string> {
		try {
			// Dynamically import xlsx library to avoid build issues
			let XLSX: XLSXLibrary;
			try {
				// @ts-ignore - xlsx is an optional dependency
				const xlsxModule = await import("xlsx");
				XLSX = xlsxModule as XLSXLibrary;
			} catch {
				throw new Error("Excel export requires the xlsx package. Please install it with: npm install xlsx");
			}

			const outputPath = this.generateOutputPath();
			await this.ensureOutputDirectory(outputPath);

			// Create workbook
			const workbook = XLSX.utils.book_new();

			// Add main data worksheet
			const mainWorksheet = this.createMainWorksheet(data, XLSX);
			XLSX.utils.book_append_sheet(workbook, mainWorksheet, "All Data");

			// Add summary worksheet
			const summaryWorksheet = this.createSummaryWorksheet(data, XLSX);
			XLSX.utils.book_append_sheet(workbook, summaryWorksheet, "Summary");

			// Add category worksheets if categories exist
			if (this.options.includeCategories) {
				const categories = this.getCategories(data);
				for (const category of categories) {
					const categoryData = data.filter(item => item.category === category);
					if (categoryData.length > 0) {
						const categoryWorksheet = this.createCategoryWorksheet(categoryData, category, XLSX);
						XLSX.utils.book_append_sheet(workbook, categoryWorksheet, category);
					}
				}
			}

			// Write workbook
			XLSX.writeFile(workbook, outputPath, {
				bookType: "xlsx",
				compression: this.options.compression,
				type: "file",
			});

			return outputPath;

		} catch (error) {
			throw new Error(`Excel export failed: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	/**
   * Create main data worksheet
   */
	private createMainWorksheet(data: TransformedData[], XLSX: XLSXLibrary): WorkSheet {
		const columns = this.determineColumns();
		const wsData = this.formatDataForExcel(data, columns);

		// Create worksheet from data
		const worksheet = XLSX.utils.json_to_sheet(wsData, {
			header: columns.map(col => col.key),
		});

		// Apply column widths and styles
		this.applyColumnFormatting(worksheet, columns, XLSX);

		// Add filter to headers
		if (wsData.length > 1) {
			worksheet["!autofilter"] = { ref: `A1:${XLSX.utils.encode_col(columns.length - 1)}1` };
		}

		return worksheet;
	}

	/**
   * Create summary worksheet with statistics
   */
	private createSummaryWorksheet(data: TransformedData[], XLSX: XLSXLibrary): WorkSheet {
		const summaryData = this.generateSummaryData(data);

		// Create two-column format for summary
		const wsData: Array<Array<string | number>> = [
			["Metric", "Value"],
			["Total Records", data.length],
			["Export Date", new Date().toLocaleDateString()],
			["Export Time", new Date().toLocaleTimeString()],
			...summaryData,
		];

		const worksheet = XLSX.utils.aoa_to_sheet(wsData);

		// Apply styling
		const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1:B1");
		for (let row = range.s.r; row <= range.e.r; row++) {
			for (let col = range.s.c; col <= range.e.c; col++) {
				const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
				const cell = worksheet[cellAddress];
				if (cell && typeof cell === 'object' && 'v' in cell) {
					cell.s = {
						Font: { Bold: row === 0 },
						Fill: row === 0 ? { FgColor: "E3F2FD" } : undefined,
						Alignment: { Vertical: "center", Horizontal: "left" },
					};
				}
			}
		}

		// Set column widths
		worksheet["!cols"] = [
			{ width: 25 }, // Metric column
			{ width: 20 },  // Value column
		];

		return worksheet;
	}

	/**
   * Create category-specific worksheet
   */
	private createCategoryWorksheet(data: TransformedData[], category: string, XLSX: XLSXLibrary): WorkSheet {
		const columns = this.determineColumnsForCategory(category);
		const wsData = this.formatDataForExcel(data, columns);

		const worksheet = XLSX.utils.json_to_sheet(wsData, {
			header: columns.map(col => col.key),
		});

		this.applyColumnFormatting(worksheet, columns, XLSX);

		return worksheet;
	}

	/**
   * Determine columns for Excel export
   */
	private determineColumns(): ExcelColumn[] {
		return [
			{ key: "id", header: "ID", width: 15 },
			{ key: "name", header: "Name", width: 30 },
			{ key: "nameJa", header: "Name (Japanese)", width: 30 },
			{ key: "nameEn", header: "Name (English)", width: 30 },
			{ key: "brand", header: "Brand", width: 20 },
			{ key: "series", header: "Series", width: 25 },
			{ key: "category", header: "Category", width: 20 },
			{ key: "price", header: "Price", width: 15 },
			{ key: "currency", header: "Currency", width: 10 },
			{ key: "releaseDate", header: "Release Date", width: 15 },
			{ key: "scale", header: "Scale", width: 15 },
			{ key: "grade", header: "Grade", width: 15 },
			{ key: "language", header: "Language", width: 12 },
			{ key: "source", header: "Source", width: 20 },
			{ key: "scrapedAt", header: "Scraped At", width: 20 },
			{ key: "url", header: "URL", width: 50 },
		];
	}

	/**
   * Determine columns for specific category
   */
	private determineColumnsForCategory(category: string): ExcelColumn[] {
		const baseColumns = this.determineColumns();

		// Add category-specific columns
		switch (category.toLowerCase()) {
			case "hg":
			case "real grade": {
				return [
					...baseColumns,
					{ key: "spec_scale", header: "Scale", width: 15 },
					{ key: "spec_grade", header: "Grade", width: 15 },
					{ key: "spec_price", header: "Price (JPY)", width: 15 },
				];
			}

			case "mg": {
				return [
					...baseColumns,
					{ key: "spec_scale", header: "Scale", width: 15 },
					{ key: "spec_grade", header: "Grade", width: 15 },
					{ key: "spec_price", header: "Price (JPY)", width: 15 },
					{ key: "spec_release", header: "Release Date", width: 15 },
				];
			}

			case "pg": {
				return [
					...baseColumns,
					{ key: "spec_scale", header: "Scale", width: 15 },
					{ key: "spec_grade", header: "Grade", width: 15 },
					{ key: "spec_price", header: "Price (JPY)", width: 15 },
					{ key: "spec_lights", header: "LED Lights", width: 15 },
				];
			}

			default: {
				return baseColumns;
			}
		}
	}

	/**
   * Format data for Excel export
   */
	private formatDataForExcel(data: TransformedData[], columns: ExcelColumn[]): Array<Record<string, unknown>> {
		return data.map(item => {
			const row: Record<string, unknown> = {};

			for (const col of columns) {
				row[col.key] = this.extractExcelValue(item, col.key);
			}

			return row;
		});
	}

	/**
   * Extract and format value for Excel
   */
	private extractExcelValue(item: TransformedData, key: string): string | number | boolean | null | undefined {
		try {
			// Handle specification keys
			if (key.startsWith("spec_")) {
				const specKey = key.slice(5);
				if (item.specifications?.[specKey]) {
					const specValue = item.specifications[specKey];
					return typeof specValue === 'string' || typeof specValue === 'number' || typeof specValue === 'boolean' ? specValue : String(specValue);
				}
				return null;
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
					value = null;
					break;
				}
			}

			// Ensure the return type is valid
			if (value === null || value === undefined) {
				return value;
			}
			if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
				return value;
			}
			return String(value);
		} catch (error) {
			console.warn(`Error extracting Excel value for key ${key}:`, error);
			return null;
		}
	}

	/**
   * Apply column formatting to worksheet
   */
	private applyColumnFormatting(worksheet: WorkSheet, columns: ExcelColumn[], XLSX: XLSXLibrary): void {
		// Set column widths
		worksheet["!cols"] = columns.map(col => ({
			width: col.width || 15,
		}));

		// Apply header styling
		const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1:A1") as unknown as { s: { r: number; c: number }; e: { r: number; c: number } };
		for (let col = range.s.c; col <= Math.min(range.e.c, columns.length - 1); col++) {
			const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
			if (worksheet[cellAddress] && typeof worksheet[cellAddress] === 'object' && 's' in worksheet[cellAddress]) {
				(worksheet[cellAddress] as any).s = {
					Font: { Bold: true },
					Fill: { FgColor: "E3F2FD" },
					Alignment: { Vertical: "center", Horizontal: "center" },
				};
			}
		}
	}

	/**
   * Generate summary statistics data
   */
	private generateSummaryData(data: TransformedData[]): Array<Array<string | number>> {
		const categories = this.getCategories(data);
		const languages = this.getLanguages(data);
		const brands = this.getBrands(data);

		const summary: Array<Array<string | number>> = [
			["", ""], // Spacing
			["Data Quality", ""],
			["Items with Images", data.filter(item => item.images && item.images.length > 0).length],
			["Items with Specifications", data.filter(item => item.specifications && Object.keys(item.specifications).length > 0).length],
			["Items with URLs", data.filter(item => item.url).length],
			["", ""], // Spacing
			["Categories", ""],
		];

		// Add category counts
		for (const category of categories) {
			const count = data.filter(item => item.category === category).length;
			summary.push([category, count]);
		}

		summary.push(["", ""], ["Languages", ""]);
		for (const language of languages) {
			const count = data.filter(item => item.language.language === language).length;
			summary.push([language, count]);
		}

		summary.push(["", ""], ["Top Brands", ""]);
		for (const brand of brands.slice(0, 10)) {
			const count = data.filter(item => item.brand === brand).length;
			summary.push([brand, count]);
		}

		// Add price statistics
		const prices = data
			.map(item => item.price)
			.filter((price): price is number => typeof price === "number");

		if (prices.length > 0) {
			summary.push(
				["", ""],
				["Price Statistics", ""],
				["Average Price", prices.reduce((sum, price) => sum + price, 0) / prices.length],
				["Min Price", Math.min(...prices)],
				["Max Price", Math.max(...prices)],
			);
		}

		return summary;
	}

	/**
   * Get unique categories from data
   */
	private getCategories(data: TransformedData[]): string[] {
		return [...new Set(data.map(item => item.category).filter((cat): cat is string => Boolean(cat)))];
	}

	/**
   * Get unique languages from data
   */
	private getLanguages(data: TransformedData[]): string[] {
		return [...new Set(data.map(item => item.language.language).filter(Boolean))];
	}

	/**
   * Get unique brands from data
   */
	private getBrands(data: TransformedData[]): string[] {
		const brandCounts = new Map<string, number>();
		for (const item of data) {
			if (item.brand) {
				brandCounts.set(item.brand, (brandCounts.get(item.brand) || 0) + 1);
			}
		}
		return [...brandCounts.entries()]
			.sort((a, b) => b[1] - a[1])
			.map(([brand]) => brand);
	}

	/**
   * Generate output path for Excel file
   */
	private generateOutputPath(): string {
		if (path.extname(this.options.outputPath)) {
			// If path already has extension, ensure it's .xlsx
			return this.options.outputPath.replace(/\.[^.]+$/, ".xlsx");
		} else {
			// Add .xlsx extension
			return `${this.options.outputPath}.xlsx`;
		}
	}

	/**
   * Create workbook with custom styling
   */
	protected async createStyledWorkbook(data: TransformedData[]): Promise<WorkBook> {
		try {
			let XLSX: XLSXLibrary;
			try {
				// @ts-ignore - xlsx is an optional dependency
				const xlsxModule = await import("xlsx");
				XLSX = xlsxModule as XLSXLibrary;
			} catch {
				throw new Error("Excel export requires the xlsx package. Please install it with: npm install xlsx");
			}
			const workbook = XLSX.utils.book_new();

			// Define styles
			const headerStyle = {
				Font: { Bold: true, Color: "FFFFFF" },
				Fill: { FgColor: "4472C4" },
				Alignment: { Vertical: "center", Horizontal: "center" },
			};

			const alternateRowStyle = {
				Fill: { FgColor: "F8F9FA" },
			};

			// Apply styles to main worksheet
			const mainWorksheet = this.createMainWorksheet(data, XLSX);
			this.applyAdvancedStyling(mainWorksheet, headerStyle, alternateRowStyle, XLSX);
			XLSX.utils.book_append_sheet(workbook, mainWorksheet, "Data");

			return workbook;

		} catch (error) {
			throw new Error(`Failed to create styled workbook: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	/**
   * Apply advanced Excel styling
   */
	private applyAdvancedStyling(worksheet: WorkSheet, headerStyle: any, alternateRowStyle: any, XLSX: XLSXLibrary): void {
		const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1:A1") as unknown as { s: { r: number; c: number }; e: { r: number; c: number } };

		// Apply header style
		for (let col = range.s.c; col <= range.e.c; col++) {
			const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
			if (worksheet[cellAddress] && typeof worksheet[cellAddress] === 'object' && 's' in worksheet[cellAddress]) {
				(worksheet[cellAddress] as any).s = headerStyle;
			}
		}

		// Apply alternate row style
		for (let row = range.s.r + 1; row <= range.e.r; row += 2) {
			for (let col = range.s.c; col <= range.e.c; col++) {
				const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
				if (worksheet[cellAddress] && typeof worksheet[cellAddress] === 'object' && 's' in worksheet[cellAddress]) {
					(worksheet[cellAddress] as any).s = alternateRowStyle;
				}
			}
		}
	}
}