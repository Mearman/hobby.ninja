import { promises as fs } from 'fs';
import * as path from 'path';
import { homedir } from 'os';
import { DEFAULT_CONFIG, CONFIG_FILE_NAMES, ENV_PREFIX } from './default-config.js';
import { ConfigValidator, type ValidatedConfig, type ValidationError } from './validators.js';
import { ScraperRegistry, type ScraperType } from '@hobby-ninja/scrapers';

export interface ConfigLoadOptions {
  configFile?: string;
  allowEnvOverride?: boolean;
  skipValidation?: boolean;
}

export interface ConfigLoadResult {
  config: ValidatedConfig;
  source: 'default' | 'file' | 'env' | 'mixed';
  filePath: string | undefined;
  warnings: string[];
}

export class ConfigManager {
  private static instance: ConfigManager;
  private config: ValidatedConfig | null = null;
  private configFilePath: string | null = null;

  private constructor() {}

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * Load configuration from multiple sources with proper precedence
   * Precedence: CLI args > Environment variables > Config file > Defaults
   */
  async load(options: ConfigLoadOptions = {}): Promise<ConfigLoadResult> {
    const {
      configFile,
      allowEnvOverride = true,
      skipValidation = false
    } = options;

    let config = { ...DEFAULT_CONFIG };
    let source: ConfigLoadResult['source'] = 'default';
    let configFilePath: string | undefined;
    const warnings: string[] = [];

    // 1. Load from config file
    const configData = await this.loadConfigFile(configFile);
    if (configData) {
      config = { ...config, ...configData.config };
      source = 'file';
      configFilePath = configData.filePath;
    }

    // 2. Override with environment variables
    if (allowEnvOverride) {
      const envConfig = this.loadFromEnvironment();
      if (Object.keys(envConfig).length > 0) {
        config = { ...config, ...envConfig };
        source = source === 'file' ? 'mixed' : 'env';
      }
    }

    // 3. Validate configuration
    if (!skipValidation) {
      const validation = ConfigValidator.validate(config);
      if (!validation.success) {
        const errorMessages = validation.errors.map(
          (err: ValidationError) => `${err.field}: ${err.message} (value: ${JSON.stringify(err.value)})`
        );
        throw new Error(`Configuration validation failed:\n${errorMessages.join('\n')}`);
      }
      config = validation.data;
    }

    this.config = config;
    this.configFilePath = configFilePath || null;

    const result: ConfigLoadResult = {
      config,
      source,
      filePath: configFilePath || undefined,
      warnings
    };

    return result;
  }

