import { brands, categories as allCategoriesData, getGradesSorted, getScalesBySize, items, series } from "@hobby-ninja/data";

import { HomepageClient, type YearData } from "@/components/homepage-client";

export default function HomePage() {
	// Get all items for the Explore section
	const allItems = Object.values(items);

	// Get all categories sorted by item count
	const allCategories = Object.values(allCategoriesData)
		.filter((c) => c.itemIds.length > 0)
		.toSorted((a, b) => b.itemIds.length - a.itemIds.length);

	// Get all series sorted by item count
	const allSeries = Object.values(series)
		.filter((s) => s.itemIds.length > 0)
		.toSorted((a, b) => b.itemIds.length - a.itemIds.length);

	// Get grades sorted by sort order (EG, SD, HG, etc.)
	const allGrades = getGradesSorted()
		.filter((g) => g.itemIds.length > 0);

	// Get non-grade brands sorted by item count
	const allBrands = Object.values(brands)
		.filter((b) => b.itemIds.length > 0 && b.type !== "grade")
		.toSorted((a, b) => b.itemIds.length - a.itemIds.length);

	// Get scales sorted by size (largest first: 1/60, 1/100, 1/144, etc.)
	const allScales = getScalesBySize()
		.filter((s) => s.itemIds.length > 0);

	// Group items by release year, sorted newest first
	const yearMap = new Map<number, string[]>();
	for (const item of allItems) {
		const year = item.releaseDate?.year;
		if (year && year > 0) {
			const existing = yearMap.get(year) ?? [];
			existing.push(item.id);
			yearMap.set(year, existing);
		}
	}
	const allYears: YearData[] = [...yearMap.entries()]
		.map(([year, itemIds]) => ({
			id: String(year),
			name: String(year),
			year,
			itemIds,
		}))
		.toSorted((a, b) => b.year - a.year); // Newest first

	return (
		<HomepageClient
			categories={allCategories}
			series={allSeries}
			grades={allGrades}
			brands={allBrands}
			scales={allScales}
			years={allYears}
			items={allItems}
		/>
	);
}
