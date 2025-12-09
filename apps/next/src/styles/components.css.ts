import { style, globalStyle, createVar, keyframes } from "@vanilla-extract/css";

import { theme } from "@/lib/theme";

// CSS Variables for dynamic theming
export const borderRadiusVar = createVar("borderRadius");
export const cardShadowVar = createVar("cardShadow");
export const hoverTransformVar = createVar("hoverTransform");
export const transitionSpeedVar = createVar("transitionSpeed");

// Keyframes (defined early to avoid hoisting issues)
export const fadeInKeyframe = keyframes({
	"0%": { opacity: "0" },
	"100%": { opacity: "1" },
});

export const slideUpKeyframe = keyframes({
	"0%": {
		opacity: "0",
		transform: "translateY(20px)",
	},
	"100%": {
		opacity: "1",
		transform: "translateY(0)",
	},
});

export const slideDownKeyframe = keyframes({
	"0%": {
		opacity: "0",
		transform: "translateY(-20px)",
	},
	"100%": {
		opacity: "1",
		transform: "translateY(0)",
	},
});

export const scaleInKeyframe = keyframes({
	"0%": {
		opacity: "0",
		transform: "scale(0.9)",
	},
	"100%": {
		opacity: "1",
		transform: "scale(1)",
	},
});

// Global styles for component overrides
globalStyle("*", {
	boxSizing: "border-box",
});

globalStyle("body", {
	margin: 0,
	fontFamily: "inherit",
	WebkitFontSmoothing: "antialiased",
	MozOsxFontSmoothing: "grayscale",
});

// Layout Components
export const appShell = style({
	minHeight: "100vh",
	display: "flex",
	flexDirection: "column",
	backgroundColor: `var(--mantine-color-body)`,
});

export const mainContent = style({
	flex: 1,
	display: "flex",
	flexDirection: "column",
});

// Header Styles
export const header = style({
	position: "sticky",
	top: 0,
	zIndex: 1000,
	backgroundColor: `var(--mantine-color-body)`,
	borderBottom: `1px solid var(--mantine-color-gray-3)`,
	backdropFilter: "blur(8px)",
	"@media": {
		"(prefers-reduced-motion: reduce)": {
			position: "static",
			backdropFilter: "none",
		},
	},
});

export const headerContent = style({
	maxWidth: "1200px",
	margin: "0 auto",
	padding: "0 var(--mantine-spacing-md)",
	display: "flex",
	alignItems: "center",
	justifyContent: "space-between",
	height: "60px",
});

export const logo = style({
	fontSize: "1.5rem",
	fontWeight: 700,
	color: `var(--mantine-color-blue-6)`,
	textDecoration: "none",
	transition: `color ${transitionSpeedVar} ease`,
	":hover": {
		color: `var(--mantine-color-blue-7)`,
	},
});

// Navigation
export const nav = style({
	display: "flex",
	alignItems: "center",
	gap: "var(--mantine-spacing-lg)",
});

export const navLink = style({
	color: `var(--mantine-color-gray-7)`,
	textDecoration: "none",
	fontSize: "0.95rem",
	fontWeight: 500,
	padding: "var(--mantine-spacing-sm) var(--mantine-spacing-md)",
	borderRadius: "var(--mantine-radius-default)",
	transition: `all ${transitionSpeedVar} ease`,
	":hover": {
		backgroundColor: `var(--mantine-color-gray-0)`,
		color: `var(--mantine-color-blue-6)`,
	},
	selectors: {
		'&[data-active="true"]': {
			backgroundColor: `var(--mantine-color-blue-0)`,
			color: `var(--mantine-color-blue-6)`,
		},
	},
});

// Item Grid
export const itemGrid = style({
	display: "grid",
	gap: "var(--mantine-spacing-md)",
	gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
	"@media": {
		"(max-width: 768px)": {
			gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
			gap: "var(--mantine-spacing-sm)",
		},
		"(max-width: 480px)": {
			gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
			gap: "var(--mantine-spacing-xs)",
		},
	},
});

export const itemGridListView = style({
	gridTemplateColumns: "1fr",
	gap: "var(--mantine-spacing-sm)",
});

