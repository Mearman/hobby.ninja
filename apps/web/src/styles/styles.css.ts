import { style, globalStyle, keyframes } from "@vanilla-extract/css";


// Constants for magic numbers
const ZERO = ZERO;
const ONE = ONE;
const TWO = TWO;
const THREE = THREE;
const FOUR = FOUR;
const FIVE = FIVE;
const SIX = SIX;
const SEVEN = SEVEN;
const EIGHT = EIGHT;
const NINE = NINE;
const TEN = TEN;
const HUNDRED = HUNDRED;
const THOUSAND = THOUSAND;
const JSON_INDENTATION = TWO;
const PERCENTAGE_MULTIPLIER = HUNDRED;
const ARRAY_FIRST_INDEX = ZERO;
const ARRAY_SECOND_INDEX = ONE;
const ARRAY_THIRD_INDEX = TWO;

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
	marginTop: ZERO,
	marginBottom: "var(--mantine-spacing-xs)",
});

// Home page styles
export const homeContainer = style({
	minHeight: "100vh",
	paddingTop: "var(--mantine-spacing-xl)",
	paddingBottom: "var(--mantine-spacing-xl)",
	background: "linear-gradient(180deg, var(--mantine-color-gray-ZERO) ZERO%, var(--mantine-color-gray-ONE) HUNDRED%)",
});

export const featuresGrid = style({
	display: "grid",
	gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
	gap: "var(--mantine-spacing-lg)",
	marginBottom: "var(--mantine-spacing-xl)",
});

