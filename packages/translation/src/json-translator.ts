import { DEFAULT_TRANSLATION_OPTIONS } from "./constants";
import { TranslationServiceError } from "./errors";
import { log } from "./logger";
import { TranslationService } from "./translator";
import {
	JsonTranslationOptions,
	SupportedLanguage,
} from "./types";

// Type definitions for JSON translation
type TranslatableValue =
	| string
	| number
	| boolean
	| null
	| undefined
	| TranslatableObject
	| TranslatableArray;

interface TranslatableObject {
	[key: string]: TranslatableValue;
}

type TranslatableArray = Array<TranslatableValue>;

/**
 * JSON translation utility for translating objects and arrays
 */
export class JsonTranslator {
	private translator: TranslationService;

	constructor(translator?: TranslationService) {
		this.translator = translator || new TranslationService();
	}

	/**
   * Translate a JSON object, array, or value recursively
   */
	async translateJson(
		data: TranslatableValue,
		targetLanguage: SupportedLanguage = "en",
		options: Partial<JsonTranslationOptions> = {},
	): Promise<TranslatableValue> {
		const finalOptions: JsonTranslationOptions = {
			...DEFAULT_TRANSLATION_OPTIONS,
			translateKeys: false,
			ignoredKeys: [],
			ignoredPatterns: [],
			preserveNumbers: true,
			preserveBooleans: true,
			...options,
			targetLanguage,
		};

		try {
			return await this.translateValue(data, finalOptions);
		} catch (error) {
			if (error instanceof TranslationServiceError) {
				throw error;
			}
			throw TranslationServiceError.fromNetworkError(error);
		}
	}

	/**
   * Translate a value (string, number, boolean, object, or array)
   */
	private async translateValue(
		value: TranslatableValue,
		options: JsonTranslationOptions,
		context: string[] = [],
	): Promise<TranslatableValue> {
		// Handle null and undefined
		if (value === null || value === undefined) {
			return value;
		}

		// Handle primitive types
		if (typeof value === "number") {
			return options.preserveNumbers ? value : String(value);
		}

		if (typeof value === "boolean") {
			return options.preserveBooleans ? value : String(value);
		}

		if (typeof value === "string") {
			return await this.translateString(value, options, context);
		}

		// Handle arrays
		if (Array.isArray(value)) {
			return await this.translateArray(value, options, context);
		}

		// Handle objects
		if (typeof value === "object") {
			return await this.translateObject(value, options, context);
		}

		// Fallback for other types
		return value;
	}

	/**
   * Translate a string value
   */
	private async translateString(
		text: string,
		options: JsonTranslationOptions,
		_context: string[],
	): Promise<string> {
		// Skip empty strings
		if (!text.trim()) {
			return text;
		}

		// Skip if it looks like a number, boolean, or code
		if (this.shouldSkipTranslation(text)) {
			return text;
		}

		try {
			// Check if text contains multiple lines or complex structure
			if (this.isComplexText(text)) {
				return await this.translateComplexText(text, options);
			}

			// Simple string translation
			const result = await this.translator.translateText(
				text,
        options.targetLanguage as SupportedLanguage,
        options.sourceLanguage,
			);

			return result.translated;
		} catch (error) {
			// Log error but return original text to avoid breaking the entire translation
			log.warn(`Failed to translate text: "${text}"`, error, "JSON Translation");
			return text;
		}
	}

	/**
   * Translate an array
   */
	private async translateArray(
		array: TranslatableArray,
		options: JsonTranslationOptions,
		context: string[],
	): Promise<TranslatableArray> {
		const translatedArray: TranslatableArray = [];

		for (const [i, item] of array.entries()) {
			const newContext = [...context, `[${i}]`];

			try {
				const translatedItem = await this.translateValue(item, options, newContext);
				translatedArray.push(translatedItem);
			} catch (error) {
				log.warn(`Failed to translate array item at index ${i}`, error, "JSON Translation");
				translatedArray.push(item); // Keep original item on error
			}
		}

		return translatedArray;
	}

	/**
   * Translate an object
   */
	private async translateObject(
		obj: TranslatableObject,
		options: JsonTranslationOptions,
		context: string[],
	): Promise<TranslatableObject> {
		const translatedObject: TranslatableObject = {};

		for (const [key, value] of Object.entries(obj)) {
			const newContext = [...context, key];

			try {
				// Check if key should be ignored
				if (this.shouldIgnoreKey(key, options)) {
					translatedObject[key] = value;
					continue;
				}

				// Translate key if requested
				const translatedKey = options.translateKeys
					? await this.translateKey(key, options, newContext)
					: key;

				// Translate value
				const translatedValue = await this.translateValue(value, options, newContext);

				translatedObject[translatedKey] = translatedValue;
			} catch (error) {
				log.warn(`Failed to translate object property: "${key}"`, error, "JSON Translation");
				translatedObject[key] = value; // Keep original key/value on error
			}
		}

		return translatedObject;
	}

