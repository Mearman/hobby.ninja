/**
 * Export functionality exports for the Gundam scraper CLI
 */

export type {
  ExportOptions,
  ExportResult,
  ExportProgress,
  ProgressCallback,
  ExportFilters,
  ExporterConfig,
  TransformedData,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ImageInfo
} from './types.js';

export type {
  ExcelWorksheet,
  ExcelColumn,
  ExcelStyle,
  CSVOptions
} from './types.js';

export { DataTransformer } from './data-transformer.js';
export { ExportManager } from './export-manager.js';
export { BaseExporter } from './exporters/base-exporter.js';
export { JsonExporter } from './exporters/json-exporter.js';
export { CsvExporter } from './exporters/csv-exporter.js';
export { ExcelExporter } from './exporters/excel-exporter.js';

// Convenience exports
export const Export = {
  Manager: ExportManager,
  Transformer: DataTransformer,
  Json: JsonExporter,
  Csv: CsvExporter,
  Excel: ExcelExporter
};