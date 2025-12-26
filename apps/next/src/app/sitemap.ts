import { getGradeIds, getScaleIds } from "@hobby-ninja/data";
import { brandsList } from "@hobby-ninja/data/brands";
import { categoriesList } from "@hobby-ninja/data/categories";
import { itemsList } from "@hobby-ninja/data/items";
import { manualsList } from "@hobby-ninja/data/manuals";
import { seriesList } from "@hobby-ninja/data/series";
import type { MetadataRoute } from "next";


// Required for static export
export const dynamic = "force-static";

const BASE_URL = "https://hobby.ninja";

export default function sitemap(): MetadataRoute.Sitemap {
	const now = new Date();

	// Static pages
	const staticPages: MetadataRoute.Sitemap = [
		{
			url: BASE_URL,
			lastModified: now,
			changeFrequency: "weekly",
			priority: 1,
		},
		{
			url: `${BASE_URL}/database`,
			lastModified: now,
			changeFrequency: "weekly",
			priority: 0.9,
		},
		{
			url: `${BASE_URL}/search`,
			lastModified: now,
			changeFrequency: "monthly",
			priority: 0.8,
		},
		{
			url: `${BASE_URL}/collection`,
			lastModified: now,
			changeFrequency: "monthly",
			priority: 0.7,
		},
	];

	// Items - highest volume, moderate priority
	const itemPages: MetadataRoute.Sitemap = itemsList.map((item) => ({
		url: `${BASE_URL}/items/${item.id}`,
		lastModified: now,
		changeFrequency: "monthly" as const,
		priority: 0.6,
	}));

	// Brands
	const brandPages: MetadataRoute.Sitemap = brandsList.map((brand) => ({
		url: `${BASE_URL}/brands/${brand.id}`,
		lastModified: now,
		changeFrequency: "monthly" as const,
		priority: 0.7,
	}));

	// Categories
	const categoryPages: MetadataRoute.Sitemap = categoriesList.map((category) => ({
		url: `${BASE_URL}/categories/${category.id}`,
		lastModified: now,
		changeFrequency: "monthly" as const,
		priority: 0.7,
	}));

	// Series
	const seriesPages: MetadataRoute.Sitemap = seriesList.map((s) => ({
		url: `${BASE_URL}/series/${s.id}`,
		lastModified: now,
		changeFrequency: "monthly" as const,
		priority: 0.7,
	}));

	// Manuals
	const manualPages: MetadataRoute.Sitemap = manualsList.map((manual) => ({
		url: `${BASE_URL}/manuals/${manual.id}`,
		lastModified: now,
		changeFrequency: "monthly" as const,
		priority: 0.5,
	}));

	// Grades
	const gradeIds = getGradeIds();
	const gradePages: MetadataRoute.Sitemap = gradeIds.map((id) => ({
		url: `${BASE_URL}/grades/${id}`,
		lastModified: now,
		changeFrequency: "monthly" as const,
		priority: 0.7,
	}));

	// Scales
	const scaleIds = getScaleIds();
	const scalePages: MetadataRoute.Sitemap = scaleIds.map((id) => ({
		url: `${BASE_URL}/scales/${id}`,
		lastModified: now,
		changeFrequency: "monthly" as const,
		priority: 0.7,
	}));

	return [
		...staticPages,
		...brandPages,
		...categoryPages,
		...seriesPages,
		...gradePages,
		...scalePages,
		...manualPages,
		...itemPages,
	];
}
