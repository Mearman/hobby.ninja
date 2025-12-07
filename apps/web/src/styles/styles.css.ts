import { style, globalStyle } from "@vanilla-extract/css";

/**
 * Vanilla Extract styles for custom styling beyond Mantine components.
 *
 * Usage examples:
 * - Use Mantine CSS variables: var(--mantine-color-default-border)
 * - Use Mantine spacing: var(--mantine-spacing-md)
 * - Use Mantine radius: var(--mantine-radius-md)
 * - Use Mantine shadows: var(--mantine-shadow-sm)
 *
 * For descendant selectors, use globalStyle():
 *   const myClass = style({ ... });
 *   globalStyle(`${myClass} h1`, { fontSize: '2rem' });
 */

// Example custom style using Mantine variables
export const exampleCard = style({
	padding: "var(--mantine-spacing-md)",
	borderRadius: "var(--mantine-radius-md)",
	border: "1px solid var(--mantine-color-default-border)",
	boxShadow: "var(--mantine-shadow-sm)",
});

// Example of descendant selector using globalStyle
globalStyle(`${exampleCard} h3`, {
	marginTop: 0,
	marginBottom: "var(--mantine-spacing-xs)",
});

// Home page styles
export const homeContainer = style({
	minHeight: "100vh",
	paddingTop: "var(--mantine-spacing-xl)",
	paddingBottom: "var(--mantine-spacing-xl)",
	background: "linear-gradient(180deg, var(--mantine-color-gray-0) 0%, var(--mantine-color-gray-1) 100%)",
});

export const featuresGrid = style({
	display: "grid",
	gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
	gap: "var(--mantine-spacing-lg)",
	marginBottom: "var(--mantine-spacing-xl)",
});

export const featureCard = style({
	height: "100%",
	transition: "all 0.2s ease",
	border: "1px solid var(--mantine-color-gray-3)",
	"&:hover": {
		transform: "translateY(-2px)",
		boxShadow: "var(--mantine-shadow-lg)",
		borderColor: "var(--mantine-color-blue-6)",
	},
});
export const aboutContainer = style({});
export const techStack = style({});
export const notFoundContainer = style({});

// Database page styles
export const databaseContainer = style({
	minHeight: "100vh",
	paddingTop: "var(--mantine-spacing-lg)",
	paddingBottom: "var(--mantine-spacing-xl)",
	background: "linear-gradient(180deg, var(--mantine-color-gray-0) 0%, var(--mantine-color-gray-1) 100%)",
});

export const databaseHeader = style({
	marginBottom: "var(--mantine-spacing-xl)",
	textAlign: "center",
});

export const heroSection = style({
	marginBottom: "3rem",
	position: "relative",
	background: "linear-gradient(135deg, var(--mantine-color-blue-1) 0%, var(--mantine-color-blue-0) 100%)",
	borderRadius: "var(--mantine-radius-xl)",
	padding: "var(--mantine-spacing-xl)",
});

export const statsCard = style({
	background: "linear-gradient(135deg, var(--mantine-color-blue-light), var(--mantine-color-gray-light))",
	borderRadius: "var(--mantine-radius-lg)",
	padding: "var(--mantine-spacing-xl)",
	border: "1px solid var(--mantine-color-blue-3)",
	transition: "all 0.3s ease",
});

export const hobbyTypeCard = style({
	transition: "all 0.2s ease",
	border: "2px solid var(--mantine-color-default-border)",
	background: "var(--mantine-color-white)",
	cursor: "pointer",
});

// Hover and active states for hobbyTypeCard
globalStyle(`${hobbyTypeCard}:hover`, {
	transform: "translateY(-2px)",
	boxShadow: "var(--mantine-shadow-md)",
	borderColor: "var(--mantine-color-blue-6)",
});

globalStyle(`${hobbyTypeCard}:active`, {
	transform: "translateY(0)",
});

export const featuredSection = style({
	height: "100%",
	display: "flex",
	flexDirection: "column",
});

// Database-specific styles
export const searchContainer = style({
	marginBottom: "var(--mantine-spacing-lg)",
	padding: "var(--mantine-spacing-md)",
	background: "var(--mantine-color-white)",
	borderRadius: "var(--mantine-radius-lg)",
	border: "1px solid var(--mantine-color-default-border)",
	boxShadow: "var(--mantine-shadow-sm)",
});

