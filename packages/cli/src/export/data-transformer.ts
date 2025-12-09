/**
 * Data transformation utilities for export functionality
 */

import { DEFAULT_VALUES, LANGUAGE_CODES } from "../constants/cli-constants.js";
import { EXPORT_CONSTANTS } from "../constants/export-constants.js";
import type { GundamData } from "../types/product-data.js";

import type { TransformedData, ExportFilters, ValidationResult, ValidationError, ValidationWarning } from "./types.js";

export class DataTransformer {
	/**
   * Transform raw GundamData to exportable format
   */
	static transformData(
		data: GundamData[],
		options: {
      includeImages?: boolean;
      includeSpecifications?: boolean;
      language?: "ja" | "en" | "all";
    } = {},
	): TransformedData[] {
		return data.map(item => this.transformSingleItem(item, options));
	}

	/**
   * Transform a single GundamData item
   */
	static transformSingleItem(
		item: GundamData,
		options: {
      includeImages?: boolean;
      includeSpecifications?: boolean;
      language?: "ja" | "en" | "all";
    } = {},
	): TransformedData {
		const transformed: TransformedData = {
			id: item.id ?? this.generateId(item),
			name: this.getLocalizedName(item.name, options.language ?? DEFAULT_VALUES.ALL),
			brand: item.brand ?? DEFAULT_VALUES.UNKNOWN,
			language: item.language,
			source: item.source ?? DEFAULT_VALUES.UNKNOWN_SOURCE,
			scrapedAt: item.scrapedAt ?? new Date().toISOString(),
			images: options.includeImages ? this.transformImages(item.images ?? []) : [],
		};

		// Add optional fields if they exist
		const series = this.extractSeries(item);
		if (series !== undefined) transformed.series = series;

		const category = this.extractCategory(item);
		if (category !== undefined) transformed.category = category;

		const price = this.extractPrice(item);
		if (price !== undefined) transformed.price = price;

		if (item.currency !== undefined) transformed.currency = item.currency;
		if (item.releaseDate !== undefined) transformed.releaseDate = item.releaseDate;
		if (item.url !== undefined) transformed.url = item.url;

		// Extract specifications if requested
		if (options.includeSpecifications && item.specifications) {
			transformed.specifications = item.specifications;

			// Extract commonly used spec fields as top-level properties
			const specs = item.specifications;
			if (specs["scale"]) transformed.scale = String(specs["scale"]);
			if (specs["grade"]) transformed.grade = String(specs["grade"]);
		}

		// Add description
		if (item.description) {
			transformed.description = typeof item.description === "string"
				? item.description
				: JSON.stringify(item.description);
		}

		return transformed;
	}

	/**
   * Filter data based on provided criteria
   */
	static filterData(data: TransformedData[], filters: ExportFilters): TransformedData[] {
		return data.filter(item => {
			// Category filter
			if (filters.categories && filters.categories.length > 0 && (!item.category || !filters.categories.includes(item.category))) {
				return false;
			}

			// Price range filter
			if (filters.minPrice !== undefined && (!item.price || item.price < filters.minPrice)) {
				return false;
			}
			if (filters.maxPrice !== undefined && (!item.price || item.price > filters.maxPrice)) {
				return false;
			}

			// Language filter
			if (filters.language && filters.language.length > 0 && !filters.language.includes(item.language.language)) {
				return false;
			}

			// Search text filter
			if (filters.searchText) {
				const searchText = filters.searchText.toLowerCase();
				const searchableText = [
					item.name,
					item.nameJa,
					item.nameEn,
					item.brand,
					item.series,
					item.category,
					item.description,
				].filter(Boolean).join(" ").toLowerCase();

				if (!searchableText.includes(searchText)) {
					return false;
				}
			}

			return true;
		});
	}

	/**
   * Validate transformed data
   */
	static validateData(data: TransformedData[]): ValidationResult {
		const errors: ValidationError[] = [];
		const warnings: ValidationWarning[] = [];

		for (const item of data) {
			// Required fields
			if (!item.id) {
				errors.push({
					field: "id",
					message: "ID is required",
					value: item.id,
				});
			}

			if (!item.name) {
				errors.push({
					field: "name",
					message: "Name is required",
					value: item.name,
				});
			}

			if (!item.brand) {
				warnings.push({
					field: "brand",
					message: "Brand is missing",
					value: item.brand,
				});
			}

			// Data type validation
			if (item.price && typeof item.price !== "number") {
				errors.push({
					field: "price",
					message: "Price must be a number",
					value: item.price,
				});
			}

			// Language validation
			if (![LANGUAGE_CODES.JAPANESE, LANGUAGE_CODES.ENGLISH, LANGUAGE_CODES.MIXED, LANGUAGE_CODES.UNKNOWN].includes(item.language.language)) {
				errors.push({
					field: "language",
					message: "Invalid language code",
					value: item.language.language,
				});
			}

			// URL validation
			if (item.url && !this.isValidUrl(item.url)) {
				warnings.push({
					field: "url",
					message: "Invalid URL format",
					value: item.url,
				});
			}
		}

		return {
			valid: errors.length === 0,
			errors,
			warnings,
		};
	}

