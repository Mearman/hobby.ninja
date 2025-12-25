/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-magic-numbers */
/**
 * Unit tests for hashing utilities
 *
 * Tests cover:
 * - SHA-256 hash generation and consistency
 * - Base64 encoding and validation
 * - Key generation and parsing
 * - Hash validation and data integrity
 * - Error handling and edge cases
 */

import { describe, it, expect, beforeEach } from "vitest";

import {
	generateTextHash,
	generateKey,
	validateKey,
	extractKeyComponents,
	validateHash,
	normalizeLanguageCode,
	areKeysEquivalent,
	generateBatchHash,
	HashingError,
	KEY_SEPARATOR,
	KEY_FORMAT_REGEX,
	HEX_REGEX,
	type KeyComponents,
	type HashingOptions,
} from "./hashing";

describe("hashing", () => {
	describe("generateTextHash", () => {
		it("should generate consistent hashes for the same input", () => {
			const text = "Hello world";
			const hash1 = generateTextHash(text);
			const hash2 = generateTextHash(text);

			expect(hash1).toBe(hash2);
			expect(hash1).toMatch(HEX_REGEX);
		});

		it("should generate different hashes for different inputs", () => {
			const hash1 = generateTextHash("Hello world");
			const hash2 = generateTextHash("Hello universe");

			expect(hash1).not.toBe(hash2);
		});

		it("should handle empty string", () => {
			const hash = generateTextHash("");
			expect(hash).toMatch(HEX_REGEX);
			expect(hash.length).toBeGreaterThan(0);
		});

		it("should handle special characters and Unicode", () => {
			const texts = [
				"こんにちは世界", // Japanese
				"🤖🌍", // Emoji
				"Spécial chárácters", // Accented characters
				"\n\t\r", // Control characters
			];

			for (const text of texts) {
				const hash = generateTextHash(text);
				expect(hash).toMatch(HEX_REGEX);
				expect(hash.length).toBeGreaterThan(0);
			}
		});

		it("should support hex encoding option", () => {
			const text = "Hello world";
			const base64Hash = generateTextHash(text, { encoding: "base64" });
			const hexHash = generateTextHash(text, { encoding: "hex" });

			// base64 encoding still supported but not the default
			expect(base64Hash).toMatch(/^[A-Za-z0-9+/=]+$/);
			expect(hexHash).toMatch(HEX_REGEX);
			expect(base64Hash).not.toBe(hexHash);
		});

		it("should throw HashingError for non-string input", () => {
			expect(() => generateTextHash(null as any)).toThrow(HashingError);
			expect(() => generateTextHash(undefined as any)).toThrow(HashingError);
			expect(() => generateTextHash(123 as any)).toThrow(HashingError);
			expect(() => generateTextHash({} as any)).toThrow(HashingError);
		});
	});

	describe("generateKey", () => {
		it("should generate properly formatted keys", () => {
			const key = generateKey("en", "ja", "Hello world");
			const parts = key.split(KEY_SEPARATOR);

			expect(parts).toHaveLength(3);
			expect(parts[0]).toBe("en");
			expect(parts[1]).toBe("ja");
			expect(parts[2]).toMatch(HEX_REGEX);
		});

		it("should generate unique keys for different content", () => {
			const key1 = generateKey("en", "ja", "Hello world");
			const key2 = generateKey("en", "ja", "Hello universe");

			expect(key1).not.toBe(key2);
		});

		it("should generate different keys for different language pairs", () => {
			const text = "Hello world";
			const key1 = generateKey("en", "ja", text);
			const key2 = generateKey("ja", "en", text);

			expect(key1).not.toBe(key2);
		});

		it("should handle empty text", () => {
			const key = generateKey("en", "ja", "");
			expect(validateKey(key)).toBe(true);
		});

		it("should throw HashingError for invalid source language", () => {
			expect(() => generateKey("", "ja", "Hello")).toThrow(HashingError);
			expect(() => generateKey(null as any, "ja", "Hello")).toThrow(HashingError);
		});

		it("should throw HashingError for invalid target language", () => {
			expect(() => generateKey("en", "", "Hello")).toThrow(HashingError);
			expect(() => generateKey("en", null as any, "Hello")).toThrow(HashingError);
		});

		it("should throw HashingError for invalid text", () => {
			expect(() => generateKey("en", "ja", null as any)).toThrow(HashingError);
			expect(() => generateKey("en", "ja", 123 as any)).toThrow(HashingError);
		});
	});

	describe("validateKey", () => {
		it("should validate properly formatted keys", () => {
			const validKeys = [
				"en:ja:64ec88ca00b268e5ba1a35678a1b5316d212f4f366b2477232534a8aeca37f3c",
				"ja:en:125aeadf27b0459b8760c13a3d80912dfa8a81a68261906f60d87f4a0268646c",
				"zh_cn:ko:9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
			];

			for (const key of validKeys) {
				expect(validateKey(key)).toBe(true);
			}
		});

		it("should reject invalidly formatted keys", () => {
			const invalidKeys = [
				"en:ja:", // Missing hash
				"en:ja", // Missing components
				"en::hash", // Missing target
				":ja:hash", // Missing source
				"en:ja:invalid!hash", // Invalid Base64
				"123:ja:hash", // Invalid source format
				"en:123:hash", // Invalid target format
				"en:ja:hash:extra", // Too many components
			];

			for (const key of invalidKeys) {
				expect(validateKey(key)).toBe(false);
			}
		});

		it("should reject empty and non-string inputs", () => {
			expect(validateKey("")).toBe(false);
			expect(validateKey("   ")).toBe(false);
			expect(validateKey(null as any)).toBe(false);
			expect(validateKey(undefined as any)).toBe(false);
			expect(validateKey(123 as any)).toBe(false);
		});
	});

	describe("extractKeyComponents", () => {
		it("should extract components from valid keys", () => {
			const key = "en:ja:64ec88ca00b268e5ba1a35678a1b5316d212f4f366b2477232534a8aeca37f3c";
			const components = extractKeyComponents(key);

			expect(components).toEqual({
				sourceLang: "en",
				targetLang: "ja",
				hash: "64ec88ca00b268e5ba1a35678a1b5316d212f4f366b2477232534a8aeca37f3c",
			});
		});

		it("should handle complex language codes", () => {
			const key = "zh_cn:zh_tw:9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08";
			const components = extractKeyComponents(key);

			expect(components).toEqual({
				sourceLang: "zh_cn",
				targetLang: "zh_tw",
				hash: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
			});
		});

		it("should throw HashingError for invalid key format", () => {
			const invalidKeys = [
				"en:ja", // Missing hash
				"en:ja:", // Empty hash
				"invalid",
				"en:ja:invalid!hash", // Invalid Base64
			];

			for (const key of invalidKeys) {
				expect(() => extractKeyComponents(key)).toThrow(HashingError);
			}
		});

		it("should throw HashingError for empty and non-string inputs", () => {
			expect(() => extractKeyComponents("")).toThrow(HashingError);
			expect(() => extractKeyComponents(null as any)).toThrow(HashingError);
			expect(() => extractKeyComponents(undefined as any)).toThrow(HashingError);
		});
	});

	describe("validateHash", () => {
		it("should validate correct hash-text pairs", () => {
			const text = "Hello world";
			const hash = generateTextHash(text);

			expect(validateHash(text, hash)).toBe(true);
		});

		it("should reject incorrect hash-text pairs", () => {
			const hash = generateTextHash("Hello world");

			expect(validateHash("Hello universe", hash)).toBe(false);
		});

		it("should reject invalid hash formats", () => {
			const text = "Hello world";
			const invalidHashes = [
				"invalid!hash",
				"",
				"not-base64",
				"!!!@@@###",
			];

			for (const hash of invalidHashes) {
				expect(validateHash(text, hash)).toBe(false);
			}
		});

		it("should handle empty strings", () => {
			const text = "";
			const hash = generateTextHash(text);

			expect(validateHash(text, hash)).toBe(true);
		});

		it("should reject invalid inputs gracefully", () => {
			expect(validateHash(null as any, "hash")).toBe(false);
			expect(validateHash(undefined as any, "hash")).toBe(false);
			expect(validateHash("text", "")).toBe(false);
			expect(validateHash("text", null as any)).toBe(false);
		});
	});

	describe("normalizeLanguageCode", () => {
		it("should normalize language codes", () => {
			const testCases = [
				["EN", "en"],
				["JA", "ja"],
				["ZH_CN", "zh_cn"],
				["  en  ", "en"],
				["ja_JP", "ja_jp"],
			];

			for (const [input, expected] of testCases) {
				expect(normalizeLanguageCode(input)).toBe(expected);
			}
		});

		it("should throw HashingError for invalid language codes", () => {
			const invalidCodes = [
				"",
				"   ",
				"english",
				"japanese",
				"e",
				"toolonglanguagecode",
				"123",
				"en!",
				"zh-CN", // Hyphen not allowed, only underscore
			];

			for (const code of invalidCodes) {
				expect(() => normalizeLanguageCode(code)).toThrow(HashingError);
			}
		});
	});

	describe("areKeysEquivalent", () => {
		it("should return true for identical keys", () => {
			const key = "en:ja:64ec88ca00b268e5ba1a35678a1b5316d212f4f366b2477232534a8aeca37f3c";
			expect(areKeysEquivalent(key, key)).toBe(true);
		});

		it("should return true for equivalent keys with same content", () => {
			const text = "Hello world";
			const key1 = generateKey("en", "ja", text);
			const key2 = generateKey("en", "ja", text);

			expect(areKeysEquivalent(key1, key2)).toBe(true);
		});

		it("should return false for different languages", () => {
			const text = "Hello world";
			const key1 = generateKey("en", "ja", text);
			const key2 = generateKey("ja", "en", text);

			expect(areKeysEquivalent(key1, key2)).toBe(false);
		});

		it("should return false for different content", () => {
			const key1 = generateKey("en", "ja", "Hello world");
			const key2 = generateKey("en", "ja", "Hello universe");

			expect(areKeysEquivalent(key1, key2)).toBe(false);
		});

		it("should return false for invalid keys", () => {
			expect(areKeysEquivalent("invalid", "also-invalid")).toBe(false);
			expect(areKeysEquivalent("en:ja:valid", "invalid")).toBe(false);
		});
	});

	describe("generateBatchHash", () => {
		it("should generate consistent hash for same batch", () => {
			const texts = ["Hello", "world", "test"];
			const hash1 = generateBatchHash(texts);
			const hash2 = generateBatchHash(texts);

			expect(hash1).toBe(hash2);
			expect(hash1).toMatch(HEX_REGEX);
		});

		it("should generate different hashes for different batches", () => {
			const batch1 = ["Hello", "world"];
			const batch2 = ["Hello", "universe"];

			const hash1 = generateBatchHash(batch1);
			const hash2 = generateBatchHash(batch2);

			expect(hash1).not.toBe(hash2);
		});

		it("should generate different hashes for different orders", () => {
			const batch1 = ["Hello", "world"];
			const batch2 = ["world", "Hello"];

			const hash1 = generateBatchHash(batch1);
			const hash2 = generateBatchHash(batch2);

			expect(hash1).not.toBe(hash2);
		});

		it("should handle single item arrays", () => {
			const hash1 = generateTextHash("Hello");
			const hash2 = generateBatchHash(["Hello"]);

			// Note: These won't be equal because batch hashing adds delimiters
			expect(hash1).toMatch(HEX_REGEX);
			expect(hash2).toMatch(HEX_REGEX);
		});

		it("should throw HashingError for non-array input", () => {
			expect(() => generateBatchHash(null as any)).toThrow(HashingError);
			expect(() => generateBatchHash(undefined as any)).toThrow(HashingError);
			expect(() => generateBatchHash("string" as any)).toThrow(HashingError);
		});

		it("should throw HashingError for empty array", () => {
			expect(() => generateBatchHash([])).toThrow(HashingError);
		});

		it("should throw HashingError for arrays with non-string elements", () => {
			expect(() => generateBatchHash(["valid", 123, "valid"])).toThrow(HashingError);
			expect(() => generateBatchHash([null, "valid"])).toThrow(HashingError);
		});
	});

	describe("constants and regex patterns", () => {
		it("should export correct constants", () => {
			expect(KEY_SEPARATOR).toBe(":");
			expect(typeof KEY_FORMAT_REGEX).toBe("object");
			expect(typeof HEX_REGEX).toBe("object");
		});

		it("should have working regex patterns", () => {
			// Test key format regex
			expect(KEY_FORMAT_REGEX.test("en:ja:64ec88ca00b268e5ba1a35678a1b5316d212f4f366b2477232534a8aeca37f3c")).toBe(true);
			expect(KEY_FORMAT_REGEX.test("zh_cn:zh_tw:9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08")).toBe(true);
			expect(KEY_FORMAT_REGEX.test("invalid")).toBe(false);
			expect(KEY_FORMAT_REGEX.test("en:ja:")).toBe(false);

			// Test hex regex
			expect(HEX_REGEX.test("64ec88ca00b268e5ba1a35678a1b5316d212f4f366b2477232534a8aeca37f3c")).toBe(true);
			expect(HEX_REGEX.test("9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08")).toBe(true);
			expect(HEX_REGEX.test("invalid!hash")).toBe(false);
			expect(HEX_REGEX.test("")).toBe(false);
		});
	});

	describe("HashingError", () => {
		it("should create proper error instances", () => {
			const message = "Test error";
			const cause = new Error("Original error");
			const error = new HashingError(message, cause);

			expect(error).toBeInstanceOf(Error);
			expect(error).toBeInstanceOf(HashingError);
			expect(error.name).toBe("HashingError");
			expect(error.message).toBe(message);
			expect(error.cause).toBe(cause);
		});
	});

	describe("edge cases and special scenarios", () => {
		it("should handle very long text content", () => {
			const longText = "Hello ".repeat(10_000);
			const hash = generateTextHash(longText);
			const key = generateKey("en", "ja", longText);

			expect(hash).toMatch(HEX_REGEX);
			expect(validateKey(key)).toBe(true);
		});

		it("should handle text with only whitespace", () => {
			const whitespaceTexts = [" ", "\t", "\n", "   ", "\t\n\r   "];

			for (const text of whitespaceTexts) {
				const hash = generateTextHash(text);
				const key = generateKey("en", "ja", text);

				expect(hash).toMatch(HEX_REGEX);
				expect(validateKey(key)).toBe(true);
			}
		});

		it("should handle Unicode and edge case characters", () => {
			const edgeTexts = [
				"\0", // Null byte
				"\u0000\u0001\u0002", // Control characters
				"𝓗𝓮𝓵𝓵𝓸", // Mathematical script
				"👍🏽👎🏿", // Emoji with skin tone modifiers
			];

			for (const text of edgeTexts) {
				const hash = generateTextHash(text);
				expect(hash).toMatch(HEX_REGEX);
			}
		});

		it("should be deterministic across different encoding options", () => {
			const text = "Hello world";

			const hash1 = generateTextHash(text, { algorithm: "sha256", encoding: "base64" });
			const hash2 = generateTextHash(text, { algorithm: "sha256", encoding: "base64" });

			expect(hash1).toBe(hash2);
		});
	});
});