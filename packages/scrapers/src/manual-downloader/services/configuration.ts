/**
 * Configuration management for Bandai Manual Content Downloader
 *
 * Handles loading, validation, and management of configuration
 * settings with support for environment variables and defaults.
 *
 * @version 1.0.0
 * @since 2025-12-05
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { ManualDownloaderConfig, SessionConfiguration } from '../types';
import { ConfigurationError, ErrorFactory } from './errors';

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: ManualDownloaderConfig = {
  targetUrl: 'https://manual.bandai-hobby.net/menus/detail/',
  outputDirectory: './data/raw/bandai/manuals',
  rateLimitDelay: 8000, // 8 seconds
  maxRetries: 3,
  userAgent: 'ManualDownloader/1.0; +http://example.com/bot-info',
  timeout: 30000 // 30 seconds
};

const DEFAULT_SESSION_CONFIG: Partial<SessionConfiguration> = {
  rateLimitDelay: DEFAULT_CONFIG.rateLimitDelay,
  maxConcurrent: 1,
  maxRetries: DEFAULT_CONFIG.maxRetries,
  backoffMultiplier: 2,
  requestTimeout: DEFAULT_CONFIG.timeout,
  userAgent: DEFAULT_CONFIG.userAgent,
  checkpointInterval: 10,
  verifyDownloads: true,
  compressFiles: false,
  maxDiskUsage: 0, // unlimited
  customHeaders: {},
  enableDetailedLogging: false,
  enableMetrics: false
};

/**
 * Configuration interface for loading from files
 */
interface ConfigurationFile {
  downloader?: Partial<ManualDownloaderConfig>;
  session?: Partial<SessionConfiguration>;
  environmentOverrides?: {
    [key: string]: string;
  };
}

/**
 * Configuration service class
 */
export class ConfigurationService {
  private config!: ManualDownloaderConfig;
  private sessionConfig!: SessionConfiguration;

  constructor(configPath?: string) {
    this.loadConfiguration(configPath);
  }

