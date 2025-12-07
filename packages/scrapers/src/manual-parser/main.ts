/**
 * Main API for Bandai Manual Parser
 */

import { promises as fs } from 'node:fs';
import { SimpleHtmlParser } from './core/simple-html-parser';

const parser = new SimpleHtmlParser();

/**
 * Parse a single manual file - the primary use case
 */
export async function parseManual(htmlFilePath: string): Promise<any> {
  const content = await fs.readFile(htmlFilePath, 'utf-8');
  const result = await parser.parse(content);

  if (!result.success) {
    throw new Error(result.error || 'Failed to parse manual');
  }

  return result.data;
}

/**
 * Parse HTML content directly
 */
export async function parseHtmlContent(htmlContent: string): Promise<any> {
  const result = await parser.parse(htmlContent);

  if (!result.success) {
    throw new Error(result.error || 'Failed to parse HTML content');
  }

  return result.data;
}


// Export the core parser for advanced usage
export { SimpleHtmlParser } from './core/simple-html-parser';