  /**
   * Get the current configuration
   */
  getConfig(): ValidatedConfig {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call load() first.');
    }
    return this.config;
  }

  /**
   * Get the path of the loaded configuration file
   */
  getConfigFilePath(): string | null {
    return this.configFilePath;
  }

  /**
   * Load configuration from file system
   */
  private async loadConfigFile(customPath?: string): Promise<{ config: Partial<ValidatedConfig>; filePath: string } | null> {
    const searchPaths = customPath ? [customPath] : await this.getConfigFilePaths();

    for (const filePath of searchPaths) {
      try {
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const fileConfig = JSON.parse(fileContent);

        // Validate the file config structure
        const validation = ConfigValidator.validatePartial(fileConfig);
        if (!validation.success) {
          console.warn(`Warning: Config file ${filePath} has validation errors:`, validation.errors);
        }

        return {
          config: validation.success ? validation.data : fileConfig,
          filePath
        };
      } catch (error) {
        // File doesn't exist or is invalid JSON - continue searching
        continue;
      }
    }

    return null;
  }

  /**
   * Load configuration from environment variables
   */
  private loadFromEnvironment(): Partial<ValidatedConfig> {
    const envConfig: Partial<ValidatedConfig> = {};

    // Helper function to parse environment variables
    const parseEnv = <T>(key: string, parser?: (value: string) => T): T | undefined => {
      const envValue = process.env[key];
      if (envValue === undefined) return undefined;

      try {
        return parser ? parser(envValue) : (envValue as unknown as T);
      } catch {
        console.warn(`Warning: Failed to parse environment variable ${key} with value ${envValue}`);
        return undefined;
      }
    };

    // Map environment variables to config properties
    const envMappings: Record<string, keyof ValidatedConfig> = {
      [`${ENV_PREFIX}SOURCE`]: 'source',
      [`${ENV_PREFIX}OUTPUT`]: 'output',
      [`${ENV_PREFIX}FORMAT`]: 'format',
      [`${ENV_PREFIX}CONCURRENCY`]: 'concurrency',
      [`${ENV_PREFIX}DELAY_MS`]: 'delayMs',
      [`${ENV_PREFIX}TIMEOUT`]: 'timeout',
      [`${ENV_PREFIX}RETRIES`]: 'retries',
      [`${ENV_PREFIX}CACHE`]: 'cache',
      [`${ENV_PREFIX}CACHE_EXPIRY`]: 'cacheExpiry',
      [`${ENV_PREFIX}RESUME`]: 'resume',
      [`${ENV_PREFIX}VALIDATE`]: 'validate',
      [`${ENV_PREFIX}FIX_ISSUES`]: 'fixIssues',
      [`${ENV_PREFIX}VERBOSE`]: 'verbose',
      [`${ENV_PREFIX}DRY_RUN`]: 'dryRun',
      [`${ENV_PREFIX}LOG_LEVEL`]: 'logLevel',
      [`${ENV_PREFIX}LOG_TO_FILE`]: 'logToFile'
    };

    // Parse simple properties with special handling for ScraperType
    Object.entries(envMappings).forEach(([envKey, configKey]) => {
      const value = parseEnv(envKey);
      if (value !== undefined) {
        // Special validation for ScraperType
        if (configKey === 'source') {
          if (value && ScraperRegistry.isValidType(value as string)) {
            (envConfig as any)[configKey] = value as ScraperType;
          } else if (value) {
            console.warn(`Warning: Invalid scraper type '${value}' for ${envKey}. Available types: ${ScraperRegistry.getAvailableTypes().join(', ')}`);
          }
        } else {
          (envConfig as any)[configKey] = value;
        }
      }
    });

    // Parse rate limiting
    const rateLimitingEnabled = parseEnv(`${ENV_PREFIX}RATE_LIMITING_ENABLED`, Boolean);
    const rateLimitingRps = parseEnv(`${ENV_PREFIX}RATE_LIMITING_RPS`, Number);
    const rateLimitingBurst = parseEnv(`${ENV_PREFIX}RATE_LIMITING_BURST`, Number);

    if (rateLimitingEnabled !== undefined || rateLimitingRps !== undefined || rateLimitingBurst !== undefined) {
      envConfig.rateLimiting = {
        enabled: rateLimitingEnabled ?? DEFAULT_CONFIG.rateLimiting.enabled,
        requestsPerSecond: rateLimitingRps ?? DEFAULT_CONFIG.rateLimiting.requestsPerSecond,
        burstSize: rateLimitingBurst ?? DEFAULT_CONFIG.rateLimiting.burstSize
      };
    }

    // Parse filters
    const minPrice = parseEnv(`${ENV_PREFIX}FILTER_MIN_PRICE`, Number);
    const maxPrice = parseEnv(`${ENV_PREFIX}FILTER_MAX_PRICE`, Number);
    const categories = parseEnv(`${ENV_PREFIX}FILTER_CATEGORIES`, (val) => val.split(',').map(s => s.trim()));
    const excludeKeywords = parseEnv(`${ENV_PREFIX}FILTER_EXCLUDE_KEYWORDS`, (val) => val.split(',').map(s => s.trim()));
    const includeKeywords = parseEnv(`${ENV_PREFIX}FILTER_INCLUDE_KEYWORDS`, (val) => val.split(',').map(s => s.trim()));

    if (minPrice !== undefined || maxPrice !== undefined || categories || excludeKeywords || includeKeywords) {
      envConfig.filters = {
        minPrice,
        maxPrice,
        categories,
        excludeKeywords,
        includeKeywords
      };
    }

    return envConfig;
  }

  /**
   * Get possible configuration file paths in order of precedence
   */
  private async getConfigFilePaths(): Promise<string[]> {
    const paths: string[] = [];

    // Current working directory
    for (const fileName of CONFIG_FILE_NAMES) {
      paths.push(path.resolve(process.cwd(), fileName));
    }

    // Home directory
    for (const fileName of CONFIG_FILE_NAMES) {
      paths.push(path.join(homedir(), fileName));
    }

    // Project root (look for .git directory to find project root)
    const currentDir = process.cwd();
    let searchDir = currentDir;
    while (searchDir !== path.dirname(searchDir)) {
      paths.push(path.join(searchDir, '.gundam-scraper.config.json'));

      const gitDir = path.join(searchDir, '.git');
      if (await this.directoryExists(gitDir)) {
        break;
      }
      searchDir = path.dirname(searchDir);
    }

    return paths;
  }

  /**
   * Check if directory exists
   */
  private async directoryExists(dirPath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(dirPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Save current configuration to file
   */
  async saveConfig(filePath?: string): Promise<void> {
    const targetPath = filePath || path.join(process.cwd(), '.gundam-scraper.config.json');
    const configData = JSON.stringify(this.config, null, 2);

    await fs.writeFile(targetPath, configData, 'utf-8');
    this.configFilePath = targetPath;
  }

  /**
   * Reset to default configuration
   */
  reset(): void {
    this.config = { ...DEFAULT_CONFIG };
    this.configFilePath = null;
  }
}