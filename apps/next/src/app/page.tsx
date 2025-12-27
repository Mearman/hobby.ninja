import { brands, categories as allCategoriesData, getGradesSorted, items, series } from "@hobby-ninja/data";

import { HomepageClient } from "@/components/homepage-client";

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

	return (
		<HomepageClient
			categories={allCategories}
			series={allSeries}
			grades={allGrades}
			brands={allBrands}
			items={allItems}
		/>
	);
}
