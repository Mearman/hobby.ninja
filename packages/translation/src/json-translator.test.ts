import { describe, it, expect, vi, beforeEach } from "vitest";

import { JsonTranslator, translateJson } from "./json-translator";
import { TranslationService } from "./translator";

// Mock the TranslationService
vi.mock("./translator", () => {
	return {
		TranslationService: vi.fn().mockImplementation(() => ({
			translateText: vi.fn(),
		})),
	};
});

describe("JsonTranslator", () => {
	let jsonTranslator: JsonTranslator;
	let mockTranslateText: vi.Mock;

	beforeEach(() => {
		vi.clearAllMocks();
		jsonTranslator = new JsonTranslator();
		mockTranslateText = (vi.mocked(TranslationService).mock.results[0].value as any).translateText;
	});

	describe("translateJson", () => {
		it("should translate simple strings", async () => {
			mockTranslateText.mockResolvedValue({
				original: "こんにちは",
				translated: "Hello",
				sourceLanguage: "ja",
				targetLanguage: "en",
				cached: false,
				processingTime: 100,
			});

			const result = await jsonTranslator.translateJson("こんにちは", "en");

			expect(result).toBe("Hello");
			expect(mockTranslateText).toHaveBeenCalledWith("こんにちは", "en", undefined);
		});

		it("should preserve numbers when preserveNumbers is true", async () => {
			const data = { count: 42, name: "テスト" };
			mockTranslateText.mockResolvedValue({
				original: "テスト",
				translated: "Test",
				sourceLanguage: "ja",
				targetLanguage: "en",
				cached: false,
				processingTime: 100,
			});

			const result = await jsonTranslator.translateJson(data, "en");

			expect(result.count).toBe(42);
			expect(result.name).toBe("Test");
		});

		it("should translate arrays", async () => {
			const data = ["アイテム1", "アイテム2"];
			mockTranslateText
				.mockResolvedValueOnce({
					original: "アイテム1",
					translated: "Item 1",
					sourceLanguage: "ja",
					targetLanguage: "en",
					cached: false,
					processingTime: 100,
				})
				.mockResolvedValueOnce({
					original: "アイテム2",
					translated: "Item 2",
					sourceLanguage: "ja",
					targetLanguage: "en",
					cached: false,
					processingTime: 100,
				});

			const result = await jsonTranslator.translateJson(data, "en");

			expect(result).toEqual(["Item 1", "Item 2"]);
			expect(mockTranslateText).toHaveBeenCalledTimes(2);
		});

		it("should translate objects", async () => {
			const data = {
				title: "タイトル",
				description: "説明",
				id: "123",
				url: "https://example.com",
			};

			mockTranslateText
				.mockResolvedValueOnce({
					original: "タイトル",
					translated: "Title",
					sourceLanguage: "ja",
					targetLanguage: "en",
					cached: false,
					processingTime: 100,
				})
				.mockResolvedValueOnce({
					original: "説明",
					translated: "Description",
					sourceLanguage: "ja",
					targetLanguage: "en",
					cached: false,
					processingTime: 100,
				});

			const result = await jsonTranslator.translateJson(data, "en");

			expect(result).toEqual({
				title: "Title",
				description: "Description",
				id: "123", // Should be ignored by default
				url: "https://example.com", // Should be ignored by default
			});

			expect(mockTranslateText).toHaveBeenCalledTimes(2);
		});

		it("should translate keys when translateKeys is true", async () => {
			const data = { "タイトル": "テスト" };

			mockTranslateText
				.mockResolvedValueOnce({
					original: "タイトル",
					translated: "Title",
					sourceLanguage: "ja",
					targetLanguage: "en",
					cached: false,
					processingTime: 100,
				})
				.mockResolvedValueOnce({
					original: "テスト",
					translated: "Test",
					sourceLanguage: "ja",
					targetLanguage: "en",
					cached: false,
					processingTime: 100,
				});

			const result = await jsonTranslator.translateJson(data, "en", {
				translateKeys: true,
			});

			expect(result).toEqual({
				"Title": "Test",
			});

			expect(mockTranslateText).toHaveBeenCalledTimes(2);
		});

		it("should handle nested objects", async () => {
			const data = {
				product: {
					name: "製品名",
					specs: {
						weight: "重量",
						height: "高さ",
					},
				},
			};

			mockTranslateText
				.mockResolvedValueOnce({
					original: "製品名",
					translated: "Product Name",
					sourceLanguage: "ja",
					targetLanguage: "en",
					cached: false,
					processingTime: 100,
				})
				.mockResolvedValueOnce({
					original: "重量",
					translated: "Weight",
					sourceLanguage: "ja",
					targetLanguage: "en",
					cached: false,
					processingTime: 100,
				})
				.mockResolvedValueOnce({
					original: "高さ",
					translated: "Height",
					sourceLanguage: "ja",
					targetLanguage: "en",
					cached: false,
					processingTime: 100,
				});

			const result = await jsonTranslator.translateJson(data, "en");

			expect(result).toEqual({
				product: {
					name: "Product Name",
					specs: {
						weight: "Weight",
						height: "Height",
					},
				},
			});

			expect(mockTranslateText).toHaveBeenCalledTimes(3);
		});

		it("should skip translation for ignored keys", async () => {
			const data = {
				title: "タイトル",
				id: "123",
				createdAt: "2023-01-01",
				url: "https://example.com",
			};

			mockTranslateText.mockResolvedValue({
				original: "タイトル",
				translated: "Title",
				sourceLanguage: "ja",
				targetLanguage: "en",
				cached: false,
				processingTime: 100,
			});

			const result = await jsonTranslator.translateJson(data, "en");

			expect(result).toEqual({
				title: "Title",
				id: "123",
				createdAt: "2023-01-01",
				url: "https://example.com",
			});

			expect(mockTranslateText).toHaveBeenCalledTimes(1);
		});

		it("should handle complex text with line breaks", async () => {
			const text = "ライン1\nライン2\nライン3";

			mockTranslateText
				.mockResolvedValueOnce({
					original: "ライン1",
					translated: "Line 1",
					sourceLanguage: "ja",
					targetLanguage: "en",
					cached: false,
					processingTime: 100,
				})
				.mockResolvedValueOnce({
					original: "ライン2",
					translated: "Line 2",
					sourceLanguage: "ja",
					targetLanguage: "en",
					cached: false,
					processingTime: 100,
				})
				.mockResolvedValueOnce({
					original: "ライン3",
					translated: "Line 3",
					sourceLanguage: "ja",
					targetLanguage: "en",
					cached: false,
					processingTime: 100,
				});

			const result = await jsonTranslator.translateJson(text, "en");

			expect(result).toBe("Line 1\nLine 2\nLine 3");
			expect(mockTranslateText).toHaveBeenCalledTimes(3);
		});

		it("should preserve original text on translation errors", async () => {
			const data = { title: "タイトル", description: "説明" };

			mockTranslateText
				.mockResolvedValueOnce({
					original: "タイトル",
					translated: "Title",
					sourceLanguage: "ja",
					targetLanguage: "en",
					cached: false,
					processingTime: 100,
				})
				.mockRejectedValueOnce(new Error("Translation failed"));

			const result = await jsonTranslator.translateJson(data, "en");

			expect(result).toEqual({
				title: "Title",
				description: "説明", // Original preserved on error
			});
		});

		it("should handle null and undefined values", async () => {
			const data = {
				title: "タイトル",
				description: null,
				tags: undefined,
				count: 0,
			};

			mockTranslateText.mockResolvedValue({
				original: "タイトル",
				translated: "Title",
				sourceLanguage: "ja",
				targetLanguage: "en",
				cached: false,
				processingTime: 100,
			});

			const result = await jsonTranslator.translateJson(data, "en");

			expect(result).toEqual({
				title: "Title",
				description: null,
				tags: undefined,
				count: 0,
			});

			expect(mockTranslateText).toHaveBeenCalledTimes(1);
		});

		it("should respect custom ignored patterns", async () => {
			const data = {
				title: "タイトル",
				custom_field_1: "値1",
				custom_field_2: "値2",
			};

			mockTranslateText.mockResolvedValue({
				original: "タイトル",
				translated: "Title",
				sourceLanguage: "ja",
				targetLanguage: "en",
				cached: false,
				processingTime: 100,
			});

			const result = await jsonTranslator.translateJson(data, "en", {
				ignoredPatterns: [/^custom_field_/],
			});

			expect(result).toEqual({
				title: "Title",
				custom_field_1: "値1",
				custom_field_2: "値2",
			});

			expect(mockTranslateText).toHaveBeenCalledTimes(1);
		});
	});
});

describe("convenience functions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("translateJson should work with default translator", async () => {
		const mockTranslateText = (vi.mocked(TranslationService).mock.results[0].value as any).translateText;
		mockTranslateText.mockResolvedValue({
			original: "こんにちは",
			translated: "Hello",
			sourceLanguage: "ja",
			targetLanguage: "en",
			cached: false,
			processingTime: 100,
		});

		const result = await translateJson("こんにちは", "en");

		expect(result).toBe("Hello");
	});
});