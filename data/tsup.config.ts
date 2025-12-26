import { defineConfig } from "tsup";

const isCI = process.env.CI === "true";

export default defineConfig({
	entry: {
		index: "lib/index.ts",
		items: "lib/items.ts",
		"item-page-data": "lib/item-page-data.ts",
		brands: "lib/brands.ts",
		series: "lib/series.ts",
		categories: "lib/categories.ts",
		manuals: "lib/manuals.ts",
		grades: "lib/grades.ts",
		scales: "lib/scales.ts",
		tags: "lib/tags.ts",
		homepage: "lib/homepage.ts",
		search: "lib/search.ts",
		schemas: "lib/schemas.ts",
	},
	outDir: "dist/lib",
	format: ["esm"],
	dts: true,
	clean: false, // Don't clean - build.ts outputs JSON to dist/ first
	// Disable sourcemaps in CI to reduce memory usage (files are 40+ MB each)
	sourcemap: !isCI,
	splitting: false,
	treeshake: true,
	external: ["zod", "fuse.js"],
	// esbuild options to reduce memory in CI
	esbuildOptions(options) {
		if (isCI) {
			// Disable parallel processing to reduce memory usage
			options.logLevel = "info";
		}
	},
});