// Item Card
export const itemCard = style({
	position: "relative",
	borderRadius: borderRadiusVar,
	boxShadow: cardShadowVar,
	transition: `all ${transitionSpeedVar} ease`,
	cursor: "pointer",
	overflow: "hidden",
	backgroundColor: `var(--mantine-color-white)`,
	border: `1px solid var(--mantine-color-gray-3)`,
	":hover": {
		transform: hoverTransformVar,
		boxShadow: "var(--mantine-shadow-lg)",
		borderColor: `var(--mantine-color-blue-6)`,
	},
	selectors: {
		'&[data-selected="true"]': {
			borderColor: `var(--mantine-color-blue-6)`,
			boxShadow: "0 0 0 2px var(--mantine-color-blue-6)",
		},
	},
});

export const itemCardImage = style({
	width: "100%",
	height: "200px",
	objectFit: "cover",
	backgroundColor: `var(--mantine-color-gray-0)`,
	"@media": {
		"(max-width: 480px)": {
			height: "150px",
		},
	},
});

export const itemCardContent = style({
	padding: "var(--mantine-spacing-md)",
});

export const itemCardTitle = style({
	fontSize: "1rem",
	fontWeight: 600,
	color: `var(--mantine-color-gray-9)`,
	margin: "0 0 var(--mantine-spacing-xs) 0",
	lineHeight: 1.3,
	display: "-webkit-box",
	WebkitLineClamp: 2,
	WebkitBoxOrient: "vertical",
	overflow: "hidden",
});

export const itemCardSubtitle = style({
	fontSize: "0.875rem",
	color: `var(--mantine-color-gray-6)`,
	margin: "0 0 var(--mantine-spacing-sm) 0",
	lineHeight: 1.4,
});

export const itemCardMetadata = style({
	display: "flex",
	flexWrap: "wrap",
	gap: "var(--mantine-spacing-xs)",
	marginBottom: "var(--mantine-spacing-sm)",
});

export const itemCardBadge = style({
	fontSize: "0.75rem",
	fontWeight: 500,
	padding: "2px 8px",
	borderRadius: "var(--mantine-radius-sm)",
	backgroundColor: `var(--mantine-color-gray-1)`,
	color: `var(--mantine-color-gray-7)`,
});

export const itemCardPrice = style({
	fontSize: "1.1rem",
	fontWeight: 700,
	color: `var(--mantine-color-blue-6)`,
	margin: 0,
});

export const itemCardActions = style({
	display: "flex",
	gap: "var(--mantine-spacing-xs)",
	marginTop: "var(--mantine-spacing-sm)",
	opacity: 0,
	transition: `opacity ${transitionSpeedVar} ease`,
	selectors: {
		[`${itemCard}:hover &`]: {
			opacity: 1,
		},
	},
});

// Search and Filter Components
export const searchContainer = style({
	backgroundColor: `var(--mantine-color-white)`,
	padding: "var(--mantine-spacing-lg)",
	borderRadius: "var(--mantine-radius-lg)",
	border: `1px solid var(--mantine-color-gray-3)`,
	marginBottom: "var(--mantine-spacing-lg)",
});

export const searchInput = style({
	fontSize: "1rem",
	padding: "var(--mantine-spacing-md)",
});

export const filterChips = style({
	display: "flex",
	flexWrap: "wrap",
	gap: "var(--mantine-spacing-xs)",
	marginTop: "var(--mantine-spacing-md)",
});

export const filterChip = style({
	fontSize: "0.875rem",
	padding: "6px 12px",
	borderRadius: "var(--mantine-radius-full)",
	backgroundColor: `var(--mantine-color-gray-1)`,
	color: `var(--mantine-color-gray-7)`,
	border: "none",
	cursor: "pointer",
	transition: `all ${transitionSpeedVar} ease`,
	":hover": {
		backgroundColor: `var(--mantine-color-gray-2)`,
	},
	selectors: {
		'&[data-active="true"]': {
			backgroundColor: `var(--mantine-color-blue-6)`,
			color: "white",
		},
	},
});

// Collection Components
export const collectionGrid = style({
	display: "grid",
	gap: "var(--mantine-spacing-lg)",
	gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
	"@media": {
		"(max-width: 768px)": {
			gridTemplateColumns: "1fr",
		},
	},
});

