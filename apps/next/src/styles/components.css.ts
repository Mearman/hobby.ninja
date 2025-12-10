import { style, globalStyle, createVar, keyframes } from "@vanilla-extract/css";

// CSS Constants to avoid string duplication
const CSS_VALUES = {
	BORDER_BOX: "border-box",
	FLEX_START: "flex-start",
	FLEX_END: "flex-end",
	CENTER: "center",
	POINTER: "pointer",
	NONE: "none",
	ABSOLUTE: "absolute",
	RELATIVE: "relative",
	FIXED: "fixed",
	BLOCK: "block",
	INLINE_BLOCK: "inline-block",
	TRANSPARENT: "transparent",
	HIDDEN: "hidden",
	VISIBLE: "visible",
	ROW: "row",
	COLUMN: "column",
	CAPITALIZE: "capitalize",
	UPPERCASE: "uppercase",
	STATIC: "static",
	VERTICAL: "vertical",
	WRAP: "wrap",
} as const;

// Common CSS property values to avoid string duplication
const COMMON_VALUES = {
	WIDTH_FULL: "100%",
	HEIGHT_FULL: "100%",
	HEIGHT_48: "48px",
	HEIGHT_64: "64px",
	WIDTH_48: "48px",
	WIDTH_60: "60px",
	WIDTH_64: "64px",
	SIZE_SM: "0.75rem",
	SIZE_XS: "0.875rem",
	SIZE_MD: "0.95rem",
	SIZE_LG: "1rem",
	SIZE_XL: "1.1rem",
	SIZE_1_5REM: "1.5rem",
	TRANSFORM_TRANSLATE_Y_NEG_2: "translateY(-2px)",
	TRANSFORM_TRANSLATE_Y_NEG_4: "translateY(-4px)",
	TRANSFORM_TRANSLATE_Y_NEG_20PX: "translateY(-20px)",
	TRANSFORM_TRANSLATE_Y_20PX: "translateY(20px)",
	TRANSFORM_SCALE_0_9: "scale(0.9)",
	TRANSFORM_SCALE_1: "scale(1)",
	TRANSFORM_TRANSLATE_X_4PX: "translateX(4px)",
	Z_INDEX_1000: 1000,
	OPACITY_0: 0,
	OPACITY_1: 1,
	LINE_HEIGHT_1_3: 1.3,
	LINE_HEIGHT_1_4: 1.4,
	LETTER_SPACING_0_05EM: "0.05em",
	PADDING_2PX_8PX: "2px 8px",
	PADDING_6PX_12PX: "6px 12px",
	BORDER_RADIUS_SM: "var(--mantine-radius-sm)",
	BORDER_RADIUS_DEFAULT: "var(--mantine-radius-default)",
	BORDER_RADIUS_MD: "var(--mantine-radius-md)",
	BORDER_RADIUS_LG: "var(--mantine-radius-lg)",
	BORDER_RADIUS_FULL: "var(--mantine-radius-full)",
	BORDER_WIDTH_1PX: "1px",
	BORDER_WIDTH_2PX: "2px",
	SIZE_8PX: "8px",
	BOX_SHADOW_LG: "var(--mantine-shadow-lg)",
	BOX_SHADOW_MD: "var(--mantine-shadow-md)",
	BOX_SHADOW_SM: "var(--mantine-shadow-sm)",
	FONT_SIZE_12PX: "12px",
	FONT_SIZE_14PX: "14px",
	FONT_WEIGHT_BOLD: 700,
	FONT_WEIGHT_NORMAL: 600,
	TRANSITION_SPEED_150: "150ms",
	TRANSITION_SPEED_200: "200ms",
	TRANSITION_SPEED_300: "300ms",
	GRID_COLS_1: "1fr",
	HEIGHT_200PX: "200px",
	HEIGHT_150PX: "150px",
	WIDTH_1200PX: "1200px",
	MAX_WIDTH_1200PX: "1200px",
	MIN_HEIGHT_100VH: "100vh",
	MAX_HEIGHT_FIT_CONTENT: "fit-content",
	MIN_WIDTH_280PX: "280px",
	MIN_WIDTH_240PX: "240px",
	MIN_WIDTH_160PX: "160px",
	MIN_WIDTH_300PX: "300px",
	MIN_WIDTH_200PX: "200px",
	MIN_WIDTH_120PX: "120px",
	MIN_HEIGHT_400PX: "400px",
	MARGIN_0: "0",
	MARGIN_BOTTOM_4PX: "4px",
} as const;

