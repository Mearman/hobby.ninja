import "@mantine/core/styles.css";
import "@mantine/carousel/styles.css";

import type { Preview } from "@storybook/react";
import { Inter } from "next/font/google";
import React from "react";

import { ThemeWrapper } from "./decorators/ThemeWrapper";

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
	globalTypes: {
		theme: {
			name: "Theme",
			description: "Color scheme for components",
			defaultValue: "light",
			toolbar: {
				icon: "paintbrush",
				items: [
					{ value: "light", title: "Light", icon: "sun" },
					{ value: "dark", title: "Dark", icon: "moon" },
					{ value: "system", title: "System", icon: "browser" },
				],
				dynamicTitle: true,
			},
		},
	},
	decorators: [
		(Story) => (
			<div className={`${inter.variable} ${inter.className}`}>
				<Story />
			</div>
		),
		ThemeWrapper,
	],
};

export default preview;
