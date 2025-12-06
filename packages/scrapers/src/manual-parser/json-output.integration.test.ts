import { describe, it, expect, beforeEach } from 'vitest';
import type { ManualDocument } from '@hobby-ninja/types';
import { z } from 'zod';
import { schema } from './core';

// Mock PerformanceLogger for testing
const mockPerformanceLogger = {
  startTimer: (name: string) => ({ name, startTime: Date.now() }),
  endTimer: (name: string) => {},
  getMetrics: () => ({ htmlParseTime: 10, totalTime: 15 }),
  getCounter: (name: string) => Math.floor(Math.random() * 1000),
  logTotalTime: () => {}
};

describe('JSON Output Validation', () => {

  describe('Schema Validation', () => {
    it('should validate a complete manual document', () => {
      const validDocument: ManualDocument = {
        id: 'RG-001',
        metadata: {
          title: { ja: 'RG 1/144 ウイングガンダムゼロ', en: 'RG 1/144 Wing Gundam Zero' },
          language: 'ja',
          product: {
            grade: 'RG',
            scale: '1/144',
            series: 'EW'
          },
          manualId: 'RG-001',
          releaseDate: '2023-01-01',
          version: '1.0',
          processingTime: {
            htmlParseTime: 100,
            totalTime: 150
          },
          warnings: []
        },
        content: {
          blocks: [
            {
              id: 'heading-1',
              type: 'heading',
              level: 1,
              content: { ja: '組立説明書', en: 'Assembly Manual' },
              order: 1
            },
            {
              id: 'paragraph-1',
              type: 'paragraph',
              content: { ja: 'このガンダムは最高です。', en: 'This Gundam is the best.' },
              order: 2
            }
          ]
        },
        assets: {
          images: [],
          diagrams: [],
          thumbnails: []
        },
        structure: {
          outline: [],
          navigation: [],
          pageCount: 10
        },
        extractedAt: '2023-01-01T00:00:00Z',
        source: {
          url: 'https://example.com/manual.html',
          format: 'html',
          encoding: 'utf-8',
          size: 1024,
          checksum: 'abc123'
        }
      };

      const result = schema.Schemas.ManualDocument.safeParse(validDocument);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.metadata.title?.ja).toBe('RG 1/144 ウイングガンダムゼロ');
        expect(result.data.content.blocks).toHaveLength(2);
      }
    });

    it('should reject document with invalid title', () => {
      const invalidDocument = {
        metadata: {
          title: { ja: '' }, // Empty title should fail validation
          language: 'ja',
          processingTime: { htmlParseTime: 10, totalTime: 15 },
          warnings: []
        },
        content: { blocks: [] }
      };

      const result = schema.Schemas.ManualDocument.safeParse(invalidDocument);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toHaveLength(1);
        expect(result.error.issues[0].path).toContain('title');
      }
    });

    it('should reject document with invalid language code', () => {
      const invalidDocument = {
        metadata: {
          title: { ja: 'Valid Title' },
          language: 'invalid-language', // Should be a valid language code
          processingTime: { htmlParseTime: 10, totalTime: 15 },
          warnings: []
        },
        content: { blocks: [] }
      };

      const result = schema.Schemas.ManualDocument.safeParse(invalidDocument);
      expect(result.success).toBe(false);
    });

    it('should accept document with minimal required fields', () => {
      const minimalDocument: ManualDocument = {
        id: 'MIN-001',
        metadata: {
          title: { ja: 'Minimal Manual' },
          language: 'ja',
          processingTime: { htmlParseTime: 10, totalTime: 15 },
          warnings: []
        },
        content: { blocks: [] },
        assets: {
          images: [],
          diagrams: [],
          thumbnails: []
        },
        structure: {
          outline: [],
          navigation: []
        },
        extractedAt: '2023-01-01T00:00:00Z',
        source: {
          url: 'https://example.com/minimal.html',
          format: 'html'
        }
      };

      const result = schema.Schemas.ManualDocument.safeParse(minimalDocument);
      expect(result.success).toBe(true);
    });
  });

  describe('Localized Text Validation', () => {
    it('should validate Japanese text with proper characters', () => {
      const japaneseText = {
        ja: 'RG 1/144 ウイングガンダムゼロ（EW版）',
        en: 'RG 1/144 Wing Gundam Zero (EW)'
      };

      const result = schema.Schemas.LocalizedText.safeParse(japaneseText);
      expect(result.success).toBe(true);
    });

    it('should reject Japanese text without Japanese characters', () => {
      const invalidJapaneseText = {
        ja: 'RG 1/144 Wing Gundam Zero' // No Japanese characters
      };

      const result = schema.Schemas.LocalizedText.safeParse(invalidJapaneseText);
      expect(result.success).toBe(false);
    });

    it('should accept Japanese-only text', () => {
      const japaneseOnlyText = {
        ja: 'ウイングガンダムゼロ'
      };

      const result = schema.Schemas.LocalizedText.safeParse(japaneseOnlyText);
      expect(result.success).toBe(true);
    });

    it('should reject text exceeding maximum length', () => {
      const longText = {
        ja: 'あ'.repeat(201) // Exceeds 200 character limit
      };

      const result = schema.Schemas.LocalizedText.safeParse(longText);
      expect(result.success).toBe(false);
    });
  });

  describe('Content Block Validation', () => {
    it('should validate heading blocks with correct levels', () => {
      const headingBlock = {
        id: 'heading-1',
        type: 'heading' as const,
        level: 1,
        content: { ja: 'メインタイトル' },
        order: 1
      };

      const result = schema.Schemas.ContentBlock.safeParse(headingBlock);
      expect(result.success).toBe(true);
    });

    it('should reject heading blocks with invalid levels', () => {
      const invalidHeadingBlock = {
        id: 'heading-1',
        type: 'heading' as const,
        level: 7, // Invalid level (should be 1-6)
        content: { ja: 'メインタイトル' },
        order: 1
      };

      const result = schema.Schemas.ContentBlock.safeParse(invalidHeadingBlock);
      expect(result.success).toBe(false);
    });

    it('should validate list blocks with correct structure', () => {
      const listBlock = {
        id: 'list-1',
        type: 'list' as const,
        listType: 'ordered' as const,
        items: ['項目1', '項目2', '項目3'],
        order: 1
      };

      const result = schema.Schemas.ContentBlock.safeParse(listBlock);
      expect(result.success).toBe(true);
    });

    it('should reject list blocks with empty items', () => {
      const invalidListBlock = {
        id: 'list-1',
        type: 'list' as const,
        listType: 'unordered' as const,
        items: [], // Empty items array
        order: 1
      };

      const result = schema.Schemas.ContentBlock.safeParse(invalidListBlock);
      expect(result.success).toBe(false);
    });
  });

  describe('Product Information Validation', () => {
    it('should validate complete product information', () => {
      const productInfo = {
        grade: 'MG',
        scale: '1/100',
        series: 'SEED',
        name: { ja: 'フリーダムガンダム', en: 'Freedom Gundam' },
        code: 'BANDAI-001'
      };

      const result = schema.Schemas.ProductInfo.safeParse(productInfo);
      expect(result.success).toBe(true);
    });

    it('should validate partial product information', () => {
      const partialProductInfo = {
        grade: 'PG',
        scale: '1/60'
      };

      const result = schema.Schemas.ProductInfo.safeParse(partialProductInfo);
      expect(result.success).toBe(true);
    });

    it('should reject invalid grade values', () => {
      const invalidProductInfo = {
        grade: 'INVALID_GRADE',
        scale: '1/100'
      };

      const result = schema.Schemas.ProductInfo.safeParse(invalidProductInfo);
      expect(result.success).toBe(false);
    });

    it('should reject invalid scale format', () => {
      const invalidProductInfo = {
        grade: 'MG',
        scale: 'invalid-scale'
      };

      const result = schema.Schemas.ProductInfo.safeParse(invalidProductInfo);
      expect(result.success).toBe(false);
    });
  });

  describe('Performance Metadata Validation', () => {
    it('should validate performance timing data', () => {
      const performanceData = {
        htmlParseTime: 150,
        contentExtractionTime: 200,
        totalTime: 400,
        fileSize: 1024000,
        nodeCount: 5000
      };

      const result = schema.Schemas.ProcessingMetadata.safeParse(performanceData);
      expect(result.success).toBe(true);
    });

    it('should reject negative timing values', () => {
      const invalidPerformanceData = {
        htmlParseTime: -100, // Negative value
        totalTime: 200
      };

      const result = schema.Schemas.ProcessingMetadata.safeParse(invalidPerformanceData);
      expect(result.success).toBe(false);
    });
  });
});