  /**
   * Load configuration from file and environment
   */
  private loadConfiguration(configPath?: string): void {
    try {
      // Start with defaults
      this.config = { ...DEFAULT_CONFIG };
      this.sessionConfig = DEFAULT_SESSION_CONFIG as SessionConfiguration;

      // Load from file if provided
      if (configPath && existsSync(configPath)) {
        const configData: ConfigurationFile = JSON.parse(readFileSync(configPath, 'utf8'));

        if (configData.downloader) {
          this.config = { ...this.config, ...configData.downloader };
        }

        if (configData.session) {
          this.sessionConfig = { ...this.sessionConfig, ...configData.session };
        }
      }

      // Apply environment variable overrides
      this.applyEnvironmentOverrides();

      // Validate configuration
      this.validateConfiguration();
    } catch (error) {
      throw ErrorFactory.configuration('CONFIG_LOAD_ERROR',
        `Failed to load configuration: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Apply environment variable overrides
   */
  private applyEnvironmentOverrides(): void {
    const overrides: { [key: string]: any } = {};

    // Map environment variables to config keys
    const envMappings: { [envVar: string]: string } = {
      'MANUAL_DOWNLOADER_TARGET_URL': 'targetUrl',
      'MANUAL_DOWNLOADER_OUTPUT_DIR': 'outputDirectory',
      'MANUAL_DOWNLOADER_RATE_LIMIT': 'rateLimitDelay',
      'MANUAL_DOWNLOADER_MAX_RETRIES': 'maxRetries',
      'MANUAL_DOWNLOADER_USER_AGENT': 'userAgent',
      'MANUAL_DOWNLOADER_TIMEOUT': 'timeout',
      'MANUAL_DOWNLOADER_MAX_CONCURRENT': 'maxConcurrent',
      'MANUAL_DOWNLOADER_VERIFY_DOWNLOADS': 'verifyDownloads',
      'MANUAL_DOWNLOADER_COMPRESS_FILES': 'compressFiles',
      'MANUAL_DOWNLOADER_ENABLE_LOGGING': 'enableDetailedLogging'
    };

    // Apply environment variable values
    for (const [envVar, configKey] of Object.entries(envMappings)) {
      const envValue = process.env[envVar];
      if (envValue !== undefined) {
        overrides[configKey] = this.parseEnvironmentValue(envValue);
      }
    }

    // Apply overrides to both configs
    this.config = { ...this.config, ...overrides };
    this.sessionConfig = { ...this.sessionConfig, ...overrides };
  }

  /**
   * Parse environment variable value to appropriate type
   */
  private parseEnvironmentValue(value: string): any {
    // Try to parse as JSON first
    try {
      return JSON.parse(value);
    } catch {
      // If not JSON, determine type
      if (value === 'true') return true;
      if (value === 'false') return false;
      if (/^\d+$/.test(value)) return parseInt(value, 10);
      if (/^\d*\.\d+$/.test(value)) return parseFloat(value);
      return value;
    }
  }

  /**
   * Validate configuration values
   */
  private validateConfiguration(): void {
    const errors: string[] = [];

    // Validate URL
    try {
      new URL(this.config.targetUrl);
    } catch {
      errors.push('Invalid targetUrl: must be a valid URL');
    }

    // Validate numeric values
    if (this.config.rateLimitDelay < 100) {
      errors.push('rateLimitDelay must be at least 100ms');
    }

    if (this.config.maxRetries < 0 || this.config.maxRetries > 10) {
      errors.push('maxRetries must be between 0 and 10');
    }

    if (this.config.timeout < 1000) {
      errors.push('timeout must be at least 1000ms');
    }

    // Validate session config
    if (this.sessionConfig.maxConcurrent < 1 || this.sessionConfig.maxConcurrent > 10) {
      errors.push('maxConcurrent must be between 1 and 10');
    }

    if (this.sessionConfig.checkpointInterval < 1) {
      errors.push('checkpointInterval must be at least 1');
    }

    if (errors.length > 0) {
      throw new ConfigurationError('CONFIG_VALIDATION_ERROR',
        `Configuration validation failed:\n${errors.join('\n')}`);
    }
  }

  /**
   * Get downloader configuration
   */
  getDownloaderConfig(): ManualDownloaderConfig {
    return { ...this.config };
  }

  /**
   * Get session configuration
   */
  getSessionConfig(): SessionConfiguration {
    return { ...this.sessionConfig };
  }

  /**
   * Get specific configuration value
   */
  get<T>(key: keyof ManualDownloaderConfig): T {
    return this.config[key] as T;
  }

  /**
   * Get session configuration value
   */
  getSession<T>(key: keyof SessionConfiguration): T {
    return this.sessionConfig[key] as T;
  }

  /**
   * Update configuration value
   */
  set<K extends keyof ManualDownloaderConfig>(key: K, value: ManualDownloaderConfig[K]): void {
    this.config[key] = value;
    this.validateConfiguration();
  }

  /**
   * Update session configuration value
   */
  setSession<K extends keyof SessionConfiguration>(key: K, value: SessionConfiguration[K]): void {
    this.sessionConfig[key] = value;
    this.validateConfiguration();
  }

  /**
   * Export configuration to object
   */
  export(): ConfigurationFile {
    return {
      downloader: this.config,
      session: this.sessionConfig
    };
  }

  /**
   * Export configuration to JSON string
   */
  exportToJson(): string {
    return JSON.stringify(this.export(), null, 2);
  }

  /**
   * Save configuration to file
   */
  saveToFile(filePath: string): void {
    const { writeFileSync } = require('node:fs');
    writeFileSync(filePath, this.exportToJson(), 'utf8');
  }
}

/**
 * Create configuration service instance
 */
export function createConfiguration(configPath?: string): ConfigurationService {
  return new ConfigurationService(configPath);
}