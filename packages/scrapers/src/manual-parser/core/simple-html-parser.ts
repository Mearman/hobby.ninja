/**
 * Simple HTML parser using parse5
 */

import { parse, type DefaultTreeAdapterTypes } from "parse5";

type Document = DefaultTreeAdapterTypes.Document;
type Element = DefaultTreeAdapterTypes.Element;
type Node = DefaultTreeAdapterTypes.Node;
type TextNode = DefaultTreeAdapterTypes.TextNode;

export interface ManualDocument {
	title?: string;
	metadata: {
		language: string;
		encoding: string;
		extractedAt: string;
	};
	content: {
		blocks: ContentBlock[];
	};
	assets: {
		images: string[];
		links: string[];
	};
}

export interface ContentBlock {
	type: string;
	content: Record<string, string>;
}

export interface ParseResult {
	success: boolean;
	data?: ManualDocument;
	error?: string;
}

/**
 * Type guard to check if node is an Element
 */
function isElement(node: Node): node is Element {
	return "tagName" in node;
}

/**
 * Type guard to check if node is a TextNode
 */
function isTextNode(node: Node): node is TextNode {
	return node.nodeName === "#text";
}

/**
 * Type guard to check if node has childNodes
 */
function hasChildNodes(node: Node): node is Document | Element {
	return "childNodes" in node;
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
						encoding: "utf8",
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

	private extractTitle(document: Document): string | undefined {
		const titleElement = this.findElementByTag(document, "title");
		if (titleElement?.childNodes) {
			return this.getTextContent(titleElement).trim();
		}
		return undefined;
	}

	private extractContent(document: Document): ContentBlock[] {
		const blocks: ContentBlock[] = [];
		const bodyElement = this.findElementByTag(document, "body");

		if (!bodyElement) {
			return blocks;
		}

		this.processNode(bodyElement, blocks);
		return blocks.filter((block) => Object.keys(block.content).length > 0);
	}

	private extractAssets(document: Document): { images: string[]; links: string[] } {
		const assets = { images: [] as string[], links: [] as string[] };
		this.extractAssetsFromNode(document, assets);
		return assets;
	}

	private processNode(node: Node, blocks: ContentBlock[]): void {
		// Process text nodes
		if (isTextNode(node)) {
			const text = node.value;
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
		if (isElement(node)) {
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
			for (const child of node.childNodes) {
				this.processNode(child, blocks);
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

	private extractAssetsFromNode(node: Node, assets: { images: string[]; links: string[] }): void {
		if (isElement(node)) {
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

		if (hasChildNodes(node)) {
			for (const child of node.childNodes) {
				this.extractAssetsFromNode(child, assets);
			}
		}
	}

	private findElementByTag(node: Node, tagName: string): Element | null {
		if (isElement(node) && node.tagName === tagName) {
			return node;
		}

		if (hasChildNodes(node)) {
			for (const child of node.childNodes) {
				const found = this.findElementByTag(child, tagName);
				if (found) return found;
			}
		}

		return null;
	}

	private getTextContent(node: Node): string {
		if (isTextNode(node)) {
			return node.value;
		}

		if (hasChildNodes(node)) {
			let result = "";
			for (const child of node.childNodes) {
				result += this.getTextContent(child);
			}
			return result;
		}

		return "";
	}

	private getAttribute(node: Element, attributeName: string): string | undefined {
		const attr = node.attrs.find((a) => a.name === attributeName);
		return attr?.value;
	}

	private hasJapaneseContent(text: string): boolean {
		return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text);
	}
}