// Mantine color values
const MANTINE_COLORS = {
	BODY: "var(--mantine-color-body)",
	WHITE: "var(--mantine-color-white)",
	BLUE_6: "var(--mantine-color-blue-6)",
	BLUE_7: "var(--mantine-color-blue-7)",
	BLUE_4: "var(--mantine-color-blue-4)",
	BLUE_3: "var(--mantine-color-blue-3)",
	BLUE_1: "var(--mantine-color-blue-1)",
	BLUE_0: "var(--mantine-color-blue-0)",
	GRAY_0: "var(--mantine-color-gray-0)",
	GRAY_1: "var(--mantine-color-gray-1)",
	GRAY_2: "var(--mantine-color-gray-2)",
	GRAY_3: "var(--mantine-color-gray-3)",
	GRAY_6: "var(--mantine-color-gray-6)",
	GRAY_7: "var(--mantine-color-gray-7)",
	GRAY_9: "var(--mantine-color-gray-9)",
	GRADIENT_1: "var(--mantine-color-gradient-1)",
} as const;

// Border widths
const BORDER_WIDTHS = {
	ONE: "1px",
	TWO: "2px",
} as const;

// Common sizes
const SIZES = {
	PX_2: "2px",
	PX_4: "4px",
	PX_8: "8px",
	PX_12: "12px",
	PX_48: "48px",
	PX_60: "60px",
	PX_64: "64px",
	PX_200: "200px",
	PX_150: "150px",
	PX_1200: "1200px",
	REM_0_75: "0.75rem",
	REM_0_875: "0.875rem",
	REM_0_95: "0.95rem",
	REM_1: "1rem",
	REM_1_1: "1.1rem",
	REM_1_5: "1.5rem",
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
	DASHED: "dashed",
	SOLID: "solid",
	NONE: "none",
} as const;

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
	boxSizing: CSS_VALUES.BORDER_BOX,
});

globalStyle("body", {
	margin: 0,
	fontFamily: "inherit",
	WebkitFontSmoothing: "antialiased",
	MozOsxFontSmoothing: "grayscale",
});

// Layout Components
export const appShell = style({
	minHeight: COMMON_VALUES.MIN_HEIGHT_100VH,
	display: "flex",
	flexDirection: CSS_VALUES.COLUMN,
	backgroundColor: MANTINE_COLORS.BODY,
});

export const mainContent = style({
	flex: 1,
	display: "flex",
	flexDirection: CSS_VALUES.COLUMN,
});

// Header Styles
export const header = style({
	position: "sticky",
	top: 0,
	zIndex: COMMON_VALUES.Z_INDEX_1000,
	backgroundColor: MANTINE_COLORS.BODY,
	borderBottom: `${BORDER_WIDTHS.ONE} ${BORDER_STYLES.SOLID} ${MANTINE_COLORS.GRAY_3}`,
	backdropFilter: "blur(8px)",
	"@media": {
		"(prefers-reduced-motion: reduce)": {
			position: CSS_VALUES.STATIC,
			backdropFilter: CSS_VALUES.NONE,
		},
	},
});

export const headerContent = style({
	maxWidth: COMMON_VALUES.MAX_WIDTH_1200PX,
	margin: `${COMMON_VALUES.MARGIN_0} auto`,
	padding: `0 ${SPACING.MD}`,
	display: "flex",
	alignItems: CSS_VALUES.CENTER,
	justifyContent: "space-between",
	height: SIZES.PX_60,
});

export const logo = style({
	fontSize: COMMON_VALUES.SIZE_1_5REM,
	fontWeight: COMMON_VALUES.FONT_WEIGHT_BOLD,
	color: MANTINE_COLORS.BLUE_6,
	textDecoration: CSS_VALUES.NONE,
	transition: `color ${transitionSpeedVar} ease`,
	":hover": {
		color: MANTINE_COLORS.BLUE_7,
	},
});

// Navigation
export const nav = style({
	display: "flex",
	alignItems: CSS_VALUES.CENTER,
	gap: SPACING.LG,
});

