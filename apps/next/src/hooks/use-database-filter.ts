"use client";

import type { Item, Manual } from "@hobby-ninja/data";
import { getNodeDisplayName } from "@hobby-ninja/data";
import { useMemo, useState } from "react";

export type DatabaseEntry =
	| (Item & { type: "item" })
	| (Manual & { type: "manual" });

export interface DatabaseFilterState {
	search: string;
	type: "all" | "items" | "manuals";
	brands: string[];
	categories: string[];
	grades: string[];
	scales: string[];
	series: string[];
	languages: string[];
	sortField: "name" | "date" | "brand";
	sortDirection: "asc" | "desc";
}

export function useDatabaseFilter(allEntries: DatabaseEntry[]) {
	const [filterState, setFilterState] = useState<DatabaseFilterState>({
		search: "",
		type: "all",
		brands: [],
		categories: [],
		grades: [],
		scales: [],
		series: [],
		languages: [],
		sortField: "name",
		sortDirection: "asc",
	});

	// Filter entries
	const filteredEntries = useMemo(() => {
		let filtered = allEntries;

		// Type filter
		if (filterState.type === "items") {
			filtered = filtered.filter((entry) => entry.type === "item");
		} else if (filterState.type === "manuals") {
			filtered = filtered.filter((entry) => entry.type === "manual");
		}

		// Search filter
		if (filterState.search.trim()) {
			const query = filterState.search.toLowerCase();
			filtered = filtered.filter((entry) => {
				const name = getNodeDisplayName(entry).toLowerCase();
				if (name.includes(query)) return true;

				if (entry.type === "item") {
					const brand = entry.brandIds.length > 0 ? entry.brandIds[0] : "";
					const category =
						entry.categoryIds.length > 0 ? entry.categoryIds[0] : "";
					return (
						brand.toLowerCase().includes(query) ||
						category.toLowerCase().includes(query) ||
						(entry.grade?.toLowerCase().includes(query) ?? false) ||
						(entry.scale?.toLowerCase().includes(query) ?? false)
					);
				}
				return false;
			});
		}

		// Brand filter (only for items)
		if (filterState.brands.length > 0) {
			filtered = filtered.filter(
				(entry) =>
					entry.type === "item" &&
					entry.brandIds.some((brand) => filterState.brands.includes(brand)),
			);
		}

		// Category filter (only for items)
		if (filterState.categories.length > 0) {
			filtered = filtered.filter(
				(entry) =>
					entry.type === "item" &&
					entry.categoryIds.some((category) =>
						filterState.categories.includes(category),
					),
			);
		}

		// Grade filter (only for items)
		if (filterState.grades.length > 0) {
			filtered = filtered.filter(
				(entry) =>
					entry.type === "item" &&
					entry.grade &&
					filterState.grades.includes(entry.grade),
			);
		}

		// Scale filter (only for items)
		if (filterState.scales.length > 0) {
			filtered = filtered.filter(
				(entry) =>
					entry.type === "item" &&
					entry.scale &&
					filterState.scales.includes(entry.scale),
			);
		}

		// Series filter (only for items)
		if (filterState.series.length > 0) {
			filtered = filtered.filter(
				(entry) =>
					entry.type === "item" &&
					entry.seriesIds.some((series) =>
						filterState.series.includes(series),
					),
			);
		}

		// Language filter (only for manuals)
		if (filterState.languages.length > 0) {
			filtered = filtered.filter(
				(entry) =>
					entry.type === "manual" &&
					entry.language &&
					filterState.languages.includes(entry.language),
			);
		}

		// Smart filtering: when showing "all", remove items that have manuals
		if (filterState.type === "all") {
			const manualItemIds = new Set(
				allEntries
					.filter(
						(entry): entry is Manual & { type: "manual" } =>
							entry.type === "manual",
					)
					.map((manual) => manual.itemId)
					.filter((itemId): itemId is string => itemId != null),
			);
			filtered = filtered.filter(
				(entry) => !(entry.type === "item" && manualItemIds.has(entry.id)),
			);
		}

		// Sort entries
		return filtered.toSorted((a, b) => {
			// Type sorting: items first when "all"
			if (filterState.type === "all" && a.type !== b.type) {
				return a.type === "item" ? -1 : 1;
			}

			let aValue: string;
			let bValue: string;

			switch (filterState.sortField) {
				case "name": {
					aValue = getNodeDisplayName(a);
					bValue = getNodeDisplayName(b);
					break;
				}
				case "brand": {
					aValue = a.type === "item" ? a.brandIds[0] ?? "" : "";
					bValue = b.type === "item" ? b.brandIds[0] ?? "" : "";
					break;
				}
				case "date": {
					// Extract year from releaseDate for comparison
					// This handles both string formats and object formats safely
					const getYearFromDate = (entry: DatabaseEntry): string => {
						if (!("releaseDate" in entry) || !entry.releaseDate) return "";
						const releaseDate = entry.releaseDate as
							| string
							| { year?: string | number }
							| undefined;
						if (typeof releaseDate === "string") {
							return releaseDate.split("-")[0];
						}
						// Safely check if it's an object with year property
						if (
							releaseDate &&
							typeof releaseDate === "object" &&
							"year" in releaseDate &&
							releaseDate.year
						) {
							const year = releaseDate.year;
							return typeof year === "string" ? year : String(year);
						}
						return "";
					};
					aValue = getYearFromDate(a);
					bValue = getYearFromDate(b);
					break;
				}
				default: {
					aValue = getNodeDisplayName(a);
					bValue = getNodeDisplayName(b);
				}
			}

			const comparison = aValue.localeCompare(bValue);
			return filterState.sortDirection === "desc" ? -comparison : comparison;
		});
	}, [allEntries, filterState]);

	const updateFilter = (updates: Partial<DatabaseFilterState>) => {
		setFilterState((prev) => ({ ...prev, ...updates }));
	};

	const clearFilters = () => {
		setFilterState({
			search: "",
			type: "all",
			brands: [],
			categories: [],
			grades: [],
			scales: [],
			series: [],
			languages: [],
			sortField: "name",
			sortDirection: "asc",
		});
	};

	const hasActiveFilters =
		filterState.search.trim() !== "" ||
		filterState.type !== "all" ||
		filterState.brands.length > 0 ||
		filterState.categories.length > 0 ||
		filterState.grades.length > 0 ||
		filterState.scales.length > 0 ||
		filterState.series.length > 0 ||
		filterState.languages.length > 0;

	return {
		filteredItems: filteredEntries,
		filterState,
		updateFilter,
		clearFilters,
		hasActiveFilters,
	};
}
