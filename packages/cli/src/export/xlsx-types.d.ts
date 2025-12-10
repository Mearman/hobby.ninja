/**
 * Type declarations for xlsx library
 * These are minimal declarations to support Excel export functionality
 */

export interface WorkSheetCell {
  v?: string | number | boolean;
  t?: string;
  f?: string;
  w?: string;
  s?: XLSXStyle;
}

export interface XLSXStyle {
  Font?: {
    Bold?: boolean;
    Sz?: number;
    Color?: string;
  };
  Fill?: {
    PatternColor?: string;
    FgColor?: string | { rgb?: string };
    rgb?: string;
  };
  Alignment?: {
    Horizontal?: string;
    Vertical?: string;
  };
  font?: {
    bold?: boolean;
    color?: { rgb?: string };
  };
  fill?: {
    fgColor?: { rgb?: string } | string;
    rgb?: string;
  };
  alignment?: {
    vertical?: string;
    horizontal?: string;
  };
}

export interface WorkSheet {
  "!ref"?: string;
  "!cols"?: Array<{ wch?: number; hidden?: boolean; width?: number }>;
  "!rows"?: Array<{ hpt?: number; hidden?: boolean }>;
  "!merges"?: Array<{ s: { c: number; r: number }; e: { c: number; r: number } }>;
  "!autofilter"?: { ref: string };
  [key: string]: WorkSheetCell | undefined | string | Array<{ wch?: number; hidden?: boolean; width?: number }>;
}

export interface WorkBook {
  SheetNames: string[];
  Sheets: Record<string, WorkSheet>;
}

export interface XLSXUtils {
  book_new(): WorkBook;
  book_append_sheet(workbook: WorkBook, worksheet: WorkSheet, name: string): void;
  aoa_to_sheet(data: unknown[][]): WorkSheet;
  json_to_sheet(data: Array<Record<string, unknown>>, options?: { header?: string[] }): WorkSheet;
  sheet_add_aoa(worksheet: WorkSheet, data: unknown[][], options?: { origin?: number | string }): void;
  sheet_to_json(worksheet: WorkSheet, options?: { header?: number }): Array<Record<string, unknown>>;
  range_add(range: string, delta: number): string;
  encode_range(range: [number, number, number, number]): string;
  decode_range(range: string): { s: { r: number; c: number }; e: { r: number; c: number } };
  encode_col(col: number): string;
  encode_row(row: number): string;
  encode_cell(cell: { r: number; c: number }): string;
}

export interface XLSXLibrary {
  utils: XLSXUtils;
  write(workbook: WorkBook, filename: string, options?: { bookType?: string }): void;
  writeFile(workbook: WorkBook, filename: string, options?: { bookType?: string; compression?: boolean; type?: string }): void;
  read(data: ArrayBuffer | string, options?: { type?: string }): WorkBook;
}

// @ts-ignore - xlsx is an optional dependency
declare module "xlsx" {
  const xlsx: XLSXLibrary;
  export default xlsx;
  export = xlsx;
}