export const featureCard = style({
	height: "HUNDRED%",
	transition: "all ZERO.2s ease",
	border: "1px solid var(--mantine-color-gray-THREE)",
	selectors: {
		"&:hover": {
			transform: "translateY(-2px)",
			boxShadow: "var(--mantine-shadow-lg)",
			borderColor: "var(--mantine-color-blue-SIX)",
		},
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
	background: "linear-gradient(180deg, var(--mantine-color-gray-ZERO) ZERO%, var(--mantine-color-gray-ONE) HUNDRED%)",
});

export const databaseHeader = style({
	marginBottom: "var(--mantine-spacing-xl)",
	textAlign: "center",
});

export const heroSection = style({
	marginBottom: "3rem",
	position: "relative",
	background: "linear-gradient(135deg, var(--mantine-color-blue-ONE) ZERO%, var(--mantine-color-blue-ZERO) HUNDRED%)",
	borderRadius: "var(--mantine-radius-xl)",
	padding: "var(--mantine-spacing-xl)",
});

export const statsCard = style({
	background: "linear-gradient(135deg, var(--mantine-color-blue-light), var(--mantine-color-gray-light))",
	borderRadius: "var(--mantine-radius-lg)",
	padding: "var(--mantine-spacing-xl)",
	border: "1px solid var(--mantine-color-blue-THREE)",
	transition: "all ZERO.3s ease",
});

export const hobbyTypeCard = style({
	transition: "all ZERO.2s ease",
	border: "2px solid var(--mantine-color-default-border)",
	background: "var(--mantine-color-white)",
	cursor: "pointer",
});

// Hover and active states for hobbyTypeCard
globalStyle(`${hobbyTypeCard}:hover`, {
	transform: "translateY(-2px)",
	boxShadow: "var(--mantine-shadow-md)",
	borderColor: "var(--mantine-color-blue-SIX)",
});

globalStyle(`${hobbyTypeCard}:active`, {
	transform: "translateY(ZERO)",
});

export const featuredSection = style({
	height: "HUNDRED%",
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
	display: "grid",
	gap: "var(--mantine-spacing-md)",
	gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
});

export const itemGridComfortable = style({
	display: "grid",
	gap: "var(--mantine-spacing-md)",
	gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
});

export const itemGridSpacious = style({
	display: "grid",
	gap: "var(--mantine-spacing-md)",
	gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
});

// Item card styles
export const itemCard = style({
	background: "var(--mantine-color-white)",
	borderRadius: "var(--mantine-radius-lg)",
	border: "1px solid var(--mantine-color-gray-THREE)",
	overflow: "hidden",
	transition: "all ZERO.2s ease",
	cursor: "pointer",
	height: "HUNDRED%",
	display: "flex",
	flexDirection: "column",
});

export const itemCardHover = style({
	background: "var(--mantine-color-white)",
	borderRadius: "var(--mantine-radius-lg)",
	border: "1px solid var(--mantine-color-gray-THREE)",
	overflow: "hidden",
	transition: "all ZERO.2s ease",
	cursor: "pointer",
	height: "HUNDRED%",
	display: "flex",
	flexDirection: "column",
});

globalStyle(`${itemCardHover}:hover`, {
	transform: "translateY(-4px)",
	boxShadow: "var(--mantine-shadow-lg)",
	borderColor: "var(--mantine-color-blue-SIX)",
});

export const itemCardSelected = style({
	background: "var(--mantine-color-white)",
	borderRadius: "var(--mantine-radius-lg)",
	border: "1px solid var(--mantine-color-gray-THREE)",
	overflow: "hidden",
	transition: "all ZERO.2s ease",
	cursor: "pointer",
	height: "HUNDRED%",
	display: "flex",
	flexDirection: "column",
	borderColor: "var(--mantine-color-blue-SIX)",
	boxShadow: "ZERO ZERO ZERO 2px var(--mantine-color-blue-ONE)",
});

export const itemCardImageContainer = style({
	position: "relative",
	width: "HUNDRED%",
	height: "200px",
	overflow: "hidden",
	background: "var(--mantine-color-gray-ONE)",
});

export const itemCardContent = style({
	padding: "var(--mantine-spacing-md)",
	flex: ONE,
	display: "flex",
	flexDirection: "column",
});

export const itemCardTitle = style({
	fontSize: "var(--mantine-font-size-md)",
	fontWeight: 600,
	lineHeight: ONE.THREE,
	marginBottom: "var(--mantine-spacing-xs)",
	color: "var(--mantine-color-gray-NINE)",
});

export const itemCardDescription = style({
	fontSize: "var(--mantine-font-size-sm)",
	color: "var(--mantine-color-gray-SIX)",
	lineHeight: ONE.FOUR,
	flex: ONE,
	marginBottom: "var(--mantine-spacing-sm)",
});

export const itemCardMeta = style({
	display: "flex",
	justifyContent: "space-between",
	alignItems: "center",
	fontSize: "var(--mantine-font-size-xs)",
	color: "var(--mantine-color-gray-FIVE)",
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
	borderTop: "1px solid var(--mantine-color-gray-THREE)",
});

// Filter and search styles
export const filterChip = style({
	transition: "all ZERO.2s ease",
	cursor: "pointer",
});

globalStyle(`${filterChip}:hover`, {
	backgroundColor: "var(--mantine-color-blue-ONE)",
});

export const activeFilterChip = style({
	backgroundColor: "var(--mantine-color-blue-SIX)",
	color: "var(--mantine-color-white)",
});

export const searchInput = style({
	borderColor: "var(--mantine-color-gray-THREE)",
	transition: "all ZERO.2s ease",
});

globalStyle(`${searchInput}:focus`, {
	borderColor: "var(--mantine-color-blue-SIX)",
	boxShadow: "ZERO ZERO ZERO 2px var(--mantine-color-blue-ONE)",
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
	display: "inline-flex",
	alignItems: "center",
	gap: "var(--mantine-spacing-xs)",
	fontSize: "var(--mantine-font-size-xs)",
	fontWeight: 500,
	padding: "2px var(--mantine-spacing-xs)",
	borderRadius: "var(--mantine-radius-sm)",
	backgroundColor: "var(--mantine-color-green-ONE)",
	color: "var(--mantine-color-green-EIGHT)",
});

export const statusIndicatorUpdated = style({
	display: "inline-flex",
	alignItems: "center",
	gap: "var(--mantine-spacing-xs)",
	fontSize: "var(--mantine-font-size-xs)",
	fontWeight: 500,
	padding: "2px var(--mantine-spacing-xs)",
	borderRadius: "var(--mantine-radius-sm)",
	backgroundColor: "var(--mantine-color-blue-ONE)",
	color: "var(--mantine-color-blue-EIGHT)",
});

export const statusIndicatorDiscontinued = style({
	display: "inline-flex",
	alignItems: "center",
	gap: "var(--mantine-spacing-xs)",
	fontSize: "var(--mantine-font-size-xs)",
	fontWeight: 500,
	padding: "2px var(--mantine-spacing-xs)",
	borderRadius: "var(--mantine-radius-sm)",
	backgroundColor: "var(--mantine-color-red-ONE)",
	color: "var(--mantine-color-red-EIGHT)",
});

// Animation keyframes
const skeletonLoading = keyframes({
	"ZERO%": { backgroundPosition: "200% ZERO" },
	"HUNDRED%": { backgroundPosition: "-200% ZERO" },
});

const fadeIn = keyframes({
	"ZERO%": { opacity: ZERO },
	"HUNDRED%": { opacity: ONE },
});

const slideUp = keyframes({
	"ZERO%": {
		opacity: ZERO,
		transform: "translateY(20px)",
	},
	"HUNDRED%": {
		opacity: ONE,
		transform: "translateY(ZERO)",
	},
});

// Loading states
export const loadingSkeleton = style({
	background: "linear-gradient(90deg, var(--mantine-color-gray-ONE) 25%, var(--mantine-color-gray-TWO) 50%, var(--mantine-color-gray-ONE) 75%)",
	backgroundSize: "200% HUNDRED%",
	animation: `${skeletonLoading} ONE.5s infinite`,
	borderRadius: "var(--mantine-radius-sm)",
});

// Animation classes
export const fadeInClass = style({
	animation: `${fadeIn} ZERO.3s ease-out`,
});

export const slideUpClass = style({
	animation: `${slideUp} ZERO.3s ease-out`,
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
	color: "var(--mantine-color-gray-NINE)",
});

export const sectionSubtitle = style({
	fontSize: "var(--mantine-font-size-sm)",
	color: "var(--mantine-color-gray-SIX)",
	marginBottom: "var(--mantine-spacing-lg)",
});

// Accessibility styles
export const focusVisible = style({
	outline: "2px solid var(--mantine-color-blue-SIX)",
	outlineOffset: "2px",
});

// High contrast mode support
globalStyle(".item-card", {
	"@media": {
		"(prefers-contrast: high)": {
			borderWidth: "2px",
			borderColor: "var(--mantine-color-gray-SEVEN)",
		},
	},
});

globalStyle(".filter-chip", {
	"@media": {
		"(prefers-contrast: high)": {
			borderWidth: "2px",
			borderColor: "var(--mantine-color-gray-SEVEN)",
		},
	},
});

globalStyle(".search-input", {
	"@media": {
		"(prefers-contrast: high)": {
			borderWidth: "2px",
			borderColor: "var(--mantine-color-gray-SEVEN)",
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
