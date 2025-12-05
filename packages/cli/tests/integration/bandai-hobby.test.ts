import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import * as path from 'path';
import { CheckpointManager } from '../../../src/utils/checkpoint';

// Simple execFile utility for testing
async function execFileNoThrow(command: string, args: string[]) {
    try {
        const { spawn } = await import('child_process');
        return new Promise((resolve) => {
            const child = spawn(command, args, { stdio: 'pipe' });
            let stdout = '';
            let stderr = '';

            child.stdout?.on('data', (data) => {
                stdout += data.toString();
            });

            child.stderr?.on('data', (data) => {
                stderr += data.toString();
            });

            child.on('close', (code) => {
                resolve({
                    status: code || 0,
                    stdout: stdout.trim(),
                    stderr: stderr.trim()
                });
            });
        });
    } catch (error) {
        return {
            status: 1,
            stdout: '',
            stderr: error instanceof Error ? error.message : String(error)
        };
    }
}

// Mock data for testing
const mockBandaiHobbyHtml = `
<!DOCTYPE html>
<html lang="ja">
<head>
    <title>HG 1/144 ガンダムエアリアル | バンダイホビーサイト</title>
    <meta charset="UTF-8">
</head>
<body>
    <div class="product-title">
        <h1>HG 1/144 ガンダムエアリアル</h1>
    </div>
    <div class="item-sku">
        <span class="sku">BAN203512</span>
    </div>
    <div class="product-price">
        <span class="price">¥1,760</span>
    </div>
    <div class="product-description">
        <p>ガンダムエアリアルのHGプラモデルです。詳細な仕様と組み立て説明。</p>
    </div>
    <div class="specifications">
        <table>
            <tr><th>スケール</th><td>1/144</td></tr>
            <tr><th>価格</th><td>1,760円</td></tr>
            <tr><th>発売日</th><td>2023年12月</td></tr>
        </table>
    </div>
    <div class="product-images">
        <img class="product-image" src="https://bandai-hobby.net/images/main.jpg" alt="メイン画像">
        <img class="gallery-image" src="https://bandai-hobby.net/images/gallery1.jpg" alt="ギャラリー1">
    </div>
    <nav class="breadcrumb">
        <a href="/">トップ</a>
        <a href="/category/gundam/">ガンダムシリーズ</a>
        <a href="/category/hg/">HG</a>
    </nav>
</body>
</html>
`;

const mockAnotherProductHtml = `
<!DOCTYPE html>
<html lang="ja">
<head>
    <title>RG 1/144 ガンダムエクシア | バンダイホビーサイト</title>
    <meta charset="UTF-8">
</head>
<body>
    <div class="product-title">
        <h1>RG 1/144 ガンダムエクシア</h1>
    </div>
    <div class="item-sku">
        <span class="sku">BAN48754</span>
    </div>
    <div class="product-price">
        <span class="price">¥3,300</span>
    </div>
    <div class="product-description">
        <p>ガンダムエクシアのRGプラモデルです。</p>
    </div>
</body>
</html>
`;

