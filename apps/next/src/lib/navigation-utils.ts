/**
 * Navigation Utilities
 *
 * Helper functions for the unified navigation system.
 */

import type { MantineBreakpoint } from "@mantine/core";

import type { NavItem } from "@/config/navigation";

/**
 * Maps a priority value to a Mantine breakpoint.
 *
 * Lower priority = visible on smaller screens.
 *
 * @param priority - The priority value (1-5+, or undefined)
 * @returns The Mantine breakpoint or undefined (never show in header)
 *
 * Mapping:
 * - Priority 1: "xs" (576px+, essentially always)
 * - Priority 2: "sm" (768px+)
 * - Priority 3: "md" (992px+)
 * - Priority 4: "lg" (1200px+)
 * - Priority 5+: "xl" (1408px+)
 * - undefined: item is sidebar-only
 */
export function priorityToBreakpoint(priority: number | undefined): MantineBreakpoint | undefined {
	if (priority === undefined) return undefined;
	if (priority <= 1) return "xs";
	if (priority === 2) return "sm";
	if (priority === 3) return "md";
	if (priority === 4) return "lg";
	return "xl";
}

/**
 * Determines if a nav item should be visible on the current path.
 *
 * @param item - The navigation item to check
 * @param pathname - The current pathname
 * @returns True if the item should be visible
 */
export function shouldShowOnPath(item: NavItem, pathname: string): boolean {
	if (!item.visibleOnPaths || item.visibleOnPaths.length === 0) {
		return true;
	}
	return item.visibleOnPaths.some(path =>
		path === pathname || (path !== "/" && pathname.startsWith(path)),
	);
}

/**
 * Checks if a path is active (matches current pathname).
 *
 * @param href - The path to check
 * @param pathname - The current pathname
 * @returns True if the path is active
 */
export function isPathActive(href: string, pathname: string): boolean {
	if (href === "/") return pathname === "/";
	return pathname.startsWith(href);
}

/**
 * Calculates the breakpoint at which the hamburger menu should be hidden.
 *
 * The hamburger should be visible until all header items are visible.
 * This finds the highest priority (lowest visibility breakpoint) and
 * returns the next breakpoint up.
 *
 * @param actions - The header action items
 * @returns The breakpoint to hide the hamburger from
 */
export function getHamburgerHiddenFrom(actions: NavItem[]): MantineBreakpoint {
	const priorities = actions
		.map(a => a.headerPriority)
		.filter((p): p is number => p !== undefined);

	if (priorities.length === 0) return "xs"; // Always show hamburger if no header items

	const maxPriority = Math.max(...priorities);
	const breakpoint = priorityToBreakpoint(maxPriority);

	// Return the breakpoint where all items would be visible
	// If max priority maps to "lg", hamburger hides at "lg"
	return breakpoint ?? "xl";
}

/**
 * Filters navigation items based on current path.
 *
 * @param items - The navigation items to filter
 * @param pathname - The current pathname
 * @returns Filtered items that should be visible on this path
 */
export function filterItemsByPath(items: NavItem[], pathname: string): NavItem[] {
	return items.filter(item => shouldShowOnPath(item, pathname));
}

/**
 * Sorts navigation items by header priority (lowest first).
 *
 * @param items - The navigation items to sort
 * @returns Sorted items
 */
export function sortByPriority(items: NavItem[]): NavItem[] {
	return items.toSorted((a, b) => {
		const aPriority = a.headerPriority ?? Infinity;
		const bPriority = b.headerPriority ?? Infinity;
		return aPriority - bPriority;
	});
}
