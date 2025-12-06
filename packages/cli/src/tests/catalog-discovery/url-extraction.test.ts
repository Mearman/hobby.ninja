import { describe, test, expect } from 'vitest';
import { generateCatalogRanges, buildCatalogUrl } from '../../cli/catalog-discovery';

describe('Catalog Discovery - URL Generation', () => {
	describe('generateCatalogRanges', () => {
		test('should generate catalog ranges starting from 00_0000', () => {
			const ranges = generateCatalogRanges(5);

			expect(ranges).toHaveLength(5);
			expect(ranges[0]).toBe('00_0000');
			expect(ranges[1]).toBe('00_0001');
			expect(ranges[2]).toBe('00_0002');
			expect(ranges[3]).toBe('00_0003');
			expect(ranges[4]).toBe('00_0004');
		});

		test('should generate single range when count is 1', () => {
			const ranges = generateCatalogRanges(1);

			expect(ranges).toHaveLength(1);
			expect(ranges[0]).toBe('00_0000');
		});

		test('should handle zero count gracefully', () => {
			const ranges = generateCatalogRanges(0);

			expect(ranges).toHaveLength(0);
		});

		test('should generate ranges with correct zero-padding', () => {
			const ranges = generateCatalogRanges(13);

			expect(ranges).toContain('00_0009');
			expect(ranges).toContain('00_0010');
			expect(ranges).toContain('00_0011');
			expect(ranges).toContain('00_0012');
		});
	});

	describe('buildCatalogUrl', () => {
		test('should build catalog URL from range identifier', () => {
			const url = buildCatalogUrl('00_0000');

			expect(url).toBe('https://bandai-hobby.net/item/00_0000/');
		});

		test('should handle different range formats', () => {
			expect(buildCatalogUrl('12_1000')).toBe('https://bandai-hobby.net/item/12_1000/');
			expect(buildCatalogUrl('99_9999')).toBe('https://bandai-hobby.net/item/99_9999/');
		});

		test('should handle range identifiers with different patterns', () => {
			expect(buildCatalogUrl('00_0001')).toBe('https://bandai-hobby.net/item/00_0001/');
			expect(buildCatalogUrl('01_1000')).toBe('https://bandai-hobby.net/item/01_1000/');
		});
	});
});