import { describe, it, expect, beforeEach } from 'vitest';
import { parse } from 'parse5';
import { HtmlStructureValidator, StructureValidationConfig } from './core/structure-validator';

describe('HTML Structure Validator', () => {
  let validator: HtmlStructureValidator;

  beforeEach(() => {
    validator = new HtmlStructureValidator();
  });

  describe('Basic Structure Validation', () => {
    it('should validate complete HTML document structure', () => {
      const html = `
        <!DOCTYPE html>
        <html lang="ja">
        <head>
          <meta charset="UTF-8">
          <title>RG 1/144 ウイングガンダム</title>
        </head>
        <body>
          <h1>組立説明書</h1>
          <p>ガンダムの組み立て説明</p>
        </body>
        </html>
      `;

      const document = parse(html);
      const result = validator.validateStructure(document);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.metadata.headingCount).toBe(1);
      expect(result.metadata.contentBlockCount).toBeGreaterThan(0);
      expect(result.metadata.japaneseCharacterCount).toBeGreaterThan(0);
    });

    it('should detect missing critical elements', () => {
      const html = `
        <title>Broken Document</title>
        <p>Missing html, head, body elements</p>
      `;

      const document = parse(html);
      const result = validator.validateStructure(document);

      // Parse5 normalizes the HTML, so we check for other structural issues
      expect(result.errors.length).toBeGreaterThan(0);

      // Should detect missing headings or other structural issues
      const hasError = result.errors.some(e =>
        e.type === 'missing-required' || e.type === 'content-quality'
      );
      expect(hasError).toBe(true);
    });

    it('should detect missing headings when required', () => {
      const config: StructureValidationConfig = {
        requireHeadings: true
      };
      const headingValidator = new HtmlStructureValidator(config);

      const html = `
        <!DOCTYPE html>
        <html lang="ja">
        <head><title>No Headings</title></head>
        <body>
          <p>This document has no headings.</p>
          <p>Just paragraphs.</p>
        </body>
        </html>
      `;

      const document = parse(html);
      const result = headingValidator.validateStructure(document);

      expect(result.isValid).toBe(false);
      const headingError = result.errors.find(e => e.message.includes('no heading elements'));
      expect(headingError).toBeDefined();
    });

    it('should validate empty document gracefully', () => {
      const html = '<!DOCTYPE html><html><head></head><body></body></html>';
      const document = parse(html);
      const result = validator.validateStructure(document);

      expect(result.metadata.headingCount).toBe(0);
      expect(result.metadata.contentBlockCount).toBe(0);
      expect(result.metadata.totalCharacterCount).toBe(0);
    });
  });

  describe('Heading Hierarchy Validation', () => {
    it('should validate proper heading hierarchy', () => {
      const html = `
        <html><head><title>Proper Headings</title></head>
        <body>
          <h1>Main Title</h1>
          <h2>Section 1</h2>
          <h3>Subsection 1.1</h3>
          <h3>Subsection 1.2</h3>
          <h2>Section 2</h2>
          <h3>Subsection 2.1</h3>
        </body></html>
      `;

      const document = parse(html);
      const result = validator.validateStructure(document);

      expect(result.isValid).toBe(true);
      expect(result.metadata.headingCount).toBe(6);
    });

    it('should warn about skipped heading levels', () => {
      const html = `
        <html><head><title>Skipped Levels</title></head>
        <body>
          <h1>Main Title</h1>
          <h3>Skipped h2</h3>
          <h4>This follows h3</h4>
        </body></html>
      `;

      const document = parse(html);
      const result = validator.validateStructure(document);

      expect(result.isValid).toBe(true); // Should still be valid but with warnings
      const skippedLevelWarning = result.warnings.find(w =>
        w.message.includes('Skipped heading level')
      );
      expect(skippedLevelWarning).toBeDefined();
    });

    it('should reject invalid heading levels when configured', () => {
      const config: StructureValidationConfig = {
        allowedHeadingLevels: [1, 2, 3]
      };
      const levelValidator = new HtmlStructureValidator(config);

      const html = `
        <html><head><title>Invalid Levels</title></head>
        <body>
          <h1>Main Title</h1>
          <h4>Invalid h4</h4>
        </body></html>
      `;

      const document = parse(html);
      const result = levelValidator.validateStructure(document);

      expect(result.isValid).toBe(false);
      const invalidLevelError = result.errors.find(e =>
        e.message.includes('Invalid heading level: h4')
      );
      expect(invalidLevelError).toBeDefined();
    });
  });

  describe('Japanese Content Validation', () => {
    it('should validate documents with sufficient Japanese content', () => {
      const html = `
        <html><head><title>日本語コンテンツ</title></head>
        <body>
          <h1>ガンダム組立説明書</h1>
          <p>これはウイングガンダムの組み立て説明書です。</p>
          <p>注意事項：鋭利な部分がありますので取り扱いに注意してください。</p>
        </body></html>
      `;

      const document = parse(html);
      const result = validator.validateStructure(document);

      expect(result.isValid).toBe(true);
      expect(result.metadata.japaneseCharacterCount).toBeGreaterThan(20);
      expect(result.metadata.totalCharacterCount).toBeGreaterThan(30);
    });

    it('should warn about low Japanese content ratio', () => {
      const config: StructureValidationConfig = {
        minJapaneseRatio: 0.5 // 50% Japanese required
      };
      const japaneseValidator = new HtmlStructureValidator(config);

      const html = `
        <html><head><title>Mixed Content</title></head>
        <body>
          <h1>Gundam Manual ガンダム説明書</h1>
          <p>This is mostly English content. 日本語は少しだけ。</p>
        </body></html>
      `;

      const document = parse(html);
      const result = japaneseValidator.validateStructure(document);

      expect(result.isValid).toBe(true); // Should be valid with warning
      const lowRatioWarning = result.warnings.find(w =>
        w.type === 'japanese-content' && w.message.includes('Low Japanese content ratio')
      );
      expect(lowRatioWarning).toBeDefined();
    });

    it('should error on documents with no Japanese content', () => {
      const config: StructureValidationConfig = {
        validateJapaneseContent: true,
        minJapaneseRatio: 0.1
      };
      const strictValidator = new HtmlStructureValidator(config);

      const html = `
        <html><head><title>English Only</title></head>
        <body>
          <h1>Gundam Assembly Manual</h1>
          <p>This document contains only English text.</p>
          <p>No Japanese characters are present.</p>
        </body></html>
      `;

      const document = parse(html);
      const result = strictValidator.validateStructure(document);

      expect(result.isValid).toBe(false);
      const noJapaneseError = result.errors.find(e =>
        e.type === 'japanese-content' && e.message.includes('No Japanese characters')
      );
      expect(noJapaneseError).toBeDefined();
    });
  });

  describe('Content Quality Validation', () => {
    it('should validate documents with sufficient content', () => {
      const html = `
        <html><head><title>Good Content</title></head>
        <body>
          <h1>メインタイトル</h1>
          <p>これは最初の段落です。十分な内容があります。</p>
          <div>これは二番目のコンテンツブロックです。</div>
          <section>
            <h2>サブセクション</h2>
            <p>サブセクションの内容も含まれています。</p>
          </section>
        </body></html>
      `;

      const document = parse(html);
      const result = validator.validateStructure(document);

      expect(result.isValid).toBe(true);
      expect(result.metadata.contentBlockCount).toBeGreaterThanOrEqual(3);
      expect(result.metadata.totalCharacterCount).toBeGreaterThan(50);
    });

    it('should warn about low content block count', () => {
      const config: StructureValidationConfig = {
        minContentBlocks: 3
      };
      const contentValidator = new HtmlStructureValidator(config);

      const html = `
        <html><head><title>Minimal Content</title></head>
        <body>
          <h1>Title Only</h1>
          <p>Only one paragraph.</p>
        </body></html>
      `;

      const document = parse(html);
      const result = contentValidator.validateStructure(document);

      expect(result.isValid).toBe(false);
      const lowContentError = result.errors.find(e =>
        e.type === 'content-quality' && e.message.includes('Low content block count')
      );
      expect(lowContentError).toBeDefined();
    });

    it('should detect documents with no meaningful content', () => {
      const html = `
        <html><head><title>Empty Content</title></head>
        <body>
          <h1></h1>
          <p>   </p>
          <div><!-- empty --></div>
        </body></html>
      `;

      const document = parse(html);
      const result = validator.validateStructure(document);

      expect(result.isValid).toBe(false);
      const noContentError = result.errors.find(e =>
        e.type === 'content-quality' && e.message.includes('no text content')
      );
      expect(noContentError).toBeDefined();
    });
  });

  describe('Element-Specific Validation', () => {
    it('should validate image elements with proper attributes', () => {
      const config: StructureValidationConfig = {
        validateJapaneseContent: false // Skip for this test
      };
      const elementValidator = new HtmlStructureValidator(config);

      const html = `
        <html><head><title>Image Test</title></head>
        <body>
          <img src="gundam.jpg" alt="ガンダム写真" title="主役機">
          <img src="parts.png"> <!-- Missing alt -->
        </body></html>
      `;

      const document = parse(html);
      const result = elementValidator.validateStructure(document);

      expect(result.isValid).toBe(true); // Should be valid but with warnings
      const missingAltWarning = result.warnings.find(w =>
        w.type === 'accessibility' && w.message.includes('missing alt attribute')
      );
      expect(missingAltWarning).toBeDefined();
    });

    it('should validate table structure', () => {
      const html = `
        <html><head><title>Table Test</title></head>
        <body>
          <table>
            <thead>
              <tr><th>部品名</th><th>数量</th></tr>
            </thead>
            <tbody>
              <tr><td>頭部</td><td>1</td></tr>
              <tr><td>胸部</td><td>1</td></tr>
            </tbody>
          </table>
        </body></html>
      `;

      const document = parse(html);
      const result = validator.validateStructure(document);

      expect(result.isValid).toBe(true);
    });

    it('should warn about tables without proper structure', () => {
      const html = `
        <html><head><title>Poor Table</title></head>
        <body>
          <table>
            <tr><td>Just</td></tr>
            <tr><td>rows</td></tr>
          </table>
        </body></html>
      `;

      const document = parse(html);
      const result = validator.validateStructure(document);

      expect(result.isValid).toBe(true); // Should be valid but with warning
      const tableWarning = result.warnings.find(w =>
        w.message.includes('missing thead or tbody elements')
      );
      expect(tableWarning).toBeDefined();
    });
  });

  describe('Semantic Structure Validation', () => {
    it('should encourage semantic HTML elements', () => {
      const html = `
        <html><head><title>Non-semantic</title></head>
        <body>
          <div class="header"><h1>Title</h1></div>
          <div class="nav"><a href="#">Link</a></div>
          <div class="main">
            <div class="article">
              <div class="section">
                <h2>Section</h2>
                <div class="p">Content here</div>
              </div>
            </div>
          </div>
          <div class="footer">Footer</div>
        </body></html>
      `;

      const document = parse(html);
      const result = validator.validateStructure(document);

      expect(result.isValid).toBe(true); // Should be valid but with recommendation
      const semanticWarning = result.warnings.find(w =>
        w.type === 'structure-weakness' && w.message.includes('High ratio of non-semantic elements')
      );
      expect(semanticWarning).toBeDefined();
    });

    it('should validate semantic HTML properly', () => {
      const html = `
        <html><head><title>Semantic HTML</title></head>
        <body>
          <header><h1>Title</h1></header>
          <nav><a href="#">Link</a></nav>
          <main>
            <article>
              <section>
                <h2>Section</h2>
                <p>Content here</p>
              </section>
            </article>
          </main>
          <footer>Footer</footer>
        </body></html>
      `;

      const document = parse(html);
      const result = validator.validateStructure(document);

      expect(result.isValid).toBe(true);
      // Should not have semantic warnings
      const semanticWarning = result.warnings.find(w =>
        w.type === 'structure-weakness' && w.message.includes('non-semantic elements')
      );
      expect(semanticWarning).toBeUndefined();
    });
  });

  describe('Structure Scoring', () => {
    it('should calculate high scores for well-structured documents', () => {
      const html = `
        <!DOCTYPE html>
        <html lang="ja">
        <head>
          <meta charset="UTF-8">
          <title>Perfect Document</title>
        </head>
        <body>
          <header><h1>完璧なドキュメント</h1></header>
          <main>
            <section>
              <h2>セクション</h2>
              <p>これはよく構造化されたドキュメントです。</p>
              <article>
                <h3>記事</h3>
                <p>セマンティックなHTML要素を使用しています。</p>
              </article>
            </section>
          </main>
        </body>
        </html>
      `;

      const document = parse(html);
      const result = validator.validateStructure(document);

      expect(result.metadata.structureScore).toBeGreaterThan(90);
      expect(result.metadata.hasProperStructure).toBe(true);
    });

    it('should calculate lower scores for poorly structured documents', () => {
      const html = `
        <title>Bad Document</title>
        <img src="test.jpg"> <!-- Missing alt -->
        <div>content</div>
      `;

      const document = parse(html);
      const result = validator.validateStructure(document);

      expect(result.metadata.structureScore).toBeLessThan(50);
      expect(result.metadata.hasProperStructure).toBe(false);
    });
  });

  describe('Content Block Validation', () => {
    it('should validate content blocks with Japanese text', () => {
      const content = {
        ja: 'これは日本語のコンテンツブロックです。',
        en: 'This is a Japanese content block.'
      };

      const result = validator.validateContentBlock(content, 'paragraph');

      expect(result.isValid).toBe(true);
      expect(result.metadata.japaneseCharacterCount).toBeGreaterThan(10);
      expect(result.metadata.contentBlockCount).toBe(1);
    });

    it('should reject content blocks without Japanese text', () => {
      const content = {
        ja: '',
        en: 'English only content'
      };

      const result = validator.validateContentBlock(content, 'paragraph');

      expect(result.isValid).toBe(false);
      const missingError = result.errors.find(e =>
        e.type === 'missing-required' && e.message.includes('missing Japanese text')
      );
      expect(missingError).toBeDefined();
    });

    it('should validate block type specific requirements', () => {
      const longHeading = {
        ja: 'これは非常に長い見出しです。見出しは通常短く簡潔であるべきですが、この例では意図的に長いテキストを使用してバリデーションの動作を確認します。'
      };

      const result = validator.validateContentBlock(longHeading, 'heading');

      expect(result.isValid).toBe(true); // Should be valid but with warning
      const longWarning = result.warnings.find(w =>
        w.message.includes('Heading text is very long')
      );
      expect(longWarning).toBeDefined();
    });
  });
});