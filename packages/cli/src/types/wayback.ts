export type UrlField = 'sourceUrl' | 'pdfUrl' | 'productImage' | 'supplementaryPdfUrl';

export interface WaybackOptions {
	dataDir: string;
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
}

export interface WaybackSubmission {
	url: string;
	field: UrlField;
	manualId: string;
	status: 'pending' | 'success' | 'failed' | 'skipped';
	archiveUrl?: string;
	error?: string;
	retryCount: number;
}

export interface WaybackCheckpoint {
	processedUrls: string[];
	failedSubmissions: WaybackSubmission[];
	successfulSubmissions: WaybackSubmission[];
	lastUpdated: number;
	totalUrls: number;
	fields: UrlField[];
	dataDir: string;
}

export interface WaybackResult {
	totalUrls: number;
	submitted: number;
	successful: number;
	failed: number;
	skipped: number;
	errors: string[];
	duration: number;
}

export interface ManualJson {
	id: string;
	sourceUrl?: string;
	pdfUrl?: string;
	productImage?: string;
	supplementaryPdfUrl?: string;
}
