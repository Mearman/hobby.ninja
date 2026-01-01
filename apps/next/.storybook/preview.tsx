import "@mantine/core/styles.css";
import "@mantine/carousel/styles.css";

import type { Preview } from "@storybook/react";
import { MantineProvider } from "@mantine/core";
import React from "react";

import { theme } from "../src/lib/theme";

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
			<MantineProvider theme={theme}>
				<Story />
			</MantineProvider>
		),
	],
};

export default preview;
