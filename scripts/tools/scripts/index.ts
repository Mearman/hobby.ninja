// Re-export utilities from markdown-utils
export {
	classifyLinkType,
	readMarkdownFile,
	checkFileExists,
	resolveLinkPath,
	getMatchPosition,
	countTokens,
	countFileTokens,
	MARKDOWN_LINK_REGEX,
	MARKDOWN_REFERENCE_LINK_REGEX,
	EMBED_LINK_REGEX,
	EMBED_SIMPLE_REGEX,
	type LinkType,
	type MarkdownFile,
	type FileCheckResult,
	type MatchPosition,
	type TokenCount,
} from "./markdown-utils";
