import type {
	ManualDocument,
	LocalizedText,
	ProductInfo,
	PublicationInfo,
	ManualMetadata,
	BlockType,
	ContentBlock,
	ContentSection,
	ManualContent,
	ContentStatistics,
	ImageReference,
	DiagramReference,
	ThumbnailReference,
	ManualAssets,
	OutlineEntry,
	NavigationItem,
	DocumentStructure,
	SourceInfo,
} from "@hobby-ninja/types/manual";
import { z } from "zod";

// Japanese text validation
const JAPANESE_TEXT_PATTERN = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3000-\u303F\uFF00-\uFFEF]/;

const LocalizedTextSchema: z.ZodType<LocalizedText> = z.object({
	ja: z.string().min(1).max(200).regex(JAPANESE_TEXT_PATTERN, "Must contain Japanese characters"),
	en: z.string().max(200).optional(),
});

const ProductInfoSchema: z.ZodType<ProductInfo> = z.object({
	name: z.string().min(1).max(200),
	series: z.string().max(100).optional(),
	grade: z.enum(["HG", "MG", "PG", "RG", "EG", "SD", "RE", "Mega Size"]).optional(),
	scale: z.string().regex(/^\d\/\d+$/).optional(),
});

const PublicationInfoSchema: z.ZodType<PublicationInfo> = z.object({
	date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
	version: z.string().max(20).optional(),
	language: z.enum(["ja", "en", "mixed"]),
});

const BandaiInfoSchema = z.object({
	categoryId: z.string().optional(),
	productId: z.string().optional(),
	manualId: z.string().optional(),
});

const ManualMetadataSchema: z.ZodType<ManualMetadata> = z.object({
	title: LocalizedTextSchema,
	product: ProductInfoSchema,
	publication: PublicationInfoSchema,
	bandai: BandaiInfoSchema.optional(),
});

const BlockTypeSchema: z.ZodType<BlockType> = z.enum([
	"heading",
	"paragraph",
	"list",
	"table",
	"image",
	"warning",
	"note",
	"instruction",
	"specification",
]);

const BlockMetadataSchema = z.object({
	className: z.string().optional(),
	pageNumber: z.number().int().min(1).max(9999).optional(),
	footnote: z.string().optional(),
});

const BlockDataSchema = z.object({
	text: z.string().optional(),
	items: z.array(z.string()).optional(),
	rows: z.array(z.array(z.string())).optional(),
	image: z.lazy(() => ImageReferenceSchema).optional(),
	specifications: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
});

const ContentBlockSchema: z.ZodType<ContentBlock> = z.object({
	id: z.string().regex(/^block-\d+$/),
	type: BlockTypeSchema,
	content: z.union([z.string(), BlockDataSchema]),
	metadata: BlockMetadataSchema.optional(),
});

const ContentSectionSchema: z.ZodType<ContentSection> = z.object({
	id: z.string().regex(/^section-\d+$/),
	level: z.number().int().min(1).max(6),
	title: LocalizedTextSchema,
	blocks: z.array(ContentBlockSchema),
	subsections: z.array(z.lazy(() => ContentSectionSchema)),
	pageNumber: z.number().int().min(1).max(9999).optional(),
});

const ContentStatisticsSchema: z.ZodType<ContentStatistics> = z.object({
	totalSections: z.number().int().min(0),
	totalBlocks: z.number().int().min(0),
	wordCount: z.number().int().min(0),
	japaneseCharacterCount: z.number().int().min(0),
	imageCount: z.number().int().min(0),
});

const ManualContentSchema: z.ZodType<ManualContent> = z.object({
	sections: z.array(ContentSectionSchema),
	blocks: z.array(ContentBlockSchema),
	statistics: ContentStatisticsSchema,
});

const PositionSchema = z.object({
	x: z.number().min(0).max(100),
	y: z.number().min(0).max(100),
});

const DiagramLabelSchema = z.object({
	text: z.string().min(1),
	position: PositionSchema,
	target: z.string().optional(),
});

const DiagramAnnotationSchema = z.object({
	id: z.string().regex(/^annotation-\d+$/),
	text: z.string().min(1),
	position: PositionSchema,
	target: z.string().optional(),
});

const ImageReferenceSchema: z.ZodType<ImageReference> = z.object({
	id: z.string().regex(/^img-\d+$/),
	src: z.string().url(),
	alt: LocalizedTextSchema,
	type: z.enum(["illustration", "photo", "diagram", "symbol"]),
	size: z.object({
		width: z.number().int().min(1).optional(),
		height: z.number().int().min(1).optional(),
	}).optional(),
	pageNumber: z.number().int().min(1).max(9999).optional(),
});

const DiagramReferenceSchema: z.ZodType<DiagramReference> = z.object({
	id: z.string().regex(/^img-\d+$/),
	src: z.string().url(),
	alt: LocalizedTextSchema,
	type: z.literal("diagram"),
	labels: z.array(DiagramLabelSchema),
	annotations: z.array(DiagramAnnotationSchema),
	size: z.object({
		width: z.number().int().min(1).optional(),
		height: z.number().int().min(1).optional(),
	}).optional(),
	pageNumber: z.number().int().min(1).max(9999).optional(),
});

