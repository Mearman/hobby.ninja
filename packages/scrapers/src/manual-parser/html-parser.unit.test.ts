import { describe, it, expect, beforeEach } from 'vitest';
import { htmlParser } from './core';
import { ManualDocument } from '@workspace/types';
import { errors } from './core';

// Extract the HtmlParser class from the htmlParser module
const { HtmlParser } = htmlParser;
// Extract error classes from errors module
const { FileNotFoundError, ParseError } = errors;

// Mock PerformanceLogger with all required methods
const mockPerformanceLogger = {
  startTimer: (name: string) => ({ name, startTime: Date.now() }),
  endTimer: (name: string) => {},
  getMetrics: () => ({ htmlParseTime: 10, totalTime: 15 }),
  getCounter: (name: string) => Math.floor(Math.random() * 1000),
  logTotalTime: () => {}
};

// Mock logger with expected interface
const mockLogger = {
  error: (message: string, ...args: any[]) => console.error(message, ...args),
  warn: (message: string, ...args: any[]) => console.warn(message, ...args),
  info: (message: string, ...args: any[]) => console.info(message, ...args),
  debug: (message: string, ...args: any[]) => console.debug(message, ...args),
  child: (context: any) => ({
    ...mockLogger,
    ...context,
    performanceLogger: mockPerformanceLogger
  })
};

