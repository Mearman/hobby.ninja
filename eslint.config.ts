import path from "node:path";
import { fileURLToPath } from "node:url";

import js from "@eslint/js";
import nx from "@nx/eslint-plugin";
import typescript from "@typescript-eslint/eslint-plugin";
import typescriptParser from "@typescript-eslint/parser";
import type { ESLint } from "eslint";
import prettier from "eslint-config-prettier";
import barrelFiles from "eslint-plugin-barrel-files";
import importPlugin from "eslint-plugin-import";
import jsonc from "eslint-plugin-jsonc";
import jsxA11y from "eslint-plugin-jsx-a11y";
import markdown from "eslint-plugin-markdown";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import sonarjs from "eslint-plugin-sonarjs";
import unicorn from "eslint-plugin-unicorn";
import tseslint from "typescript-eslint";

import { eslintPluginNoEmoji } from "./eslint-plugins/eslintPluginNoEmoji";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// JSON data file patterns - used for minification enforcement
const JSON_DATA_FILE_PATTERNS = [
	"**/public/data/**/*.json",
	"**/src/data/**/*.json",
	"apps/next/public/data/**/*.json",
	"apps/next/src/data/**/*.json",
];

export default [
	// Ignores must be first in the flat config array per ESLint 9 specification
	{
		ignores: [
			".claude/**",
			".nx/**",
			".vscode/**",
			".prettierrc.json",
			".syncpackrc.json",
			"**/*.json",
			"**/*.md",
			"scripts/**",
			"*.mjs",
			"*.cjs",
			"**/*.config.{js,mjs,cjs,ts}",
		],
	},

	// Base configurations
	js.configs.recommended,
	prettier,
	unicorn.configs.recommended,

	// Override deprecated ESLint options that might come from Nx
	{
		// These settings override any deprecated useEslintrc or extensions options
		settings: {},
	},

	// Nx flat configs for TypeScript
	...nx.configs["flat/typescript"],

	// Nx flat configs for React (includes react-base, react-typescript, react-jsx)
	...nx.configs["flat/react"],

	// TypeScript ESLint strict type-checked config - only for actual TypeScript files
	...tseslint.configs.strictTypeChecked,

	// TypeScript ESLint stylistic type-checked config - only for actual TypeScript files
	...tseslint.configs.stylisticTypeChecked,

	{
		// Override for JSON files - disable type-checked rules
		files: ["**/*.json"],
		languageOptions: {
			parser: typescriptParser,
		},
		rules: {
			"@typescript-eslint/await-thenable": "off",
			"@typescript-eslint/no-floating-promises": "off",
			"@typescript-eslint/no-misused-promises": "off",
			"@typescript-eslint/no-unnecessary-type-assertion": "off",
			"@typescript-eslint/no-unnecessary-condition": "off",
			"@typescript-eslint/no-unsafe-argument": "off",
			"@typescript-eslint/no-unsafe-assignment": "off",
			"@typescript-eslint/no-unsafe-call": "off",
			"@typescript-eslint/no-unsafe-member-access": "off",
			"@typescript-eslint/no-unsafe-return": "off",
			"@typescript-eslint/require-await": "off",
			"@typescript-eslint/restrict-template-expressions": "off",
			"@typescript-eslint/unbound-method": "off",
			"@typescript-eslint/no-base-to-string": "off",
			"@typescript-eslint/restrict-plus-operands": "off",
		},
	},

	{
		files: ["**/*.{ts,tsx,js,jsx}"],
		languageOptions: {
			parser: typescriptParser,
			parserOptions: {
				ecmaVersion: "latest",
				sourceType: "module",
				ecmaFeatures: {
					jsx: true,
				},
				// Use absolute paths for TypeScript project configurations
				// Note: tsconfig.base.json excluded - it lacks path aliases (@/*) that apps define
				project: [
					path.resolve(__dirname, "packages/types/tsconfig.json"),
					path.resolve(__dirname, "packages/utils/tsconfig.json"),
					path.resolve(__dirname, "packages/translation/tsconfig.json"),
					path.resolve(__dirname, "packages/cli/tsconfig.json"),
					path.resolve(__dirname, "apps/web/tsconfig.json"),
					path.resolve(__dirname, "apps/next/tsconfig.json"),
					path.resolve(__dirname, "data/tsconfig.json"),
					path.resolve(__dirname, "tsconfig.json"),
				],
				tsconfigRootDir: __dirname,
			},
			globals: {
				console: "readonly",
				process: "readonly",
				Buffer: "readonly",
				__dirname: "readonly",
				__filename: "readonly",
				global: "readonly",
				window: "readonly",
				document: "readonly",
				navigator: "readonly",
				localStorage: "readonly",
				sessionStorage: "readonly",
				crypto: "readonly",
				fetch: "readonly",
				setTimeout: "readonly",
				clearTimeout: "readonly",
				setInterval: "readonly",
				clearInterval: "readonly",
			},
		},
		plugins: {
			"@typescript-eslint": typescript,
			"@nx": nx,
			react: react,
			"react-hooks": reactHooks,
			"react-refresh": reactRefresh,
			import: importPlugin,
			"jsx-a11y": jsxA11y as unknown as ESLint.Plugin,
			"no-emoji": eslintPluginNoEmoji as unknown as ESLint.Plugin,
			sonarjs: sonarjs,
			"barrel-files": barrelFiles as unknown as ESLint.Plugin,
		},
		settings: {
			react: {
				version: "detect",
			},
		},
		rules: {
			// TypeScript strict type-checked rules (from tseslint.configs.strictTypeChecked)
			// These are automatically applied, but we can override specific ones here

			// Strict rules - keep as error
			"@typescript-eslint/await-thenable": "error",
			"@typescript-eslint/no-floating-promises": "error",
			"@typescript-eslint/no-misused-promises": "error",
			"@typescript-eslint/no-unnecessary-type-assertion": "error",
			"@typescript-eslint/no-unnecessary-condition": "error",
			"@typescript-eslint/no-unsafe-argument": "error",
			"@typescript-eslint/no-unsafe-assignment": "error",
			"@typescript-eslint/no-unsafe-call": "error",
			"@typescript-eslint/no-unsafe-member-access": "error",
			"@typescript-eslint/no-unsafe-return": "error",
			"@typescript-eslint/require-await": "error",
			"@typescript-eslint/restrict-template-expressions": [
				"error",
				{
					allowNumber: true, // Allow numbers in template literals
					allowBoolean: false,
					allowAny: false,
					allowNullish: false,
					allowRegExp: false,
				},
			],
			"@typescript-eslint/unbound-method": "error",
			"@typescript-eslint/no-deprecated": "warn",
			"@typescript-eslint/use-unknown-in-catch-callback-variable": "error",

			// Stylistic rules
			"@typescript-eslint/prefer-nullish-coalescing": "error",
			"@typescript-eslint/prefer-optional-chain": "error",
			"@typescript-eslint/consistent-type-definitions": ["error", "interface"],
			"@typescript-eslint/array-type": ["error", { default: "array-simple" }],
			"@typescript-eslint/prefer-for-of": "error",
			"@typescript-eslint/prefer-includes": "error",
			"@typescript-eslint/prefer-string-starts-ends-with": "error",
			"@typescript-eslint/dot-notation": "error",
			"@typescript-eslint/prefer-find": "error",

			// Relaxed rules for practical development
			"@typescript-eslint/no-unused-vars": [
				"error",
				{ argsIgnorePattern: "^_" },
			],
			"@typescript-eslint/no-explicit-any": "error", // Forbid any types - only allowed in test files
			"@typescript-eslint/no-non-null-assertion": "warn",
			"@typescript-eslint/ban-ts-comment": [
				"error",
				{
					"ts-expect-error": "allow-with-description",
					"ts-ignore": true,
					"ts-nocheck": true,
					minimumDescriptionLength: 10,
				},
			],
			"@typescript-eslint/no-require-imports": "warn", // Allow require for some cases

			// Additional strict rules
			"@typescript-eslint/no-confusing-void-expression": "error",
			"@typescript-eslint/no-meaningless-void-operator": "error",
			"@typescript-eslint/no-mixed-enums": "error",
			"@typescript-eslint/no-redundant-type-constituents": "error",
			"@typescript-eslint/no-unnecessary-boolean-literal-compare": "error",
			"@typescript-eslint/no-unnecessary-template-expression": "error",
			"@typescript-eslint/no-unnecessary-type-arguments": "error",
			"@typescript-eslint/only-throw-error": "error",
			"@typescript-eslint/prefer-promise-reject-errors": "error",
			"@typescript-eslint/prefer-reduce-type-parameter": "error",
			"@typescript-eslint/prefer-return-this-type": "error",
			"@typescript-eslint/return-await": ["error", "error-handling-correctness-only"],

			// Magic numbers - relaxed for practical development
			"@typescript-eslint/no-magic-numbers": [
				"warn",
				{
					ignore: [
						-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
						12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 100,
						120, 128, 160, 200, 240, 256, 300, 320, 400,
						480, 500, 512, 600, 640, 720, 768, 800, 900,
						1000, 1024, 1200, 1600, 1920, 2048,
						0.5, 0.6, 0.7, 0.8, 0.9,
					], // Common pixel/spacing/opacity values
					ignoreArrayIndexes: true,
					ignoreClassFieldInitialValues: true,
					ignoreEnums: true,
					ignoreNumericLiteralTypes: true, // Allow numbers in types
					ignoreReadonlyClassProperties: true,
				},
			],

			// Turn off base ESLint rules that conflict with TypeScript versions
			"no-implied-eval": "off",
			"no-throw-literal": "off",
			"prefer-promise-reject-errors": "off",
			"require-await": "off",
			"no-return-await": "off",
			"dot-notation": "off",

			// Keep existing strict rules
			"@typescript-eslint/no-array-constructor": "error",
			"@typescript-eslint/no-namespace": "error",
			"@typescript-eslint/no-use-before-define": [
				"warn",
				{
					functions: false,
					classes: false,
					variables: false,
					typedefs: false,
				},
			],
			"@typescript-eslint/no-useless-constructor": "error",
			"@typescript-eslint/no-unused-expressions": [
				"error",
				{
					allowShortCircuit: true,
					allowTernary: true,
					allowTaggedTemplates: true,
				},
			],
			"@typescript-eslint/adjacent-overload-signatures": "error",
			"@typescript-eslint/prefer-namespace-keyword": "error",
			"@typescript-eslint/no-empty-function": "error",
			"@typescript-eslint/no-inferrable-types": "error",
			"@typescript-eslint/no-empty-object-type": "error",
			"@typescript-eslint/explicit-member-accessibility": "off",
			"@typescript-eslint/explicit-module-boundary-types": "off",
			"@typescript-eslint/explicit-function-return-type": "off",

			// Nx rules - enforce module boundaries in monorepo
			"@nx/enforce-module-boundaries": [
				"error",
				{
					enforceBuildableLibDependency: true,
					allow: [],
					depConstraints: [
						{
							sourceTag: "*",
							onlyDependOnLibsWithTags: ["*"],
						},
					],
				},
			],

			// React rules for React 19 (enhanced from Nx flat/react-jsx)
			...react.configs.flat.recommended.rules,
			"react/react-in-jsx-scope": "off", // Not needed in React 19+
			"react/jsx-uses-react": "off", // Not needed in React 19+
			"react/prop-types": "off", // Using TypeScript for prop validation
			"react/jsx-boolean-value": ["error", "always"],
			"react/jsx-curly-brace-presence": [
				"error",
				{ props: "never", children: "never" },
			],
			"react/self-closing-comp": "error",
			"react/jsx-fragments": ["error", "syntax"],
			"react/forbid-foreign-prop-types": ["warn", { allowInPropTypes: true }],
			"react/jsx-no-comment-textnodes": "warn",
			"react/jsx-no-duplicate-props": "warn",
			"react/jsx-no-target-blank": "warn",
			"react/jsx-no-undef": "error",
			"react/jsx-pascal-case": ["warn", { allowAllCaps: true, ignore: [] }],
			"react/jsx-uses-vars": "warn",
			"react/no-danger-with-children": "warn",
			"react/no-direct-mutation-state": "warn",
			"react/no-is-mounted": "warn",
			"react/no-typos": "error",
			"react/require-render-return": "error",
			"react/style-prop-object": "warn",
			"react/jsx-no-useless-fragment": "warn",

			// React Hooks rules
			"react-hooks/rules-of-hooks": "error",
			"react-hooks/exhaustive-deps": "warn",

			// React Refresh rules
			"react-refresh/only-export-components": [
				"warn",
				{
					allowConstantExport: true,
					allowExportNames: ["router", "Route", "AppRouter"],
				},
			],

			// Import rules (enhanced from Nx flat/react-base)
			"import/order": [
				"error",
				{
					groups: [
						"builtin",
						"external",
						"internal",
						"parent",
						"sibling",
						"index",
					],
					"newlines-between": "always",
					alphabetize: {
						order: "asc",
						caseInsensitive: true,
					},
				},
			],
			"import/no-duplicates": "error",
			"import/no-default-export": "error",
			"import/no-unresolved": "off", // TypeScript handles this
			"import/first": "error",
			"import/no-amd": "error",
			"import/no-webpack-loader-syntax": "error",

			// Enforce workspace package imports for internal packages
			"no-restricted-imports": [
				"error",
				{
					patterns: [
						{
							group: ["../utils/*", "../types/*", "../scrapers/*", "../cli/*", "../translation/*"],
							message: "Use @hobby-ninja/ workspace package imports instead of relative imports",
						},
					],
				},
			],

			// JSX A11y rules (enhanced from Nx flat/react-jsx)
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- jsx-a11y lacks proper types
			...(jsxA11y.configs.recommended.rules as Record<string, unknown>),
			"jsx-a11y/anchor-is-valid": [
				"warn",
				{ aspects: ["noHref", "invalidHref"] },
			],
			"jsx-a11y/accessible-emoji": "warn",
			"jsx-a11y/alt-text": "warn",
			"jsx-a11y/anchor-has-content": "warn",
			"jsx-a11y/aria-activedescendant-has-tabindex": "warn",
			"jsx-a11y/aria-props": "warn",
			"jsx-a11y/aria-proptypes": "warn",
			"jsx-a11y/aria-role": "warn",
			"jsx-a11y/aria-unsupported-elements": "warn",
			"jsx-a11y/heading-has-content": "warn",
			"jsx-a11y/iframe-has-title": "warn",
			"jsx-a11y/img-redundant-alt": "warn",
			"jsx-a11y/no-access-key": "warn",
			"jsx-a11y/no-distracting-elements": "warn",
			"jsx-a11y/no-redundant-roles": "warn",
			"jsx-a11y/role-has-required-aria-props": "warn",
			"jsx-a11y/role-supports-aria-props": "warn",
			"jsx-a11y/scope": "warn",

			// Standard ESLint rules (from Nx flat/react-base)
			"array-callback-return": "warn",
			"dot-location": ["warn", "property"],
			eqeqeq: ["warn", "smart"],
			"new-parens": "warn",
			"no-caller": "warn",
			"no-cond-assign": ["warn", "except-parens"],
			"no-const-assign": "warn",
			"no-control-regex": "warn",
			"no-delete-var": "warn",
			"no-dupe-args": "warn",
			"no-dupe-keys": "warn",
			"no-duplicate-case": "warn",
			"no-empty-character-class": "warn",
			"no-empty-pattern": "warn",
			"no-eval": "warn",
			"no-ex-assign": "warn",
			"no-extend-native": "warn",
			"no-extra-bind": "warn",
			"no-extra-label": "warn",
			"no-fallthrough": "warn",
			"no-func-assign": "warn",
			"no-invalid-regexp": "warn",
			"no-iterator": "warn",
			"no-label-var": "warn",
			"no-labels": ["warn", { allowLoop: true, allowSwitch: false }],
			"no-lone-blocks": "warn",
			"no-loop-func": "warn",
			"no-mixed-operators": [
				"warn",
				{
					groups: [
						["&", "|", "^", "~", "<<", ">>", ">>>"],
						["==", "!=", "===", "!==", ">", ">=", "<", "<="],
						["&&", "||"],
						["in", "instanceof"],
					],
					allowSamePrecedence: false,
				},
			],
			"no-multi-str": "warn",
			"no-new-func": "warn",
			"no-new-wrappers": "warn",
			"no-obj-calls": "warn",
			"no-octal": "warn",
			"no-octal-escape": "warn",
			"no-redeclare": "warn",
			"no-regex-spaces": "warn",
			"no-restricted-syntax": ["warn", "WithStatement"],

			// Ban re-exports and namespace imports (except in index files - see override below)
			"barrel-files/avoid-barrel-files": "off", // Allow index files
			"barrel-files/avoid-re-export-all": "error",
			"barrel-files/avoid-namespace-import": "error",
			"no-script-url": "warn",
			"no-self-assign": "warn",
			"no-self-compare": "warn",
			"no-sequences": "warn",
			"no-shadow-restricted-names": "warn",
			"no-sparse-arrays": "warn",
			"no-template-curly-in-string": "warn",
			"no-this-before-super": "warn",
			"no-unexpected-multiline": "warn",
			"no-unreachable": "warn",
			"no-unused-labels": "warn",
			"no-useless-computed-key": "warn",
			"no-useless-concat": "warn",
			"no-useless-escape": "warn",
			"no-useless-rename": [
				"warn",
				{
					ignoreDestructuring: false,
					ignoreImport: false,
					ignoreExport: false,
				},
			],
			"no-with": "warn",
			"no-whitespace-before-property": "warn",
			"require-yield": "warn",
			"rest-spread-spacing": ["warn", "never"],
			strict: ["warn", "never"],
			"unicode-bom": ["warn", "never"],
			"use-isnan": "warn",
			"valid-typeof": "warn",
			"no-restricted-properties": [
				"error",
				{
					object: "require",
					property: "ensure",
					message:
						"Please use import() instead. More info: https://facebook.github.io/create-react-app/docs/code-splitting",
				},
				{
					object: "System",
					property: "import",
					message:
						"Please use import() instead. More info: https://facebook.github.io/create-react-app/docs/code-splitting",
				},
			],
			"getter-return": "warn",
			"default-case": "off", // TypeScript's noFallthroughCasesInSwitch is more robust
			"no-dupe-class-members": "off", // tsc handles this
			"no-undef": "off", // tsc handles this
			"no-array-constructor": "off", // Using @typescript-eslint version
			"no-use-before-define": "off", // Using @typescript-eslint version
			"no-unused-vars": "off", // Using @typescript-eslint version
			"no-useless-constructor": "off", // Using @typescript-eslint version
			"no-unused-expressions": "off", // Using @typescript-eslint version
			"no-empty-function": "off", // Using @typescript-eslint version

			// SonarJS rules for code quality
			"sonarjs/no-duplicate-string": "error",

			// Formatting rules
			quotes: [
				"error",
				"double",
				{ avoidEscape: true, allowTemplateLiterals: true },
			],
			indent: ["error", "tab", { SwitchCase: 1 }],
			semi: ["error", "always"],
			"comma-dangle": ["error", "always-multiline"],

			// Type coercion prevention
			"no-implicit-coercion": [
				"error",
				{
					boolean: true,
					number: true,
					string: true,
					disallowTemplateShorthand: true,
				},
			],
			"@typescript-eslint/no-base-to-string": "error",
			"@typescript-eslint/restrict-plus-operands": "error",

		
			// General rules
			"no-console": "warn",
			"prefer-const": "error",
			"no-var": "error",

			// Emoji ban
			"no-emoji/no-emoji": "error",
		},
	},

	// Nx dependency-checks for package.json validation
	{
		files: ["**/package.json"],
		plugins: {
			"@nx": nx,
		},
		rules: {
			"@nx/dependency-checks": [
				"error",
				{
					buildTargets: ["build"],
					checkMissingDependencies: true,
					checkObsoleteDependencies: true,
					checkVersionMismatches: true,
					ignoredDependencies: [],
					ignoredFiles: [],
					includeTransitiveDependencies: false,
				},
			],
		},
	},

	{
		// Disable conflicting core rule and enable TypeScript version
		rules: {
			"unicorn/prevent-abbreviations": "off",
			"unicorn/no-null": "off",
			// Disable ESLint core rule to avoid conflict with TypeScript ESLint
			"no-magic-numbers": "off",
		},
	},
	{
		files: ["**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}"],
		rules: {
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/no-unsafe-argument": "off",
			"@typescript-eslint/no-unsafe-assignment": "off",
			"@typescript-eslint/no-unsafe-call": "off",
			"@typescript-eslint/no-unsafe-member-access": "off",
			"@typescript-eslint/no-unsafe-return": "off",
			"@typescript-eslint/no-floating-promises": "off",
			"@typescript-eslint/unbound-method": "off",
			"@typescript-eslint/require-await": "off",
			"no-console": "off",
		},
	},
	{
		files: ["**/*.e2e.test.{ts,tsx}"],
		rules: {
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/no-unsafe-argument": "off",
			"@typescript-eslint/no-unsafe-assignment": "off",
			"@typescript-eslint/no-unsafe-call": "off",
			"@typescript-eslint/no-unsafe-member-access": "off",
			"@typescript-eslint/no-unsafe-return": "off",
			"@typescript-eslint/no-floating-promises": "off",
			"@typescript-eslint/unbound-method": "off",
			"no-console": "off",
			"playwright/missing-playwright-await": "off", // Not using the Playwright ESLint plugin yet
		},
	},
	{
		// Logger utility needs to use console statements
		files: ["**/packages/translation/src/logger.ts"],
		rules: {
			"no-console": "off",
			"unicorn/no-negated-condition": "off",
		},
	},
	{
		// Constants files contain intentional magic numbers for configuration
		files: ["**/constants.ts"],
		rules: {
			"@typescript-eslint/no-magic-numbers": "off",
		},
	},
	{
		// Markdown files configuration with emoji ban
		files: ["**/*.md"],
		plugins: {
			markdown: markdown as unknown as ESLint.Plugin,
			"no-emoji": eslintPluginNoEmoji as unknown as ESLint.Plugin,
		},
		processor: "markdown/markdown",
		languageOptions: {
			ecmaVersion: "latest",
			sourceType: "script",
		},
		rules: {
			"no-emoji/no-emoji": "error",
		},
	},
	{
		// Configuration for code blocks extracted from markdown files
		files: ["**/*.md/**"],
		plugins: {
			"no-emoji": eslintPluginNoEmoji as unknown as ESLint.Plugin,
		},
		languageOptions: {
			parser: typescriptParser,
			parserOptions: {
				project: false,
				ecmaVersion: "latest",
				sourceType: "module",
				ecmaFeatures: {
					jsx: true,
				},
			},
		},
		rules: {
			"no-emoji/no-emoji": "error",
			// Disable TypeScript rules that require type information for extracted blocks
			"@typescript-eslint/no-base-to-string": "off",
			"@typescript-eslint/restrict-plus-operands": "off",
		},
	},
	{
		// Types package files use camelCase for consistency
		files: ["packages/types/src/*.ts"],
		rules: {
			"unicorn/filename-case": "off",
			"@typescript-eslint/array-type": ["error", { default: "array" }],
		},
	},
	{
		// Utils package files use camelCase for consistency
		files: ["packages/utils/src/*.ts"],
		rules: {
			"unicorn/filename-case": "off",
		},
	},
	{
		// Config files can use default exports
		files: [
			"*.config.ts",
			"*.config.js",
			"*.config.mjs",
			"vite.config.ts",
			"vitest.config.ts",
			"playwright.config.ts",
		],
		rules: {
			"import/no-default-export": "off",
		},
	},
	{
		// Next.js App Router requires default exports for pages, layouts, etc.
		files: [
			"**/app/**/page.tsx",
			"**/app/**/layout.tsx",
			"**/app/**/loading.tsx",
			"**/app/**/error.tsx",
			"**/app/**/not-found.tsx",
			"**/app/**/template.tsx",
			"**/app/**/default.tsx",
		],
		rules: {
			"import/no-default-export": "off",
		},
	},
	{
		// Index files (barrels) are allowed to have re-exports
		files: ["**/index.ts", "**/index.tsx"],
		rules: {
			"barrel-files/avoid-re-export-all": "off",
		},
	},
	{
		// CLI tools and scripts need console output and emojis for user feedback
		files: [
			"packages/cli/**/*.ts",
			"packages/scrapers/**/*.ts",
			"tools/scripts/**/*.ts",
			"scripts/**/*.ts",
			"data/scripts/**/*.ts",
			"data/lib/**/*.ts",
		],
		rules: {
			"no-console": "off",
			"no-emoji/no-emoji": "off",
			"unicorn/no-process-exit": "off",
			"unicorn/prefer-module": "off", // Allow require.main === module pattern
		},
	},
	// JSON data files must be minified (single line) - use eslint-plugin-jsonc
	// First, disable all TypeScript type-checked rules for JSON files
	{
		...tseslint.configs.disableTypeChecked,
		files: JSON_DATA_FILE_PATTERNS,
	},
	// Then apply jsonc recommended config
	...jsonc.configs["flat/recommended-with-json"].map((config) => ({
		...config,
		files: JSON_DATA_FILE_PATTERNS,
	})),
	{
		files: JSON_DATA_FILE_PATTERNS,
		rules: {
			// Enforce tab indentation for JSON data files
			"jsonc/indent": ["error", "tab"],
			// Enforce pretty-printed JSON (newlines between elements)
			"jsonc/array-bracket-newline": ["error", { multiline: true, minItems: 1 }],
			"jsonc/array-element-newline": ["error", "always"],
			"jsonc/object-curly-newline": ["error", { multiline: true, minProperties: 1 }],
			"jsonc/object-property-newline": ["error", { allowAllPropertiesOnSameLine: false }],
			// Space after colons
			"jsonc/key-spacing": ["error", { beforeColon: false, afterColon: true }],
			// Disable rules not applicable to data files
			"unicorn/filename-case": "off",
			// Allow irregular whitespace in data (Japanese text has special spaces)
			"no-irregular-whitespace": "off",
		},
	},
	{
		ignores: [
			"dist/**",
			"build/**",
			"node_modules/**",
			"coverage/**",
			"tmp/**",
			".nx/cache/**",
			".next/**",
			"out/**",
			".output/**",
			"!.syncpackrc.json",
			"playwright-report/**",
			"test-results/**",
			"**/*.config.js",
			"**/*.config.mjs",
			// Note: JSON data files are no longer ignored - they are linted for minification
		],
	},
];
