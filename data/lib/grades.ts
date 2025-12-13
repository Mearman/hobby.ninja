import { z } from "zod";
import gradesJson from "../dist/grades.json" with { type: "json" };
import { GradeDataSchema, type GradeData, type Item } from "./schemas.js";
import { items } from "./items.js";

/**
 * Validated grades data with helper functions
 *
 * Grades are derived from items based on their brand and name patterns.
 * They include hierarchical relationships (parent/child) for grade variants.
 */

const GradesRecordSchema = z.record(z.string(), GradeDataSchema);
export const grades = GradesRecordSchema.parse(gradesJson);

export const gradesList = Object.values(grades);

export function getGradeIds(): string[] {
	return Object.keys(grades);
}

export function getGradeById(id: string): GradeData | undefined {
	return grades[id];
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
	const parent = grades[parentId];
	if (!parent) return [];
	return parent.children.map(childId => grades[childId]).filter(Boolean) as GradeData[];
}

/**
 * Get all items for a given grade ID
 */
export function getItemsByGrade(gradeId: string): Item[] {
	const grade = grades[gradeId];
	if (!grade) return [];
	return grade.itemIds.map(id => items[id]).filter(Boolean) as Item[];
}

export type { GradeData } from "./schemas.js";
