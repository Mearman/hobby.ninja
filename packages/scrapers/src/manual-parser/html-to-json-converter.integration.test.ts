import { describe, it, expect, beforeEach } from 'vitest';
import { htmlParser, schema } from './core';

// Extract the HtmlParser class from the htmlParser module
const { HtmlParser } = htmlParser;

// Mock logger and performance logger
const mockLogger = {
  error: () => {},
  warn: () => {},
  info: () => {},
  debug: () => {},
  child: () => mockLogger
};

const mockPerformanceLogger = {
  startTimer: () => ({ name: 'test', startTime: Date.now() }),
  endTimer: () => {},
  getMetrics: () => ({ htmlParseTime: 50, totalTime: 100 }),
  getCounter: () => 1,
  logTotalTime: () => {}
};

describe('HTML to JSON Converter Integration', () => {
  let parser: any;

  beforeEach(() => {
    parser = new HtmlParser({ logger: mockLogger });
  });

  describe('Complete HTML to JSON Conversion', () => {
    it('should convert simple Gundam manual HTML to structured JSON', async () => {
      const html = `
        <!DOCTYPE html>
        <html lang="ja">
        <head>
          <meta charset="UTF-8">
          <title>MG 1/100 ストライクフリーダムガンダム</title>
          <meta name="product-grade" content="MG">
          <meta name="product-scale" content="1/100">
          <meta name="product-series" content="SEED">
          <meta name="manual-id" content="MG-042">
        </head>
        <body>
          <div class="manual-content">
            <h1>組立説明書</h1>
            <p>ストライクフリーダムガンダムの組み立て説明書です。</p>

            <h2>注意事項</h2>
            <div class="warning">
              <p>鋭利な部分がありますので注意してください。</p>
            </div>

            <h2>部品一覧</h2>
            <ul>
              <li>Aパーツ：フレーム</li>
              <li>Bパーツ：アーマー</li>
              <li>Cパーツ：ウェポン</li>
            </ul>

            <h3>組み立て手順</h3>
            <ol>
              <li>フレームを組み立てる</li>
              <li>アーマーを取り付ける</li>
              <li>ウェポンを装備する</li>
            </ol>
          </div>
        </body>
        </html>
      `;

      // Mock the PerformanceLogger instance creation
      parser.createParseContext = () => ({
        filePath: 'test-manual.html',
        startTime: Date.now(),
        performanceLogger: mockPerformanceLogger,
        warnings: [],
        metadata: {}
      });

      const result = await parser.parse(html, 'mg-strike-freedom.html');

      // Verify the result structure
      expect(result).toBeDefined();
      expect(result.metadata.title?.ja).toBe('MG 1/100 ストライクフリーダムガンダム');
      expect(result.metadata.language).toBe('ja');
      expect(result.metadata.product?.grade).toBe('MG');
      expect(result.metadata.product?.scale).toBe('1/100');
      expect(result.metadata.product?.series).toBe('SEED');
      expect(result.metadata.manualId).toBe('MG-042');

      // Verify content blocks
      expect(result.content.blocks).toHaveLength(6);

      // Check heading blocks
      const mainHeading = result.content.blocks.find(b => b.type === 'heading' && b.level === 1);
      expect(mainHeading?.content?.ja).toBe('組立説明書');

      const sectionHeading = result.content.blocks.find(b => b.type === 'heading' && b.level === 2);
      expect(sectionHeading?.content?.ja).toBe('注意事項');

      // Check paragraph block
      const paragraph = result.content.blocks.find(b => b.type === 'paragraph');
      expect(paragraph?.content?.ja).toBe('ストライクフリーダムガンダムの組み立て説明書です。');

      // Check warning block
      const warning = result.content.blocks.find(b => b.type === 'warning');
      expect(warning?.content?.ja).toBe('鋭利な部分がありますので注意してください。');

      // Check list blocks
      const unorderedList = result.content.blocks.find(b => b.type === 'list' && b.listType === 'unordered');
      expect(unorderedList?.items).toHaveLength(3);
      expect(unorderedList?.items[0]).toBe('Aパーツ：フレーム');

      const orderedList = result.content.blocks.find(b => b.type === 'list' && b.listType === 'ordered');
      expect(orderedList?.items).toHaveLength(3);
      expect(orderedList?.items[0]).toBe('フレームを組み立てる');

      // Validate against schema
      const validationResult = schema.Schemas.ManualDocument.safeParse(result);
      expect(validationResult.success).toBe(true);
    });

    it('should handle complex manual with mixed content types', async () => {
      const html = `
        <!DOCTYPE html>
        <html lang="ja">
        <head>
          <meta charset="UTF-8">
          <title>RG 1/144 ウイングガンダムゼロカスタム</title>
        </head>
        <body>
          <div class="manual">
            <h1>Wing Gundam Zero Custom Assembly Manual</h1>

            <h2>安全に関する注意 Safety Precautions</h2>
            <div class="caution">
              <p>Please handle with care / 取り扱いには注意してください</p>
            </div>

            <h2>部品説明 Parts Description</h2>
            <p>バスターライフル / Buster Rifle</p>
            <p>ウイング / Wings</p>

            <h3>特殊装備 Special Equipment</h3>
            <ul>
              <li>ツインバスターライフル Twin Buster Rifle</li>
              <li>ウイングバインダー Wing Binders</li>
              <li>シールド Shield</li>
            </ul>

            <div class="technical-specs">
              <h2>仕様 Specifications</h2>
              <p>全高: 17.1m / Total Height: 17.1m</p>
              <p>重量: 8.0t / Weight: 8.0t</p>
            </div>
          </div>
        </body>
        </html>
      `;

      parser.createParseContext = () => ({
        filePath: 'rg-wing-zero.html',
        startTime: Date.now(),
        performanceLogger: mockPerformanceLogger,
        warnings: [],
        metadata: {}
      });

      const result = await parser.parse(html, 'rg-wing-zero.html');

      // Verify bilingual content handling
      expect(result.metadata.title?.ja).toBe('RG 1/144 ウイングガンダムゼロカスタム');

      // Check for mixed language content
      const headingWithMixed = result.content.blocks.find(b =>
        b.type === 'heading' && b.content?.ja?.includes('Safety')
      );
      expect(headingWithMixed?.content?.ja).toContain('安全に関する注意 Safety Precautions');

      // Check for bilingual paragraphs
      const bilingualParagraph = result.content.blocks.find(b =>
        b.type === 'paragraph' && b.content?.ja?.includes('Please')
      );
      expect(bilingualParagraph?.content?.ja).toContain('Please handle with care / 取り扱いには注意してください');

      // Check Japanese text preservation
      const partsParagraph = result.content.blocks.find(b =>
        b.type === 'paragraph' && b.content?.ja?.includes('バスターライフル')
      );
      expect(partsParagraph?.content?.ja).toBe('バスターライフル / Buster Rifle');

      // Validate the structure
      const validationResult = schema.Schemas.ManualDocument.safeParse(result);
      expect(validationResult.success).toBe(true);
    });

    it('should extract metadata from various meta tag formats', async () => {
      const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>PG 1/60 Unleashed Gundam</title>
          <meta name="description" content="Perfect Grade manual">
          <meta property="product:grade" content="PG">
          <meta property="product:scale" content="1/60">
          <meta name="series" content="Unleashed">
          <meta content="PG-001" name="manual-id">
          <meta content="2024-03-01" name="release-date">
        </head>
        <body>
          <div class="content">
            <h1>Assembly Instructions</h1>
          </div>
        </body>
        </html>
      `;

      parser.createParseContext = () => ({
        filePath: 'pg-unleashed.html',
        startTime: Date.now(),
        performanceLogger: mockPerformanceLogger,
        warnings: [],
        metadata: {}
      });

      const result = await parser.parse(html, 'pg-unleashed.html');

      expect(result.metadata.title?.ja).toBe('PG 1/60 Unleashed Gundam');
      expect(result.metadata.language).toBe('en');
      expect(result.metadata.product?.grade).toBe('PG');
      expect(result.metadata.product?.scale).toBe('1/60');
      expect(result.metadata.manualId).toBe('PG-001');
      expect(result.metadata.releaseDate).toBe('2024-03-01');
    });

    it('should handle malformed HTML gracefully and produce valid JSON', async () => {
      const malformedHtml = `
        <html>
        <head><title>Broken Manual</title></head>
        <body>
          <div>Unclosed div
          <h1>Missing closing tags
          <p>No proper structure
          <ul>
            <li>Item 1
            <li>Item 2
          </body>
        `;

      parser.createParseContext = () => ({
        filePath: 'broken-manual.html',
        startTime: Date.now(),
        performanceLogger: mockPerformanceLogger,
        warnings: [],
        metadata: {}
      });

      // Should not throw an error
      const result = await parser.parse(malformedHtml, 'broken-manual.html');

      expect(result).toBeDefined();
      expect(result.metadata.title?.ja).toBe('Broken Manual');

      // parse5 should fix the structure automatically
      const validationResult = schema.Schemas.ManualDocument.safeParse(result);
      expect(validationResult.success).toBe(true);

      // Should have some warnings about parsing issues
      expect(result.metadata.warnings?.length).toBeGreaterThan(0);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large HTML documents efficiently', async () => {
      // Generate a large HTML document
      let html = `
        <!DOCTYPE html>
        <html lang="ja">
        <head>
          <meta charset="UTF-8">
          <title>Large Manual Test</title>
        </head>
        <body>
          <div class="manual-content">
            <h1>大型マニュアル</h1>
      `;

      // Add many content blocks
      for (let i = 0; i < 100; i++) {
        html += `<h2>セクション ${i + 1}</h2>`;
        html += `<p>これはセクション ${i + 1} の説明文です。大量のコンテンツを処理するテストです。</p>`;
        html += '<ul>';
        for (let j = 0; j < 10; j++) {
          html += `<li>項目 ${i + 1}-${j + 1}</li>`;
        }
        html += '</ul>';
      }

      html += '</div></body></html>';

      parser.createParseContext = () => ({
        filePath: 'large-manual.html',
        startTime: Date.now(),
        performanceLogger: mockPerformanceLogger,
        warnings: [],
        metadata: {}
      });

      const startTime = Date.now();
      const result = await parser.parse(html, 'large-manual.html');
      const endTime = Date.now();

      expect(result).toBeDefined();
      expect(result.content.blocks.length).toBeGreaterThan(300); // 1 heading + 1 paragraph + 1 list per section
      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds

      // Validate the large document
      const validationResult = schema.Schemas.ManualDocument.safeParse(result);
      expect(validationResult.success).toBe(true);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty HTML body gracefully', async () => {
      const html = `
        <!DOCTYPE html>
        <html lang="ja">
        <head>
          <meta charset="UTF-8">
          <title>Empty Manual</title>
        </head>
        <body>
        </body>
        </html>
      `;

      parser.createParseContext = () => ({
        filePath: 'empty-manual.html',
        startTime: Date.now(),
        performanceLogger: mockPerformanceLogger,
        warnings: [],
        metadata: {}
      });

      const result = await parser.parse(html, 'empty-manual.html');

      expect(result.metadata.title?.ja).toBe('Empty Manual');
      expect(result.content.blocks).toHaveLength(0);

      const validationResult = schema.Schemas.ManualDocument.safeParse(result);
      expect(validationResult.success).toBe(true);
    });

    it('should handle HTML with script and style tags correctly', async () => {
      const html = `
        <!DOCTYPE html>
        <html lang="ja">
        <head>
          <meta charset="UTF-8">
          <title>Manual with Scripts</title>
          <script>
            console.log('This should be ignored');
          </script>
          <style>
            .ignored { color: red; }
          </style>
        </head>
        <body>
          <h1>重要な内容</h1>
          <p>この内容のみを抽出します。</p>
          <script>
            // This script should be ignored
            var x = 1;
          </script>
        </body>
        </html>
      `;

      parser.createParseContext = () => ({
        filePath: 'script-manual.html',
        startTime: Date.now(),
        performanceLogger: mockPerformanceLogger,
        warnings: [],
        metadata: {}
      });

      const result = await parser.parse(html, 'script-manual.html');

      // Should only extract meaningful content, ignore scripts/styles
      const contentTexts = result.content.blocks
        .filter(b => b.content?.ja)
        .map(b => b.content?.ja);

      expect(contentTexts).toContain('重要な内容');
      expect(contentTexts).toContain('この内容のみを抽出します。');

      // Should not contain script content
      const hasScriptContent = contentTexts.some(text =>
        text.includes('console.log') || text.includes('var x = 1')
      );
      expect(hasScriptContent).toBe(false);

      const validationResult = schema.Schemas.ManualDocument.safeParse(result);
      expect(validationResult.success).toBe(true);
    });
  });
});