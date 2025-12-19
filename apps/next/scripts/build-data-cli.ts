#!/usr/bin/env node

// eslint-disable-next-line unicorn/import-style
import { join } from "node:path";

import { buildDataFiles, DataProcessorOptions } from "./data-processor";

/**
 * CLI wrapper for the data processor with customizable options
 */
function parseArgs(): DataProcessorOptions {
	const args = process.argv.slice(2);
	const options: DataProcessorOptions = {};

	// Set up default paths that work whether running from monorepo root or apps/next
	const isRunningFromAppsNext = process.cwd().endsWith("apps/next");
	const defaultSourceDir = isRunningFromAppsNext
		? join(process.cwd(), "../../data/api/graph")
		: join(process.cwd(), "data/api/graph");

	const defaultOutputDir = isRunningFromAppsNext
		? join(process.cwd(), "src/data")
		: join(process.cwd(), "apps/next/src/data");

	// Set default options
	options.sourceDir = defaultSourceDir;
	options.outputDir = defaultOutputDir;

	for (let i = 0; i < args.length; i += 2) {
		const flag = args[i];
		const value = args[i + 1];

		switch (flag) {
			case "--source-dir": {
				options.sourceDir = value;
				break;
			}
			case "--output-dir": {
				options.outputDir = value;
				break;
			}
			case "--categories": {
				options.categories = value.split(",");
				break;
			}
			case "--help":
			case "-h": {
				// eslint-disable-next-line no-console
				console.log(`
Usage: build-data-cli.ts [options]

Options:
  --source-dir <path>    Source directory containing JSON files
                         (auto-detected based on current directory)
  --output-dir <path>    Output directory for generated files
                         (auto-detected based on current directory)
  --categories <list>    Comma-separated list of categories to process
                         (default: items,brands,categories,series)
  --help, -h            Show this help message

Examples:
  tsx ./scripts/build-data-cli.ts
  tsx ./scripts/build-data-cli.ts --output-dir ./custom-data
  tsx ./scripts/build-data-cli.ts --categories items,brands
        `);
				process.exit(0);
			}
		}
	}

	return options;
}

// Run CLI with parsed options
 
const options = parseArgs();
// eslint-disable-next-line no-console
console.log("Data Processor CLI");
// eslint-disable-next-line no-console
console.log("Options:", options);
// eslint-disable-next-line no-console
console.log("");

try {
	buildDataFiles(options);
	// eslint-disable-next-line no-console
	console.log("\nBuild completed successfully!");
	process.exit(0);
} catch (error) {
	// eslint-disable-next-line no-console
	console.error("\nBuild failed:", error);
	process.exit(1);
}