export const collectionCard = style({
	borderRadius: borderRadiusVar,
	boxShadow: cardShadowVar,
	overflow: "hidden",
	transition: `all ${transitionSpeedVar} ease`,
	border: `1px solid var(--mantine-color-gray-3)`,
	":hover": {
		transform: hoverTransformVar,
		boxShadow: "var(--mantine-shadow-lg)",
	},
});

export const collectionHeader = style({
	padding: "var(--mantine-spacing-lg)",
	backgroundColor: `var(--mantine-color-gradient-1)`,
	color: "white",
});

export const collectionContent = style({
	padding: "var(--mantine-spacing-lg)",
});

export const statsGrid = style({
	display: "grid",
	gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
	gap: "var(--mantine-spacing-md)",
	margin: "var(--mantine-spacing-md) 0",
});

export const statCard = style({
	textAlign: "center",
	padding: "var(--mantine-spacing-md)",
	borderRadius: "var(--mantine-radius-default)",
	backgroundColor: `var(--mantine-color-gray-0)`,
});

export const statValue = style({
	fontSize: "1.5rem",
	fontWeight: 700,
	color: `var(--mantine-color-blue-6)`,
	margin: "0 0 4px 0",
});

export const statLabel = style({
	fontSize: "0.875rem",
	color: `var(--mantine-color-gray-6)`,
	margin: 0,
	textTransform: "uppercase",
	letterSpacing: "0.05em",
});

// Progress Tracker
export const progressBar = style({
	width: "100%",
	height: "8px",
	backgroundColor: `var(--mantine-color-gray-2)`,
	borderRadius: "var(--mantine-radius-sm)",
	overflow: "hidden",
	margin: "var(--mantine-spacing-sm) 0",
});

export const progressFill = style({
	height: "100%",
	backgroundColor: `var(--mantine-color-blue-6)`,
	borderRadius: "var(--mantine-radius-sm)",
	transition: `width ${transitionSpeedVar} ease`,
});

export const progressSegments = style({
	display: "flex",
	height: "100%",
});

export const progressSegment = style({
	height: "100%",
	transition: `width ${transitionSpeedVar} ease`,
	":first-child": {
		borderTopLeftRadius: "var(--mantine-radius-sm)",
		borderBottomLeftRadius: "var(--mantine-radius-sm)",
	},
	":last-child": {
		borderTopRightRadius: "var(--mantine-radius-sm)",
		borderBottomRightRadius: "var(--mantine-radius-sm)",
	},
});

// Loading and Skeleton States
export const skeletonContainer = style({
	display: "grid",
	gap: "var(--mantine-spacing-md)",
	gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
});

export const skeletonCard = style({
	borderRadius: borderRadiusVar,
	overflow: "hidden",
});

export const skeletonImage = style({
	width: "100%",
	height: "200px",
	backgroundColor: `var(--mantine-color-gray-1)`,
});

export const skeletonContent = style({
	padding: "var(--mantine-spacing-md)",
});

export const skeletonLine = style({
	height: "1rem",
	backgroundColor: `var(--mantine-color-gray-1)`,
	borderRadius: "var(--mantine-radius-sm)",
	marginBottom: "var(--mantine-spacing-xs)",
	selectors: {
		"&:last-child": {
			width: "60%",
		},
	},
});

// Responsive utilities
export const mobileOnly = style({
	display: "block",
	"@media": {
		"(min-width: 769px)": {
			display: "none",
		},
	},
});

export const desktopOnly = style({
	display: "none",
	"@media": {
		"(min-width: 769px)": {
			display: "block",
		},
	},
});

// Animation classes
export const fadeIn = style({
	animation: `${fadeInKeyframe} 0.3s ease-in-out`,
});

export const slideUp = style({
	animation: `${slideUpKeyframe} 0.3s ease-out`,
});

export const slideDown = style({
	animation: `${slideDownKeyframe} 0.3s ease-out`,
});

export const scaleIn = style({
	animation: `${scaleInKeyframe} 0.2s ease-out`,
});

