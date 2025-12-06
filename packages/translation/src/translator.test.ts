import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Timer globals for test environment
declare const setTimeout: typeof globalThis.setTimeout;

import { TranslationCache } from "./cache";
import { GOOGLE_TRANSLATE_API_URL } from "./constants";
import { TranslationServiceError, TranslationErrorCode } from "./errors";
import { TranslationService, translateText } from "./translator";

// Mock fetch
globalThis.fetch = vi.fn();

describe("TranslationService", () => {
	let translator: TranslationService;
	let mockCache: TranslationCache;

	beforeEach(() => {
		vi.clearAllMocks();
		mockCache = new TranslationCache(100, 0); // No TTL for tests
		translator = new TranslationService({}, mockCache);
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe("translateText", () => {
		it("should translate text successfully", async () => {
			const mockResponse = {
				ok: true,
				json: vi.fn().mockResolvedValue([[
					["Hello world", "こんにちは世界"],
				]]),
			};

			(globalThis.fetch as any).mockResolvedValue(mockResponse);

			const result = await translator.translateText("Hello world", "ja", "en");

			expect(result).toEqual({
				original: "Hello world",
				translated: "こんにちは世界",
				sourceLanguage: "en",
				targetLanguage: "ja",
				cached: false,
				processingTime: expect.any(Number),
			});

			expect(globalThis.fetch).toHaveBeenCalledWith(
				expect.stringContaining(GOOGLE_TRANSLATE_API_URL),
				expect.objectContaining({
					method: "GET",
					signal: expect.any(AbortSignal),
				}),
			);
		});

		it("should use cached translation when available", async () => {
			const text = "Hello world";
			const targetLanguage = "ja";
			const sourceLanguage = "en";

			// Pre-populate cache
			mockCache.set(text, sourceLanguage, targetLanguage, "こんにちは世界");

			const result = await translator.translateText(text, targetLanguage, sourceLanguage);

			expect(result).toEqual({
				original: text,
				translated: "こんにちは世界",
				sourceLanguage,
				targetLanguage,
				cached: true,
				processingTime: expect.any(Number),
			});

			expect(globalThis.fetch).not.toHaveBeenCalled();
		});

		it("should handle empty text", async () => {
			await expect(translator.translateText("", "ja")).rejects.toThrow(TranslationServiceError);
		});

		it("should handle text that exceeds maximum length", async () => {
			const longText = "a".repeat(6000); // Exceeds MAX_TEXT_LENGTH
			await expect(translator.translateText(longText, "ja")).rejects.toThrow(TranslationServiceError);
		});

		it("should retry on network errors", async () => {
			(globalThis.fetch as any)
				.mockRejectedValueOnce(new Error("Network error"))
				.mockRejectedValueOnce(new Error("Network error"))
				.mockResolvedValueOnce({
					ok: true,
					json: vi.fn().mockResolvedValue([[
						["Hello world", "こんにちは世界"],
					]]),
				});

			const result = await translator.translateText("Hello world", "ja");

			expect(result.translated).toBe("こんにちは世界");
			expect(globalThis.fetch).toHaveBeenCalledTimes(3);
		});

		it("should handle HTTP errors", async () => {
			const mockResponse = {
				ok: false,
				status: 429,
				statusText: "Too Many Requests",
			};

			(globalThis.fetch as any).mockResolvedValue(mockResponse);

			await expect(translator.translateText("Hello world", "ja")).rejects.toThrow(
				expect.objectContaining({
					code: TranslationErrorCode.RATE_LIMIT_EXCEEDED,
				}),
			);
		});

		it("should handle timeout", async () => {
			(globalThis.fetch as any).mockImplementation(() => {
				return new Promise((_, reject) => {
					setTimeout(() => reject(new DOMException("AbortError", "AbortError")), 100);
				});
			});

			const translatorWithTimeout = new TranslationService({ timeout: 50 });

			await expect(translatorWithTimeout.translateText("Hello world", "ja")).rejects.toThrow(
				expect.objectContaining({
					code: TranslationErrorCode.TIMEOUT,
				}),
			);
		});
	});

	describe("translateBatch", () => {
		it("should translate multiple texts", async () => {
			const mockResponse = {
				ok: true,
				json: vi.fn().mockResolvedValue([[
					["Hello", "こんにちは"],
					["World", "世界"],
				]]),
			};

			(globalThis.fetch as any).mockResolvedValue(mockResponse);

			const result = await translator.translateBatch({
				texts: ["Hello", "World"],
				options: { targetLanguage: "ja" },
			});

			expect(result).toEqual({
				results: expect.arrayContaining([
					expect.objectContaining({
						original: "Hello",
						translated: expect.any(String),
					}),
					expect.objectContaining({
						original: "World",
						translated: expect.any(String),
					}),
				]),
				totalCount: 2,
				successCount: 2,
				errorCount: 0,
				processingTime: expect.any(Number),
			});
		});

		it("should handle partial failures in batch", async () => {
			(globalThis.fetch as any)
				.mockResolvedValueOnce({
					ok: true,
					json: vi.fn().mockResolvedValue([[
						["Hello", "こんにちは"],
					]]),
				})
				.mockRejectedValueOnce(new Error("Network error"));

			const result = await translator.translateBatch({
				texts: ["Hello", "World"],
				options: { targetLanguage: "ja" },
			});

			expect(result.totalCount).toBe(2);
			expect(result.successCount).toBe(1);
			expect(result.errorCount).toBe(1);
			expect(result.results).toHaveLength(2);
		});
	});

	describe("caching", () => {
		it("should cache successful translations", async () => {
			const mockResponse = {
				ok: true,
				json: vi.fn().mockResolvedValue([[
					["Hello", "こんにちは"],
				]]),
			};

			(globalThis.fetch as any).mockResolvedValue(mockResponse);

			// First call
			await translator.translateText("Hello", "ja");

			// Second call should use cache
			const result = await translator.translateText("Hello", "ja");

			expect(result.cached).toBe(true);
			expect(globalThis.fetch).toHaveBeenCalledTimes(1); // Only called once
		});

		it("should respect cache TTL", async () => {
			const shortTtl = 100; // 100ms
			const translatorWithShortTtl = new TranslationService({
				cacheTtl: shortTtl,
			});

			const mockResponse = {
				ok: true,
				json: vi.fn().mockResolvedValue([[
					["Hello", "こんにちは"],
				]]),
			};

			(globalThis.fetch as any).mockResolvedValue(mockResponse);

			// First call
			await translatorWithShortTtl.translateText("Hello", "ja");

			// Wait for cache to expire
			await new Promise(resolve => setTimeout(resolve, shortTtl + 10));

			// Second call should fetch again
			await translatorWithShortTtl.translateText("Hello", "ja");

			expect(globalThis.fetch).toHaveBeenCalledTimes(2);
		});
	});

	describe("rate limiting", () => {
		it("should enforce rate limiting between requests", async () => {
			const mockResponse = {
				ok: true,
				json: vi.fn().mockResolvedValue([[
					["Hello", "こんにちは"],
				]]),
			};

			(globalThis.fetch as any).mockResolvedValue(mockResponse);

			const startTime = Date.now();

			await translator.translateText("Hello", "ja");
			await translator.translateText("World", "ja");

			const endTime = Date.now();
			const elapsedTime = endTime - startTime;

			// Should have at least some delay between requests
			expect(elapsedTime).toBeGreaterThan(500); // Allow some margin
			expect(globalThis.fetch).toHaveBeenCalledTimes(2);
		});
	});

	describe("statistics", () => {
		it("should provide cache statistics", () => {
			const stats = translator.getCacheStats();

			expect(stats).toEqual({
				size: expect.any(Number),
				maxSize: expect.any(Number),
				hits: expect.any(Number),
				misses: expect.any(Number),
				hitRate: expect.any(Number),
				memoryUsage: expect.any(Number),
			});
		});

		it("should provide circuit breaker status", () => {
			const status = translator.getCircuitBreakerStatus();

			expect(status).toEqual({
				state: expect.any(String),
				failureCount: expect.any(Number),
				lastFailureTime: expect.any(Number),
			});
		});

		it("should provide error statistics", () => {
			const stats = translator.getErrorStats();

			expect(stats).toEqual(expect.any(Object));
		});
	});
});

describe("convenience functions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("translateText should work with default translator", async () => {
		const mockResponse = {
			ok: true,
			json: vi.fn().mockResolvedValue([[
				["Hello", "こんにちは"],
			]]),
		};

		(globalThis.fetch as any).mockResolvedValue(mockResponse);

		const result = await translateText("Hello", "ja");

		expect(result).toEqual({
			original: "Hello",
			translated: "こんにちは",
			sourceLanguage: "auto",
			targetLanguage: "ja",
			cached: false,
			processingTime: expect.any(Number),
		});
	});
});