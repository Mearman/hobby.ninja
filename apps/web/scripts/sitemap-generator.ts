/**
 * Sitemap Generator
 *
 * Generates sitemap.xml for all graph nodes to improve SEO
 * Compatible with Google and other search engines
 */

import { createWriteStream, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { generateGraphRoutes } from '../src/utils/graph-routes-generator';

interface SitemapEntry {
	url: string;
	lastmod: string;
	changefreq: string;
	priority: number;
}

export class SitemapGenerator {
	private baseUrl: string;
	private outputDir: string;

	constructor(baseUrl: string = 'https://hobby.ninja', outputDir: string = join(process.cwd(), 'dist', 'apps', 'web')) {
		this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
		this.outputDir = outputDir;
	}

	/**
	 * Generates sitemap.xml for all graph nodes
	 */
	async generateSitemap(): Promise<void> {
		console.log('🗺️ Generating sitemap.xml...');

		try {
			const routes = await generateGraphRoutes();
			const sitemapEntries = await this.createSitemapEntries(routes);
			const sitemapXml = this.createSitemapXML(sitemapEntries);

			// Ensure output directory exists
			if (!existsSync(this.outputDir)) {
				mkdirSync(this.outputDir, { recursive: true });
			}

			// Write sitemap.xml
			const sitemapPath = join(this.outputDir, 'sitemap.xml');
			await this.writeFile(sitemapPath, sitemapXml);

			console.log(`✅ Generated sitemap.xml with ${sitemapEntries.length} URLs`);
			console.log(`📍 Location: ${sitemapPath}`);
		} catch (error) {
			console.error('❌ Failed to generate sitemap:', error);
			throw error;
		}
	}

	/**
	 * Creates sitemap entries from routes
	 */
	private async createSitemapEntries(routes: string[]): Promise<SitemapEntry[]> {
		const entries: SitemapEntry[] = [];
		const lastmod = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

		// Add static pages
		entries.push(
			{
				url: this.baseUrl,
				lastmod,
				changefreq: 'weekly',
				priority: 1.0
			},
			{
				url: `${this.baseUrl}/database`,
				lastmod,
				changefreq: 'weekly',
				priority: 0.8
			}
		);

		// Add graph node pages
		for (const route of routes) {
			const nodeType = route.split('/')[1]; // Extract nodeType from /brand/30mm

			let priority = 0.7;
			let changefreq = 'monthly';

			// Set priority and change frequency based on node type
			switch (nodeType) {
				case 'item':
					priority = 0.9;
					changefreq = 'yearly';
					break;
				case 'brand':
					priority = 0.8;
					changefreq = 'monthly';
					break;
				case 'series':
					priority = 0.8;
					changefreq = 'monthly';
					break;
				case 'category':
					priority = 0.7;
					changefreq = 'yearly';
					break;
				case 'manual':
					priority = 0.6;
					changefreq = 'yearly';
					break;
			}

			entries.push({
				url: `${this.baseUrl}${route}`,
				lastmod,
				changefreq,
				priority
			});
		}

		return entries;
	}

	/**
	 * Creates sitemap XML content
	 */
	private createSitemapXML(entries: SitemapEntry[]): string {
		const xmlEntries = entries.map(entry => `  <url>
    <loc>${entry.url}</loc>
    <lastmod>${entry.lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority.toFixed(1)}</priority>
  </url>`).join('\n');

		return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xmlEntries}
</urlset>`;
	}

	/**
	 * Writes content to file
	 */
	private async writeFile(filePath: string, content: string): Promise<void> {
		return new Promise((resolve, reject) => {
			const stream = createWriteStream(filePath, { encoding: 'utf8' });

			stream.on('finish', resolve);
			stream.on('error', reject);

			stream.write(content);
			stream.end();
		});
	}

	/**
	 * Generates robots.txt with sitemap reference
	 */
	async generateRobotsTxt(): Promise<void> {
		console.log('🤖 Generating robots.txt...');

		const robotsTxt = `User-agent: *
Allow: /

# Sitemap
Sitemap: ${this.baseUrl}/sitemap.xml

# Block admin areas (if any exist in future)
Disallow: /admin/
`;

		const robotsPath = join(this.outputDir, 'robots.txt');
		await this.writeFile(robotsPath, robotsTxt);

		console.log(`✅ Generated robots.txt`);
		console.log(`📍 Location: ${robotsPath}`);
	}
}

/**
 * Generate both sitemap.xml and robots.txt
 */
export async function generateSEOFiles(): Promise<void> {
	const generator = new SitemapGenerator();

	await generator.generateSitemap();
	await generator.generateRobotsTxt();

	console.log('🎉 SEO files generated successfully!');
}