export const filtersSection = style({
	marginBottom: "var(--mantine-spacing-lg)",
});

export const itemGrid = style({
	display: "grid",
	gap: "var(--mantine-spacing-md)",
});

// Responsive grid layouts
export const itemGridCompact = style({
	composes: itemGrid,
	gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
});

export const itemGridComfortable = style({
	composes: itemGrid,
	gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
});

export const itemGridSpacious = style({
	composes: itemGrid,
	gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
});

// Item card styles
export const itemCard = style({
	background: "var(--mantine-color-white)",
	borderRadius: "var(--mantine-radius-lg)",
	border: "1px solid var(--mantine-color-gray-3)",
	overflow: "hidden",
	transition: "all 0.2s ease",
	cursor: "pointer",
	height: "100%",
	display: "flex",
	flexDirection: "column",
});

export const itemCardHover = style({
	composes: itemCard,
});

globalStyle(`${itemCardHover}:hover`, {
	transform: "translateY(-4px)",
	boxShadow: "var(--mantine-shadow-lg)",
	borderColor: "var(--mantine-color-blue-6)",
});

export const itemCardSelected = style({
	composes: itemCard,
	borderColor: "var(--mantine-color-blue-6)",
	boxShadow: "0 0 0 2px var(--mantine-color-blue-1)",
});

export const itemCardImageContainer = style({
	position: "relative",
	width: "100%",
	height: "200px",
	overflow: "hidden",
	background: "var(--mantine-color-gray-1)",
});

export const itemCardContent = style({
	padding: "var(--mantine-spacing-md)",
	flex: 1,
	display: "flex",
	flexDirection: "column",
});

export const itemCardTitle = style({
	fontSize: "var(--mantine-font-size-md)",
	fontWeight: 600,
	lineHeight: 1.3,
	marginBottom: "var(--mantine-spacing-xs)",
	color: "var(--mantine-color-gray-9)",
});

export const itemCardDescription = style({
	fontSize: "var(--mantine-font-size-sm)",
	color: "var(--mantine-color-gray-6)",
	lineHeight: 1.4,
	flex: 1,
	marginBottom: "var(--mantine-spacing-sm)",
});

export const itemCardMeta = style({
	display: "flex",
	justifyContent: "space-between",
	alignItems: "center",
	fontSize: "var(--mantine-font-size-xs)",
	color: "var(--mantine-color-gray-5)",
});

// Detail view styles
export const detailContainer = style({
	display: "grid",
	gridTemplateColumns: "1fr 2fr",
	gap: "var(--mantine-spacing-xl)",
	marginBottom: "var(--mantine-spacing-xl)",
});

export const detailImageSection = style({
	position: "sticky",
	top: "var(--mantine-spacing-lg)",
	height: "fit-content",
});

export const detailInfoSection = style({
	minHeight: "400px",
});

export const detailActions = style({
	display: "flex",
	gap: "var(--mantine-spacing-sm)",
	marginTop: "var(--mantine-spacing-md)",
	paddingTop: "var(--mantine-spacing-md)",
	borderTop: "1px solid var(--mantine-color-gray-3)",
});

// Filter and search styles
export const filterChip = style({
	transition: "all 0.2s ease",
	cursor: "pointer",
});

globalStyle(`${filterChip}:hover`, {
	backgroundColor: "var(--mantine-color-blue-1)",
});

export const activeFilterChip = style({
	backgroundColor: "var(--mantine-color-blue-6)",
	color: "var(--mantine-color-white)",
});

export const searchInput = style({
	borderColor: "var(--mantine-color-gray-3)",
	transition: "all 0.2s ease",
});

globalStyle(`${searchInput}:focus`, {
	borderColor: "var(--mantine-color-blue-6)",
	boxShadow: "0 0 0 2px var(--mantine-color-blue-1)",
});

// Status indicator styles
export const statusIndicator = style({
	display: "inline-flex",
	alignItems: "center",
	gap: "var(--mantine-spacing-xs)",
	fontSize: "var(--mantine-font-size-xs)",
	fontWeight: 500,
	padding: "2px var(--mantine-spacing-xs)",
	borderRadius: "var(--mantine-radius-sm)",
});

