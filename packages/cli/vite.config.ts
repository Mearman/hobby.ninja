import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

export default defineConfig({
	plugins: [
		dts({
			include: ['src/**/*.ts', 'src/**/*.tsx'],
			outDir: 'dist',
		}),
	],
	build: {
		lib: {
			entry: {
				index: resolve(__dirname, 'src/index.ts'),
				'bin/cli': resolve(__dirname, 'src/bin/cli.ts'),
			},
			formats: ['es'],
			fileName: (format, entryName) => `${entryName}.js`,
		},
		outDir: 'dist',
		emptyDirBeforeWrite: true,
		rollupOptions: {
			external: [
				// Node built-ins
				'node:fs',
				'node:fs/promises',
				'node:path',
				'node:crypto',
				'node:url',
				'node:stream',
				'node:util',
				'fs',
				'fs/promises',
				'path',
				'crypto',
				'url',
				'stream',
				'util',
				// Workspace packages
				/^@hobby-ninja\//,
				// Dependencies that should remain external
				'commander',
				'cheerio',
				'playwright',
				'zod',
				'inquirer',
				// Ink and React (keep external for proper ESM handling)
				'ink',
				'react',
				'@inkjs/ui',
			],
			output: {
				preserveModules: true,
				preserveModulesRoot: 'src',
			},
		},
		target: 'node20',
		minify: false,
		sourcemap: true,
	},
	resolve: {
		alias: {
			'@hobby-ninja/translation': resolve(__dirname, '../translation/src'),
			'@hobby-ninja/types': resolve(__dirname, '../types/src'),
			'@hobby-ninja/utils': resolve(__dirname, '../utils/src'),
			'@hobby-ninja/scrapers': resolve(__dirname, '../scrapers/src'),
		},
	},
	esbuild: {
		jsx: 'automatic',
	},
});