export const navLink = style({
	color: MANTINE_COLORS.GRAY_7,
	textDecoration: CSS_VALUES.NONE,
	fontSize: COMMON_VALUES.SIZE_MD,
	fontWeight: 500,
	padding: `${SPACING.SM} ${SPACING.MD}`,
	borderRadius: COMMON_VALUES.BORDER_RADIUS_DEFAULT,
	transition: `all ${transitionSpeedVar} ease`,
	":hover": {
		backgroundColor: MANTINE_COLORS.GRAY_0,
		color: MANTINE_COLORS.BLUE_6,
	},
	selectors: {
		'&[data-active="true"]': {
			backgroundColor: MANTINE_COLORS.BLUE_0,
			color: MANTINE_COLORS.BLUE_6,
		},
	},
});

// Item Grid
export const itemGrid = style({
	display: "grid",
	gap: SPACING.MD,
	gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
	"@media": {
		"(max-width: 768px)": {
			gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
			gap: SPACING.SM,
		},
		"(max-width: 480px)": {
			gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
			gap: SPACING.XS,
		},
	},
});

export const itemGridListView = style({
	gridTemplateColumns: COMMON_VALUES.GRID_COLS_1,
	gap: SPACING.SM,
});

// Item Card
export const itemCard = style({
	position: CSS_VALUES.RELATIVE,
	borderRadius: borderRadiusVar,
	boxShadow: cardShadowVar,
	transition: `all ${transitionSpeedVar} ease`,
	cursor: CSS_VALUES.POINTER,
	overflow: CSS_VALUES.HIDDEN,
	backgroundColor: MANTINE_COLORS.WHITE,
	border: `${BORDER_WIDTHS.ONE} ${BORDER_STYLES.SOLID} ${MANTINE_COLORS.GRAY_3}`,
	":hover": {
		transform: hoverTransformVar,
		boxShadow: COMMON_VALUES.BOX_SHADOW_LG,
		borderColor: MANTINE_COLORS.BLUE_6,
	},
	selectors: {
		'&[data-selected="true"]': {
			borderColor: MANTINE_COLORS.BLUE_6,
			boxShadow: `0 0 0 ${BORDER_WIDTHS.TWO} ${MANTINE_COLORS.BLUE_6}`,
		},
	},
});

export const itemCardImage = style({
	width: COMMON_VALUES.WIDTH_FULL,
	height: SIZES.PX_200,
	objectFit: "cover",
	backgroundColor: MANTINE_COLORS.GRAY_0,
	"@media": {
		"(max-width: 480px)": {
			height: SIZES.PX_150,
		},
	},
});

export const itemCardContent = style({
	padding: SPACING.MD,
});

export const itemCardTitle = style({
	fontSize: SIZES.REM_1,
	fontWeight: COMMON_VALUES.FONT_WEIGHT_NORMAL,
	color: MANTINE_COLORS.GRAY_9,
	margin: `0 0 ${SPACING.XS} 0`,
	lineHeight: COMMON_VALUES.LINE_HEIGHT_1_3,
	display: "-webkit-box",
	WebkitLineClamp: 2,
	WebkitBoxOrient: "vertical",
	overflow: CSS_VALUES.HIDDEN,
});

export const itemCardSubtitle = style({
	fontSize: SIZES.REM_0_875,
	color: MANTINE_COLORS.GRAY_6,
	margin: `0 0 ${SPACING.SM} 0`,
	lineHeight: COMMON_VALUES.LINE_HEIGHT_1_4,
});

export const itemCardMetadata = style({
	display: "flex",
	flexWrap: CSS_VALUES.WRAP,
	gap: SPACING.XS,
	marginBottom: SPACING.SM,
});

export const itemCardBadge = style({
	fontSize: COMMON_VALUES.SIZE_SM,
	fontWeight: 500,
	padding: COMMON_VALUES.PADDING_2PX_8PX,
	borderRadius: COMMON_VALUES.BORDER_RADIUS_SM,
	backgroundColor: MANTINE_COLORS.GRAY_1,
	color: MANTINE_COLORS.GRAY_7,
});

