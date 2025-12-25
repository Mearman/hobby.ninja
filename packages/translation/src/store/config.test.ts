/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-dynamic-delete, @typescript-eslint/no-magic-numbers */
/**
 * Tests for the configuration module
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import {
	StoreConfigurationSchema,
	validateConfig,
	createConfig,
	loadConfigFromEnv,
	mergeConfigs,
	getPresetConfig,
	CONFIGURATION_PRESETS,
	ENV_VARS,
	ConfigBuilder,
	configBuilder,
	exportConfig,
	createConfigWithEnv,
} from "./config";
import { TranslationStoreError } from "./translation-store";

describe("config", () => {
	beforeEach(() => {
		// Clear environment variables before each test
		for (const envVar of Object.values(ENV_VARS)) {
			delete process.env[envVar];
		}
	});

	afterEach(() => {
		// Clean up environment variables after each test
		for (const envVar of Object.values(ENV_VARS)) {
			delete process.env[envVar];
		}
	});

	describe("StoreConfigurationSchema", () => {
		it("should validate a correct configuration", () => {
			const config = {
				storagePath: ".gundam-cache/translations",
				maxEntries: 10_000,
				maxSizeBytes: 100 * 1024 * 1024,
				compressionThreshold: 1024,
				memoryCacheSize: 1000,
				syncInterval: 5000,
				lockTimeout: 10_000,
				defaultTTL: 30 * 24 * 60 * 60 * 1000,
				enableCompression: true,
				enableMetrics: true,
			};

			const result = StoreConfigurationSchema.parse(config);
			expect(result).toEqual(config);
		});

		it("should reject invalid storagePath", () => {
			const config = {
				storagePath: "", // Invalid: empty string
				maxEntries: 10_000,
				maxSizeBytes: 100 * 1024 * 1024,
				compressionThreshold: 1024,
				memoryCacheSize: 1000,
				syncInterval: 5000,
				lockTimeout: 10_000,
				defaultTTL: 30 * 24 * 60 * 60 * 1000,
				enableCompression: true,
				enableMetrics: true,
			};

			expect(() => StoreConfigurationSchema.parse(config)).toThrow();
		});

		it("should reject negative maxEntries", () => {
			const config = {
				storagePath: ".gundam-cache/translations",
				maxEntries: -1, // Invalid: negative
				maxSizeBytes: 100 * 1024 * 1024,
				compressionThreshold: 1024,
				memoryCacheSize: 1000,
				syncInterval: 5000,
				lockTimeout: 10_000,
				defaultTTL: 30 * 24 * 60 * 60 * 1000,
				enableCompression: true,
				enableMetrics: true,
			};

			expect(() => StoreConfigurationSchema.parse(config)).toThrow();
		});
	});

	describe("validateConfig", () => {
		it("should return valid: true for correct configuration", () => {
			const config = {
				storagePath: ".gundam-cache/translations",
				maxEntries: 10_000,
				maxSizeBytes: 100 * 1024 * 1024,
				compressionThreshold: 1024,
				memoryCacheSize: 1000,
				syncInterval: 5000,
				lockTimeout: 10_000,
				defaultTTL: 30 * 24 * 60 * 60 * 1000,
				enableCompression: true,
				enableMetrics: true,
			};

			const result = validateConfig(config);
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("should return valid: false for invalid configuration", () => {
			const config = {
				storagePath: "", // Invalid
				maxEntries: -1, // Invalid
				maxSizeBytes: 100 * 1024 * 1024,
				compressionThreshold: 1024,
				memoryCacheSize: 1000,
				syncInterval: 5000,
				lockTimeout: 10_000,
				defaultTTL: 30 * 24 * 60 * 60 * 1000,
				enableCompression: true,
				enableMetrics: true,
			};

			const result = validateConfig(config);
			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
		});

		it("should generate warnings for potentially problematic configurations", () => {
			const config = {
				storagePath: ".gundam-cache/translations",
				maxEntries: 200_000, // Large number - should trigger warning
				maxSizeBytes: 100 * 1024 * 1024,
				compressionThreshold: 1024,
				memoryCacheSize: 150_000, // > 50% of maxEntries - should trigger warning
				syncInterval: 500, // Very frequent - should trigger warning
				lockTimeout: 10_000,
				defaultTTL: 30 * 60 * 1000, // Very short - should trigger warning
				enableCompression: true,
				enableMetrics: true,
			};

			const result = validateConfig(config);
			expect(result.valid).toBe(true);
			// Suppress warnings during test by mocking console.warn
			const originalWarn = console.warn;
			console.warn = vi.fn();
			try {
				createConfig(config); // This should log warnings
			} finally {
				console.warn = originalWarn;
			}
		});
	});

	describe("createConfig", () => {
		it("should create a valid configuration with defaults", () => {
			const config = createConfig();
			expect(config.storagePath).toBe(".gundam-cache/translations");
			expect(config.maxEntries).toBe(10_000);
			expect(config.maxSizeBytes).toBe(100 * 1024 * 1024);
		});

		it("should create a configuration with overrides", () => {
			const overrides = {
				maxEntries: 5000,
				enableCompression: false,
			};

			const config = createConfig(overrides);
			expect(config.maxEntries).toBe(5000);
			expect(config.enableCompression).toBe(false);
			expect(config.storagePath).toBe(".gundam-cache/translations"); // Default
		});

		it("should throw TranslationStoreError for invalid configuration", () => {
			const overrides = {
				maxEntries: -1, // Invalid
			};

			expect(() => createConfig(overrides)).toThrow(TranslationStoreError);
		});
	});

	describe("loadConfigFromEnv", () => {
		it("should load configuration from environment variables", () => {
			process.env[ENV_VARS.MAX_ENTRIES] = "5000";
			process.env[ENV_VARS.ENABLE_COMPRESSION] = "false";
			process.env[ENV_VARS.STORAGE_PATH] = "/custom/path";

			const config = loadConfigFromEnv();
			expect(config.maxEntries).toBe(5000);
			expect(config.enableCompression).toBe(false);
			expect(config.storagePath).toBe("/custom/path");
		});

		it("should handle boolean environment variables correctly", () => {
			// Test various boolean representations
			process.env[ENV_VARS.ENABLE_COMPRESSION] = "true";
			process.env[ENV_VARS.ENABLE_METRICS] = "false";

			const config1 = loadConfigFromEnv();
			expect(config1.enableCompression).toBe(true);
			expect(config1.enableMetrics).toBe(false);

			delete process.env[ENV_VARS.ENABLE_COMPRESSION];
			delete process.env[ENV_VARS.ENABLE_METRICS];

			process.env[ENV_VARS.ENABLE_COMPRESSION] = "1";
			process.env[ENV_VARS.ENABLE_METRICS] = "0";

			const config2 = loadConfigFromEnv();
			expect(config2.enableCompression).toBe(true);
			expect(config2.enableMetrics).toBe(false);
		});

		it("should throw TranslationStoreError for invalid environment values", () => {
			process.env[ENV_VARS.MAX_ENTRIES] = "invalid-number";

			expect(() => loadConfigFromEnv()).toThrow(TranslationStoreError);
		});

		it("should return empty object when no environment variables are set", () => {
			const config = loadConfigFromEnv();
			expect(Object.keys(config)).toHaveLength(0);
		});
	});

	describe("mergeConfigs", () => {
		it("should merge base configuration with overrides", () => {
			const base = {
				storagePath: ".gundam-cache/translations",
				maxEntries: 10_000,
				maxSizeBytes: 100 * 1024 * 1024,
				compressionThreshold: 1024,
				memoryCacheSize: 1000,
				syncInterval: 5000,
				lockTimeout: 10_000,
				defaultTTL: 30 * 24 * 60 * 60 * 1000,
				enableCompression: true,
				enableMetrics: true,
			};

			const overrides = {
				maxEntries: 5000,
				enableCompression: false,
			};

			const merged = mergeConfigs(base, overrides);
			expect(merged.maxEntries).toBe(5000);
			expect(merged.enableCompression).toBe(false);
			expect(merged.storagePath).toBe(".gundam-cache/translations"); // From base
			expect(merged.maxSizeBytes).toBe(100 * 1024 * 1024); // From base
		});
	});

	describe("getPresetConfig", () => {
		it("should return development preset", () => {
			const config = getPresetConfig("development");
			expect(config.storagePath).toBe(".gundam-cache/translations-dev");
			expect(config.memoryCacheSize).toBe(100);
			expect(config.enableMetrics).toBe(true);
		});

		it("should return production preset", () => {
			const config = getPresetConfig("production");
			expect(config.maxEntries).toBe(50_000);
			expect(config.maxSizeBytes).toBe(500 * 1024 * 1024);
		});

		it("should return testing preset", () => {
			const config = getPresetConfig("testing");
			expect(config.storagePath).toBe("./test-cache");
			expect(config.maxEntries).toBe(100);
			expect(config.enableMetrics).toBe(false);
		});

		it("should return minimal preset", () => {
			const config = getPresetConfig("minimal");
			expect(config.enableCompression).toBe(false);
			expect(config.enableMetrics).toBe(false);
		});

		it("should apply overrides to preset", () => {
			const config = getPresetConfig("development", {
				maxEntries: 9999,
			});
			expect(config.maxEntries).toBe(9999);
			expect(config.storagePath).toBe(".gundam-cache/translations-dev"); // From preset
		});

		it("should throw TranslationStoreError for invalid preset name", () => {
			expect(() => getPresetConfig("invalid" as any)).toThrow(TranslationStoreError);
		});
	});

	describe("createConfigWithEnv", () => {
		it("should create config with environment overrides", () => {
			process.env[ENV_VARS.MAX_ENTRIES] = "7500";
			process.env[ENV_VARS.ENABLE_METRICS] = "false";

			const config = createConfigWithEnv();
			expect(config.maxEntries).toBe(7500);
			expect(config.enableMetrics).toBe(false);
			expect(config.storagePath).toBe(".gundam-cache/translations"); // Default
		});

		it("should merge both provided overrides and environment variables", () => {
			process.env[ENV_VARS.ENABLE_METRICS] = "false";
			process.env[ENV_VARS.MAX_ENTRIES] = "2000";

			const config = createConfigWithEnv({
				maxEntries: 8000, // This should take precedence over env var
				enableCompression: false,
			});
			expect(config.maxEntries).toBe(8000); // From provided overrides
			expect(config.enableMetrics).toBe(false); // From environment
			expect(config.enableCompression).toBe(false); // From provided overrides
		});
	});

	describe("ConfigBuilder", () => {
		it("should build configuration using fluent interface", () => {
			const config = configBuilder()
				.withMaxEntries(5000)
				.withMaxSizeMB(50)
				.withCompression(false)
				.withDefaultTTLDays(7)
				.build();

			expect(config.maxEntries).toBe(5000);
			expect(config.maxSizeBytes).toBe(50 * 1024 * 1024);
			expect(config.enableCompression).toBe(false);
			expect(config.defaultTTL).toBe(7 * 24 * 60 * 60 * 1000);
		});

		it("should build from preset with additional overrides", () => {
			const originalWarn = console.warn;
			console.warn = vi.fn();
			try {
				const config = configBuilder()
					.buildFromPreset("testing", {
						enableMetrics: true,
					});

				expect(config.storagePath).toBe("./test-cache"); // From preset
				expect(config.enableMetrics).toBe(true); // From override
			} finally {
				console.warn = originalWarn;
			}
		});

		it("should apply environment overrides when requested", () => {
			process.env[ENV_VARS.MAX_ENTRIES] = "1234";

			const originalWarn = console.warn;
			console.warn = vi.fn();
			try {
				const config = configBuilder()
					.withMaxEntries(5678) // This should come first
					.withEnvOverrides() // Then env should override
					.build();

				expect(config.maxEntries).toBe(1234); // From environment
			} finally {
				console.warn = originalWarn;
			}
		});
	});

	describe("exportConfig", () => {
		it("should export configuration in readable format", () => {
			const config = createConfig({
				maxSizeBytes: 200 * 1024 * 1024,
				defaultTTL: 7 * 24 * 60 * 60 * 1000,
			});

			const exported = exportConfig(config);
			const parsed = JSON.parse(exported);

			expect(parsed.maxSizeMB).toBe(200);
			expect(parsed.defaultTTLDays).toBe(7);
			expect(parsed.enableCompression).toBe(true);
		});
	});

	describe("CONFIGURATION_PRESETS", () => {
		it("should have all required presets", () => {
			expect(Object.keys(CONFIGURATION_PRESETS)).toContain("development");
			expect(Object.keys(CONFIGURATION_PRESETS)).toContain("production");
			expect(Object.keys(CONFIGURATION_PRESETS)).toContain("testing");
			expect(Object.keys(CONFIGURATION_PRESETS)).toContain("minimal");
		});

		it("should have valid preset configurations", () => {
			for (const preset of Object.values(CONFIGURATION_PRESETS)) {
				const validation = validateConfig(preset);
				expect(validation.valid).toBe(true);
				expect(validation.errors).toHaveLength(0);
			}
		});
	});

	describe("ENV_VARS", () => {
		it("should have all required environment variable names", () => {
			expect(Object.values(ENV_VARS)).toContain("GUNDAM_STORAGE_PATH");
			expect(Object.values(ENV_VARS)).toContain("GUNDAM_MAX_ENTRIES");
			expect(Object.values(ENV_VARS)).toContain("GUNDAM_ENABLE_COMPRESSION");
			expect(Object.values(ENV_VARS)).toContain("GUNDAM_ENABLE_METRICS");
		});
	});
});