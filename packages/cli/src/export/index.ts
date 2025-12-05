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
import { ExportManager as EM } from './export-manager.js';
import { DataTransformer as DT } from './data-transformer.js';
import { JsonExporter as JE } from './exporters/json-exporter.js';
import { CsvExporter as CE } from './exporters/csv-exporter.js';
import { ExcelExporter as EE } from './exporters/excel-exporter.js';

export const Export = {
  Manager: EM,
  Transformer: DT,
  Json: JE,
  Csv: CE,
  Excel: EE
};