const ThumbnailReferenceSchema: z.ZodType<ThumbnailReference> = z.object({
	id: z.string().regex(/^thumb-\d+$/),
	src: z.string().url(),
	width: z.number().int().min(1).optional(),
	height: z.number().int().min(1).optional(),
});

const ManualAssetsSchema: z.ZodType<ManualAssets> = z.object({
	images: z.array(ImageReferenceSchema),
	diagrams: z.array(DiagramReferenceSchema),
	thumbnails: z.array(ThumbnailReferenceSchema),
});

const OutlineEntrySchema: z.ZodType<OutlineEntry> = z.object({
	id: z.string().regex(/^outline-\d+$/),
	level: z.number().int().min(1).max(6),
	title: z.string().min(1),
	sectionId: z.string().regex(/^section-\d+$/),
	pageNumber: z.number().int().min(1).max(9999).optional(),
	children: z.array(z.lazy(() => OutlineEntrySchema)),
});

const NavigationItemSchema: z.ZodType<NavigationItem> = z.object({
	id: z.string().regex(/^nav-\d+$/),
	type: z.enum(["page", "section", "chapter", "appendix"]),
	title: z.string().min(1),
	target: z.string(),
	order: z.number().int().min(0),
});

const DocumentStructureSchema: z.ZodType<DocumentStructure> = z.object({
	outline: z.array(OutlineEntrySchema),
	navigation: z.array(NavigationItemSchema),
	pageCount: z.number().int().min(1).optional(),
});

const SourceInfoSchema: z.ZodType<SourceInfo> = z.object({
	url: z.string().url().optional(),
	htmlPath: z.string().min(1),
	htmlSize: z.number().int().min(0),
});

const ManualDocumentSchema: z.ZodType<ManualDocument> = z.object({
	id: z.string().regex(/^\d+$/).min(1).max(10),
	metadata: ManualMetadataSchema,
	content: ManualContentSchema,
	assets: ManualAssetsSchema,
	structure: DocumentStructureSchema,
	extractedAt: z.string().datetime(),
	source: SourceInfoSchema,
});

// Compiled schemas for performance
export const Schemas = {
	LocalizedText: LocalizedTextSchema,
	ProductInfo: ProductInfoSchema,
	PublicationInfo: PublicationInfoSchema,
	ManualMetadata: ManualMetadataSchema,
	ContentBlock: ContentBlockSchema,
	ContentSection: ContentSectionSchema,
	ManualContent: ManualContentSchema,
	ImageReference: ImageReferenceSchema,
	DiagramReference: DiagramReferenceSchema,
	ThumbnailReference: ThumbnailReferenceSchema,
	ManualAssets: ManualAssetsSchema,
	DocumentStructure: DocumentStructureSchema,
	ManualDocument: ManualDocumentSchema,

	// Direct schema usage (compile() method removed in newer Zod versions)
	LocalizedTextCompiled: LocalizedTextSchema,
	ManualDocumentCompiled: ManualDocumentSchema,
};

/**
 * Validate manual document against schema
 */
export function validateManualDocument(data: unknown): {
  success: boolean;
  data?: ManualDocument;
  errors?: string[];
} {
	const result = Schemas.ManualDocumentCompiled.safeParse(data);

	return result.success ? { success: true, data: result.data } : {
		success: false,
		errors: result.error.issues.map(issue =>
			`${issue.path.join(".")}: ${issue.message}`,
		),
	};
}

/**
 * Validate localized text
 */
export function validateLocalizedText(data: unknown): {
  success: boolean;
  data?: LocalizedText;
  errors?: string[];
} {
	const result = Schemas.LocalizedTextCompiled.safeParse(data);

	return result.success ? { success: true, data: result.data } : {
		success: false,
		errors: result.error.issues.map(issue =>
			`${issue.path.join(".")}: ${issue.message}`,
		),
	};
}

/**
 * Custom validation functions for specific fields
 */
export const CustomValidators = {
	/**
   * Validate Japanese text content
   */
	japaneseText: (text: string) => {
		if (!text || text.length === 0) {
			return false;
		}
		return JAPANESE_TEXT_PATTERN.test(text);
	},

	/**
   * Validate manual ID format
   */
	manualId: (id: string) => {
		return /^\d+$/.test(id) && id.length > 0 && id.length <= 10;
	},

	/**
   * Validate grade format
   */
	grade: (grade: string) => {
		const validGrades = ["HG", "MG", "PG", "RG", "EG", "SD", "RE", "Mega Size"];
		return validGrades.includes(grade);
	},

	/**
   * Validate scale format (e.g., "1/144", "1/100")
   */
	scale: (scale: string) => {
		return /^\d\/\d+$/.test(scale);
	},
};

/**
 * Type guards for runtime type checking
 */
export const TypeGuards = {
	isManualDocument: (data: unknown): data is ManualDocument => {
		return validateManualDocument(data).success;
	},

	isLocalizedText: (data: unknown): data is LocalizedText => {
		return validateLocalizedText(data).success;
	},

	isString: (data: unknown): data is string => {
		return typeof data === "string";
	},
};