export const itemCardPrice = style({
	fontSize: SIZES.REM_1_1,
	fontWeight: COMMON_VALUES.FONT_WEIGHT_BOLD,
	color: MANTINE_COLORS.BLUE_6,
	margin: COMMON_VALUES.MARGIN_0,
});

export const itemCardActions = style({
	display: "flex",
	gap: SPACING.XS,
	marginTop: SPACING.SM,
	opacity: COMMON_VALUES.OPACITY_0,
	transition: `opacity ${transitionSpeedVar} ease`,
	selectors: {
		[`${itemCard}:hover &`]: {
			opacity: COMMON_VALUES.OPACITY_1,
		},
	},
});

// Search and Filter Components
export const searchContainer = style({
	backgroundColor: MANTINE_COLORS.WHITE,
	padding: SPACING.LG,
	borderRadius: COMMON_VALUES.BORDER_RADIUS_LG,
	border: `${BORDER_WIDTHS.ONE} ${BORDER_STYLES.SOLID} ${MANTINE_COLORS.GRAY_3}`,
	marginBottom: SPACING.LG,
});

export const searchInput = style({
	fontSize: SIZES.REM_1,
	padding: SPACING.MD,
});

export const filterChips = style({
	display: "flex",
	flexWrap: CSS_VALUES.WRAP,
	gap: SPACING.XS,
	marginTop: SPACING.MD,
});

export const filterChip = style({
	fontSize: SIZES.REM_0_875,
	padding: COMMON_VALUES.PADDING_6PX_12PX,
	borderRadius: COMMON_VALUES.BORDER_RADIUS_FULL,
	backgroundColor: MANTINE_COLORS.GRAY_1,
	color: MANTINE_COLORS.GRAY_7,
	border: BORDER_STYLES.NONE,
	cursor: CSS_VALUES.POINTER,
	transition: `all ${transitionSpeedVar} ease`,
	":hover": {
		backgroundColor: MANTINE_COLORS.GRAY_2,
	},
	selectors: {
		'&[data-active="true"]': {
			backgroundColor: MANTINE_COLORS.BLUE_6,
			color: "white",
		},
	},
});

// Collection Components
export const collectionGrid = style({
	display: "grid",
	gap: SPACING.LG,
	gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
	"@media": {
		"(max-width: 768px)": {
			gridTemplateColumns: COMMON_VALUES.GRID_COLS_1,
		},
	},
});

export const collectionCard = style({
	borderRadius: borderRadiusVar,
	boxShadow: cardShadowVar,
	overflow: CSS_VALUES.HIDDEN,
	transition: `all ${transitionSpeedVar} ease`,
	border: `${BORDER_WIDTHS.ONE} ${BORDER_STYLES.SOLID} ${MANTINE_COLORS.GRAY_3}`,
	":hover": {
		transform: hoverTransformVar,
		boxShadow: COMMON_VALUES.BOX_SHADOW_LG,
	},
});

export const collectionHeader = style({
	padding: SPACING.LG,
	backgroundColor: MANTINE_COLORS.GRADIENT_1,
	color: "white",
});

export const collectionContent = style({
	padding: SPACING.LG,
});

export const statsGrid = style({
	display: "grid",
	gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
	gap: SPACING.MD,
	margin: `${SPACING.MD} 0`,
});

export const statCard = style({
	textAlign: CSS_VALUES.CENTER,
	padding: SPACING.MD,
	borderRadius: COMMON_VALUES.BORDER_RADIUS_DEFAULT,
	backgroundColor: MANTINE_COLORS.GRAY_0,
});

export const statValue = style({
	fontSize: SIZES.REM_1_5,
	fontWeight: COMMON_VALUES.FONT_WEIGHT_BOLD,
	color: MANTINE_COLORS.BLUE_6,
	margin: `0 0 ${SIZES.PX_4} 0`,
});

export const statLabel = style({
	fontSize: SIZES.REM_0_875,
	color: MANTINE_COLORS.GRAY_6,
	margin: COMMON_VALUES.MARGIN_0,
	textTransform: CSS_VALUES.UPPERCASE,
	letterSpacing: COMMON_VALUES.LETTER_SPACING_0_05EM,
});

