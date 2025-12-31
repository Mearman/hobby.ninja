import { createTheme, MantineColorsTuple, Tooltip } from "@mantine/core";

import { Z_INDEX } from "./constants";

export const gunplaBlue: MantineColorsTuple = [
	"#e3f2fd",
	"#bbdefb",
	"#90caf9",
	"#64b5f6",
	"#42a5f5",
	"#2196f3",
	"#1e88e5",
	"#1976d2",
	"#1565c0",
	"#0d47a1",
];

export const gunplaRed: MantineColorsTuple = [
	"#ffebee",
	"#ffcdd2",
	"#ef9a9a",
	"#e57373",
	"#ef5350",
	"#f44336",
	"#e53935",
	"#d32f2f",
	"#c62828",
	"#b71c1c",
];

export const gunplaGray: MantineColorsTuple = [
	"#fafafa",
	"#f5f5f5",
	"#eeeeee",
	"#e0e0e0",
	"#bdbdbd",
	"#9e9e9e",
	"#757575",
	"#616161",
	"#424242",
	"#212121",
];

export const theme = createTheme({
	colors: {
		gunplaBlue,
		gunplaRed,
		gunplaGray,
	},
	fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif",
	defaultRadius: "md",
	components: {
		Tooltip: Tooltip.extend({
			defaultProps: {
				zIndex: Z_INDEX.TOOLTIP,
			},
		}),
	},
});