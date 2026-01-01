import type { StorybookConfig } from "@storybook/nextjs-vite";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const config: StorybookConfig = {
	// Stories are outside src/ to avoid Next.js bundling them
	stories: ["../stories/**/*.mdx", "../stories/**/*.stories.@(js|jsx|ts|tsx)"],

	addons: ["@storybook/addon-docs"],

	framework: {
		name: "@storybook/nextjs-vite",
		options: {},
	},

	viteFinal: async (config) => {
		return {
			...config,
			resolve: {
				...config.resolve,
				alias: {
					...config.resolve?.alias,
					"@": path.resolve(__dirname, "../src"),
				},
			},
		};
	},

	typescript: {
		reactDocgen: "react-docgen-typescript",
	},
};

export default config;