// Progress Tracker
export const progressBar = style({
	width: COMMON_VALUES.WIDTH_FULL,
	height: SIZES.PX_8,
	backgroundColor: MANTINE_COLORS.GRAY_2,
	borderRadius: COMMON_VALUES.BORDER_RADIUS_SM,
	overflow: CSS_VALUES.HIDDEN,
	margin: `${SPACING.SM} 0`,
});

export const progressFill = style({
	height: COMMON_VALUES.HEIGHT_FULL,
	backgroundColor: MANTINE_COLORS.BLUE_6,
	borderRadius: COMMON_VALUES.BORDER_RADIUS_SM,
	transition: `width ${transitionSpeedVar} ease`,
});

export const progressSegments = style({
	display: "flex",
	height: COMMON_VALUES.HEIGHT_FULL,
});

export const progressSegment = style({
	height: COMMON_VALUES.HEIGHT_FULL,
	transition: `width ${transitionSpeedVar} ease`,
	":first-child": {
		borderTopLeftRadius: COMMON_VALUES.BORDER_RADIUS_SM,
		borderBottomLeftRadius: COMMON_VALUES.BORDER_RADIUS_SM,
	},
	":last-child": {
		borderTopRightRadius: COMMON_VALUES.BORDER_RADIUS_SM,
		borderBottomRightRadius: COMMON_VALUES.BORDER_RADIUS_SM,
	},
});

// Loading and Skeleton States
export const skeletonContainer = style({
	display: "grid",
	gap: SPACING.MD,
	gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
});

export const skeletonCard = style({
	borderRadius: borderRadiusVar,
	overflow: CSS_VALUES.HIDDEN,
});

export const skeletonImage = style({
	width: COMMON_VALUES.WIDTH_FULL,
	height: SIZES.PX_200,
	backgroundColor: MANTINE_COLORS.GRAY_1,
});

export const skeletonContent = style({
	padding: SPACING.MD,
});

export const skeletonLine = style({
	height: SIZES.REM_1,
	backgroundColor: MANTINE_COLORS.GRAY_1,
	borderRadius: COMMON_VALUES.BORDER_RADIUS_SM,
	marginBottom: SPACING.XS,
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
			display: CSS_VALUES.NONE,
		},
	},
});

export const desktopOnly = style({
	display: CSS_VALUES.NONE,
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
	transition: `all ${COMMON_VALUES.TRANSITION_SPEED_200} ease-in-out`,
	border: `${BORDER_WIDTHS.ONE} ${BORDER_STYLES.SOLID} ${MANTINE_COLORS.GRAY_2}`,

	selectors: {
		"&:hover": {
			transform: COMMON_VALUES.TRANSFORM_TRANSLATE_Y_NEG_2,
			boxShadow: COMMON_VALUES.BOX_SHADOW_MD,
			borderColor: MANTINE_COLORS.BLUE_3,
		},
	},
});

export const databaseStatIcon = style({
	display: "flex",
	alignItems: CSS_VALUES.CENTER,
	justifyContent: CSS_VALUES.CENTER,
	width: SIZES.PX_48,
	height: SIZES.PX_48,
	borderRadius: COMMON_VALUES.BORDER_RADIUS_MD,
	backgroundColor: MANTINE_COLORS.BLUE_0,
	color: MANTINE_COLORS.BLUE_6,
});

export const categoryCard = style({
	textDecoration: CSS_VALUES.NONE,
	color: "inherit",
	transition: `all ${COMMON_VALUES.TRANSITION_SPEED_200} ease-in-out`,
	backgroundColor: MANTINE_COLORS.WHITE,

	selectors: {
		"&:hover": {
			transform: COMMON_VALUES.TRANSFORM_TRANSLATE_Y_NEG_4,
			boxShadow: COMMON_VALUES.BOX_SHADOW_LG,
			borderColor: MANTINE_COLORS.BLUE_4,
		},
	},
});

export const brandLogo = style({
	borderRadius: COMMON_VALUES.BORDER_RADIUS_MD,
	overflow: CSS_VALUES.HIDDEN,
	backgroundColor: MANTINE_COLORS.GRAY_0,
	border: `${BORDER_WIDTHS.ONE} ${BORDER_STYLES.SOLID} ${MANTINE_COLORS.GRAY_2}`,
});

