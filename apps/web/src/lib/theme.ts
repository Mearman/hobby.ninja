import { createTheme, MantineColorsTuple } from "@mantine/core";


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
	fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif",
	defaultRadius: "md",
});