	/**
   * Translate an object key
   */
	private async translateKey(
		key: string,
		options: JsonTranslationOptions,
		_context: string[],
	): Promise<string> {
		// Skip translation for keys that look like identifiers
		if (this.shouldSkipKeyTranslation(key)) {
			return key;
		}

		try {
			const result = await this.translator.translateText(
				key,
        options.targetLanguage as SupportedLanguage,
        options.sourceLanguage,
			);

			// Sanitize translated key to be a valid object key
			return this.sanitizeKey(result.translated);
		} catch (error) {
			log.warn(`Failed to translate key: "${key}"`, error, "JSON Translation");
			return key;
		}
	}

	/**
   * Check if a key should be ignored based on options
   */
	private shouldIgnoreKey(key: string, options: JsonTranslationOptions): boolean {
		// Check ignored keys list
		if (options.ignoredKeys.includes(key)) {
			return true;
		}

		// Check ignored patterns
		for (const pattern of options.ignoredPatterns) {
			if (pattern.test(key)) {
				return true;
			}
		}

		// Additional heuristics
		if (key.startsWith("_") || key.startsWith("$")) {
			return true; // Private or special properties
		}

		if (/^[a-z]+[A-Z][a-zA-Z]*$/.test(key)) {
			return true; // camelCase - likely a property name
		}

		if (/^[A-Z][a-zA-Z]*$/.test(key)) {
			return true; // PascalCase - likely a class/interface name
		}

		if (/^[a-z_]+[a-z0-9_]*$/.test(key)) {
			return true; // snake_case - likely a field name
		}

		return false;
	}

	/**
   * Check if a string should be skipped during translation
   */
	private shouldSkipTranslation(text: string): boolean {
		// Skip if it's just numbers, special characters, or code-like
		if (/^[\d\s\-._+,]+$/.test(text)) {
			return true;
		}

		// Skip if it looks like an identifier
		if (/^[a-z_][a-z0-9_]*$/i.test(text)) {
			return true;
		}

		// Skip if it's very short and contains only letters
		if (text.length <= 2 && /^[a-zA-Z]+$/.test(text)) {
			return true;
		}

		// Skip if it looks like a URL or path
		if (text.includes("http://") || text.includes("https://") || text.includes("://")) {
			return true;
		}

		// Skip if it looks like a file path
		if (text.includes("/") && text.includes(".")) {
			return true;
		}

		return false;
	}

	/**
   * Check if a key should be skipped during translation
   */
	private shouldSkipKeyTranslation(key: string): boolean {
		// Skip keys that are already in English or look like code identifiers
		if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key)) {
			return true;
		}

		return false;
	}

	/**
   * Check if text is complex (multiple lines, lists, etc.)
   */
	private isComplexText(text: string): boolean {
		// Multiple lines
		if (text.includes("\n") && text.split("\n").length > 1) {
			return true;
		}

		// Bullet points or numbered lists
		if (/^[•·‣⁃]\s|[0-9]+[.)]\s/m.test(text)) {
			return true;
		}

		// Multiple sentences
		const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
		if (sentences.length > 1) {
			return true;
		}

		return false;
	}

	/**
   * Translate complex text (multiple lines, lists, etc.)
   */
	private async translateComplexText(
		text: string,
		options: JsonTranslationOptions,
	): Promise<string> {
		// Split by lines and translate each line
		const lines = text.split("\n");
		const translatedLines: string[] = [];

		for (const line of lines) {
			const trimmedLine = line.trim();

			// Skip empty lines
			if (!trimmedLine) {
				translatedLines.push(line);
				continue;
			}

			// Skip lines that should not be translated
			if (this.shouldSkipTranslation(trimmedLine)) {
				translatedLines.push(line);
				continue;
			}

			try {
				const result = await this.translator.translateText(
					trimmedLine,
          options.targetLanguage as SupportedLanguage,
          options.sourceLanguage,
				);

				// Preserve original indentation
				const indentation = line.match(/^\s*/)?.[0] || "";
				translatedLines.push(indentation + result.translated);
			} catch (error) {
				log.warn(`Failed to translate line: "${trimmedLine}"`, error, "JSON Translation");
				translatedLines.push(line);
			}
		}

		return translatedLines.join("\n");
	}

	/**
   * Sanitize translated key to be a valid object key
   */
	private sanitizeKey(key: string): string {
		// Remove invalid characters and replace with underscores
		let sanitized = key.replaceAll(/[^a-zA-Z0-9_$]/g, "_");

		// Ensure it doesn't start with a number
		if (/^[0-9]/.test(sanitized)) {
			sanitized = `_${sanitized}`;
		}

		// Prevent empty keys
		if (!sanitized) {
			sanitized = "translated";
		}

		return sanitized;
	}
}

/**
 * Default JSON translator instance
 */
export const defaultJsonTranslator = new JsonTranslator();

/**
 * Convenience function for JSON translation
 */
export async function translateJson(
	data: TranslatableValue,
	targetLanguage: SupportedLanguage = "en",
	options?: Partial<JsonTranslationOptions>,
): Promise<TranslatableValue> {
	return defaultJsonTranslator.translateJson(data, targetLanguage, options);
}