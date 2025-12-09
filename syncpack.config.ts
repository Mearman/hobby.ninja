import type { RcFile } from "syncpack";

const config: RcFile = {
	// Sort exports condition keys (source before import/require for bundler support)
	sortExports: [
		"types",
		"source",
		"node-addons",
		"node",
		"browser",
		"module",
		"import",
		"require",
		"development",
		"production",
		"script",
		"default",
	],

	// Sort package.json properties
	sortFirst: [
		"name",
		"description",
		"version",
		"type",
		"private",
		"packageManager",
		"workspaces",
		"repository",
		"scripts",
		"dependencies",
		"devDependencies",
		"peerDependencies",
		"optionalDependencies",
	],

	// Source files to analyze
	source: [
		"package.json",
		"apps/*/package.json",
		"packages/*/package.json",
		"tools/*/package.json",
	],

	// Configure semver groups to enforce exact versions
	semverGroups: [
		// Production, overrides, and resolutions should use exact versions
		{
			label: "Production and overrides use exact versions",
			dependencyTypes: ["prod", "resolutions", "overrides", "pnpmOverrides"],
			range: "", // Exact versions
		},
		// Development dependencies use exact versions
		{
			label: "Development dependencies use exact versions",
			dependencyTypes: ["dev"],
			range: "", // Exact versions
		},
		// Peer dependencies should also use exact versions
		{
			label: "Peer dependencies use exact versions",
			dependencyTypes: ["peer"],
			range: "", // Exact versions
		},
	],

	// Version groups for aligning specific packages
	versionGroups: [
		// Local workspace packages must use workspace:* protocol
		{
			label: "Local workspace packages",
			packages: ["**/*"],
			dependencies: ["@hobby-ninja/*"],
			dependencyTypes: ["prod", "dev"],
			pinVersion: "workspace:*",
		},
		// Nx ecosystem packages
		{
			label: "Nx ecosystem",
			packages: ["**/*"],
			dependencies: ["@nx/*"],
		},
		// React ecosystem packages
		{
			label: "React ecosystem",
			packages: ["**/*"],
			dependencies: [
				"react",
				"react-dom",
				"@types/react",
				"@types/react-dom",
			],
		},
		// TypeScript ecosystem packages
		{
			label: "TypeScript ecosystem",
			packages: ["**/*"],
			dependencies: [
				"typescript",
				"@types/node",
				"tslib",
			],
		},
		// ESLint ecosystem packages
		{
			label: "ESLint ecosystem",
			packages: ["**/*"],
			dependencies: [
				"eslint",
				"@typescript-eslint/*",
				"@eslint/*",
			],
		},
		// Vite ecosystem packages
		{
			label: "Vite ecosystem",
			packages: ["**/*"],
			dependencies: [
				"vite",
				"@vitejs/*",
			],
		},
		// Vitest ecosystem packages
		{
			label: "Vitest ecosystem",
			packages: ["**/*"],
			dependencies: [
				"vitest",
				"@vitest/*",
			],
		},
		// Playwright ecosystem packages
		{
			label: "Playwright ecosystem",
			packages: ["**/*"],
			dependencies: [
				"@playwright/test",
				"playwright",
			],
		},
		// Testing Library ecosystem
		{
			label: "Testing Library ecosystem",
			packages: ["**/*"],
			dependencies: [
				"@testing-library/*",
			],
		},
		// Zod ecosystem
		{
			label: "Zod ecosystem",
			packages: ["**/*"],
			dependencies: [
				"zod",
			],
		},
		// Mantine UI ecosystem
		{
			label: "Mantine UI ecosystem",
			packages: ["**/*"],
			dependencies: [
				"@mantine/*",
			],
		},
		// TanStack ecosystem
		{
			label: "TanStack ecosystem",
			packages: ["**/*"],
			dependencies: [
				"@tanstack/*",
			],
		},
		// Tabler Icons ecosystem
		{
			label: "Tabler Icons ecosystem",
			packages: ["**/*"],
			dependencies: [
				"@tabler/*",
			],
		},
		// Ink CLI ecosystem
		{
			label: "Ink CLI ecosystem",
			packages: ["**/*"],
			dependencies: [
				"ink",
				"@inkjs/ui",
			],
		},
	],
};

export default config;
