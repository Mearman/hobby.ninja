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

// CSS Constants to avoid string duplication
const CSS_VALUES = {
	FLEX: "flex",
	GRID: "grid",
	BLOCK: "block",
	NONE: "none",
	RELATIVE: "relative",
	STICKY: "sticky",
	CENTER: "center",
	SPACE_BETWEEN: "space-between",
	ALIGN_CENTER: "center",
	WRAP: "wrap",
	COLUMN: "column",
	ROW: "row",
	STATIC: "static",
	FIXED: "fixed",
	FIT_CONTENT: "fit-content",
	HIDDEN: "hidden",
	AUTO: "auto",
	TRANSPARENT: "transparent",
	POINTER: "pointer",
	UNDERLINE: "underline",
	UPPERCASE: "uppercase",
	BOLD: "bold",
	LEFT: "left",
	RIGHT: "right",
} as const;

const COMMON_VALUES = {
	WIDTH_FULL: "100%",
	HEIGHT_FULL: "100%",
	MAX_WIDTH_1200PX: "1200px",
	HEIGHT_200PX: "200px",
	HEIGHT_400PX: "400px",
	MIN_HEIGHT_100VH: "100vh",
	OPACITY_0: 0,
	OPACITY_1: 1,
	Z_INDEX_2: 2,
	Z_INDEX_1000: 1000,
	BORDER_WIDTH_1PX: "1px",
	BORDER_WIDTH_2PX: "2px",
	BOX_SHADOW_LG: "var(--mantine-shadow-lg)",
	BOX_SHADOW_MD: "var(--mantine-shadow-md)",
	BOX_SHADOW_SM: "var(--mantine-shadow-sm)",
	FONT_SIZE_12PX: "12px",
	FONT_SIZE_14PX: "14px",
	TRANSFORM_TRANSLATE_Y_NEG_2: "translateY(-2px)",
	TRANSFORM_TRANSLATE_Y_NEG_4: "translateY(-4px)",
	TRANSFORM_TRANSLATE_Y_20PX: "translateY(20px)",
	TRANSFORM_SCALE_0_9: "scale(0.9)",
	TRANSFORM_SCALE_1: "scale(1)",
	LINE_HEIGHT_1_3: 1.3,
	LINE_HEIGHT_1_4: 1.4,
	LETTER_SPACING_0_05EM: "0.05em",
} as const;

// Mantine color values
const MANTINE_COLORS = {
	WHITE: "var(--mantine-color-white)",
	BLUE_6: "var(--mantine-color-blue-6)",
	GRAY_0: "var(--mantine-color-gray-0)",
	GRAY_1: "var(--mantine-color-gray-1)",
	GRAY_2: "var(--mantine-color-gray-2)",
	GRAY_3: "var(--mantine-color-gray-3)",
	GRAY_6: "var(--mantine-color-gray-6)",
	GRAY_9: "var(--mantine-color-gray-9)",
} as const;

// Spacing values
const SPACING = {
	XS: "var(--mantine-spacing-xs)",
	SM: "var(--mantine-spacing-sm)",
	MD: "var(--mantine-spacing-md)",
	LG: "var(--mantine-spacing-lg)",
	XL: "var(--mantine-spacing-xl)",
} as const;

// Border styles
const BORDER_STYLES = {
	SOLID: "solid",
} as const;

// Border radius values
const BORDER_RADIUS = {
	LG: "var(--mantine-radius-lg)",
} as const;

// Animation durations
const ANIMATION_DURATIONS = {
	FAST_200: "0.2s",
	SLOW_300: "0.3s",
} as const;

// Container styles
export const container = style({
	maxWidth: COMMON_VALUES.MAX_WIDTH_1200PX,
	margin: "0 auto",
	padding: "0 var(--mantine-spacing-md)",
});

export const pageContainer = style({
	minHeight: COMMON_VALUES.MIN_HEIGHT_100VH,
	padding: SPACING.LG,
	background: `linear-gradient(180deg, ${MANTINE_COLORS.GRAY_0} 0%, ${MANTINE_COLORS.GRAY_1} 100%)`,
});

