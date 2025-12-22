import { resolve } from "node:path";

import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
	plugins: [
		dts({
			insertTypesEntry: true,
		}),
	],
	build: {
		lib: {
			entry: {
				registry: resolve(__dirname, "src/registry.ts"),
				"base-scraper": resolve(__dirname, "src/base-scraper.ts"),
				"gundam-info": resolve(__dirname, "src/gundam-info.ts"),
				hobbylink: resolve(__dirname, "src/hobbylink.ts"),
				"url-scanner/scanner": resolve(__dirname, "src/url-scanner/scanner.ts"),
				"manual-downloader/mod": resolve(__dirname, "src/manual-downloader/mod.ts"),
			},
			formats: ["es"],
		},
		outDir: "dist",
		emptyOutDir: true,
		rollupOptions: {
			external: [
				/^node:/,
				"cheerio",
				"parse5",
				"zod",
				"p-limit",
				"@hobby-ninja/types",
				"@hobby-ninja/utils",
				"@hobby-ninja/translation",
			],
			output: {
				preserveModules: false,
				entryFileNames: "[name].js",
			},
		},
	},
});