describe('HtmlParser', () => {
  let parser: any; // Using any for now since we have import issues

  beforeEach(() => {
    parser = new HtmlParser({ logger: mockLogger });
  });

  describe('Basic HTML Parsing', () => {
    it('should parse simple HTML structure with Japanese text', async () => {
      const html = `
        <!DOCTYPE html>
        <html lang="ja">
        <head>
          <meta charset="UTF-8">
          <title>RG 1/144 ウイングガンダムゼロ（EW版）</title>
          <meta name="product" content="RG 1/144 Wing Gundam Zero (EW)">
        </head>
        <body>
          <div class="manual-content">
            <h1>組立説明書</h1>
            <p>このガンダムは最高です。</p>
            <div class="warning">
              <p>注意：小さな部品があります</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const result = await parser.parse(html, 'test-manual.html');

      expect(result).toBeDefined();
      expect(result.metadata.title?.ja).toBe('RG 1/144 ウイングガンダムゼロ（EW版）');
      expect(result.metadata.product?.grade).toBe('RG');
      expect(result.metadata.product?.scale).toBe('1/144');
      expect(result.content.blocks).toHaveLength(2); // h1 and p
      expect(result.content.blocks[0].type).toBe('heading');
      expect(result.content.blocks[0].content?.ja).toBe('組立説明書');
    });

    it('should handle empty HTML gracefully', async () => {
      const html = '<!DOCTYPE html><html><head><title>Empty</title></head><body></body></html>';

      const result = await parser.parse(html, 'empty.html');

      expect(result).toBeDefined();
      expect(result.metadata.title?.ja).toBe('Empty');
      expect(result.content.blocks).toHaveLength(0);
    });

    it('should handle HTML without proper DOCTYPE', async () => {
      const html = `
        <html>
        <head><title>No Doctype</title></head>
        <body><p>Content</p></body>
        </html>
      `;

      const result = await parser.parse(html, 'no-doctype.html');

      expect(result).toBeDefined();
      expect(result.metadata.title?.ja).toBe('No Doctype');
    });
  });

  describe('Japanese Text Preservation', () => {
    it('should preserve hiragana, katakana, and kanji correctly', async () => {
      const html = `
        <html>
        <head><title>Japanese Test</title></head>
        <body>
          <p>ひらがな カタカナ 漢字</p>
          <p> RG ガンダム 1/144 </p>
        </body>
        </html>
      `;

      const result = await parser.parse(html, 'japanese-test.html');

      expect(result.content.blocks).toHaveLength(2);
      expect(result.content.blocks[0].content?.ja).toBe('ひらがな カタカナ 漢字');
      expect(result.content.blocks[1].content?.ja).toBe('RG ガンダム 1/144');
    });

    it('should handle mixed Japanese and English text', async () => {
      const html = `
        <html>
        <head><title>Mixed Language</title></head>
        <body>
          <h1>Assembly Manual / 組立説明書</h1>
          <p>This is Gundam / これはガンダムです</p>
        </body>
        </html>
      `;

      const result = await parser.parse(html, 'mixed-lang.html');

      expect(result.content.blocks[0].content?.ja).toBe('Assembly Manual / 組立説明書');
      expect(result.content.blocks[1].content?.ja).toBe('This is Gundam / これはガンダムです');
    });

    it('should normalize Japanese text to NFC form', async () => {
      // Using characters that have different normalization forms
      const html = `<html><body><p>ガンダム\u309a</p></body></html>`; //

      const result = await parser.parse(html, 'normalization-test.html');

      expect(result.content.blocks[0].content?.ja).toBe('ガンダムパ');
    });
  });

  describe('Content Structure Extraction', () => {
    it('should extract headings with correct levels', async () => {
      const html = `
        <html>
        <head><title>Heading Test</title></head>
        <body>
          <h1>Main Title</h1>
          <h2>Section 1</h2>
          <h3>Subsection 1.1</h3>
          <h2>Section 2</h2>
        </body>
        </html>
      `;

      const result = await parser.parse(html, 'headings.html');

      expect(result.content.blocks).toHaveLength(4);
      expect(result.content.blocks[0].type).toBe('heading');
      expect(result.content.blocks[0].level).toBe(1);
      expect(result.content.blocks[1].type).toBe('heading');
      expect(result.content.blocks[1].level).toBe(2);
      expect(result.content.blocks[2].type).toBe('heading');
      expect(result.content.blocks[2].level).toBe(3);
    });

    it('should identify warning and safety sections', async () => {
      const html = `
        <html>
        <head><title>Safety</title></head>
        <body>
          <div class="warning">
            <h2>安全上的注意</h2>
            <p>危険な内容</p>
          </div>
          <div class="caution">
            <p>注意事項</p>
          </div>
        </body>
        </html>
      `;

      const result = await parser.parse(html, 'safety.html');

      const warningBlock = result.content.blocks.find(b => b.type === 'warning');
      const cautionBlock = result.content.blocks.find(b => b.type === 'caution');

      expect(warningBlock).toBeDefined();
      expect(cautionBlock).toBeDefined();
      expect(warningBlock?.subtype).toBe('safety');
    });

    it('should extract list structures correctly', async () => {
      const html = `
        <html>
        <head><title>Lists</title></head>
        <body>
          <ul>
            <li>Item 1</li>
            <li>Item 2</li>
            <li>Item 3</li>
          </ul>
          <ol>
            <li>First</li>
            <li>Second</li>
          </ol>
        </body>
        </html>
      `;

      const result = await parser.parse(html, 'lists.html');

      const unorderedList = result.content.blocks.find(b => b.type === 'list' && b.listType === 'unordered');
      const orderedList = result.content.blocks.find(b => b.type === 'list' && b.listType === 'ordered');

      expect(unorderedList).toBeDefined();
      expect(orderedList).toBeDefined();
      expect(unorderedList?.items).toHaveLength(3);
      expect(orderedList?.items).toHaveLength(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed HTML gracefully', async () => {
      const malformedHtml = `
        <html>
        <head><title>Malformed</title></head>
        <body>
          <div>Unclosed div
          <p>Missing closing tags
          <h1>Broken structure
        </body>
      `;

      // Should not throw an error, but should log a warning
      const result = await parser.parse(malformedHtml, 'malformed.html');

      expect(result).toBeDefined();
      expect(result.metadata.title?.ja).toBe('Malformed');
      // Parse5 should fix the structure automatically
    });

    it('should handle null/undefined input', async () => {
      await expect(parser.parse(null as any, 'null.html')).rejects.toThrow(ParseError);
      await expect(parser.parse(undefined as any, 'undefined.html')).rejects.toThrow(ParseError);
    });

    it('should handle non-string input', async () => {
      await expect(parser.parse(123 as any, 'number.html')).rejects.toThrow(ParseError);
      await expect(parser.parse({} as any, 'object.html')).rejects.toThrow(ParseError);
    });

    it('should handle encoding issues', async () => {
      // Create HTML with problematic encoding
      const html = Buffer.from('invalid encoding', 'utf16le').toString('utf8');

      // Should handle gracefully and not crash
      const result = await parser.parse(html, 'encoding-test.html');
      expect(result).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should handle large HTML files efficiently', async () => {
      // Generate large HTML content
      let html = '<!DOCTYPE html><html><head><title>Large File</title></head><body>';
      for (let i = 0; i < 1000; i++) {
        html += `<p>Paragraph ${i}: 大量のテキストコンテンツ ${i}</p>`;
      }
      html += '</body></html>';

      const startTime = Date.now();
      const result = await parser.parse(html, 'large-file.html');
      const endTime = Date.now();

      expect(result).toBeDefined();
      expect(result.content.blocks).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should track parsing performance metrics', async () => {
      const html = '<html><head><title>Performance Test</title></head><body><p>Test content</p></body></html>';

      const result = await parser.parse(html, 'perf-test.html');

      expect(result.metadata.processingTime).toBeDefined();
      expect(result.metadata.processingTime?.htmlParseTime).toBeGreaterThan(0);
      expect(result.metadata.processingTime?.totalTime).toBeGreaterThan(0);
    });
  });

  describe('Metadata Extraction', () => {
    it('should extract product information from meta tags', async () => {
      const html = `
        <html>
        <head>
          <title>MG 1/100 フリーダムガンダム</title>
          <meta name="product-grade" content="MG">
          <meta name="product-scale" content="1/100">
          <meta name="product-series" content="SEED">
          <meta name="manual-id" content="12345">
          <meta name="release-date" content="2023-01-01">
        </head>
        <body><p>Content</p></body>
        </html>
      `;

      const result = await parser.parse(html, 'metadata-test.html');

      expect(result.metadata.product?.grade).toBe('MG');
      expect(result.metadata.product?.scale).toBe('1/100');
      expect(result.metadata.product?.series).toBe('SEED');
      expect(result.metadata.manualId).toBe('12345');
      expect(result.metadata.releaseDate).toBe('2023-01-01');
    });

    it('should extract language information', async () => {
      const html = `
        <html lang="ja">
        <head><title>Language Test</title></head>
        <body><p>Content</p></body>
        </html>
      `;

      const result = await parser.parse(html, 'lang-test.html');

      expect(result.metadata.language).toBe('ja');
    });

    it('should handle missing metadata gracefully', async () => {
      const html = '<html><head><title>Minimal</title></head><body><p>Content</p></body></html>';

      const result = await parser.parse(html, 'minimal.html');

      expect(result.metadata.title?.ja).toBe('Minimal');
      expect(result.metadata.product).toBeUndefined();
      expect(result.metadata.manualId).toBeUndefined();
    });
  });
});