// Navigation styles
export const navigation = style({
	background: MANTINE_COLORS.WHITE,
	borderBottom: `${COMMON_VALUES.BORDER_WIDTH_1PX} ${BORDER_STYLES.SOLID} ${MANTINE_COLORS.GRAY_3}`,
	padding: `${SPACING.MD} 0`,
	marginBottom: SPACING.LG,
	boxShadow: COMMON_VALUES.BOX_SHADOW_SM,
});

export const navContainer = style({
	maxWidth: COMMON_VALUES.MAX_WIDTH_1200PX,
	margin: "0 auto",
	padding: `0 ${SPACING.MD}`,
	display: CSS_VALUES.FLEX,
	justifyContent: CSS_VALUES.SPACE_BETWEEN,
	alignItems: CSS_VALUES.ALIGN_CENTER,
});

export const navBrand = style({
	fontSize: "var(--mantine-font-size-xl)",
	fontWeight: 700,
	color: MANTINE_COLORS.BLUE_6,
	textDecoration: CSS_VALUES.NONE,
});

export const navLinks = style({
	display: CSS_VALUES.FLEX,
	gap: SPACING.LG,
	alignItems: CSS_VALUES.ALIGN_CENTER,
});

// Card styles
export const card = style({
	background: MANTINE_COLORS.WHITE,
	borderRadius: BORDER_RADIUS.LG,
	padding: SPACING.LG,
	border: `${COMMON_VALUES.BORDER_WIDTH_1PX} ${BORDER_STYLES.SOLID} ${MANTINE_COLORS.GRAY_3}`,
	boxShadow: COMMON_VALUES.BOX_SHADOW_SM,
	transition: `all ${ANIMATION_DURATIONS.FAST_200} ease`,
});

export const cardHover = style({
	background: MANTINE_COLORS.WHITE,
	borderRadius: BORDER_RADIUS.LG,
	padding: SPACING.LG,
	border: `${COMMON_VALUES.BORDER_WIDTH_1PX} ${BORDER_STYLES.SOLID} ${MANTINE_COLORS.GRAY_3}`,
	boxShadow: COMMON_VALUES.BOX_SHADOW_SM,
	transition: `all ${ANIMATION_DURATIONS.FAST_200} ease`,
	cursor: CSS_VALUES.POINTER,
});

globalStyle(`${cardHover}:hover`, {
	transform: COMMON_VALUES.TRANSFORM_TRANSLATE_Y_NEG_2,
	boxShadow: COMMON_VALUES.BOX_SHADOW_MD,
	borderColor: MANTINE_COLORS.BLUE_6,
});

// Item grid styles
export const itemGrid = style({
	display: CSS_VALUES.GRID,
	gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
	gap: SPACING.LG,
	marginTop: SPACING.LG,
});

// Item card styles
export const itemCard = style({
	background: MANTINE_COLORS.WHITE,
	borderRadius: BORDER_RADIUS.LG,
	border: `${COMMON_VALUES.BORDER_WIDTH_1PX} ${BORDER_STYLES.SOLID} ${MANTINE_COLORS.GRAY_3}`,
	overflow: CSS_VALUES.HIDDEN,
	transition: `all ${ANIMATION_DURATIONS.FAST_200} ease`,
	cursor: CSS_VALUES.POINTER,
	height: COMMON_VALUES.HEIGHT_FULL,
	display: CSS_VALUES.FLEX,
	flexDirection: CSS_VALUES.COLUMN,
});

globalStyle(`${itemCard}:hover`, {
	transform: COMMON_VALUES.TRANSFORM_TRANSLATE_Y_NEG_4,
	boxShadow: COMMON_VALUES.BOX_SHADOW_LG,
	borderColor: MANTINE_COLORS.BLUE_6,
});

export const itemCardImageContainer = style({
	position: CSS_VALUES.RELATIVE,
	width: COMMON_VALUES.WIDTH_FULL,
	height: COMMON_VALUES.HEIGHT_200PX,
	overflow: CSS_VALUES.HIDDEN,
	background: MANTINE_COLORS.GRAY_1,
});

