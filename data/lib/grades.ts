import { z } from "zod";

import gradesJson from "../dist/grades.json" with { type: "json" };

import { getItemById } from "./items.js";
import { GradeDataSchema, type GradeData, type Item } from "./schemas.js";

/**
 * Validated grades data with helper functions
 *
 * Grades are derived from items based on their brand and name patterns.
 * They include hierarchical relationships (parent/child) for grade variants.
 */

const GradesRecordSchema = z.record(z.string(), GradeDataSchema);
const gradesData = GradesRecordSchema.parse(gradesJson);

/** Default sort order for unknown grades (high value sorts to end) */
const DEFAULT_GRADE_SORT_ORDER = 999;

// Create a Map for safe key lookups that may return undefined
const gradesMap = new Map<string, GradeData>(Object.entries(gradesData));

/** Exported grades record for direct access */
export const grades = gradesData;

export const gradesList = Object.values(grades);

export function getGradeIds(): string[] {
	return Object.keys(grades);
}

export function getGradeById(id: string): GradeData | undefined {
	return gradesMap.get(id);
}

export function getGradeCount(): number {
	return gradesList.length;
}

/**
 * Get grades index with hierarchy information
 * Returns all grades and a map of parent/child relationships
 */
export function getGradesIndex(): {
	grades: GradeData[];
	hierarchy: Record<string, { parent: string | null; children: string[] }>;
	} {
	const hierarchy: Record<string, { parent: string | null; children: string[] }> = {};
	for (const grade of gradesList) {
		hierarchy[grade.id] = {
			parent: grade.parent,
			children: grade.children,
		};
	}
	return { grades: gradesList, hierarchy };
}

/**
 * Get all root grades (grades without parents)
 */
export function getRootGrades(): GradeData[] {
	return gradesList.filter(grade => grade.parent === null);
}

/**
 * Get all child grades for a given parent grade ID
 */
export function getChildGrades(parentId: string): GradeData[] {
	const parent = gradesMap.get(parentId);
	if (!parent) return [];
	return parent.children.flatMap(childId => {
		const child = gradesMap.get(childId);
		return child ? [child] : [];
	});
}

/**
 * Get all items for a given grade ID
 */
export function getItemsByGrade(gradeId: string): Item[] {
	const grade = gradesMap.get(gradeId);
	if (!grade) return [];
	return grade.itemIds.flatMap(id => {
		const item = getItemById(id);
		return item ? [item] : [];
	});
}

/**
 * Get the sort order for a grade ID
 * Returns DEFAULT_GRADE_SORT_ORDER (high value) for unknown grades so they sort to the end
 */
export function getGradeSortOrder(gradeId: string): number {
	return gradesMap.get(gradeId)?.sortOrder ?? DEFAULT_GRADE_SORT_ORDER;
}

/**
 * Sort an array of grade IDs by their sort order
 * Lower sort order values come first (EG=100 before PG=900)
 */
export function sortGradeIds(gradeIds: string[]): string[] {
	return [...gradeIds].toSorted((a, b) => getGradeSortOrder(a) - getGradeSortOrder(b));
}

/**
 * Get all grades sorted by their sort order
 */
export function getGradesSorted(): GradeData[] {
	return [...gradesList].toSorted((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Grade hierarchy entry with root grade and its children
 */
export interface GradeHierarchyEntry {
	root: GradeData;
	children: GradeData[];
}

/**
 * Get grades organized by hierarchy for UI rendering
 * Returns root grades with their children, sorted by sortOrder
 */
export function getGradesHierarchy(): GradeHierarchyEntry[] {
	const rootGrades = getRootGrades();
	return rootGrades
		.toSorted((a, b) => a.sortOrder - b.sortOrder)
		.map((root) => ({
			root,
			children: getChildGrades(root.id).toSorted((a, b) => a.sortOrder - b.sortOrder),
		}));
}

/**
 * Get all grade IDs in a grade family (root + all children)
 */
export function getGradeFamilyIds(rootGradeId: string): string[] {
	const root = gradesMap.get(rootGradeId);
	if (!root) return [];
	return [root.id, ...root.children];
}

/**
 * Get all unique item IDs in a grade family (root + all children)
 * Returns deduplicated array since items may have multiple grades in the same family
 */
export function getGradeFamilyItemIds(rootGradeId: string): string[] {
	const familyGradeIds = getGradeFamilyIds(rootGradeId);
	const allItemIds = new Set<string>();
	for (const gradeId of familyGradeIds) {
		const grade = gradesMap.get(gradeId);
		if (grade) {
			for (const itemId of grade.itemIds) {
				allItemIds.add(itemId);
			}
		}
	}
	return Array.from(allItemIds);
}

export type { GradeData } from "./schemas.js";
