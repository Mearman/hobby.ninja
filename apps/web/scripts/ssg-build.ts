/**
 * SSG Build Script
 *
 * Generates static HTML pages for all graph nodes using TanStack Router's createStaticHandler.
 * This script implements the hybrid routing approach with clean paths for static nodes
 * and hash routing for dynamic features.
 */

import { createWriteStream, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderToString } from 'react-dom/server';
import { createStaticHandler } from '@tanstack/react-router';
import { staticRouter } from '../src/router';
import { getGraphPreloader } from '../src/utils/graph-preloader';
import { generateGraphRoutes } from '../src/utils/graph-routes-generator';
import { generateSEOFiles } from './sitemap-generator';
import { StructuredDataGenerator } from './structured-data-generator';
import PerformanceMonitor from './performance-monitor';
import { ReactElement } from 'react';

// Configuration
const OUTPUT_DIR = join(process.cwd(), 'dist', 'apps', 'web');
const PUBLIC_DIR = join(process.cwd(), 'apps', 'web', 'public');

interface SSGOptions {
	routes?: string[];
	maxConcurrency?: number;
	chunkSize?: number;
	verbose?: boolean;
}

/**
 * Generates static HTML for a single route
 */
async function generateRouteHTML(
	route: string,
	staticHandler: any,
	preloader: any
): Promise<{ route: string; html: string; error?: string }> {
	try {
		console.log(`Generating route: ${route}`);

		// Generate route using TanStack Router's static handler
		const routeResult = await staticHandler.generateRoute(route);

		// Get the rendered component
		const rendered = await staticHandler.renderRoute(routeResult);

		// Create HTML document with the rendered content
		const html = createHTMLDocument(route, rendered.html || '');

		return { route, html };
	} catch (error) {
		console.error(`Error generating route ${route}:`, error);
		return {
			route,
			html: createErrorPage(route, error instanceof Error ? error.message : 'Unknown error'),
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
}

/**
 * Creates a complete HTML document template
 */
function createHTMLDocument(route: string, content: string): string {
	const title = route === '/' ? 'hobby.ninja' : `${route} - hobby.ninja`;
	const description = route === '/'
		? 'Progressive web application for managing hobby collections'
		: `Explore ${route} in the Gundam model database`;

	return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<title>${title}</title>
	<meta name="description" content="${description}" />
	<meta name="theme-color" content="#228be6" />
	<link rel="manifest" href="/manifest.json" />
	<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
	<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
	<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
	<link rel="canonical" href="https://hobby.ninja${route}" />

	<!-- Preconnect to external domains -->
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />

	<!-- Critical CSS inline -->
	<style>
		/* Loading skeleton styles */
		.loading-skeleton {
			background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
			background-size: 200% 100%;
			animation: loading 1.5s infinite;
		}
		@keyframes loading {
			0% { background-position: 200% 0; }
			100% { background-position: -200% 0; }
		}

		/* Basic layout styles */
		body {
			margin: 0;
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
			line-height: 1.5;
			color: #333;
		}
		.app-layout {
			min-height: 100vh;
			display: flex;
			flex-direction: column;
		}
		.app-main {
			flex: 1;
		}
		.app-footer {
			text-align: center;
			padding: 1rem;
			border-top: 1px solid #eee;
			color: #666;
		}
	</style>
</head>
<body>
	<div id="root">
		<!-- Static Content -->
		${content}
	</div>

	<!-- React App for dynamic features -->
	<script type="module">
		// Initialize React app for client-side functionality
		import('./src/main.tsx');
	</script>

	<!-- Service Worker Registration -->
	<script>
		if ('serviceWorker' in navigator) {
			window.addEventListener('load', () => {
				navigator.serviceWorker.register('/sw.js')
					.then((registration) => {
						console.log('SW registered: ', registration);
					})
					.catch((registrationError) => {
						console.log('SW registration failed: ', registrationError);
					});
			});
		}
	</script>
</body>
</html>`;
}

/**
 * Creates an error page HTML
 */
function createErrorPage(route: string, error: string): string {
	const content = `
		<div class="app-layout">
			<main class="app-main">
				<div style="padding: 2rem; max-width: 800px; margin: 0 auto;">
					<h1>Page Not Found</h1>
					<p>The page <code>${route}</code> could not be generated.</p>
					<p><strong>Error:</strong> ${error}</p>
					<a href="/" style="color: #228be6;">← Return to Home</a>
				</div>
			</main>
			<footer class="app-footer">
				<p>&copy; 2025 hobby.ninja</p>
			</footer>
		</div>
	`;

	return createHTMLDocument(route, content);
}

/**
 * Writes HTML content to file
 */
function writeHTMLFile(route: string, html: string, outputDir: string): void {
	// Convert route to file path
	let filePath: string;
	if (route === '/') {
		filePath = join(outputDir, 'index.html');
	} else {
		// Clean the route path and create directory structure
		const cleanRoute = route.replace(/^\//, '').replace(/\/$/, '');
		const routePath = join(outputDir, cleanRoute);
		const dirPath = dirname(routePath);

		// Create directory if it doesn't exist
		if (!existsSync(dirPath)) {
			mkdirSync(dirPath, { recursive: true });
		}

		filePath = `${routePath}.html`;
	}

	// Write HTML file
	const writeStream = createWriteStream(filePath);
	writeStream.write(html);
	writeStream.end();
}

/**
 * Processes routes in chunks to manage memory
 */
async function processRouteChunk(
	routes: string[],
	staticHandler: any,
	preloader: any,
	outputDir: string,
	verbose: boolean = false
): Promise<{ success: number; failed: number }> {
	let success = 0;
	let failed = 0;

	const promises = routes.map(async (route) => {
		const result = await generateRouteHTML(route, staticHandler, preloader);

		if (result.error) {
			failed++;
			if (verbose) {
				console.error(`❌ Failed: ${route} - ${result.error}`);
			}
		} else {
			success++;
			writeHTMLFile(result.route, result.html, outputDir);
			if (verbose) {
				console.log(`✅ Generated: ${result.route}`);
			}
		}

		return result;
	});

	await Promise.allSettled(promises);

	// Force garbage collection after chunk
	if (global.gc) {
		global.gc();
	}

	return { success, failed };
}

/**
 * Main SSG build function
 */
export async function buildSSG(options: SSGOptions = {}): Promise<void> {
	const {
		routes: customRoutes,
		maxConcurrency = 10,
		chunkSize = 50,
		verbose = true
	} = options;

	console.log('🚀 Starting SSG build...');
	const startTime = Date.now();

	// Initialize performance monitor
	const perfMonitor = new PerformanceMonitor(OUTPUT_DIR);

	try {
		// Ensure output directory exists
		if (!existsSync(OUTPUT_DIR)) {
			mkdirSync(OUTPUT_DIR, { recursive: true });
		}

		// Initialize static handler
		const staticHandler = createStaticHandler(staticRouter);

		// Initialize preloader and load graph data
		if (verbose) {
			console.log('📊 Preloading graph data...');
		}
		const preloader = getGraphPreloader();
		await preloader.preloadAllNodes();

		// Generate routes
		const routeGenStart = Date.now();
		const graphRoutes = customRoutes || await generateGraphRoutes();
		const routeGenTime = Date.now() - routeGenStart;
		perfMonitor.recordRouteGeneration(graphRoutes.length, routeGenTime);

		// Add static pages
		const staticPages = [
			'/',
			'/about',
			'/collection',
			'/database'
		];

		const allRoutes = [...staticPages, ...graphRoutes];

		if (verbose) {
			console.log(`📝 Found ${allRoutes.length} routes to generate`);
			console.log(`   - ${staticPages.length} static pages`);
			console.log(`   - ${graphRoutes.length} graph nodes`);
		}

		// Process routes in chunks
		let totalSuccess = 0;
		let totalFailed = 0;

		for (let i = 0; i < allRoutes.length; i += chunkSize) {
			const chunk = allRoutes.slice(i, i + chunkSize);
			const progress = Math.round((i / allRoutes.length) * 100);

			if (verbose) {
				console.log(`📦 Processing chunk ${Math.floor(i / chunkSize) + 1}/${Math.ceil(allRoutes.length / chunkSize)} (${progress}%)`);
			}

			const { success, failed } = await processRouteChunk(
				chunk,
				staticHandler,
				preloader,
				OUTPUT_DIR,
				verbose
			);

			totalSuccess += success;
			totalFailed += failed;
		}

		// Generate SEO files (sitemap.xml, robots.txt)
		const seoStart = Date.now();
		if (verbose) {
			console.log('🔍 Generating SEO files...');
		}
		await generateSEOFiles();
		const seoTime = Date.now() - seoStart;
		perfMonitor.recordSEOGeneration(seoTime);

		// Record HTML generation metrics
		perfMonitor.recordHTMLGeneration(totalSuccess, totalFailed, Date.now() - startTime - routeGenTime - seoTime);

		// Finalize performance monitoring
		perfMonitor.finalize();

		const duration = Date.now() - startTime;

		console.log('\n✅ SSG build completed!');
		console.log(`   📄 Generated: ${totalSuccess} pages`);
		console.log(`   ❌ Failed: ${totalFailed} pages`);
		console.log(`   ⏱️  Duration: ${(duration / 1000).toFixed(2)}s`);
		console.log(`   📁 Output: ${OUTPUT_DIR}`);

		if (totalFailed > 0) {
			console.warn(`⚠️  ${totalFailed} pages failed to generate`);
			process.exit(1);
		}

	} catch (error) {
		console.error('❌ SSG build failed:', error);
		process.exit(1);
	}
}


/**
 * CLI execution
 */
if (import.meta.url === `file://${process.argv[1]}`) {
	const options: SSGOptions = {
		verbose: true,
	};

	// Parse command line arguments
	const args = process.argv.slice(2);
	const verboseIndex = args.indexOf('--verbose');
	if (verboseIndex !== -1) {
		options.verbose = true;
		args.splice(verboseIndex, 1);
	}

	const chunkSizeIndex = args.indexOf('--chunk-size');
	if (chunkSizeIndex !== -1 && args[chunkSizeIndex + 1]) {
		options.chunkSize = parseInt(args[chunkSizeIndex + 1], 10);
	}

	// Run build
	await buildSSG(options);
}