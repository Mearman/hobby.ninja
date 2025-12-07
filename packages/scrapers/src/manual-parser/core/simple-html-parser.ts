/**
 * Simple HTML parser using parse5
 */

import { parse } from "parse5";

export interface ManualDocument {
  title?: string;
  metadata: {
    language: string;
    encoding: string;
    extractedAt: string;
  };
  content: {
    blocks: Array<{
      type: string;
      content: Record<string, string>;
    }>;
  };
  assets: {
    images: string[];
    links: string[];
  };
}

export interface ParseResult {
  success: boolean;
  data?: ManualDocument;
  error?: string;
}

/**
 * Simple HTML parser - focuses on extracting Japanese content
 */
export class SimpleHtmlParser {
	parse(htmlContent: string): ParseResult {
		try {
			const document = parse(htmlContent);
			const title = this.extractTitle(document);
			const content = this.extractContent(document);
			const assets = this.extractAssets(document);

			return {
				success: true,
				data: {
					title,
					metadata: {
						language: "ja",
						encoding: "utf-8",
						extractedAt: new Date().toISOString(),
					},
					content: {
						blocks: content,
					},
					assets,
				},
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}

	private extractTitle(document: any): string | undefined {
		const titleElement = this.findElementByTag(document, "title");
		if (titleElement?.childNodes) {
			return this.getTextContent(titleElement).trim();
		}
		return undefined;
	}

	private extractContent(document: any): any[] {
		const blocks: any[] = [];
		const bodyElement = this.findElementByTag(document, "body");

		if (!bodyElement) {
			return blocks;
		}

		this.processNode(bodyElement, blocks);
		return blocks.filter(block => block?.content && Object.keys(block.content).length > 0);
	}

	private extractAssets(document: any): { images: string[]; links: string[] } {
		const assets = { images: [] as string[], links: [] as string[] };
		this.extractAssetsFromNode(document, assets);
		return assets;
	}

	private processNode(node: any, blocks: any[]): void {
		if (!node) return;

		// Process text nodes
		if (node.nodeName === "#text") {
			const text = node.value || "";
			if (text.trim() && this.hasJapaneseContent(text)) {
				blocks.push({
					type: "text",
					content: {
						text: text.trim(),
						ja: text.trim(),
					},
				});
			}
			return;
		}

		// Process element nodes
		if (node.tagName) {
			const tagName = node.tagName.toLowerCase();
			const textContent = this.getTextContent(node);

			if (this.shouldProcessElement(tagName, textContent)) {
				const content: Record<string, string> = {};

				// Store original text
				if (textContent.trim()) {
					content.text = textContent.trim();
					content.ja = content.text;
				}

				// Extract specific attributes
				if (tagName === "img") {
					const src = this.getAttribute(node, "src");
					if (src) content.src = src;
				}

				if (tagName === "a") {
					const href = this.getAttribute(node, "href");
					if (href) content.href = href;
				}

				if (Object.keys(content).length > 0) {
					blocks.push({
						type: tagName,
						content,
					});
				}
			}

			// Process child nodes
			if (node.childNodes) {
				for (const child of node.childNodes) {
					this.processNode(child, blocks);
				}
			}
		}
	}

	private shouldProcessElement(tagName: string, textContent: string): boolean {
		// Skip script and style elements
		if (["script", "style", "meta", "link"].includes(tagName)) {
			return false;
		}

		// For elements with no text content, still process if they're meaningful
		if (!textContent.trim()) {
			return ["img", "br", "hr"].includes(tagName);
		}

		// Check Japanese content
		return this.hasJapaneseContent(textContent);
	}

	private extractAssetsFromNode(node: any, assets: { images: string[]; links: string[] }): void {
		if (!node) return;

		if (node.tagName) {
			const tagName = node.tagName.toLowerCase();

			if (tagName === "img") {
				const src = this.getAttribute(node, "src");
				if (src && !assets.images.includes(src)) {
					assets.images.push(src);
				}
			}

			if (tagName === "a") {
				const href = this.getAttribute(node, "href");
				if (href && !assets.links.includes(href)) {
					assets.links.push(href);
				}
			}
		}

		if (node.childNodes) {
			for (const child of node.childNodes) {
				this.extractAssetsFromNode(child, assets);
			}
		}
	}

	private findElementByTag(node: any, tagName: string): any {
		if (!node) return null;

		if (node.tagName === tagName) {
			return node;
		}

		if (node.childNodes) {
			for (const child of node.childNodes) {
				const found = this.findElementByTag(child, tagName);
				if (found) return found;
			}
		}

		return null;
	}

	private getTextContent(node: any): string {
		if (!node) return "";

		if (node.nodeName === "#text") {
			return node.value || "";
		}

		if (node.childNodes) {
			return node.childNodes.map((child: any) => this.getTextContent(child)).join("");
		}

		return "";
	}

	private getAttribute(node: any, attributeName: string): string | undefined {
		if (node.attrs) {
			const attr = node.attrs.find((attr: any) => attr.name === attributeName);
			return attr?.value;
		}
		return undefined;
	}

	private hasJapaneseContent(text: string): boolean {
		return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text);
	}
}