	/**
   * Get localized name based on language preference
   */
	private static getLocalizedName(name: GundamData["name"], _language: string): string {
		if (!name) return DEFAULT_VALUES.UNKNOWN;

		// GundamData.name is always a string according to the interface
		if (typeof name === "string") {
			return name;
		}

		// Fallback for any non-string data (shouldn't happen with proper typing)
		return String(name);
	}

	/**
   * Extract series information
   */
	private static extractSeries(_item: GundamData): string | undefined {
		// GundamData doesn't have series property according to interface, so return undefined
		return undefined;
	}

	/**
   * Extract category information
   */
	private static extractCategory(item: GundamData): string | undefined {
		// Return category if it exists on GundamData
		if (item.category) {
			return typeof item.category === "string" ? item.category : String(item.category);
		}
		return undefined;
	}

	/**
   * Extract price information
   */
	private static extractPrice(item: GundamData): number | undefined {
		const price = item.price;
		if (typeof price === "number") {
			return price;
		}
		// GundamData interface shows price as number | undefined, so string case shouldn't happen
		return undefined;
	}

	/**
   * Transform images array
   */
	private static transformImages(images: GundamData["images"]): TransformedData["images"] {
		if (!images || !Array.isArray(images)) {
			return [];
		}

		return images.map(img => {
			const transformed: TransformedData["images"][0] = {
				type: img.type ?? "unknown",
				url: img.url ?? "",
				alt: img.alt,
			};
			return transformed;
		});
	}

	/**
   * Generate ID from item data if not provided
   */
	private static generateId(item: GundamData): string {
		const name = typeof item.name === "string" ? item.name : DEFAULT_VALUES.UNKNOWN_BRAND;
		const brand = item.brand ?? DEFAULT_VALUES.UNKNOWN_BRAND;
		const hash = Buffer.from(`${brand}-${name}-${item.source ?? DEFAULT_VALUES.UNKNOWN_BRAND}`).toString("base64");
		return hash.replaceAll(/[^a-zA-Z0-9]/g, "").slice(0, Math.max(0, EXPORT_CONSTANTS.HASH_SUBSTRING_LENGTH));
	}

	/**
   * Validate URL format
   */
	private static isValidUrl(url: string): boolean {
		try {
			new URL(url);
			return true;
		} catch {
			return false;
		}
	}

	/**
   * Get summary statistics for data
   */
	static getDataSummary(data: TransformedData[]): {
    totalItems: number;
    itemsWithImages: number;
    itemsWithSpecifications: number;
    languageDistribution: Record<string, number>;
    categoryDistribution: Record<string, number>;
    priceRange: { min: number; max: number; average: number } | null;
  } {
		const summary = {
			totalItems: data.length,
			itemsWithImages: 0,
			itemsWithSpecifications: 0,
			languageDistribution: {} as Record<string, number>,
			categoryDistribution: {} as Record<string, number>,
			priceRange: null as { min: number; max: number; average: number } | null,
		};

		const prices: number[] = [];

		for (const item of data) {
			// Images
			if (item.images && item.images.length > 0) {
				summary.itemsWithImages++;
			}

			// Specifications
			if (item.specifications && Object.keys(item.specifications).length > 0) {
				summary.itemsWithSpecifications++;
			}

			// Language distribution
			const lang = item.language.language;
			summary.languageDistribution[lang] = (summary.languageDistribution[lang] ?? 0) + 1;

			// Category distribution
			if (item.category) {
				summary.categoryDistribution[item.category] = (summary.categoryDistribution[item.category] ?? 0) + 1;
			}

			// Price data
			if (typeof item.price === "number") {
				prices.push(item.price);
			}
		}

		// Calculate price statistics
		if (prices.length > 0) {
			summary.priceRange = {
				min: Math.min(...prices),
				max: Math.max(...prices),
				average: prices.reduce((sum, price) => sum + price, 0) / prices.length,
			};
		}

		return summary;
	}
}