/* eslint-disable no-console, @typescript-eslint/restrict-template-expressions, barrel-files/avoid-namespace-import */
/**
 * Example usage of TranslationStore core operations
 *
 * This file demonstrates the newly implemented set(), get(), and getByText() methods
 * with TTL support, access tracking, and comprehensive error handling.
 */

import * as fs from "node:fs/promises";
import path from "node:path";

import { SupportedLanguage } from "../types";

import { TranslationStore, type StoreConfiguration } from "./translation-store";


async function example(): Promise<void> {
	console.log("🚀 TranslationStore Example - Core Operations\n");

	// Create a temporary directory for the example
	const tempDir = path.join(process.cwd(), ".temp-translation-store-" + Date.now());

	// Store configuration
	const config: StoreConfiguration = {
		storagePath: tempDir,
		maxEntries: 100,
		maxSizeBytes: 10 * 1024 * 1024, // 10MB
		compressionThreshold: 512,
		memoryCacheSize: 50,
		syncInterval: 5000,
		lockTimeout: 3000,
		defaultTTL: 60_000, // 1 minute
		enableCompression: true,
		enableMetrics: true,
	};

	try {
		// Initialize the store
		const store = new TranslationStore(config);
		await store.initialize();

		console.log("✅ Store initialized successfully");

		// Example 1: Store a translation with metadata
		console.log("\n📝 Example 1: Storing translation");
		const key1 = await store.set(
			"Hello world",
			"こんにちは世界",
			"en",
			"ja",
			{
				confidence: 0.95,
				apiProvider: "openai",
				ttl: 120_000, // 2 minutes
			},
		);
		console.log(`   Stored translation with key: ${key1.slice(0, 20)}...`);

		// Example 2: Store another translation without metadata
		console.log("\n📝 Example 2: Storing translation without metadata");
		const key2 = await store.set(
			"Good morning",
			"おはようございます",
			"en",
			"ja",
		);
		console.log(`   Stored translation with key: ${key2.slice(0, 20)}...`);

		// Example 3: Retrieve translation by key
		console.log("\n🔍 Example 3: Retrieving translation by key");
		const entry1 = await store.get(key1);
		if (entry1) {
			console.log(`   Found: "${entry1.originalText}" -> "${entry1.translatedText}"`);
			console.log(`   Confidence: ${entry1.confidence}, Access count: ${entry1.accessCount}`);
			console.log(`   Created: ${new Date(entry1.createdAt).toISOString()}`);
			console.log(`   Last accessed: ${new Date(entry1.accessedAt).toISOString()}`);
		} else {
			console.log("   Translation not found");
		}

		// Example 4: Retrieve translation by text
		console.log("\n🔍 Example 4: Retrieving translation by text");
		const entry2 = await store.getByText("Good morning", "en", "ja");
		if (entry2) {
			console.log(`   Found: "${entry2.originalText}" -> "${entry2.translatedText}"`);
			console.log(`   Access count: ${entry2.accessCount}`);
		} else {
			console.log("   Translation not found");
		}

		// Example 5: Access tracking (retrieve the same entry again)
		console.log("\n🔍 Example 5: Access tracking");
		const entry3 = await store.get(key1); // This should increment access count
		if (entry3) {
			console.log(`   Access count after second retrieval: ${entry3.accessCount}`);
			console.log(`   Last accessed time updated: ${new Date(entry3.accessedAt).toISOString()}`);
		}

		// Example 6: Non-existent translation
		console.log("\n🔍 Example 6: Non-existent translation");
		const notFound = await store.getByText("Nonexistent text", "en", "ja");
		console.log(`   Non-existent lookup result: ${notFound}`);

		// Example 7: Error handling with invalid parameters
		console.log("\n❌ Example 7: Error handling");
		try {
			// This should throw a validation error
			await store.set("", "translation", "en", "ja");
		} catch (error) {
			if (error instanceof Error) {
				console.log(`   Expected error caught: ${error.message}`);
			}
		}

		// Display store statistics
		console.log("\n📊 Store Statistics:");
		const stats = store.getStatistics();
		console.log(`   Total entries: ${stats.totalEntries}`);
		console.log(`   Total lookups: ${stats.totalLookups}`);
		console.log(`   Total writes: ${stats.totalWrites}`);
		console.log(`   Cache hit rate: ${(stats.hitRate * 100).toFixed(2)}%`);
		console.log(`   Disk usage: ${(stats.diskUsageBytes / 1024).toFixed(2)} KB`);
		console.log(`   Average lookup time: ${stats.averageLookupTime.toFixed(2)} ms`);
		console.log(`   Average write time: ${stats.averageWriteTime.toFixed(2)} ms`);

		// Display health status
		console.log("\n🏥 Store Health:");
		const health = store.getHealth();
		console.log(`   Status: ${health.status}`);
		console.log(`   Errors: ${health.errors.length}`);
		console.log(`   Warnings: ${health.warnings.length}`);

		console.log("\n✅ Example completed successfully!");

	} catch (error) {
		console.error("❌ Example failed:", error);
		throw error;
	} finally {
		// Cleanup: remove temporary directory
		try {
			await fs.rm(tempDir, { recursive: true, force: true });
			console.log("\n🧹 Cleaned up temporary directory");
		} catch (cleanupError) {
			console.warn("⚠️  Warning: Could not clean up temporary directory:", cleanupError);
		}
	}
}

// Run the example if this file is executed directly
if (require.main === module) {
	example().catch(console.error);
}

export { example as translationStoreExample };