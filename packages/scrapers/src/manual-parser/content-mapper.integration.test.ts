import { describe, it, expect, beforeEach } from 'vitest';
import { parse } from 'parse5';
import { ContentMapper, ContentMappingConfig } from './core/content-mapper';
import { ManualDocument } from '@workspace/types';

describe('Content Mapper Integration', () => {
  let mapper: ContentMapper;

  beforeEach(() => {
    mapper = new ContentMapper();
  });

  describe('Complete Document Mapping', () => {
    it('should map complete Gundam manual HTML to ManualDocument', () => {
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
          <meta name="release-date" content="2004-03-01">
          <meta name="version" content="2.0">
        </head>
        <body>
          <div class="manual-content">
            <h1>組立説明書</h1>
            <p>ストライクフリーダムガンダムの組み立て説明書です。</p>

            <h2>安全に関する注意事項</h2>
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

            <h2>仕様</h2>
            <table>
              <thead>
                <tr><th>項目</th><th>数値</th></tr>
              </thead>
              <tbody>
                <tr><td>全高</td><td>18.3m</td></tr>
                <tr><td>重量</td><td>80.09t</td></tr>
              </tbody>
            </table>

            <h2>完成例</h2>
            <div class="diagram">
              <img src="completed.jpg" alt="完成例" title="ストライクフリーダムガンダム完成例">
              <p>図1：完成状態</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const document = parse(html);
      const context = {
        filePath: 'mg-strike-freedom.html',
        startTime: Date.now(),
        blockCounter: 0,
        imageCounter: 0,
        warnings: [],
        errors: [],
        metadata: { fileSize: 1024, checksum: 'abc123' }
      };

      const result = mapper.mapDocument(document, context);

      // Verify document structure
      expect(result).toBeDefined();
      expect(result.id).toBe('MG-042');
      expect(result.metadata.title?.ja).toBe('MG 1/100 ストライクフリーダムガンダム');
      expect(result.metadata.language).toBe('ja');
      expect(result.metadata.product?.grade).toBe('MG');
      expect(result.metadata.product?.scale).toBe('1/100');
      expect(result.metadata.product?.series).toBe('SEED');
      expect(result.metadata.manualId).toBe('MG-042');
      expect(result.metadata.releaseDate).toBe('2004-03-01');
      expect(result.metadata.version).toBe('2.0');

      // Verify content blocks
      expect(result.content.blocks).toHaveLength(9); // h1, p, h2, warning, h2, ul, h3, ol, h2, table, h2, div

      // Check heading blocks
      const mainHeading = result.content.blocks.find(b => b.type === 'heading' && b.level === 1);
      expect(mainHeading?.content?.ja).toBe('組立説明書');

      const safetyHeading = result.content.blocks.find(b =>
        b.type === 'heading' && b.level === 2 && b.content?.ja?.includes('安全')
      );
      expect(safetyHeading).toBeDefined();

      // Check paragraph block
      const introParagraph = result.content.blocks.find(b => b.type === 'paragraph');
      expect(introParagraph?.content?.ja).toBe('ストライクフリーダムガンダムの組み立て説明書です。');

      // Check warning block
      const warningBlock = result.content.blocks.find(b => b.type === 'warning');
      expect(warningBlock?.content?.ja).toBe('鋭利な部分がありますので注意してください。');

      // Check list blocks
      const unorderedList = result.content.blocks.find(b => b.type === 'list' && b.listType === 'unordered');
      expect(unorderedList?.items).toHaveLength(3);
      expect(unorderedList?.items[0]).toBe('Aパーツ：フレーム');

      const orderedList = result.content.blocks.find(b => b.type === 'list' && b.listType === 'ordered');
      expect(orderedList?.items).toHaveLength(3);
      expect(orderedList?.items[0]).toBe('フレームを組み立てる');

      // Check table block
      const tableBlock = result.content.blocks.find(b => b.type === 'table');
      expect(tableBlock?.headers).toEqual([['項目', '数値']]);
      expect(tableBlock?.rows).toEqual([['全高', '18.3m'], ['重量', '80.09t']]);

      // Verify assets
      expect(result.assets.images).toHaveLength(1);
      expect(result.assets.images[0].src).toBe('completed.jpg');
      expect(result.assets.images[0].alt).toBe('完成例');
      expect(result.assets.images[0].title).toBe('ストライクフリーダムガンダム完成例');

      // Verify structure
      expect(result.structure.outline).toHaveLength(5); // h1, h2 (safety), h2 (parts), h3, h2 (spec)
      expect(result.structure.navigation).toHaveLength(5);
    });

    it('should handle documents with minimal metadata', () => {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Simple Manual</title>
        </head>
        <body>
          <h1>基本マニュアル</h1>
          <p>基本的な説明です。</p>
        </body>
        </html>
      `;

      const document = parse(html);
      const context = {
        filePath: 'simple-manual.html',
        startTime: Date.now(),
        blockCounter: 0,
        imageCounter: 0,
        warnings: [],
        errors: [],
        metadata: {}
      };

      const result = mapper.mapDocument(document, context);

      expect(result.id).toBe('simple-manual');
      expect(result.metadata.title?.ja).toBe('Simple Manual');
      expect(result.metadata.language).toBe('ja'); // Default
      expect(result.metadata.version).toBe('1.0'); // Default
      expect(result.content.blocks).toHaveLength(2);
    });

    it('should handle bilingual content properly', () => {
      const html = `
        <!DOCTYPE html>
        <html lang="ja">
        <head><title>Bilingual Manual</title></head>
        <body>
          <h1>Safety Precautions / 安全に関する注意</h1>
          <p>Please handle with care / 取り扱いには注意してください</p>
          <h2>Parts List / 部品一覧</h2>
          <p>Frame / フレーム</p>
          <p>Armor / アーマー</p>
        </body>
        </html>
      `;

      const document = parse(html);
      const context = {
        filePath: 'bilingual-manual.html',
        startTime: Date.now(),
        blockCounter: 0,
        imageCounter: 0,
        warnings: [],
        errors: [],
        metadata: {}
      };

      const result = mapper.mapDocument(document, context);

      // Should preserve bilingual content
      const heading = result.content.blocks.find(b => b.type === 'heading');
      expect(heading?.content?.ja).toContain('Safety Precautions / 安全に関する注意');

      const paragraph = result.content.blocks.find(b => b.type === 'paragraph');
      expect(paragraph?.content?.ja).toContain('Please handle with care / 取り扱いには注意してください');

      // Should detect Japanese content presence
      expect(result.metadata.title?.ja).toBe('Bilingual Manual');
    });
  });

  describe('Content Block Mapping', () => {
    it('should map different content block types correctly', () => {
      const html = `
        <html><head><title>Block Types</title></head>
        <body>
          <h1>Main Heading</h1>
          <p>This is a paragraph.</p>
          <div class="warning">Warning content</div>
          <div class="note">Note content</div>
          <div class="tip">Tip content</div>
          <blockquote>Quote content</blockquote>
          <pre>Code content</pre>
          <table><tr><td>Table content</td></tr></table>
          <ul><li>Item 1</li></ul>
          <ol><li>Step 1</li></ol>
        </body></html>
      `;

      const document = parse(html);
      const context = {
        filePath: 'block-types.html',
        startTime: Date.now(),
        blockCounter: 0,
        imageCounter: 0,
        warnings: [],
        errors: [],
        metadata: {}
      };

      const result = mapper.mapDocument(document, context);

      // Should identify all block types
      const blockTypes = result.content.blocks.map(b => b.type);
      expect(blockTypes).toContain('heading');
      expect(blockTypes).toContain('paragraph');
      expect(blockTypes).toContain('warning');
      expect(blockTypes).toContain('note');
      expect(blockTypes).toContain('tip');
      expect(blockTypes).toContain('quote');
      expect(blockTypes).toContain('code');
      expect(blockTypes).toContain('table');
      expect(blockTypes).toContain('list');

      // Check specific block properties
      const warningBlock = result.content.blocks.find(b => b.type === 'warning');
      expect(warningBlock?.content?.ja).toBe('Warning content');

      const listBlocks = result.content.blocks.filter(b => b.type === 'list');
      expect(listBlocks).toHaveLength(2);
      expect(listBlocks.some(b => b.listType === 'unordered')).toBe(true);
      expect(listBlocks.some(b => b.listType === 'ordered')).toBe(true);
    });

    it('should handle nested content structures', () => {
      const html = `
        <html><head><title>Nested Content</title></head>
        <body>
          <h1>Chapter 1</h1>
          <div>
            <h2>Section 1.1</h2>
            <p>Content in section 1.1</p>
            <div>
              <h3>Subsection 1.1.1</h3>
              <p>Nested content</p>
            </div>
          </div>
          <h2>Section 1.2</h2>
          <p>Content in section 1.2</p>
        </body></html>
      `;

      const document = parse(html);
      const context = {
        filePath: 'nested-content.html',
        startTime: Date.now(),
        blockCounter: 0,
        imageCounter: 0,
        warnings: [],
        errors: [],
        metadata: {}
      };

      const result = mapper.mapDocument(document, context);

      // Should maintain hierarchical structure
      expect(result.structure.outline).toHaveLength(3); // h1, h2, h2
      expect(result.content.blocks.length).toBeGreaterThan(5); // Multiple content blocks

      // Check heading levels
      const headings = result.content.blocks.filter(b => b.type === 'heading');
      expect(headings.some(h => h.level === 1)).toBe(true);
      expect(headings.some(h => h.level === 2)).toBe(true);
      expect(headings.some(h => h.level === 3)).toBe(true);
    });
  });

  describe('Asset Mapping', () => {
    it('should map images with metadata', () => {
      const html = `
        <html><head><title>Images</title></head>
        <body>
          <h1>Image Examples</h1>
          <img src="gundam.jpg" alt="ガンダム" title="主役機">
          <img src="parts.png">
          <div class="diagram">
            <img src="step1.jpg" alt="ステップ1">
            <p>図1：組み立て手順</p>
          </div>
          <img src="step2.jpg" alt="ステップ2">
          <p>図2：次のステップ</p>
        </body></html>
      `;

      const document = parse(html);
      const context = {
        filePath: 'images.html',
        startTime: Date.now(),
        blockCounter: 0,
        imageCounter: 0,
        warnings: [],
        errors: [],
        metadata: {}
      };

      const result = mapper.mapDocument(document, context);

      expect(result.assets.images).toHaveLength(4);

      // Check image properties
      const mainImage = result.assets.images.find(img => img.src === 'gundam.jpg');
      expect(mainImage?.alt).toBe('ガンダム');
      expect(mainImage?.title).toBe('主役機');

      const imageWithoutAlt = result.assets.images.find(img => img.src === 'parts.png');
      expect(imageWithoutAlt?.alt).toBeUndefined();

      // Check image with caption
      const imageWithCaption = result.assets.images.find(img => img.src === 'step1.jpg');
      expect(imageWithCaption?.alt).toBe('ステップ1');
      expect(imageWithCaption?.caption?.ja).toBe('図1：組み立て手順');
    });

    it('should map tables as diagrams', () => {
      const html = `
        <html><head><title>Tables</title></head>
        <body>
          <h1>Specification Table</h1>
          <table>
            <caption>基本仕様</caption>
            <thead>
              <tr><th>項目</th><th>スペック</th></tr>
            </thead>
            <tbody>
              <tr><td>型式番号</td><td>ZGMF-X20A</td></tr>
              <tr><td>全高</td><td>18.3m</td></tr>
            </tbody>
          </table>
        </body></html>
      `;

      const document = parse(html);
      const context = {
        filePath: 'tables.html',
        startTime: Date.now(),
        blockCounter: 0,
        imageCounter: 0,
        warnings: [],
        errors: [],
        metadata: {}
      };

      const result = mapper.mapDocument(document, context);

      // Should have both table block and diagram asset
      const tableBlock = result.content.blocks.find(b => b.type === 'table');
      expect(tableBlock).toBeDefined();
      expect(tableBlock?.caption).toBe('基本仕様');
      expect(tableBlock?.headers).toEqual([['項目', 'スペック']]);
      expect(tableBlock?.rows).toEqual([['型式番号', 'ZGMF-X20A'], ['全高', '18.3m']]);

      // Should create diagram asset for the table
      expect(result.assets.diagrams).toHaveLength(1);
      const diagram = result.assets.diagrams[0];
      expect(diagram.description?.ja).toBe('基本仕様');
    });
  });

  describe('Structure Validation Integration', () => {
    it('should collect validation errors and warnings', () => {
      const html = `
        <title>Invalid Document</title>
        <p>Missing html, head, body</p>
        <h3>Invalid heading level (skipped h1, h2)</h3>
      `;

      const document = parse(html);
      const context = {
        filePath: 'invalid.html',
        startTime: Date.now(),
        blockCounter: 0,
        imageCounter: 0,
        warnings: [],
        errors: [],
        metadata: {}
      };

      const result = mapper.mapDocument(document, context);

      // Should have collected validation warnings
      expect(result.metadata.warnings?.length).toBeGreaterThan(0);
      expect(result.metadata.warnings?.some(w => w.includes('structure-weakness'))).toBe(true);
    });

    it('should skip validation when disabled', () => {
      const config: ContentMappingConfig = {
        validateStructure: false
      };
      const noValidationMapper = new ContentMapper(config);

      const html = `
        <title>No Validation</title>
        <p>This would normally generate warnings</p>
      `;

      const document = parse(html);
      const context = {
        filePath: 'no-validation.html',
        startTime: Date.now(),
        blockCounter: 0,
        imageCounter: 0,
        warnings: [],
        errors: [],
        metadata: {}
      };

      const result = noValidationMapper.mapDocument(document, context);

      // Should not have validation warnings when disabled
      expect(result.metadata.warnings?.length ?? 0).toBe(0);
    });
  });

  describe('Configuration Options', () => {
    it('should use custom extraction strategy', () => {
      const config: ContentMappingConfig = {
        extractionStrategy: 'conservative' as any
      };
      const conservativeMapper = new ContentMapper(config);

      const html = `
        <html><head><title>Conservative</title></head>
        <body>
          <h1>Title</h1>
          <p>Meaningful content in Japanese: 日本語の意味のある内容</p>
          <p>English only content that should be filtered</p>
        </body></html>
      `;

      const document = parse(html);
      const context = {
        filePath: 'conservative.html',
        startTime: Date.now(),
        blockCounter: 0,
        imageCounter: 0,
        warnings: [],
        errors: [],
        metadata: {}
      };

      const result = conservativeMapper.mapDocument(document, context);

      // Conservative strategy should prioritize Japanese content
      expect(result.content.blocks.length).toBeGreaterThan(0);
      const japaneseBlock = result.content.blocks.find(b =>
        b.content?.ja?.includes('日本語')
      );
      expect(japaneseBlock).toBeDefined();
    });

    it('should handle custom ID generation', () => {
      const config: ContentMappingConfig = {
        generateIds: false
      };
      const noIdMapper = new ContentMapper(config);

      const html = `
        <html><head><title>No ID Generation</title></head>
        <body>
          <h1>Title</h1>
          <p>Content</p>
        </body></html>
      `;

      const document = parse(html);
      const context = {
        filePath: 'no-ids.html',
        startTime: Date.now(),
        blockCounter: 5, // Start with higher number
        imageCounter: 10,
        warnings: [],
        errors: [],
        metadata: {}
      };

      const result = noIdMapper.mapDocument(document, context);

      // Should use predictable IDs without incrementing
      expect(result.content.blocks[0].id).toBe('heading-5');
      expect(result.content.blocks[1].id).toBe('paragraph-6');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty documents gracefully', () => {
      const html = '<!DOCTYPE html><html><head><title>Empty</title></head><body></body></html>';

      const document = parse(html);
      const context = {
        filePath: 'empty.html',
        startTime: Date.now(),
        blockCounter: 0,
        imageCounter: 0,
        warnings: [],
        errors: [],
        metadata: {}
      };

      const result = mapper.mapDocument(document, context);

      expect(result).toBeDefined();
      expect(result.content.blocks).toHaveLength(0);
      expect(result.assets.images).toHaveLength(0);
      expect(result.assets.diagrams).toHaveLength(0);
    });

    it('should handle malformed HTML', () => {
      const html = `
        <html>
        <head><title>Malformed</title></head>
        <body>
          <div>Unclosed div
          <h1>Missing closing tags
          <p>No proper structure
          <ul>
            <li>Item 1
            <li>Item 2
        </body>
      `;

      const document = parse(html);
      const context = {
        filePath: 'malformed.html',
        startTime: Date.now(),
        blockCounter: 0,
        imageCounter: 0,
        warnings: [],
        errors: [],
        metadata: {}
      };

      // Should not throw error
      expect(() => {
        const result = mapper.mapDocument(document, context);
        expect(result).toBeDefined();
      }).not.toThrow();
    });

    it('should handle documents with scripts and styles', () => {
      const html = `
        <html><head><title>Scripts and Styles</title>
          <script>console.log('ignore me');</script>
          <style>.ignored { color: red; }</style>
        </head>
        <body>
          <h1>Important Content</h1>
          <script>var x = 1; // should be ignored</script>
          <p>Only this content should be extracted: 重要なコンテンツ</p>
          <style>.more-ignored { display: none; }</style>
        </body></html>
      `;

      const document = parse(html);
      const context = {
        filePath: 'scripts-styles.html',
        startTime: Date.now(),
        blockCounter: 0,
        imageCounter: 0,
        warnings: [],
        errors: [],
        metadata: {}
      };

      const result = mapper.mapDocument(document, context);

      // Should extract meaningful content but ignore scripts/styles
      expect(result.content.blocks.length).toBeGreaterThan(0);
      const contentTexts = result.content.blocks
        .filter(b => b.content?.ja)
        .map(b => b.content?.ja);

      expect(contentTexts).toContain('重要なコンテンツ');
      expect(contentTexts).not.toContain('console.log');
      expect(contentTexts).not.toContain('var x = 1');
      expect(contentTexts).not.toContain('.ignored');
    });
  });
});