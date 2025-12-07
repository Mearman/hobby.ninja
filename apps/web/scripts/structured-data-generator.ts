/**
 * Structured Data Generator
 *
 * Generates JSON-LD structured data for graph nodes to improve SEO
 * Implements schema.org markup for products, brands, and series
 */

import { GraphNode } from '../src/utils/graph-routes-generator';

export interface StructuredData {
	'@context': string;
	'@type': string;
	[key: string]: unknown;
}

export class StructuredDataGenerator {
	/**
	 * Generates structured data for a graph node
	 */
	generateStructuredData(node: GraphNode): StructuredData | null {
		switch (node.type) {
			case 'item':
				return this.generateProductData(node);
			case 'brand':
				return this.generateBrandData(node);
			case 'series':
				return this.generateSeriesData(node);
			case 'category':
				return this.generateCategoryData(node);
			case 'manual':
				return this.generateManualData(node);
			default:
				return null;
		}
	}

	/**
	 * Generates Product schema for items
	 */
	private generateProductData(node: GraphNode): StructuredData {
		const data = node.data;

		const product: StructuredData = {
			'@context': 'https://schema.org',
			'@type': 'Product',
			name: node.name.en || node.name.ja,
			description: this.extractDescription(data),
			identifier: node.id
		};

		// Add brand information
		if (data.brand?.name?.en) {
			product.brand = {
				'@type': 'Brand',
				name: data.brand.name.en
			};
		}

		// Add series information
		if (data.series?.name?.en) {
			product.isPartOf = {
				'@type': 'ProductModel',
				name: data.series.name.en
			};
		}

		// Add grade information
		if (data.grade) {
			product.additionalProperty = [
				{
					'@type': 'PropertyValue',
					name: 'Grade',
					value: data.grade
				}
			];
		}

		// Add scale information
		if (data.scale) {
			const currentProps = product.additionalProperty as Array<any> || [];
			currentProps.push({
				'@type': 'PropertyValue',
				name: 'Scale',
				value: data.scale
			});
			product.additionalProperty = currentProps;
		}

		// Add release date
		if (data.releaseDate) {
			product.releaseDate = new Date(data.releaseDate.year, data.releaseDate.month - 1, data.releaseDate.day).toISOString();
		}

		// Add price information
		if (data.price) {
			product.offers = {
				'@type': 'Offer',
				price: data.price,
				priceCurrency: 'JPY'
			};
		}

		// Add images
		if (data.images?.length > 0) {
			product.image = data.images.map((img: any) => img.url || img).filter(Boolean);
		}

		return product;
	}

	/**
	 * Generates Brand schema for brands
	 */
	private generateBrandData(node: GraphNode): StructuredData {
		const data = node.data;

		const brand: StructuredData = {
			'@context': 'https://schema.org',
			'@type': 'Brand',
			name: node.name.en || node.name.ja,
			description: this.extractDescription(data),
			identifier: node.id
		};

		// Add logo if available
		if (data.logo) {
			brand.logo = data.logo;
		}

		// Add URL if available
		if (data.url) {
			brand.url = data.url;
		}

		return brand;
	}

	/**
	 * Generates Series schema for series
	 */
	private generateSeriesData(node: GraphNode): StructuredData {
		const data = node.data;

		const series: StructuredData = {
			'@context': 'https://schema.org',
			'@type': 'ProductModel',
			name: node.name.en || node.name.ja,
			description: this.extractDescription(data),
			identifier: node.id
		};

		// Add brand if available
		if (data.brand?.name?.en) {
			series.brand = {
				'@type': 'Brand',
				name: data.brand.name.en
			};
		}

		return series;
	}

	/**
	 * Generates Category schema for categories
	 */
	private generateCategoryData(node: GraphNode): StructuredData {
		return {
			'@context': 'https://schema.org',
			'@type': 'Thing',
			name: node.name.en || node.name.ja,
			description: this.extractDescription(node.data),
			identifier: node.id,
			additionalType: 'ProductCategory'
		};
	}

	/**
	 * Generates Manual schema for manuals
	 */
	private generateManualData(node: GraphNode): StructuredData {
		const data = node.data;

		const manual: StructuredData = {
			'@context': 'https://schema.org',
			'@type': 'TechArticle',
			name: node.name.en || node.name.ja,
			description: this.extractDescription(data),
			identifier: node.id
		};

		// Add page count if available
		if (data.pages) {
			manual.pageEnd = data.pages;
		}

		// Add PDF URL if available
		if (data.pdfUrl) {
			manual.url = data.pdfUrl;
		}

		// Add associated product if available
		if (data.product?.name) {
			manual.about = {
				'@type': 'Product',
				name: data.product.name
			};
		}

		return manual;
	}

	/**
	 * Extracts description from node data
	 */
	private extractDescription(data: Record<string, any>): string {
		// Try different description fields
		if (data.description?.en) return data.description.en;
		if (data.description?.ja) return data.description.ja;
		if (data.summary?.en) return data.summary.en;
		if (data.summary?.ja) return data.summary.ja;

		// Generate description from available data
		const parts: string[] = [];
		if (data.grade) parts.push(`Grade: ${data.grade}`);
		if (data.scale) parts.push(`Scale: ${data.scale}`);
		if (data.releaseDate) {
			parts.push(`Released: ${data.releaseDate.year}`);
		}

		return parts.length > 0 ? parts.join(' • ') : `${data.name?.ja || ''} details`;
	}

	/**
	 * Generates breadcrumb structured data
	 */
	generateBreadcrumbData(nodeType: string, nodeId: string, nodeName?: string): StructuredData {
		const breadcrumbs = [
			{ name: 'Home', url: '/' },
			{ name: 'Database', url: '/database' },
			{ name: nodeType.charAt(0).toUpperCase() + nodeType.slice(1), url: `/database/${nodeType}s` }
		];

		if (nodeName) {
			breadcrumbs.push({ name: nodeName, url: `/${nodeType}/${nodeId}` });
		}

		return {
			'@context': 'https://schema.org',
			'@type': 'BreadcrumbList',
			itemListElement: breadcrumbs.map((crumb, index) => ({
				'@type': 'ListItem',
				position: index + 1,
				name: crumb.name,
				item: `https://hobby.ninja${crumb.url}`
			}))
		};
	}
}