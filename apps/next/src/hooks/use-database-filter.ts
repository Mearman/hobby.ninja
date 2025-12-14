"use client";

import type { Item, Manual } from "@hobby-ninja/data";
import { getNodeDisplayName } from "@hobby-ninja/data";
import { useMemo, useState } from "react";

import type { DatabaseAvailableOptions } from "@/components/lists/database-filters";

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

export function useDatabaseFilter(items: Item[], manuals: Manual[]) {
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

	// Combine items and manuals into unified array
	const allEntries = useMemo((): DatabaseEntry[] => {
		const entries: DatabaseEntry[] = [];
		for (const item of items) {
			entries.push({ ...item, type: "item" });
		}
		for (const manual of manuals) {
			entries.push({ ...manual, type: "manual" });
		}
		return entries;
	}, [items, manuals]);

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
					// Search in grades object (root keys + specific values)
					const gradesMatch =
						Object.keys(entry.grades).some(g => g.toLowerCase().includes(query)) ||
						Object.values(entry.grades).flat().some(g => g.toLowerCase().includes(query));
					return (
						brand.toLowerCase().includes(query) ||
						category.toLowerCase().includes(query) ||
						gradesMatch ||
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
		// Matches if any selected grade is a root key OR in any specific grades array
		if (filterState.grades.length > 0) {
			filtered = filtered.filter((entry) => {
				if (entry.type !== "item") return false;
				// Check if any selected grade matches root or specific
				return filterState.grades.some(
					(selectedGrade) =>
						selectedGrade in entry.grades ||
						Object.values(entry.grades).flat().includes(selectedGrade),
				);
			});
		}

		// Scale filter (for both items and manuals)
		if (filterState.scales.length > 0) {
			filtered = filtered.filter(
				(entry) =>
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

	// Calculate available filter options
	const availableOptions = useMemo((): DatabaseAvailableOptions => {
		const brands = new Set<string>();
		const categories = new Set<string>();
		const grades = new Set<string>();
		const scales = new Set<string>();
		const series = new Set<string>();
		const languages = new Set<string>();

		for (const item of items) {
			if (item.brandIds.length > 0) brands.add(item.brandIds[0]);
			if (item.categoryIds.length > 0) categories.add(item.categoryIds[0]);
			// Collect grades from object: both root keys and specific values
			for (const rootGrade of Object.keys(item.grades)) {
				grades.add(rootGrade);
			}
			for (const specificGrades of Object.values(item.grades)) {
				for (const specific of specificGrades) {
					grades.add(specific);
				}
			}
			if (item.scale) scales.add(item.scale);
			if (item.seriesIds.length > 0) series.add(item.seriesIds[0]);
		}

		for (const manual of manuals) {
			if (manual.language) languages.add(manual.language);
			if (manual.scale) scales.add(manual.scale);
		}

		return {
			brands: [...brands].toSorted(),
			categories: [...categories].toSorted(),
			grades: [...grades].toSorted(),
			scales: [...scales].toSorted(),
			series: [...series].toSorted(),
			languages: [...languages].toSorted(),
		};
	}, [items, manuals]);

	return {
		filteredItems: filteredEntries,
		filterState,
		updateFilter,
		clearFilters,
		hasActiveFilters,
		availableOptions,
	};
}
