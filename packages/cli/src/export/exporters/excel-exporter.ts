/**
 * Excel exporter implementation using XLSX library
 */

import path from "node:path";

import type { TransformedData, ExcelColumn } from "../types.js";
import type { WorkBook, WorkSheet, XLSXLibrary } from "../xlsx-types.js";

import { BaseExporter } from "./base-exporter.js";

// Constants
const DEFAULT_COLUMN_WIDTH = 15;
const TOP_BRANDS_LIMIT = 10;
const ALTERNATE_ROW_INTERVAL = 2;
const HEADER_ROW_INDEX = 0;
const FIRST_DATA_ROW = 1;
const SPEC_PREFIX = "spec_";
const SPEC_PREFIX_LENGTH = 5;
const XLSX_ERROR_MESSAGE = "Excel export requires the xlsx package. Please install it with: npm install xlsx";
const PRICE_JPY_HEADER = "Price (JPY)";

export class ExcelExporter extends BaseExporter {
	/**
   * Export data to Excel format
   */
	protected async exportToFile(data: TransformedData[]): Promise<string> {
		try {
			// Dynamically import xlsx library to avoid build issues
			let XLSX: XLSXLibrary;
			try {
				// @ts-expect-error - xlsx is an optional dependency
				XLSX = await import("xlsx") as XLSXLibrary;
			} catch {
				throw new Error(XLSX_ERROR_MESSAGE);
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
			const errorMessage = error instanceof Error ? error.message : String(error);
			throw new Error(`Excel export failed: ${errorMessage}`);
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
		const range = XLSX.utils.decode_range(worksheet["!ref"] ?? "A1:B1");
		for (let row = range.s.r; row <= range.e.r; row++) {
			for (let col = range.s.c; col <= range.e.c; col++) {
				const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
				const cell = worksheet[cellAddress];
				if (cell && typeof cell === "object" && "v" in cell) {
					cell.s = {
						Font: { Bold: row === HEADER_ROW_INDEX },
						Fill: row === HEADER_ROW_INDEX ? { FgColor: "E3F2FD" } : undefined,
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
					{ key: "spec_scale", header: "Scale", width: DEFAULT_COLUMN_WIDTH },
					{ key: "spec_grade", header: "Grade", width: DEFAULT_COLUMN_WIDTH },
					{ key: "spec_price", header: PRICE_JPY_HEADER, width: DEFAULT_COLUMN_WIDTH },
				];
			}

			case "mg": {
				return [
					...baseColumns,
					{ key: "spec_scale", header: "Scale", width: DEFAULT_COLUMN_WIDTH },
					{ key: "spec_grade", header: "Grade", width: DEFAULT_COLUMN_WIDTH },
					{ key: "spec_price", header: PRICE_JPY_HEADER, width: DEFAULT_COLUMN_WIDTH },
					{ key: "spec_release", header: "Release Date", width: DEFAULT_COLUMN_WIDTH },
				];
			}

			case "pg": {
				return [
					...baseColumns,
					{ key: "spec_scale", header: "Scale", width: DEFAULT_COLUMN_WIDTH },
					{ key: "spec_grade", header: "Grade", width: DEFAULT_COLUMN_WIDTH },
					{ key: "spec_price", header: PRICE_JPY_HEADER, width: DEFAULT_COLUMN_WIDTH },
					{ key: "spec_lights", header: "LED Lights", width: DEFAULT_COLUMN_WIDTH },
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
			if (key.startsWith(SPEC_PREFIX)) {
				const specKey = key.slice(SPEC_PREFIX_LENGTH);
				const specValue = item.specifications?.[specKey];
				if (specValue === undefined || specValue === null) {
					return null;
				}
				if (typeof specValue === "string" || typeof specValue === "number" || typeof specValue === "boolean") {
					return specValue;
				}
				// Stringify objects and arrays
				return JSON.stringify(specValue);
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
			if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
				return value;
			}
			// Stringify objects and arrays
			return JSON.stringify(value);
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
			width: col.width ?? DEFAULT_COLUMN_WIDTH,
		}));

		// Apply header styling
		const range = XLSX.utils.decode_range(worksheet["!ref"] ?? "A1:A1") as unknown as { s: { r: number; c: number }; e: { r: number; c: number } };
		for (let col = range.s.c; col <= Math.min(range.e.c, columns.length - 1); col++) {
			const cellAddress = XLSX.utils.encode_cell({ r: HEADER_ROW_INDEX, c: col });
			if (worksheet[cellAddress] && typeof worksheet[cellAddress] === "object" && "s" in worksheet[cellAddress]) {
				interface CellWithStyle {
					s: {
						Font: { Bold: boolean };
						Fill: { FgColor: string };
						Alignment: { Vertical: string; Horizontal: string };
					};
				}
				(worksheet[cellAddress] as CellWithStyle).s = {
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
			["Items with Images", data.filter(item => item.images.length > 0).length],
			["Items with Specifications", data.filter(item => Object.keys(item.specifications).length > 0).length],
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
		for (const brand of brands.slice(0, TOP_BRANDS_LIMIT)) {
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
		return [...new Set(data.map(item => item.category).filter((cat): cat is string => typeof cat === "string"))];
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
				brandCounts.set(item.brand, (brandCounts.get(item.brand) ?? 0) + 1);
			}
		}
		return [...brandCounts.entries()]
			.toSorted((a, b) => b[1] - a[1])
			.map(([brand]) => brand);
	}

	/**
   * Generate output path for Excel file
   */
	private generateOutputPath(): string {
		return path.extname(this.options.outputPath)
			? this.options.outputPath.replace(/\.[^.]+$/, ".xlsx")
			: `${this.options.outputPath}.xlsx`;
	}

	/**
   * Create workbook with custom styling
   */
	protected async createStyledWorkbook(data: TransformedData[]): Promise<WorkBook> {
		try {
			let XLSX: XLSXLibrary;
			try {
				// @ts-expect-error - xlsx is an optional dependency
				const xlsxModule = await import("xlsx") as XLSXLibrary;
				XLSX = xlsxModule;
			} catch {
				throw new Error(XLSX_ERROR_MESSAGE);
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
	private applyAdvancedStyling(
		worksheet: WorkSheet,
		headerStyle: { Font: { Bold: boolean; Color: string }; Fill: { FgColor: string }; Alignment: { Vertical: string; Horizontal: string } },
		alternateRowStyle: { Fill: { FgColor: string } },
		XLSX: XLSXLibrary,
	): void {
		const range = XLSX.utils.decode_range(worksheet["!ref"] ?? "A1:A1") as unknown as { s: { r: number; c: number }; e: { r: number; c: number } };

		// Apply header style
		for (let col = range.s.c; col <= range.e.c; col++) {
			const cellAddress = XLSX.utils.encode_cell({ r: HEADER_ROW_INDEX, c: col });
			if (worksheet[cellAddress] && typeof worksheet[cellAddress] === "object" && "s" in worksheet[cellAddress]) {
				interface CellWithStyle {
					s: typeof headerStyle;
				}
				(worksheet[cellAddress] as CellWithStyle).s = headerStyle;
			}
		}

		// Apply alternate row style
		for (let row = range.s.r + FIRST_DATA_ROW; row <= range.e.r; row += ALTERNATE_ROW_INTERVAL) {
			for (let col = range.s.c; col <= range.e.c; col++) {
				const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
				if (worksheet[cellAddress] && typeof worksheet[cellAddress] === "object" && "s" in worksheet[cellAddress]) {
					interface CellWithStyle {
						s: typeof alternateRowStyle;
					}
					(worksheet[cellAddress] as CellWithStyle).s = alternateRowStyle;
				}
			}
		}
	}
}