// Mock fetch for network requests
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Bandai Hobby Integration Tests', () => {
    let tempDir: string;
    let testOutputDir: string;
    let checkpointManager: CheckpointManager;
    const testUrls = [
        'https://bandai-hobby.net/site/hg-1-144-gundam-aerial/',
        'https://bandai-hobby.net/site/rg-1-144-gundam-exia/'
    ];

    beforeEach(async () => {
        // Create temporary directories for testing
        tempDir = await fs.mkdtemp('bandai-hobby-test-');
        testOutputDir = path.join(tempDir, 'output');
        await fs.mkdir(testOutputDir, { recursive: true });

        checkpointManager = new CheckpointManager({
            checkpointFile: path.join(tempDir, 'checkpoint.json')
        });

        // Mock successful fetch responses
        mockFetch.mockImplementation((url) => {
            if (url.includes('gundam-aerial')) {
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    text: () => Promise.resolve(mockBandaiHobbyHtml)
                } as Response);
            } else if (url.includes('gundam-exia')) {
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    text: () => Promise.resolve(mockAnotherProductHtml)
                } as Response);
            }
            return Promise.resolve({
                ok: false,
                status: 404,
                statusText: 'Not Found'
            } as Response);
        });

        // Clear checkpoint file
        try {
            await checkpointManager.deleteCheckpoint();
        } catch {
            // Ignore if file doesn't exist
        }
    });

    afterEach(async () => {
        // Clean up temporary directories
        try {
            await fs.rm(tempDir, { recursive: true, force: true });
        } catch {
            // Ignore cleanup errors
        }

        vi.clearAllMocks();
    });

    describe('CLI Command Integration', () => {
        it('should execute scrape command with bandai-hobby source', async () => {
            const cliPath = path.resolve(process.cwd(), 'dist/packages/cli/index.js');

            // Create a simple test script that imports and tests the CLI
            const testScript = `
import { ScrapeCommand } from './packages/cli/src/cli/scrape.js';

async function testScrapeCommand() {
    const scrapeCommand = new ScrapeCommand();
    const options = {
        source: 'bandai-hobby',
        language: 'all',
        output: '${testOutputDir}',
        cache: false,
        resume: false,
        verbose: true,
        dryRun: true
    };

    try {
        const result = await scrapeCommand.execute(options);

        if (result.totalProcessed === 3 && result.successful === 0 && result.cached === 0) {
            console.log('SUCCESS: Dry run completed correctly');
            process.exit(0);
        } else {
            console.log('FAIL: Unexpected result', result);
            process.exit(1);
        }
    } catch (error) {
        console.error('ERROR:', error);
        process.exit(1);
    }
}

testScrapeCommand();
            `;

            const testScriptPath = path.join(tempDir, 'test-cli.js');
            await fs.writeFile(testScriptPath, testScript, 'utf-8');

            const result = await execFileNoThrow('node', [testScriptPath]);

            expect(result.status).toBe(0);
            expect(result.stdout).toContain('SUCCESS: Dry run completed correctly');
        });

        it('should handle cache operations', async () => {
            // Test cache command functionality
            const testScript = `
import { CacheCommand } from './packages/cli/src/cli/cache.js';

async function testCacheCommand() {
    const cacheCommand = new CacheCommand();

    try {
        // Test stats
        await cacheCommand.execute({ stats: true });

        // Test cleanup (should not error)
        await cacheCommand.execute({ cleanup: true });

        console.log('SUCCESS: Cache operations completed');
        process.exit(0);
    } catch (error) {
        console.error('ERROR:', error);
        process.exit(1);
    }
}

testCacheCommand();
            `;

            const testScriptPath = path.join(tempDir, 'test-cache.js');
            await fs.writeFile(testScriptPath, testScript, 'utf-8');

            const result = await execFileNoThrow('node', [testScriptPath]);

            expect(result.status).toBe(0);
            expect(result.stdout).toContain('SUCCESS: Cache operations completed');
        });

        it('should validate scraped data', async () => {
            // Test validation command functionality
            const testScript = `
import { ValidateCommand } from './packages/cli/src/cli/validate.js';

async function testValidateCommand() {
    const validateCommand = new ValidateCommand();

    try {
        // Test validation (should not error)
        await validateCommand.execute({
            source: 'bandai-hobby',
            fix: false,
            output: '${testOutputDir}'
        });

        console.log('SUCCESS: Validation completed');
        process.exit(0);
    } catch (error) {
        console.error('ERROR:', error);
        process.exit(1);
    }
}

testValidateCommand();
            `;

            const testScriptPath = path.join(tempDir, 'test-validate.js');
            await fs.writeFile(testScriptPath, testScript, 'utf-8');

            const result = await execFileNoThrow('node', [testScriptPath]);

            expect(result.status).toBe(0);
            expect(result.stdout).toContain('SUCCESS: Validation completed');
        });
    });

    describe('End-to-End Workflow', () => {
        it('should process complete scraping workflow', async () => {
            // Test the complete workflow from URL collection to data validation
            const workflowTestScript = `
import { BandaiHobbyScraper } from './packages/cli/src/scrapers/bandai-hobby.js';
import { validateProductData } from './packages/cli/src/schemas/validation.js';
import { CacheManager } from './packages/cli/src/utils/cache-manager.js';

async function testCompleteWorkflow() {
    const scraper = new BandaiHobbyScraper();
    const cacheManager = new CacheManager();

    try {
        // Initialize cache
        await cacheManager.initialize();

        // Test scraping workflow
        const extractedProducts = [];
        const testUrls = ${JSON.stringify(testUrls)};

        for (const url of testUrls) {
            // In real scenario, this would fetch from the web
            // For test, we'll mock the scraping
            if (url.includes('gundam-aerial')) {
                const mockData = await scraper.extractFromPage('${mockBandaiHobbyHtml}', url);
                extractedProducts.push(mockData);
            } else if (url.includes('gundam-exia')) {
                const mockData = await scraper.extractFromPage('${mockAnotherProductHtml}', url);
                extractedProducts.push(mockData);
            }
        }

        // Validate all extracted products
        const validation = validateProductDataBatch(extractedProducts);

        if (validation.valid.length === 2 && validation.invalid.length === 0) {
            console.log('SUCCESS: Complete workflow successful');
            console.log('Products validated:', validation.valid.length);
            process.exit(0);
        } else {
            console.log('PARTIAL: Some products failed validation');
            console.log('Valid:', validation.valid.length);
            console.log('Invalid:', validation.invalid.length);
            process.exit(0); // Still exit 0 for integration test
        }
    } catch (error) {
        console.error('ERROR in workflow:', error);
        process.exit(1);
    }
}

testCompleteWorkflow();
            `;

            const testScriptPath = path.join(tempDir, 'test-workflow.js');
            await fs.writeFile(testScriptPath, workflowTestScript, 'utf-8');

            const result = await execFileNoThrow('node', [testScriptPath]);

            expect(result.status).toBe(0);
            expect(result.stdout).toContain('SUCCESS: Complete workflow successful');
        });

        it('should handle checkpoint and resume functionality', async () => {
            // Test checkpoint saving and loading
            const remainingUrls = testUrls.slice(1);
            await checkpointManager.saveScrapeProgress(
                'bandai-hobby',
                remainingUrls,
                ['https://bandai-hobby.net/site/completed-product/'],
                { totalExpected: 3, phase: 'extraction' }
            );

            const loadedProgress = await checkpointManager.loadScrapeProgress();

            expect(loadedProgress).toBeTruthy();
            expect(loadedProgress?.remainingUrls).toEqual(remainingUrls);
            expect(loadedProgress?.completedUrls).toEqual(['https://bandai-hobby.net/site/completed-product/']);
            expect(loadedProgress?.metadata.totalExpected).toBe(3);
        });

        it('should handle error recovery scenarios', async () => {
            // Test error handling and recovery
            const errorTestScript = `
import { ErrorHandler } from './packages/cli/src/utils/error-handler.js';

async function testErrorHandling() {
    const errorHandler = new ErrorHandler({ maxErrors: 10 });

    try {
        // Test error creation and reporting
        const error1 = errorHandler.createError(
            'Test network error',
            'NETWORK',
            'HIGH',
            { url: 'https://bandai-hobby.net/test' }
        );

        const error2 = errorHandler.createNetworkError(
            'Connection timeout',
            'https://bandai-hobby.net/test'
        );

        errorHandler.addError(error1);
        errorHandler.addError(error2);

        const report = errorHandler.getErrorReport();

        if (report.totalErrors === 2 &&
            report.errorsByCategory.NETWORK === 2 &&
            report.retryableErrors === 2) {
            console.log('SUCCESS: Error handling working correctly');
            process.exit(0);
        } else {
            console.log('ERROR: Error handling not working as expected');
            process.exit(1);
        }
    } catch (error) {
        console.error('ERROR in error handling:', error);
        process.exit(1);
    }
}

testErrorHandling();
            `;

            const testScriptPath = path.join(tempDir, 'test-errors.js');
            await fs.writeFile(testScriptPath, errorTestScript, 'utf-8');

            const result = await execFileNoThrow('node', [testScriptPath]);

            expect(result.status).toBe(0);
            expect(result.stdout).toContain('SUCCESS: Error handling working correctly');
        });
    });

    describe('Performance and Scalability', () => {
        it('should handle concurrent processing', async () => {
            // Test that the system can handle multiple URLs concurrently
            const performanceTest = `
import { BandaiRateLimiter } from './packages/cli/src/utils/rate-limiter.js';

async function testPerformance() {
    const rateLimiter = new BandaiRateLimiter({ requestsPerSecond: 2 });

    try {
        const startTime = Date.now();
        const promises = [];

        // Simulate concurrent requests
        for (let i = 0; i < 5; i++) {
            promises.push(
                rateLimiter.executeWithLimit(() =>
                    Promise.resolve(\`Result \${i}\`)
                )
            );
        }

        const results = await Promise.all(promises);
        const duration = Date.now() - startTime;

        // Should take at least 2 seconds due to rate limiting
        if (duration >= 2000 && results.length === 5) {
            console.log('SUCCESS: Rate limiting working correctly');
            console.log('Duration:', duration + 'ms');
            process.exit(0);
        } else {
            console.log('ERROR: Rate limiting not working');
            console.log('Duration:', duration + 'ms', 'Results:', results.length);
            process.exit(1);
        }
    } catch (error) {
        console.error('ERROR in performance test:', error);
        process.exit(1);
    }
}

testPerformance();
            `;

            const testScriptPath = path.join(tempDir, 'test-performance.js');
            await fs.writeFile(testScriptPath, performanceTest, 'utf-8');

            const result = await execFileNoThrow('node', [testScriptPath]);

            expect(result.status).toBe(0);
            expect(result.stdout).toContain('SUCCESS: Rate limiting working correctly');
        });
    });
});