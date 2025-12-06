export type UrlField = 'sourceUrl' | 'pdfUrl' | 'productImage' | 'supplementaryPdfUrl' | 'images';

export type WaybackSource = 'all' | 'manuals' | 'catalog';

export interface WaybackOptions {
	source: WaybackSource;
	manualsDir: string;
	catalogDir: string;
	fields: UrlField[];
	dryRun: boolean;
	resume: boolean;
	verbose: boolean;
	retries: number;
	output: string;
	delayMs: number; // Base delay between requests
	rateLimitDelayMs: number; // Delay after rate limit error
	accessKey?: string; // Internet Archive S3 access key
	secretKey?: string; // Internet Archive S3 secret key
	minArchiveAge: string; // Skip archives newer than this (default: 30d)
	maxArchiveAge: string; // Force re-archive if older than this (default: 1y)
}

export interface WaybackSubmission {
	url: string;
	field: UrlField;
	itemId: string;
	sourceType: 'manual' | 'catalog';
	status: 'pending' | 'success' | 'failed' | 'skipped';
	archiveUrl?: string;
	error?: string;
	retryCount: number;
	existingArchive?: {
		timestamp: string;
		age: number;
		url: string;
	};
	ageCheckResult?: 'too_new' | 'needs_update' | 'not_archived';
	/** Whether the age check came from local cache */
	ageCheckFromCache?: boolean;
	/** @deprecated Use itemId instead */
	manualId?: string;
}

export interface WaybackCheckpoint {
	processedUrls: string[];
	failedSubmissions: WaybackSubmission[];
	successfulSubmissions: WaybackSubmission[];
	lastUpdated: number;
	totalUrls: number;
	fields: UrlField[];
	source: WaybackSource;
	manualsDir: string;
	catalogDir: string;
}

export interface WaybackResult {
	totalUrls: number;
	submitted: number;
	successful: number;
	failed: number;
	skipped: number;
	errors: string[];
	duration: number;
	ageStats: {
		tooNew: number;
		needsUpdate: number;
		notArchived: number;
	};
}

export interface ArchiveAgeCheck {
	result: 'not_archived' | 'too_new' | 'needs_update';
	archive?: {
		timestamp: string;
		age: number;
		url: string;
	};
	/** Whether this result came from the local cache */
	fromCache?: boolean;
}

export interface WaybackAvailableResponse {
	archived_snapshots: {
		closest?: {
			available: boolean;
			url: string;
			timestamp: string;
			status: string;
		};
	};
}

export interface ManualJson {
	id: string;
	sourceUrl?: string;
	pdfUrl?: string;
	productImage?: string;
	supplementaryPdfUrl?: string;
}

export interface CatalogItemJson {
	id: string;
	sourceUrl?: string;
	images?: string[];
}
