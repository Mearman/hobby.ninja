/**
 * Unified Navigation Configuration
 *
 * Single source of truth for all navigation items. Items are distributed between
 * the header (top bar) and sidebar (hamburger menu) based on priority values.
 *
 * Priority → Breakpoint Mapping:
 * - Priority 1: visibleFrom="xs" (always visible)
 * - Priority 2: visibleFrom="sm" (768px+)
 * - Priority 3: visibleFrom="md" (992px+)
 * - Priority 4: visibleFrom="lg" (1200px+)
 * - Priority 5+: visibleFrom="xl" (1408px+)
 * - undefined: sidebar only (never in header)
 */

import type { Icon } from "@tabler/icons-react";
import {
	IconArrowsDiagonal,
	IconDeviceDesktop,
	IconDownload,
	IconFilterDown,
	IconFolder,
	IconHeart,
	IconHome,
	IconInfoCircle,
	IconMoon,
	IconSearch,
	IconSettings,
	IconShare,
	IconSun,
	IconUpload,
} from "@tabler/icons-react";

// ============================================================================
// Types
// ============================================================================

export type NavActionType = "theme" | "fullwidth" | "filter-toggle";

export interface NavItem {
	/** Unique identifier */
	id: string;
	/** Display label */
	label: string;
	/** Navigation href (optional for action-only items) */
	href?: string;
	/** Icon component */
	icon: Icon;
	/** Badge content (e.g., count) */
	badge?: string | number;
	/** Opens in new tab */
	external?: boolean;
	/** Nested navigation items */
	children?: NavItem[];
	/** Header visibility priority (lower = more visible, undefined = sidebar only) */
	headerPriority?: number;
	/** How to render in header: icon only or icon with label */
	headerVariant?: "icon" | "icon-label";
	/** Only show on specific paths */
	visibleOnPaths?: string[];
	/** Special action type for interactive buttons */
	action?: NavActionType;
	/** Tooltip text (defaults to label) */
	tooltip?: string;
}

// ============================================================================
// Route Constants
// ============================================================================

const ROUTES = {
	HOME: "/",
	SEARCH: "/search",
	COLLECTION: "/collection",
	COLLECTION_IMPORT_EXPORT: "/collection/import-export",
	COLLECTION_CREATE: "/collection/create",
	ABOUT: "/about",
	SETTINGS: "/settings",
} as const;

// ============================================================================
// Primary Navigation Items
// ============================================================================

/**
 * Main navigation items shown in sidebar.
 * These are the core navigation destinations.
 */
export const primaryNavItems: NavItem[] = [
	{
		id: "home",
		label: "Home",
		href: ROUTES.HOME,
		icon: IconHome,
	},
	{
		id: "search",
		label: "Search",
		href: ROUTES.SEARCH,
		icon: IconSearch,
	},
	{
		id: "collection",
		label: "Collection",
		href: ROUTES.COLLECTION,
		icon: IconFolder,
		badge: "2", // TODO: Make dynamic based on actual collection count
		children: [
			{
				id: "my-collections",
				label: "My Collections",
				href: ROUTES.COLLECTION,
				icon: IconFolder,
			},
			{
				id: "import-export",
				label: "Import / Export",
				href: ROUTES.COLLECTION_IMPORT_EXPORT,
				icon: IconUpload,
			},
			{
				id: "create-collection",
				label: "Create Collection",
				href: ROUTES.COLLECTION_CREATE,
				icon: IconHeart,
			},
		],
	},
];

// ============================================================================
// Secondary Navigation Items
// ============================================================================

/**
 * Secondary navigation items shown in sidebar under "More" section.
 */
export const secondaryNavItems: NavItem[] = [
	{
		id: "about",
		label: "About",
		href: ROUTES.ABOUT,
		icon: IconInfoCircle,
	},
	{
		id: "settings",
		label: "Settings",
		href: ROUTES.SETTINGS,
		icon: IconSettings,
	},
];

// ============================================================================
// Header Action Items
// ============================================================================

/**
 * Action items for the header bar.
 * Priority determines when they become visible as viewport grows.
 * Lower priority = visible on smaller screens.
 */
export const headerActions: NavItem[] = [
	{
		id: "filter-toggle",
		label: "Toggle filters",
		icon: IconFilterDown,
		headerPriority: 2,
		action: "filter-toggle",
		visibleOnPaths: [ROUTES.HOME],
		tooltip: "Show/hide active filters",
	},
	{
		id: "collection-link",
		label: "Collections",
		href: ROUTES.COLLECTION,
		icon: IconFolder,
		headerPriority: 2,
		tooltip: "View collections",
	},
	{
		id: "about-link",
		label: "About",
		href: ROUTES.ABOUT,
		icon: IconInfoCircle,
		headerPriority: 2,
		tooltip: "About hobby.ninja",
	},
	{
		id: "fullwidth-toggle",
		label: "Toggle width",
		icon: IconArrowsDiagonal,
		headerPriority: 4,
		action: "fullwidth",
		tooltip: "Toggle full width mode",
	},
	{
		id: "theme-toggle",
		label: "Toggle theme",
		icon: IconSun, // Dynamic - actual icon determined at render time
		headerPriority: 2,
		action: "theme",
		tooltip: "Change color scheme",
	},
];

// ============================================================================
// Quick Actions (Sidebar Only)
// ============================================================================

/**
 * Quick action buttons shown at bottom of sidebar.
 */
export const quickActions: NavItem[] = [
	{
		id: "share",
		label: "Share",
		icon: IconShare,
	},
	{
		id: "download",
		label: "Download",
		icon: IconDownload,
	},
	{
		id: "settings-quick",
		label: "Settings",
		icon: IconSettings,
	},
];

// ============================================================================
// Theme Icons
// ============================================================================

/**
 * Icons for each theme state.
 */
export const themeIcons = {
	light: IconSun,
	dark: IconMoon,
	system: IconDeviceDesktop,
} as const;
