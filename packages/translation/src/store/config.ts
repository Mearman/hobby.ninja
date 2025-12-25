/**
 * Configuration system for the TranslationStore
 *
 * This module provides comprehensive configuration management with:
 * - Type-safe configuration interfaces
 * - Runtime validation with Zod schemas
 * - Environment variable support
 * - Default settings optimized for CLI workflows
 */

import { existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

import { z } from "zod";

/**
 * Configuration schema with Zod validation
 */
export const ConfigurationSchema = z.object({
	/** Directory path where translation store files are saved */
	storageDir: z.string()
		.min(1, "Storage directory path cannot be empty")
		.refine(path => {
			// Basic path validation - should be a valid path format
			return !path.includes("..") || path.startsWith("..");
		}, "Invalid path format"),

	/** Time-to-live for cached translations in milliseconds */
	ttlMs: z.number()
		.int("TTL must be an integer")
		.min(1000, "TTL must be at least 1 second")
		.max(365 * 24 * 60 * 60 * 1000, "TTL cannot exceed 1 year"),

	/** Maximum storage size in bytes */
	maxStorageSize: z.number()
		.int("Maximum storage size must be an integer")
		.min(1024 * 1024, "Maximum storage size must be at least 1MB")
		.max(1024 * 1024 * 1024, "Maximum storage size cannot exceed 1GB"),

	/** Maximum number of translation entries */
	maxEntries: z.number()
		.int("Maximum entries must be an integer")
		.min(10, "Maximum entries must be at least 10")
		.max(100_000, "Maximum entries cannot exceed 100,000"),

	/** Minimum file size in bytes to trigger compression */
	compressionThreshold: z.number()
		.int("Compression threshold must be an integer")
		.min(100, "Compression threshold must be at least 100 bytes")
		.max(1024 * 1024, "Compression threshold cannot exceed 1MB"),

	/** File lock timeout in milliseconds */
	lockTimeout: z.number()
		.int("Lock timeout must be an integer")
		.min(1000, "Lock timeout must be at least 1 second")
		.max(60_000, "Lock timeout cannot exceed 60 seconds"),

	/** Enable integrity checksums for stored data */
	enableIntegrityChecks: z.boolean(),

	/** Enable compression for stored files */
	enableCompression: z.boolean(),

	/** In-memory cache size (number of entries) */
	cacheSize: z.number()
		.int("Cache size must be an integer")
		.min(1, "Cache size must be at least 1")
		.max(10_000, "Cache size cannot exceed 10,000"),

	/** Prefix for environment variable overrides */
	envPrefix: z.string()
		.min(1, "Environment variable prefix cannot be empty"),

	/** Optional custom cache directory (overrides storageDir if provided) */
	cacheDir: z.string().optional(),
});

/**
 * Type definition for validated configuration
 */
export type StoreConfiguration = z.infer<typeof ConfigurationSchema>;

/**
 * Default configuration optimized for CLI workflows
 */
export const DEFAULT_CONFIG: StoreConfiguration = {
	// Store in user's home directory under .gundam-cache/translations
	storageDir: path.join(homedir(), ".gundam-cache", "translations"),

	// 30 days TTL for translations
	ttlMs: 30 * 24 * 60 * 60 * 1000,

	// 10MB storage limit
	maxStorageSize: 10 * 1024 * 1024,

	// Maximum 1000 translation entries
	maxEntries: 1000,

	// Compress files larger than 1KB
	compressionThreshold: 1024,

	// 5 second lock timeout
	lockTimeout: 5000,

	// Enable integrity checks by default
	enableIntegrityChecks: true,

	// Enable compression by default
	enableCompression: true,

	// Cache 100 recent entries in memory
	cacheSize: 100,

	// Environment variable prefix
	envPrefix: "GUNDAM_TRANSLATION",
};

/**
 * Environment variable mappings
 */
const ENV_VAR_MAPPINGS = {
	storageDir: "_STORAGE_DIR",
	ttlMs: "_TTL_MS",
	maxStorageSize: "_MAX_SIZE",
	maxEntries: "_MAX_ENTRIES",
	enableCompression: "_COMPRESSION",
} as const;

/**
 * Parse environment variable value with proper type conversion
 */
function parseEnvValue(key: keyof typeof ENV_VAR_MAPPINGS, value: string): string | number | boolean {
	switch (key) {
		case "storageDir": {
			return value.trim();
		}

		case "ttlMs":
		case "maxStorageSize":
		case "maxEntries": {
			const num = Number.parseInt(value, 10);
			if (isNaN(num) || num < 0) {
				throw new Error(`Invalid number value for ${key}: ${value}`);
			}
			return num;
		}

		case "enableCompression": {
			return value.toLowerCase() === "true" || value === "1";
		}

		default: {
			return value;
		}
	}
}

/**
 * Load configuration from environment variables
 */
export function loadFromEnv(envPrefix: string = DEFAULT_CONFIG.envPrefix): Partial<StoreConfiguration> {
	const envConfig: Partial<StoreConfiguration> = {};

	for (const [configKey, envSuffix] of Object.entries(ENV_VAR_MAPPINGS)) {
		const envVar = `${envPrefix}${envSuffix}`;
		const envValue = process.env[envVar];

		if (envValue !== undefined) {
			try {
				const parsedValue = parseEnvValue(configKey as keyof typeof ENV_VAR_MAPPINGS, envValue);
				// Type-safe assignment based on key
				switch (configKey) {
					case "storageDir": {
						envConfig.storageDir = parsedValue as string;
						break;
					}
					case "ttlMs": {
						envConfig.ttlMs = parsedValue as number;
						break;
					}
					case "maxStorageSize": {
						envConfig.maxStorageSize = parsedValue as number;
						break;
					}
					case "maxEntries": {
						envConfig.maxEntries = parsedValue as number;
						break;
					}
					case "enableCompression": {
						envConfig.enableCompression = parsedValue as boolean;
						break;
					}
				}
			} catch (error) {
				console.warn(`Warning: Invalid environment variable ${envVar}: ${(error as Error).message}`);
			}
		}
	}

	return envConfig;
}

/**
 * Validate configuration using Zod schema
 */
export function validateConfig(config: Partial<StoreConfiguration>): StoreConfiguration {
	const mergedConfig = { ...DEFAULT_CONFIG, ...config };

	try {
		return ConfigurationSchema.parse(mergedConfig);
	} catch (error) {
		if (error instanceof z.ZodError) {
			const errorMessages = error.issues.map(err =>
				`${err.path.join(".")}: ${err.message}`,
			).join("; ");
			throw new Error(`Configuration validation failed: ${errorMessages}`);
		}
		throw error;
	}
}

/**
 * Resolve configuration file path
 */
export function resolveConfigPath(configPath?: string): string {
	if (configPath) {
		return path.resolve(configPath);
	}

	// Look for config in current directory and parent directories
	const possiblePaths = [
		path.join(process.cwd(), "translation.config.json"),
		path.join(process.cwd(), ".translationrc"),
		path.join(homedir(), ".gundam", "translation.config.json"),
	];

	for (const possiblePath of possiblePaths) {
		if (existsSync(possiblePath)) {
			return possiblePath;
		}
	}

	// Return default path if no config file found
	return path.join(process.cwd(), "translation.config.json");
}

/**
 * Load configuration from file
 */
export function loadFromFile(configPath: string): Partial<StoreConfiguration> {
	try {
		// This would require adding file reading dependencies
		// For now, return empty config - file loading can be added later
		return {};
	} catch (error) {
		console.warn(`Warning: Could not load config from ${configPath}: ${(error as Error).message}`);
		return {};
	}
}

/**
 * Merge multiple configuration sources
 */
export function mergeConfig(
	baseConfig: Partial<StoreConfiguration> = {},
	envConfig: Partial<StoreConfiguration> = {},
	fileConfig: Partial<StoreConfiguration> = {},
): StoreConfiguration {
	// Priority: user config > file config > env config > defaults
	const merged = {
		...DEFAULT_CONFIG,
		...envConfig,
		...fileConfig,
		...baseConfig,
	};

	return validateConfig(merged);
}

/**
 * Create configuration with automatic environment variable loading
 */
export function createConfig(userConfig: Partial<StoreConfiguration> = {}): StoreConfiguration {
	const envConfig = loadFromEnv(userConfig.envPrefix);
	return mergeConfig(userConfig, envConfig);
}

/**
 * Configuration builder class for fluent API
 */
export class ConfigurationBuilder {
	private config: Partial<StoreConfiguration> = {};

	/**
   * Set storage directory
   */
	withStorageDir(dir: string): this {
		this.config.storageDir = dir;
		return this;
	}

	/**
   * Set time-to-live
   */
	withTtl(ttlMs: number): this {
		this.config.ttlMs = ttlMs;
		return this;
	}

	/**
   * Set maximum storage size
   */
	withMaxStorageSize(sizeBytes: number): this {
		this.config.maxStorageSize = sizeBytes;
		return this;
	}

	/**
   * Set maximum entries
   */
	withMaxEntries(entries: number): this {
		this.config.maxEntries = entries;
		return this;
	}

	/**
   * Enable or disable compression
   */
	withCompression(enabled: boolean): this {
		this.config.enableCompression = enabled;
		return this;
	}

	/**
   * Enable or disable integrity checks
   */
	withIntegrityChecks(enabled: boolean): this {
		this.config.enableIntegrityChecks = enabled;
		return this;
	}

	/**
   * Set cache size
   */
	withCacheSize(size: number): this {
		this.config.cacheSize = size;
		return this;
	}

	/**
   * Set environment variable prefix
   */
	withEnvPrefix(prefix: string): this {
		this.config.envPrefix = prefix;
		return this;
	}

	/**
   * Build and validate the configuration
   */
	build(): StoreConfiguration {
		const envConfig = loadFromEnv(this.config.envPrefix);
		return mergeConfig(this.config, envConfig);
	}
}

/**
 * Convenience function to create a configuration builder
 */
export function configBuilder(): ConfigurationBuilder {
	return new ConfigurationBuilder();
}

/**
 * Immutable configuration wrapper
 */
export class ImmutableConfig {
	private readonly config: StoreConfiguration;

	constructor(config: StoreConfiguration) {
		this.config = Object.freeze({ ...config });
	}

	get storageDir(): string { return this.config.storageDir; }
	get ttlMs(): number { return this.config.ttlMs; }
	get maxStorageSize(): number { return this.config.maxStorageSize; }
	get maxEntries(): number { return this.config.maxEntries; }
	get compressionThreshold(): number { return this.config.compressionThreshold; }
	get lockTimeout(): number { return this.config.lockTimeout; }
	get enableIntegrityChecks(): boolean { return this.config.enableIntegrityChecks; }
	get enableCompression(): boolean { return this.config.enableCompression; }
	get cacheSize(): number { return this.config.cacheSize; }
	get envPrefix(): string { return this.config.envPrefix; }

	/**
   * Create a copy with updated values
   */
	with(updates: Partial<StoreConfiguration>): ImmutableConfig {
		const newConfig = { ...this.config, ...updates };
		return new ImmutableConfig(validateConfig(newConfig));
	}

	/**
   * Get the underlying configuration object (for internal use)
   */
	toObject(): StoreConfiguration {
		return this.config;
	}
}

/**
 * Create an immutable configuration instance
 */
export function createImmutableConfig(config: Partial<StoreConfiguration> = {}): ImmutableConfig {
	const validatedConfig = createConfig(config);
	return new ImmutableConfig(validatedConfig);
}

// Export the default configuration for convenience
export default DEFAULT_CONFIG;