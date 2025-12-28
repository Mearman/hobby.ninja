/**
 * Lightweight item page data module
 *
 * Returns only the fields needed for rendering item detail pages,
 * significantly reducing RSC payload size (~70% reduction per page).
 */

import { getBrandById } from "./brands.js";
import { getCategoryById } from "./categories.js";
import { getItemById } from "./items.js";
import { getManualById } from "./manuals.js";
import {
	getNodeAccessories,
	getNodeDisplayName,
	getNodeImages,
	getNodePrimaryGrade,
	type Item,
	type LocalizedString,
	type LocalizedTextArray,
} from "./schemas.js";
import { getSeriesById } from "./series.js";

/**
 * Minimal reference with just id and resolved display name
 */
export interface NamedRef {
	id: string;
	name: string;
}

/**
 * Minimal PDF data for display
 */
export interface PdfSummary {
	name: string;
	url: string;
}

/**
 * Minimal manual data needed for item page
 */
export interface ManualSummary {
	id: string;
	name: string;
	thumbnailImage?: string;
	productNumber?: string;
	scale?: string;
	releaseDate?: { year?: number | null; month?: number | null; day?: number | null };
	brands: NamedRef[];
	series: NamedRef[];
	pdfs: PdfSummary[];
}

/**
 * Lightweight item data for page rendering
 * Only includes fields actually displayed on the item detail page
 */
export interface ItemPageData {
	id: string;
	name: string;
	images: string[];
	displayImage?: string;
	scales: string[];
	targetAge?: number;
	sourceUrl?: string;
	globalSiteUrls?: { enUs?: string };
	pbandaiUs?: Array<{ id: string; url: string }>;
	primaryGrade: string | null;

	// Formatted values
	price?: { amount: number; currency: string };
	releaseDate?: { year?: number | null; month?: number | null; day?: number | null };

	// Content arrays
	description: string[];
	accessories: string[];

	// Pre-resolved relationships (just id + name)
	categories: NamedRef[];
	brands: NamedRef[];
	series: NamedRef[];

	// Manual summary (if available)
	manual?: ManualSummary;
}

/**
 * Helper to get localized name as string
 */
function getLocalizedName(name: string | LocalizedString): string {
	if (typeof name === "string") return name;
	return name.en ?? name.ja;
}

/**
 * Helper to extract description as string array
 */
function getDescriptionItems(item: Item): string[] {
	if (!item.description) return [];
	return item.description.en ?? item.description.ja;
}

/**
 * Get lightweight item data for page rendering
 * Returns only the fields needed, with relationships pre-resolved to names
 */
export function getItemPageData(id: string): ItemPageData | undefined {
	const item = getItemById(id);
	if (!item) return undefined;

	// Pre-resolve category names
	const categories: NamedRef[] = item.categories
		.map((c) => {
			const cat = getCategoryById(c.id);
			return cat ? { id: cat.id, name: getNodeDisplayName(cat) } : null;
		})
		.filter((c): c is NamedRef => c !== null);

	// Pre-resolve brand names
	const brands: NamedRef[] = item.brands
		.map((b) => {
			const brand = getBrandById(b.id);
			return brand ? { id: brand.id, name: getNodeDisplayName(brand) } : null;
		})
		.filter((b): b is NamedRef => b !== null);

	// Pre-resolve series names
	const series: NamedRef[] = item.series
		.map((s) => {
			const ser = getSeriesById(s.id);
			return ser ? { id: ser.id, name: getNodeDisplayName(ser) } : null;
		})
		.filter((s): s is NamedRef => s !== null);

	// Get manual summary if available
	let manual: ManualSummary | undefined;
	if (item.manual?.id) {
		const fullManual = getManualById(item.manual.id);
		if (fullManual) {
			manual = {
				id: fullManual.id,
				name: getNodeDisplayName(fullManual),
				thumbnailImage: fullManual.thumbnailImage,
				productNumber: fullManual.productNumber,
				scale: fullManual.scale,
				releaseDate: fullManual.releaseDate,
				brands: fullManual.brandIds
					.map((bid) => {
						const brand = getBrandById(bid);
						return brand ? { id: brand.id, name: getNodeDisplayName(brand) } : null;
					})
					.filter((b): b is NamedRef => b !== null),
				series: fullManual.seriesIds
					.map((sid) => {
						const ser = getSeriesById(sid);
						return ser ? { id: ser.id, name: getNodeDisplayName(ser) } : null;
					})
					.filter((s): s is NamedRef => s !== null),
				pdfs: (fullManual.pdfs ?? []).map((pdf) => ({
					name: getLocalizedName(pdf.name),
					url: pdf.url,
				})),
			};
		}
	}

	return {
		id: item.id,
		name: getNodeDisplayName(item),
		images: getNodeImages(item),
		displayImage: item.displayImage,
		scales: item.scales,
		targetAge: item.targetAge,
		sourceUrl: item.sourceUrl,
		globalSiteUrls: item.globalSiteUrls,
		pbandaiUs: item.pbandaiUs,
		primaryGrade: getNodePrimaryGrade(item),
		price: item.price,
		releaseDate: item.releaseDate,
		description: getDescriptionItems(item),
		accessories: getNodeAccessories(item),
		categories,
		brands,
		series,
		manual,
	};
}
