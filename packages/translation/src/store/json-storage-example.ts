/**
 * Example usage of JSONStorage for atomic file operations
 */

import { JSONStorage, JSONStorageError } from './json-storage';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

/**
 * Example demonstrating basic JSONStorage usage
 */
export async function basicStorageExample(): Promise<void> {
	console.log('🗂️  JSONStorage Basic Example');
	console.log('================================');

	// Create storage instance with custom configuration
	const storage = new JSONStorage({
		compressionThreshold: 512, // Compress files >512 bytes
		lockTimeout: 3000, // 3 second lock timeout
		lockRetryInterval: 100, // Retry every 100ms
		maxLockRetries: 30,
		tempFilePrefix: '.example-tmp-',
		verifyIntegrity: true, // Enable integrity checking
		cleanupStaleLocks: true
	});

	// Example data
	const translationData = {
		id: 'gundam_rx78_2',
		name: 'RX-78-2 Gundam',
		series: 'Mobile Suit Gundam',
		grade: 'MG',
		scale: '1:100',
		price: 4500,
		description: 'The legendary RX-78-2 Gundam, the original mobile suit from the first Gundam series. This Master Grade kit features detailed articulation and realistic proportions.',
		tags: ['protagonist', 'universal century', 'earth federation'],
		specifications: {
			height: '18.0m',
			weight: '43.4t',
			armor: 'Luna Titanium',
			powerSource: 'Minovsky Ultracompact Fusion Reactor'
		},
		equipment: [
			'Beam Rifle',
			'Beam Saber x2',
			'Shield',
			'Gundam Hammer'
		]
	};

	try {
		// Create test file path
		const testFile = join(tmpdir(), `gundma-example-${Date.now()}.json`);

		console.log('📝 Writing translation data...');

		// Write data to file
		const writeResult = await storage.writeJSON(testFile, translationData);

		console.log('✅ Write successful!');
		console.log(`   File: ${writeResult.filePath}`);
		console.log(`   Compressed: ${writeResult.compressed}`);
		console.log(`   Compression format: ${writeResult.compressionFormat}`);
		console.log(`   Original size: ${writeResult.originalSize} bytes`);
		console.log(`   Final size: ${writeResult.fileSize} bytes`);
		console.log(`   Compression ratio: ${writeResult.compressionRatio.toFixed(2)}`);
		console.log(`   Checksum: ${writeResult.checksum}`);

		console.log('\n📖 Reading data back...');

		// Read data from file
		const readData = await storage.readJSON(testFile);

		console.log('✅ Read successful!');
		console.log(`   Data: ${(readData as any).name} - ${(readData as any).series}`);

		// Verify data integrity
		if (JSON.stringify(readData) === JSON.stringify(translationData)) {
			console.log('✅ Data integrity verified!');
		} else {
			console.log('❌ Data integrity check failed!');
		}

		// Get storage statistics
		const stats = storage.getStatistics();
		console.log('\n📊 Storage Statistics:');
		console.log(`   Total operations: ${stats.totalOperations}`);
		console.log(`   Write operations: ${stats.writeOperations}`);
		console.log(`   Read operations: ${stats.readOperations}`);
		console.log(`   Lock acquisitions: ${stats.lockAcquisitions}`);
		console.log(`   Compression operations: ${stats.compressionOperations}`);
		console.log(`   Integrity verifications: ${stats.integrityVerifications}`);
		console.log(`   Total bytes written: ${stats.totalBytesWritten}`);
		console.log(`   Total bytes read: ${stats.totalBytesRead}`);

		console.log('\n🗑️  Cleaning up...');

		// Clean up test file
		await storage.deleteFile(testFile);
		console.log('✅ Test file deleted');

	} catch (error) {
		if (error instanceof JSONStorageError) {
			console.error(`❌ Storage Error [${error.code}]: ${error.message}`);
			if (error.filePath) {
				console.error(`   File: ${error.filePath}`);
			}
			if (error.originalError) {
				console.error(`   Cause: ${error.originalError}`);
			}
		} else {
			console.error('❌ Unexpected error:', error);
		}
	}
}

/**
 * Example demonstrating concurrent access handling
 */