// Database hub page styles
export const databaseStatCard = style({
	transition: "all 0.2s ease-in-out",
	border: "1px solid var(--mantine-color-gray-2)",

	selectors: {
		"&:hover": {
			transform: "translateY(-2px)",
			boxShadow: "var(--mantine-shadow-md)",
			borderColor: "var(--mantine-color-blue-3)",
		},
	},
});

export const databaseStatIcon = style({
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	width: "48px",
	height: "48px",
	borderRadius: "var(--mantine-radius-md)",
	backgroundColor: "var(--mantine-color-blue-0)",
	color: "var(--mantine-color-blue-6)",
});

export const categoryCard = style({
	textDecoration: "none",
	color: "inherit",
	transition: "all 0.2s ease-in-out",
	backgroundColor: "var(--mantine-color-white)",

	selectors: {
		"&:hover": {
			transform: "translateY(-4px)",
			boxShadow: "var(--mantine-shadow-lg)",
			borderColor: "var(--mantine-color-blue-4)",
		},
	},
});

export const brandLogo = style({
	borderRadius: "var(--mantine-radius-md)",
	overflow: "hidden",
	backgroundColor: "var(--mantine-color-gray-0)",
	border: "1px solid var(--mantine-color-gray-2)",
});

export const categoryIcon = style({
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	width: "64px",
	height: "64px",
	borderRadius: "var(--mantine-radius-lg)",
	backgroundColor: "var(--mantine-color-blue-1)",
	color: "var(--mantine-color-blue-6)",
});

export const seriesCard = style({
	textDecoration: "none",
	color: "inherit",
	transition: "all 0.2s ease-in-out",
	backgroundColor: "var(--mantine-color-white)",

	selectors: {
		"&:hover": {
			transform: "translateY(-4px)",
			boxShadow: "var(--mantine-shadow-lg)",
			borderColor: "var(--mantine-color-blue-4)",
		},
	},
});

export const seriesImage = style({
	borderRadius: "var(--mantine-radius-sm)",
	overflow: "hidden",
});

export const searchCard = style({
	textDecoration: "none",
	color: "inherit",
	backgroundColor: "var(--mantine-color-gray-0)",
	border: "2px dashed var(--mantine-color-gray-3)",
	cursor: "pointer",
	transition: "all 0.2s ease-in-out",

	selectors: {
		"&:hover": {
			backgroundColor: "var(--mantine-color-blue-0)",
			borderColor: "var(--mantine-color-blue-4)",
			transform: "translateY(-2px)",
		},
	},
});

export const actionCard = style({
	textDecoration: "none",
	color: "inherit",
	transition: "all 0.2s ease-in-out",
	backgroundColor: "var(--mantine-color-white)",

	selectors: {
		"&:hover": {
			backgroundColor: "var(--mantine-color-blue-0)",
			borderColor: "var(--mantine-color-blue-4)",
			transform: "translateX(4px)",
		},
	},
});

// Item detail page styles
export const itemDetailHeader = style({
	marginBottom: "var(--mantine-spacing-xl)",
});

export const itemDetailTitle = style({
	marginBottom: "var(--mantine-spacing-sm)",
});

export const itemDetailSubtitle = style({
	color: "var(--mantine-color-gray-6)",
	marginBottom: "var(--mantine-spacing-lg)",
});

export const itemDetailImage = style({
	borderRadius: "var(--mantine-radius-lg)",
	overflow: "hidden",
	border: "1px solid var(--mantine-color-gray-3)",
	marginBottom: "var(--mantine-spacing-xl)",
});

export const itemDetailMetadata = style({
	display: "grid",
	gap: "16px",
	gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
});

// Global styles for definition list within itemDetailMetadata
globalStyle(`${itemDetailMetadata} dt`, {
	fontWeight: 600,
	color: "var(--mantine-color-gray-6)",
	fontSize: "12px",
	textTransform: "uppercase",
	letterSpacing: "0.05em",
});

globalStyle(`${itemDetailMetadata} dd`, {
	marginLeft: 0,
	fontSize: "14px",
});

// Assign CSS variables
export const themeVars = {
	[borderRadiusVar]: "var(--mantine-radius-lg)",
	[cardShadowVar]: "var(--mantine-shadow-sm)",
	[hoverTransformVar]: "translateY(-2px)",
	[transitionSpeedVar]: "150ms",
};