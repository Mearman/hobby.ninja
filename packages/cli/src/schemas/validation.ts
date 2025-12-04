import { z } from 'zod';

export const PriceInfoSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().length(3),
  originalText: z.string().min(1).max(200),
  includesTax: z.boolean().optional()
});

export const SpecificationValueSchema = z.object({
  value: z.union([z.string(), z.number(), z.boolean()]),
  unit: z.string().max(20).optional(),
  originalText: z.string().min(1).max(500)
});

export const ProductImageSchema = z.object({
  url: z.string().url(),
  alt: z.string().max(200).optional(),
  width: z.number().positive().int().optional(),
  height: z.number().positive().int().optional(),
  type: z.enum(['main', 'gallery', 'thumbnail', 'box'])
});

export const DataSourceInfoSchema = z.object({
  domain: z.string().min(1),
  section: z.string().min(1),
  pageType: z.enum(['listing', 'detail', 'variant']),
  version: z.string().optional()
});

export const ProductDataSchema = z.object({
  id: z.string().min(1).max(255),
  name: z.string().min(1).max(500),
  sku: z.string().min(1).max(100),
  price: PriceInfoSchema.optional(),
  description: z.string().max(2000).optional(),
  specifications: z.record(z.string(), SpecificationValueSchema),
  detectedLanguage: z.any(), // Will be validated separately
  source: DataSourceInfoSchema,
  url: z.string().url(),
  extractedAt: z.number().int().positive(),
  images: z.array(ProductImageSchema).min(0),
  categories: z.array(z.string().min(1).max(100)).min(0)
});

export const ExtractionMetadataSchema = z.object({
  method: z.enum(['cheerio', 'playwright', 'hybrid']),
  renderingType: z.enum(['static', 'dynamic', 'hybrid']),
  extractedAt: z.number().int().positive(),
  extractionDuration: z.number().int().min(0),
  requiresJavaScript: z.boolean()
});

export const QualityMetadataSchema = z.object({
  completeness: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  validationErrors: z.array(z.string()).max(10),
  lastValidated: z.number().int().positive()
});

// Full product data validation schema
export const CompleteProductDataSchema = z.object({
  ...ProductDataSchema.shape,
  extraction: ExtractionMetadataSchema,
  quality: QualityMetadataSchema
});

// Validation function
export function validateProductData(data: any): {
  isValid: boolean;
  errors: string[];
} {
  try {
    CompleteProductDataSchema.parse(data);
    return { isValid: true, errors: [] };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        errors: error.errors.map(err => `${err.path?.join('.') || 'field'}: ${err.message}`)
      };
    }
    return {
      isValid: false,
      errors: ['Validation failed']
    };
  }
}

// Batch validation function
export function validateProductDataBatch(dataArray: any[]): {
  valid: ProductData[];
  invalid: { data: any; errors: string[] }[];
} {
  const valid: ProductData[] = [];
  const invalid: { data: any; errors: string[] }[] = [];

  for (const data of dataArray) {
    const validation = validateProductData(data);
    if (validation.isValid) {
      valid.push(data);
    } else {
      invalid.push({ data, errors: validation.errors });
    }
  }

  return { valid, invalid };
}