export async function concurrentAccessExample(): Promise<void> {
	console.log('\n🔄 JSONStorage Concurrent Access Example');
	console.log('=====================================');

	const storage = new JSONStorage();
	const testFile = join(tmpdir(), `concurrent-example-${Date.now()}.json`);

	try {
		// Create multiple concurrent operations
		const promises: Promise<any>[] = [];

		// Simulate multiple processes writing different data
		for (let i = 0; i < 5; i++) {
			const data = {
				processId: i,
				timestamp: Date.now(),
				message: `Process ${i} data`,
				priority: i % 3 === 0 ? 'high' : 'normal'
			};

			promises.push(
				storage.writeJSON(`${testFile}-${i}.json`, data)
					.then(() => console.log(`✅ Process ${i} write complete`))
					.catch((error) => console.error(`❌ Process ${i} write failed:`, error.message))
			);
		}

		// Wait for all operations to complete
		await Promise.all(promises);

		// Read back all files
		console.log('\n📖 Reading concurrent data...');
		for (let i = 0; i < 5; i++) {
			try {
				const data = await storage.readJSON(`${testFile}-${i}.json`);
				console.log(`✅ Process ${(data as any).processId}: ${(data as any).message}`);
			} catch (error) {
				console.error(`❌ Failed to read process ${i} data:`, error);
			}
		}

		// Clean up
		for (let i = 0; i < 5; i++) {
			try {
				await storage.deleteFile(`${testFile}-${i}.json`);
			} catch {
				// Ignore cleanup errors
			}
		}

		console.log('✅ Concurrent example completed');

	} catch (error) {
		console.error('❌ Concurrent example failed:', error);
	}
}

/**
 * Example demonstrating error handling and recovery
 */
export async function errorHandlingExample(): Promise<void> {
	console.log('\n⚠️  JSONStorage Error Handling Example');
	console.log('=====================================');

	const storage = new JSONStorage();
	const testFile = join(tmpdir(), `error-example-${Date.now()}.json`);

	try {
		console.log('🧪 Testing error handling...');

		// Test 1: Reading non-existent file
		try {
			await storage.readJSON(testFile);
			console.log('❌ Should have thrown error for non-existent file');
		} catch (error) {
			if (error instanceof JSONStorageError && error.code === 'FILE_NOT_FOUND') {
				console.log('✅ Correctly detected non-existent file');
			} else {
				console.log('❌ Unexpected error:', error);
			}
		}

		// Test 2: Writing circular reference (should fail JSON serialization)
		try {
			const circular: any = { name: 'test' };
			circular.self = circular;

			await storage.writeJSON(testFile, circular);
			console.log('❌ Should have thrown error for circular reference');
		} catch (error) {
			if (error instanceof JSONStorageError) {
				console.log('✅ Correctly detected circular reference');
			} else {
				console.log('❌ Unexpected error:', error);
			}
		}

		// Test 3: File tampering detection
		console.log('🔍 Testing tampering detection...');
		const validData = { message: 'This file will be tampered with' };

		await storage.writeJSON(testFile, validData);

		// Tamper with the file
		const { writeFile } = await import('node:fs/promises');
		await writeFile(testFile, 'tampered content');

		try {
			await storage.readJSON(testFile);
			console.log('❌ Should have detected file tampering');
		} catch (error) {
			if (error instanceof JSONStorageError) {
				console.log('✅ Correctly detected file tampering');
			} else {
				console.log('❌ Unexpected error:', error);
			}
		}

		console.log('✅ Error handling example completed');

	} catch (error) {
		console.error('❌ Error handling example failed:', error);
	} finally {
		// Clean up
		try {
			await storage.deleteFile(testFile);
		} catch {
			// Ignore cleanup errors
		}
	}
}

/**
 * Run all examples
 */
export async function runAllExamples(): Promise<void> {
	console.log('🚀 JSONStorage Examples Suite');
	console.log('=============================\n');

	await basicStorageExample();
	await concurrentAccessExample();
	await errorHandlingExample();

	console.log('\n🎉 All examples completed!');
}

// Run examples if this file is executed directly
if (require.main === module) {
	runAllExamples().catch(console.error);
}