/* eslint-disable @typescript-eslint/restrict-template-expressions, sonarjs/no-duplicate-string */
/**
 * Example usage of the translation package for Gunpla data
 */

// Node.js globals for when this file is executed directly
import { logger } from "./logger";
import {
	translateText,
	translateJson,
	translateBatch,
	TranslationService,
	createCache,
	TranslationServiceError,
} from "./mod";

// Configure logger for examples - always enabled for demo purposes
logger.updateConfig({
	enabled: true,
	level: "info",
	prefix: "[Examples]",
});

/**
 * Example 1: Basic text translation
 */
export async function basicTextTranslation() {
	logger.info("=== Basic Text Translation ===");

	const examples = [
		"HG 1/144 RX-78-2 ガンダム",
		"MG 1/100 νガンダム",
		"PG 1/60 ストライクフリーダムガンダム",
		"機動戦士ガンダム SEED DESTINY",
		"ランナーAと説明書が含まれています",
	];

	for (const text of examples) {
		const result = await translateText(text, "en");
		logger.info(`${text} → ${result.translated}`);
		logger.info(`  Source: ${result.sourceLanguage}, Cached: ${result.cached}`);
	}
}

/**
 * Example 2: Batch translation
 */
export async function batchTranslationExample() {
	logger.info("\n=== Batch Translation ===");

	const texts = [
		"HG 1/144 RX-78-2 ガンダム",
		"MG 1/100 νガンダム",
		"PG 1/60 ストライクフリーダムガンダム",
		"RG 1/144 ウイングガンダム EW",
		"SDCS 1/144 ガンダム",
	];

	const results = await translateBatch(texts, "en");

	logger.info(`Translated ${results.successCount}/${results.totalCount} texts`);
	logger.info(`Processing time: ${results.processingTime}ms`);

	for (const [index, result] of results.results.entries()) {
		logger.info(`${index + 1}. ${result.original} → ${result.translated}`);
	}
}

/**
 * Example 3: JSON translation for Gunpla product data
 */
export async function jsonTranslationExample() {
	logger.info("\n=== JSON Translation Example ===");

	const gunplaProduct = {
		id: "bg-000001",
		name: "HG 1/144 RX-78-2 ガンダム",
		series: "機動戦士ガンダム",
		description: "一年戦争時における地球連邦軍の試作モビルスーツ。アムロ・レイが搭乗したことで伝説となる。",
		specifications: {
			scale: "1/144",
			grade: "HG",
			height_mm: 180,
			price_yen: 1200,
			release_date: "2023-12-01",
			parts_count: 120,
		},
		accessories: [
			"ビーム・ライフル",
			"ハイパー・バズーカ",
			"シールド",
			"ビーム・サーベル × 2",
		],
		runner_details: {
			"ランナーA": "胴体、腕",
			"ランナーB": "脚、腰部",
			"ランナーC": "武器、アクセサリー",
		},
		manual_included: true,
		pdf_url: "https://bandai-hobby.net/manual/rx78-2.pdf",
	};

	const translated = await translateJson(gunplaProduct, "en", {
		translateKeys: true, // Translate object keys too
		ignoredKeys: ["id", "pdf_url", "manual_included"], // Keep these as-is
		preserveNumbers: true,
	});

	logger.info("Original:", JSON.stringify(gunplaProduct, null, 2));
	logger.info("Translated:", JSON.stringify(translated, null, 2));
}

/**
 * Example 4: Custom translation service with caching
 */
export async function customServiceExample() {
	logger.info("\n=== Custom Service Example ===");

	// Create custom cache
	const cache = createCache({
		maxSize: 1000,
		defaultTtl: 1000 * 60 * 60 * 24, // 24 hours
		enablePeriodicCleanup: true,
	});

	// Create custom translator
	const translator = new TranslationService(
		{
			cacheEnabled: true,
			cacheTtl: 1000 * 60 * 60 * 24, // 24 hours
			retryAttempts: 5,
			retryDelay: 2000,
			timeout: 15_000,
			batchSize: 20,
		},
		cache,
	);

	// Translate some text
	logger.info("First translation (should hit API):");
	const result1 = await translator.translateText("HG 1/144 ガンダム", "en");
	logger.info(`Result: ${result1.translated}, Cached: ${result1.cached}`);

	logger.info("\nSecond translation (should hit cache):");
	const result2 = await translator.translateText("HG 1/144 ガンダム", "en");
	logger.info(`Result: ${result2.translated}, Cached: ${result2.cached}`);

	// Show statistics
	logger.info("\nCache Statistics:");
	logger.info(JSON.stringify(translator.getCacheStats(), null, 2));

	logger.info("\nCircuit Breaker Status:");
	logger.info(JSON.stringify(translator.getCircuitBreakerStatus(), null, 2));
}

/**
 * Example 5: Error handling
 */
export async function errorHandlingExample() {
	logger.info("\n=== Error Handling Example ===");

	const translator = new TranslationService({
		timeout: 100, // Very short timeout to trigger error
		retryAttempts: 2,
	});

	try {
		// This might fail due to timeout or network issues
		const result = await translator.translateText("これは長いテキストです", "en");
		logger.info(`Translation successful: ${result.translated}`);
	} catch (error) {
		logger.info("Translation failed:", error instanceof Error ? error.message : String(error));

		if (error instanceof TranslationServiceError) {
			logger.info("Error code:", error.code);
			logger.info("Is retryable:", error.isRetryable);
			logger.info("Recommended delay:", error.recommendedRetryDelay);
		}
	}
}

/**
 * Example 6: Translating complex nested structures
 */
export async function complexStructureExample() {
	logger.info("\n=== Complex Structure Example ===");

	const catalogData = {
		categories: [
			{
				id: "hg",
				name: "HG (High Grade)",
				description: "1/144スケールの高品質キット",
				products: [
					{
						name: "HG 1/144 RX-78-2 ガンダム",
						price: 1200,
						tags: ["主人公機", "一年戦争", "アムロ専用機"],
					},
					{
						name: "HG 1/144 ザクII",
						price: 1100,
						tags: ["ジオン軍", "量産機", "シャア専用機"],
					},
				],
			},
			{
				id: "mg",
				name: "MG (Master Grade)",
				description: "1/100スケールの詳細なキット",
				products: [
					{
						name: "MG 1/100 νガンダム",
						price: 7500,
						tags: ["主人公機", "逆襲のシャア", "サイコフレーム"],
					},
				],
			},
		],
		total_products: 3,
		last_updated: "2023-12-01T10:00:00Z",
	};

	const translated = await translateJson(catalogData, "en", {
		translateKeys: true,
		ignoredKeys: ["id", "price", "last_updated"],
	});

	logger.info("Translated catalog:");
	logger.info(JSON.stringify(translated, null, 2));
}

/**
 * Run all examples
 */
export async function runAllExamples() {
	logger.info("Translation Package Examples for Gunpla Data\n");

	try {
		await basicTextTranslation();
		await batchTranslationExample();
		await jsonTranslationExample();
		await customServiceExample();
		await errorHandlingExample();
		await complexStructureExample();

		logger.info("\n✅ All examples completed successfully!");
	} catch (error) {
		logger.error("\n❌ Error running examples:", error);
	}
}

// Run examples if this file is executed directly
if (require.main === module) {
	await runAllExamples();
}