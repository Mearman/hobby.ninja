import "@mantine/core/styles.css";
import "@mantine/carousel/styles.css";

import type { Preview } from "@storybook/react";
import { MantineProvider } from "@mantine/core";
import { Inter } from "next/font/google";
import React from "react";

import { theme } from "../src/lib/theme";

// Load Inter font - same as layout.tsx
const inter = Inter({
	subsets: ["latin"],
	variable: "--font-inter",
	display: "swap",
});

const preview: Preview = {
	parameters: {
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i,
			},
		},
		viewport: {
			viewports: {
				mobile: {
					name: "Mobile",
					styles: { width: "375px", height: "667px" },
				},
				tablet: {
					name: "Tablet",
					styles: { width: "768px", height: "1024px" },
				},
				desktop: {
					name: "Desktop",
					styles: { width: "1280px", height: "800px" },
				},
			},
		},
	},
	decorators: [
		(Story) => (
			<div className={`${inter.variable} ${inter.className}`}>
				<MantineProvider theme={theme}>
					<Story />
				</MantineProvider>
			</div>
		),
	],
};

export default preview;
