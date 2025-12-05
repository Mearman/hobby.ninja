import { z } from 'zod';

const LanguageCodeSchema = z.enum(['ja', 'en', 'mixed', 'unknown']);

const OutputFormatSchema = z.enum(['json', 'csv', 'excel', 'ndjson']);

const LogLevelSchema = z.enum(['error', 'warn', 'info', 'debug']);

const RateLimitingSchema = z.object({
  enabled: z.boolean(),
  requestsPerSecond: z.number().min(0.1).max(100),
  burstSize: z.number().min(1).max(100)
});

const FiltersSchema = z.object({
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  categories: z.array(z.string()).optional(),
  excludeKeywords: z.array(z.string()).optional(),
  includeKeywords: z.array(z.string()).optional()
}).refine(
  (data) => {
    if (data.minPrice !== undefined && data.maxPrice !== undefined) {
      return data.minPrice <= data.maxPrice;
    }
    return true;
  },
  {
    message: "minPrice must be less than or equal to maxPrice"
  }
);

const ExportSchema = z.object({
  includeImages: z.boolean(),
  includeSpecifications: z.boolean(),
  includeCategories: z.boolean(),
  prettyPrint: z.boolean(),
  compression: z.boolean()
});

export const ScrapingConfigSchema = z.object({
  source: z.string().min(1),
  language: z.union([LanguageCodeSchema, z.literal('all')]),

  output: z.string().min(1),
  format: OutputFormatSchema,

  concurrency: z.number().min(1).max(10),
  delayMs: z.number().min(0).max(60000),
  timeout: z.number().min(1000).max(300000),
  retries: z.number().min(0).max(10),

  cache: z.boolean(),
  cacheExpiry: z.number().min(1).max(168), // 1 hour to 1 week

  resume: z.boolean(),
  checkpointsEnabled: z.boolean(),

  validate: z.boolean(),
  fixIssues: z.boolean(),

  verbose: z.boolean(),
  dryRun: z.boolean(),
  logLevel: LogLevelSchema,
  logToFile: z.boolean(),

  rateLimiting: RateLimitingSchema,
  filters: FiltersSchema,
  export: ExportSchema
});

export type ValidatedConfig = z.infer<typeof ScrapingConfigSchema>;

export interface ValidationError {
  field: string;
  message: string;
  value: unknown;
}

export class ConfigValidator {
  static validate(config: unknown): { success: true; data: ValidatedConfig } | { success: false; errors: ValidationError[] } {
    const result = ScrapingConfigSchema.safeParse(config);

    if (result.success) {
      return { success: true, data: result.data };
    }

    const errors: ValidationError[] = result.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
      value: issue.received || issue.code
    }));

    return { success: false, errors };
  }

  static validatePartial(config: unknown): { success: true; data: Partial<ValidatedConfig> } | { success: false; errors: ValidationError[] } {
    const result = ScrapingConfigSchema.partial().safeParse(config);

    if (result.success) {
      return { success: true, data: result.data };
    }

    const errors: ValidationError[] = result.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
      value: issue.received || issue.code
    }));

    return { success: false, errors };
  }
}