export const statusIndicatorNew = style({
	composes: statusIndicator,
	backgroundColor: "var(--mantine-color-green-1)",
	color: "var(--mantine-color-green-8)",
});

export const statusIndicatorUpdated = style({
	composes: statusIndicator,
	backgroundColor: "var(--mantine-color-blue-1)",
	color: "var(--mantine-color-blue-8)",
});

export const statusIndicatorDiscontinued = style({
	composes: statusIndicator,
	backgroundColor: "var(--mantine-color-red-1)",
	color: "var(--mantine-color-red-8)",
});

// Loading states
export const loadingSkeleton = style({
	background: "linear-gradient(90deg, var(--mantine-color-gray-1) 25%, var(--mantine-color-gray-2) 50%, var(--mantine-color-gray-1) 75%)",
	backgroundSize: "200% 100%",
	animation: "skeleton-loading 1.5s infinite",
	borderRadius: "var(--mantine-radius-sm)",
});

// Animation keyframes
export const fadeIn = style({
	animation: "fade-in 0.3s ease-out",
});

export const slideUp = style({
	animation: "slide-up 0.3s ease-out",
});

// Define animations
globalStyle("@keyframes skeleton-loading", {
	"0%": { backgroundPosition: "200% 0" },
	"100%": { backgroundPosition: "-200% 0" },
});

globalStyle("@keyframes fade-in", {
	"0%": { opacity: 0 },
	"100%": { opacity: 1 },
});

globalStyle("@keyframes slide-up", {
	"0%": {
		opacity: 0,
		transform: "translateY(20px)",
	},
	"100%": {
		opacity: 1,
		transform: "translateY(0)",
	},
});

// Mobile responsiveness
export const mobileBreakpoint = style({
	"@media": {
		"(max-width: 768px)": {
			padding: "var(--mantine-spacing-sm)",
		},
	},
});

// Compact view for mobile
export const mobileGrid = style({
	"@media": {
		"(max-width: 768px)": {
			gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
			gap: "var(--mantine-spacing-sm)",
		},
	},
});

// Shared component styles
export const sectionTitle = style({
	fontSize: "var(--mantine-font-size-xl)",
	fontWeight: 700,
	marginBottom: "var(--mantine-spacing-md)",
	color: "var(--mantine-color-gray-9)",
});

export const sectionSubtitle = style({
	fontSize: "var(--mantine-font-size-sm)",
	color: "var(--mantine-color-gray-6)",
	marginBottom: "var(--mantine-spacing-lg)",
});

// Accessibility styles
export const focusVisible = style({
	outline: "2px solid var(--mantine-color-blue-6)",
	outlineOffset: "2px",
});

// High contrast mode support
globalStyle(".item-card", {
	"@media": {
		"(prefers-contrast: high)": {
			borderWidth: "2px",
			borderColor: "var(--mantine-color-gray-7)",
		},
	},
});

globalStyle(".filter-chip", {
	"@media": {
		"(prefers-contrast: high)": {
			borderWidth: "2px",
			borderColor: "var(--mantine-color-gray-7)",
		},
	},
});

globalStyle(".search-input", {
	"@media": {
		"(prefers-contrast: high)": {
			borderWidth: "2px",
			borderColor: "var(--mantine-color-gray-7)",
		},
	},
});

// Reduced motion support
globalStyle(".item-card", {
	"@media": {
		"(prefers-reduced-motion: reduce)": {
			animation: "none",
			transition: "none",
		},
	},
});

globalStyle(".filter-chip", {
	"@media": {
		"(prefers-reduced-motion: reduce)": {
			animation: "none",
			transition: "none",
		},
	},
});

globalStyle(".fade-in", {
	"@media": {
		"(prefers-reduced-motion: reduce)": {
			animation: "none",
			transition: "none",
		},
	},
});

globalStyle(".slide-up", {
	"@media": {
		"(prefers-reduced-motion: reduce)": {
			animation: "none",
			transition: "none",
		},
	},
});

// Print styles
globalStyle(".search-container", {
	"@media": {
		print: {
			display: "none",
		},
	},
});

globalStyle(".filters-section", {
	"@media": {
		print: {
			display: "none",
		},
	},
});

globalStyle(".item-grid", {
	"@media": {
		print: {
			gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
		},
	},
});