export const itemCardContent = style({
	padding: SPACING.MD,
	flex: 1,
	display: CSS_VALUES.FLEX,
	flexDirection: CSS_VALUES.COLUMN,
});

export const itemCardTitle = style({
	fontSize: "var(--mantine-font-size-md)",
	fontWeight: 600,
	lineHeight: COMMON_VALUES.LINE_HEIGHT_1_3,
	marginBottom: SPACING.XS,
	color: MANTINE_COLORS.GRAY_9,
});

export const itemCardDescription = style({
	fontSize: "var(--mantine-font-size-sm)",
	color: MANTINE_COLORS.GRAY_6,
	lineHeight: COMMON_VALUES.LINE_HEIGHT_1_4,
	flex: 1,
	marginBottom: SPACING.SM,
});

// Detail page styles
export const detailContainer = style({
	maxWidth: COMMON_VALUES.MAX_WIDTH_1200PX,
	margin: "0 auto",
	padding: SPACING.LG,
	display: CSS_VALUES.GRID,
	gridTemplateColumns: "1fr 2fr",
	gap: SPACING.XL,
});

export const detailImageSection = style({
	position: CSS_VALUES.STICKY,
	top: SPACING.LG,
	height: CSS_VALUES.FIT_CONTENT,
});

export const detailInfoSection = style({
	minHeight: COMMON_VALUES.HEIGHT_400PX,
});

export const detailActions = style({
	display: CSS_VALUES.FLEX,
	gap: SPACING.SM,
	marginTop: SPACING.MD,
	paddingTop: SPACING.MD,
	borderTop: `${COMMON_VALUES.BORDER_WIDTH_1PX} ${BORDER_STYLES.SOLID} ${MANTINE_COLORS.GRAY_3}`,
});

// Utility styles
export const textCenter = style({
	textAlign: CSS_VALUES.CENTER,
});

export const textMuted = style({
	color: MANTINE_COLORS.GRAY_6,
	fontSize: "var(--mantine-font-size-sm)",
});

export const marginBottom = style({
	marginBottom: SPACING.MD,
});

export const marginTop = style({
	marginTop: SPACING.MD,
});

// Animation keyframes
const fadeIn = keyframes({
	"0%": { opacity: COMMON_VALUES.OPACITY_0 },
	"100%": { opacity: COMMON_VALUES.OPACITY_1 },
});

const slideUp = keyframes({
	"0%": {
		opacity: COMMON_VALUES.OPACITY_0,
		transform: COMMON_VALUES.TRANSFORM_TRANSLATE_Y_20PX,
	},
	"100%": {
		opacity: COMMON_VALUES.OPACITY_1,
		transform: "translateY(0)",
	},
});

// Animation classes
export const fadeInClass = style({
	animation: `${fadeIn} ${ANIMATION_DURATIONS.SLOW_300} ease-out`,
});

export const slideUpClass = style({
	animation: `${slideUp} ${ANIMATION_DURATIONS.SLOW_300} ease-out`,
});

// Mobile responsiveness
export const mobileBreakpoint = style({
	"@media": {
		"(max-width: 768px)": {
			padding: SPACING.SM,
		},
	},
});

export const mobileGrid = style({
	"@media": {
		"(max-width: 768px)": {
			gridTemplateColumns: "1fr",
			gap: SPACING.MD,
		},
	},
});

// Accessibility styles
export const focusVisible = style({
	outline: `2px solid ${MANTINE_COLORS.BLUE_6}`,
	outlineOffset: "2px",
});

// Reduced motion support
globalStyle(".fade-in", {
	"@media": {
		"(prefers-reduced-motion: reduce)": {
			animation: CSS_VALUES.NONE,
			transition: CSS_VALUES.NONE,
		},
	},
});

globalStyle(".slide-up", {
	"@media": {
		"(prefers-reduced-motion: reduce)": {
			animation: CSS_VALUES.NONE,
			transition: CSS_VALUES.NONE,
		},
	},
});