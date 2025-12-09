import { promises as fs } from 'fs';
import * as path from 'path';
import { validateProductDataBatch } from '../schemas/validation.js';
import type { ProductData } from '../types/product-data.js';
import { EXIT_CODES, DIRECTORIES, FILE_PATTERNS, PROGRESS_PERCENTAGES } from '../constants/cli-constants.js';

export interface ValidateCommandOptions {
  source?: string;
  fix?: boolean;
  output?: string;
  file?: string;
}

export interface ValidationResult {
  totalChecked: number;
  valid: number;
  invalid: number;
  fixed: number;
  errors: string[];
}

export class ValidateCommand {
  async execute(options: ValidateCommandOptions): Promise<void> {
    try {
      console.log('🔍 Starting data validation...');

      let result: ValidationResult;

      if (options.file) {
        result = await this.validateFile(options.file, !!options.fix);
      } else if (options.source) {
        result = await this.validateSourceOutput(options.source, !!options.fix);
      } else {
        console.log('Please specify either --file or --source to validate');
        process.exit(EXIT_CODES.INVALID_ARGS);
      }

      console.log('\n📊 Validation Results:');
      console.log(`Total checked: ${result.totalChecked}`);
      console.log(`Valid: ${result.valid}`);
      console.log(`Invalid: ${result.invalid}`);
      if (options.fix) {
        console.log(`Fixed: ${result.fixed}`);
      }

      if (result.errors.length > 0) {
        console.log('\n❌ Validation Errors:');
        result.errors.forEach(error => console.log(`  - ${error}`));
      }

      if (result.invalid === 0) {
        console.log('\n✅ All data is valid!');
        process.exit(EXIT_CODES.SUCCESS);
      } else {
        console.log('\n⚠️ Validation completed with errors');
        process.exit(EXIT_CODES.VALIDATION_ERROR);
      }
    } catch (error) {
      console.error('❌ Validation failed:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(EXIT_CODES.GENERAL_ERROR);
    }
  }

  private async validateFile(filePath: string, fix: boolean): Promise<ValidationResult> {
    console.log(`Validating file: ${filePath}`);

    try {
      const data = await fs.readFile(filePath, 'utf-8');
      let parsedData: unknown[];

      // Try to parse as JSON
      if (filePath.endsWith(FILE_PATTERNS.NDJSON_EXTENSION)) {
        // NDJSON format
        parsedData = data.split('\n')
          .filter(line => line.trim())
          .map(line => JSON.parse(line));
      } else {
        // Regular JSON format
        parsedData = JSON.parse(data);
        if (!Array.isArray(parsedData)) {
          parsedData = [parsedData];
        }
      }

      return this.validateData(parsedData, filePath, fix);
    } catch (error) {
      throw new Error(`Failed to read or parse file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async validateSourceOutput(source: string, fix: boolean): Promise<ValidationResult> {
    const outputDir = DIRECTORIES.OUTPUT;
    const sourcePattern = source === 'all' ? '' : source;

    // Find files in output directory
    try {
      const files = await fs.readdir(outputDir);
      const relevantFiles = files
        .filter(file => file.endsWith(FILE_PATTERNS.JSON_EXTENSION) || file.endsWith(FILE_PATTERNS.NDJSON_EXTENSION))
        .filter(file => sourcePattern === '' || file.includes(sourcePattern));

      if (relevantFiles.length === 0) {
        throw new Error(`No output files found for source: ${source}`);
      }

      console.log(`Found ${relevantFiles.length} files to validate`);

      let totalResult: ValidationResult = {
        totalChecked: 0,
        valid: 0,
        invalid: 0,
        fixed: 0,
        errors: []
      };

      for (const file of relevantFiles) {
        const filePath = path.join(outputDir, file);
        const fileResult = await this.validateFile(filePath, fix);

        totalResult.totalChecked += fileResult.totalChecked;
        totalResult.valid += fileResult.valid;
        totalResult.invalid += fileResult.invalid;
        totalResult.fixed += fileResult.fixed;
        totalResult.errors.push(...fileResult.errors.map(error => `${file}: ${error}`));
      }

      return totalResult;
    } catch (error) {
      throw new Error(`Failed to validate source output: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async validateData(data: unknown[], filePath: string, fix: boolean): Promise<ValidationResult> {
    const validationResult = validateProductDataBatch(data);
    let fixed = 0;

    if (fix && validationResult.invalid.length > 0) {
      console.log(`Attempting to fix ${validationResult.invalid.length} invalid entries...`);

      // Simple fixes that can be applied
      const fixedData = validationResult.invalid.map(item => {
        // Cast to object to allow property access
        const dataObj = item.data as Record<string, unknown>;
        const fixedItem: Record<string, unknown> = { ...dataObj };
        let wasFixed = false;

        // Fix missing required fields
        if (!fixedItem['name'] || fixedItem['name'] === '') {
          fixedItem['name'] = 'Unknown Product';
          wasFixed = true;
        }

        if (!fixedItem['sku'] || fixedItem['sku'] === '') {
          fixedItem['sku'] = 'unknown-sku';
          wasFixed = true;
        }

        // Fix type issues
        if (typeof fixedItem['price'] === 'string') {
          try {
            const price = parseFloat(String(fixedItem['price']).replace(/[^0-9.]/g, ''));
            if (!isNaN(price)) {
              fixedItem['price'] = {
                amount: price,
                currency: 'USD',
                originalText: String(fixedItem['price'])
              };
              wasFixed = true;
            }
          } catch (e) {
            delete fixedItem['price'];
            wasFixed = true;
          }
        }

        if (wasFixed) {
          fixed++;
        }

        return {
          data: fixedItem as unknown as ProductData,
          wasFixed
        };
      });

      if (fixed > 0) {
        // Save fixed data
        const validFixedData = fixedData.filter(item => item.wasFixed).map(item => item.data);
        const outputPath = filePath.replace(/\.(json|ndjson)$/, '-fixed.$1');

        if (filePath.endsWith(FILE_PATTERNS.NDJSON_EXTENSION)) {
          const ndjsonContent = validFixedData.map(item => JSON.stringify(item)).join('\n');
          await fs.writeFile(outputPath, ndjsonContent);
        } else {
          await fs.writeFile(outputPath, JSON.stringify(validFixedData, null, PROGRESS_PERCENTAGES.COMPLETE));
        }

        console.log(`Fixed data saved to: ${outputPath}`);
      }
    }

    return {
      totalChecked: data.length,
      valid: validationResult.valid.length,
      invalid: validationResult.invalid.length,
      fixed,
      errors: validationResult.invalid.map(item => item.errors.join(', '))
    };
  }
}