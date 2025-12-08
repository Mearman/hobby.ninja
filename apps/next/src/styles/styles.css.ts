import { style, globalStyle, keyframes } from "@vanilla-extract/css";

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

// Container styles
export const container = style({
	maxWidth: "1200px",
	margin: "0 auto",
	padding: "0 var(--mantine-spacing-md)",
});

export const pageContainer = style({
	minHeight: "100vh",
	padding: "var(--mantine-spacing-lg)",
	background: "linear-gradient(180deg, var(--mantine-color-gray-0) 0%, var(--mantine-color-gray-1) 100%)",
});

// Navigation styles
export const navigation = style({
	background: "var(--mantine-color-white)",
	borderBottom: "1px solid var(--mantine-color-gray-3)",
	padding: "var(--mantine-spacing-md) 0",
	marginBottom: "var(--mantine-spacing-lg)",
	boxShadow: "var(--mantine-shadow-sm)",
});

export const navContainer = style({
	maxWidth: "1200px",
	margin: "0 auto",
	padding: "0 var(--mantine-spacing-md)",
	display: "flex",
	justifyContent: "space-between",
	alignItems: "center",
});

export const navBrand = style({
	fontSize: "var(--mantine-font-size-xl)",
	fontWeight: 700,
	color: "var(--mantine-color-blue-6)",
	textDecoration: "none",
});

export const navLinks = style({
	display: "flex",
	gap: "var(--mantine-spacing-lg)",
	alignItems: "center",
});

// Card styles
export const card = style({
	background: "var(--mantine-color-white)",
	borderRadius: "var(--mantine-radius-lg)",
	padding: "var(--mantine-spacing-lg)",
	border: "1px solid var(--mantine-color-gray-3)",
	boxShadow: "var(--mantine-shadow-sm)",
	transition: "all 0.2s ease",
});

export const cardHover = style({
	background: "var(--mantine-color-white)",
	borderRadius: "var(--mantine-radius-lg)",
	padding: "var(--mantine-spacing-lg)",
	border: "1px solid var(--mantine-color-gray-3)",
	boxShadow: "var(--mantine-shadow-sm)",
	transition: "all 0.2s ease",
	cursor: "pointer",
});

globalStyle(`${cardHover}:hover`, {
	transform: "translateY(-2px)",
	boxShadow: "var(--mantine-shadow-md)",
	borderColor: "var(--mantine-color-blue-6)",
});

// Item grid styles
export const itemGrid = style({
	display: "grid",
	gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
	gap: "var(--mantine-spacing-lg)",
	marginTop: "var(--mantine-spacing-lg)",
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

globalStyle(`${itemCard}:hover`, {
	transform: "translateY(-4px)",
	boxShadow: "var(--mantine-shadow-lg)",
	borderColor: "var(--mantine-color-blue-6)",
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

// Detail page styles
export const detailContainer = style({
	maxWidth: "1200px",
	margin: "0 auto",
	padding: "var(--mantine-spacing-lg)",
	display: "grid",
	gridTemplateColumns: "1fr 2fr",
	gap: "var(--mantine-spacing-xl)",
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

// Utility styles
export const textCenter = style({
	textAlign: "center",
});

export const textMuted = style({
	color: "var(--mantine-color-gray-6)",
	fontSize: "var(--mantine-font-size-sm)",
});

export const marginBottom = style({
	marginBottom: "var(--mantine-spacing-md)",
});

export const marginTop = style({
	marginTop: "var(--mantine-spacing-md)",
});

// Animation keyframes
const fadeIn = keyframes({
	"0%": { opacity: 0 },
	"100%": { opacity: 1 },
});

const slideUp = keyframes({
	"0%": {
		opacity: 0,
		transform: "translateY(20px)",
	},
	"100%": {
		opacity: 1,
		transform: "translateY(0)",
	},
});

// Animation classes
export const fadeInClass = style({
	animation: `${fadeIn} 0.3s ease-out`,
});

export const slideUpClass = style({
	animation: `${slideUp} 0.3s ease-out`,
});

// Mobile responsiveness
export const mobileBreakpoint = style({
	"@media": {
		"(max-width: 768px)": {
			padding: "var(--mantine-spacing-sm)",
		},
	},
});

export const mobileGrid = style({
	"@media": {
		"(max-width: 768px)": {
			gridTemplateColumns: "1fr",
			gap: "var(--mantine-spacing-md)",
		},
	},
});

// Accessibility styles
export const focusVisible = style({
	outline: "2px solid var(--mantine-color-blue-6)",
	outlineOffset: "2px",
});

// Reduced motion support
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