export const categoryIcon = style({
	display: "flex",
	alignItems: CSS_VALUES.CENTER,
	justifyContent: CSS_VALUES.CENTER,
	width: SIZES.PX_64,
	height: SIZES.PX_64,
	borderRadius: COMMON_VALUES.BORDER_RADIUS_LG,
	backgroundColor: MANTINE_COLORS.BLUE_1,
	color: MANTINE_COLORS.BLUE_6,
});

export const seriesCard = style({
	textDecoration: CSS_VALUES.NONE,
	color: "inherit",
	transition: `all ${COMMON_VALUES.TRANSITION_SPEED_200} ease-in-out`,
	backgroundColor: MANTINE_COLORS.WHITE,

	selectors: {
		"&:hover": {
			transform: COMMON_VALUES.TRANSFORM_TRANSLATE_Y_NEG_4,
			boxShadow: COMMON_VALUES.BOX_SHADOW_LG,
			borderColor: MANTINE_COLORS.BLUE_4,
		},
	},
});

export const seriesImage = style({
	borderRadius: COMMON_VALUES.BORDER_RADIUS_SM,
	overflow: CSS_VALUES.HIDDEN,
});

export const searchCard = style({
	textDecoration: CSS_VALUES.NONE,
	color: "inherit",
	backgroundColor: MANTINE_COLORS.GRAY_0,
	border: `${BORDER_WIDTHS.TWO} ${BORDER_STYLES.DASHED} ${MANTINE_COLORS.GRAY_3}`,
	cursor: CSS_VALUES.POINTER,
	transition: `all ${COMMON_VALUES.TRANSITION_SPEED_200} ease-in-out`,

	selectors: {
		"&:hover": {
			backgroundColor: MANTINE_COLORS.BLUE_0,
			borderColor: MANTINE_COLORS.BLUE_4,
			transform: COMMON_VALUES.TRANSFORM_TRANSLATE_Y_NEG_2,
		},
	},
});

export const actionCard = style({
	textDecoration: CSS_VALUES.NONE,
	color: "inherit",
	transition: `all ${COMMON_VALUES.TRANSITION_SPEED_200} ease-in-out`,
	backgroundColor: MANTINE_COLORS.WHITE,

	selectors: {
		"&:hover": {
			backgroundColor: MANTINE_COLORS.BLUE_0,
			borderColor: MANTINE_COLORS.BLUE_4,
			transform: COMMON_VALUES.TRANSFORM_TRANSLATE_X_4PX,
		},
	},
});

// Item detail page styles
export const itemDetailHeader = style({
	marginBottom: SPACING.XL,
});

export const itemDetailTitle = style({
	marginBottom: SPACING.SM,
});

export const itemDetailSubtitle = style({
	color: MANTINE_COLORS.GRAY_6,
	marginBottom: SPACING.LG,
});

export const itemDetailImage = style({
	borderRadius: COMMON_VALUES.BORDER_RADIUS_LG,
	overflow: CSS_VALUES.HIDDEN,
	border: `${BORDER_WIDTHS.ONE} ${BORDER_STYLES.SOLID} ${MANTINE_COLORS.GRAY_3}`,
	marginBottom: SPACING.XL,
});

export const itemDetailMetadata = style({
	display: "grid",
	gap: SIZES.PX_12,
	gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
});

// Global styles for definition list within itemDetailMetadata
globalStyle(`${itemDetailMetadata} dt`, {
	fontWeight: COMMON_VALUES.FONT_WEIGHT_NORMAL,
	color: MANTINE_COLORS.GRAY_6,
	fontSize: COMMON_VALUES.FONT_SIZE_12PX,
	textTransform: CSS_VALUES.UPPERCASE,
	letterSpacing: COMMON_VALUES.LETTER_SPACING_0_05EM,
});

globalStyle(`${itemDetailMetadata} dd`, {
	marginLeft: COMMON_VALUES.MARGIN_0,
	fontSize: COMMON_VALUES.FONT_SIZE_14PX,
});

// Assign CSS variables using globalStyle
globalStyle(":root", {
	[borderRadiusVar]: "var(--mantine-radius-lg)",
	[cardShadowVar]: "var(--mantine-shadow-sm)",
	[hoverTransformVar]: "translateY(-2px)",
	[transitionSpeedVar]: "150ms",
});