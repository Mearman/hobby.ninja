import { defineConfig } from "tsup";

export default defineConfig({
	entry: {
		index: "lib/index.ts",
		items: "lib/items.ts",
		brands: "lib/brands.ts",
		series: "lib/series.ts",
		categories: "lib/categories.ts",
		manuals: "lib/manuals.ts",
		grades: "lib/grades.ts",
		scales: "lib/scales.ts",
		homepage: "lib/homepage.ts",
		search: "lib/search.ts",
		schemas: "lib/schemas.ts",
	},
	outDir: "dist/lib",
	format: ["esm"],
	dts: true,
	clean: false, // Don't clean - build.ts outputs JSON to dist/ first
	sourcemap: true,
	splitting: false,
	treeshake: true,
	external: ["zod", "fuse.js"],
});
