/**
 * Default configuration for the Gundam data scraper CLI
 * Provides sensible defaults that can be overridden by users
 */

import {
	SCRAPER_TYPES,
	LANGUAGE_CODES,
	EXPORT_FORMATS,
	DIRECTORIES,
	CONCURRENCY_LIMITS,
	DEFAULT_TIMEOUTS,
	RETRY_CONFIG,
	TIME_HOURS,
	RATE_LIMITING,
	LOG_LEVELS,
} from "../constants/cli-constants.js";

import type { ValidatedConfig } from "./validators.js";

export type ScrapingConfig = ValidatedConfig;

export const DEFAULT_CONFIG: ScrapingConfig = {
	source: SCRAPER_TYPES.BANDAI_HOBBY,
	language: LANGUAGE_CODES.ALL,

	output: DIRECTORIES.OUTPUT,
	format: EXPORT_FORMATS.JSON,

	concurrency: CONCURRENCY_LIMITS.DEFAULT,
	delayMs: DEFAULT_TIMEOUTS.DEFAULT_DELAY,
	timeout: DEFAULT_TIMEOUTS.REQUEST_TIMEOUT,
	retries: RETRY_CONFIG.DEFAULT_RETRIES,

	cache: true,
	cacheExpiry: TIME_HOURS.TWENTY_FOUR,

	resume: false,
	checkpointsEnabled: true,

	validate: true,
	fixIssues: false,

	verbose: false,
	dryRun: false,
	logLevel: LOG_LEVELS.INFO,
	logToFile: false,

	rateLimiting: {
		enabled: true,
		requestsPerSecond: RATE_LIMITING.DEFAULT_REQUESTS_PER_SECOND,
		burstSize: RATE_LIMITING.DEFAULT_BURST_CAPACITY,
	},

	filters: {},

	export: {
		includeImages: true,
		includeSpecifications: true,
		includeCategories: true,
		prettyPrint: true,
		compression: false,
	},
};

export const CONFIG_FILE_NAMES = [
	".gundam-scraper.config.json",
	"gundam-scraper.config.json",
	".gundam-scraper.json",
	"gundam-scraper.json",
];

export const ENV_PREFIX = "GUNDAM_SCRAPER_";