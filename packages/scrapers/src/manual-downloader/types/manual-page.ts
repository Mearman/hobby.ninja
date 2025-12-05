/**
 * Manual Page entity definitions
 *
 * Core entity representing a single Bandai manual page
 * with all associated metadata and status tracking.
 */

export interface ManualPage {
  /** Unique identifier from the URL (e.g., 652 from /menus/detail/652/) */
  id: number;

  /** Full URL to the manual page */
  url: string;

  /** Download timestamp in ISO 8601 format */
  downloadedAt: string;

  /** Raw HTML content as downloaded from the server */
  htmlContent: string;

  /** Content length in bytes */
  contentSize: number;

  /** HTTP status code received during download */
  statusCode: number;

  /** Response headers received from server */
  headers: Record<string, string>;

  /** Download duration in milliseconds */
  downloadDuration: number;

  /** Content hash for integrity verification */
  contentHash: string;

  /** Whether the content was successfully verified */
  isVerified: boolean;

  /** File path where content is stored */
  filePath: string;

  /** Processing status */
  status: 'pending' | 'downloading' | 'completed' | 'failed' | 'verified';

  /** Error details if download failed */
  error?: {
    type: 'network' | 'http' | 'filesystem' | 'verification';
    message: string;
    timestamp: string;
    retryCount: number;
  };

  /** Additional metadata */
  metadata?: {
    title?: string;
    description?: string;
    pageCount?: number;
    fileSize?: number;
    lastModified?: string;
    etag?: string;
  };
}

/**
 * Manual page creation parameters
 */
export interface CreateManualPageParams {
  id: number;
  url: string;
  htmlContent: string;
  statusCode: number;
  headers: Record<string, string>;
  downloadDuration: number;
  filePath: string;
  metadata?: Partial<ManualPage['metadata']>;
}

/**
 * Factory function for creating ManualPage instances
 */
export function createManualPage(params: CreateManualPageParams): ManualPage {
  const now = new Date().toISOString();
  const contentSize = Buffer.byteLength(params.htmlContent, 'utf8');

  return {
    id: params.id,
    url: params.url,
    downloadedAt: now,
    htmlContent: params.htmlContent,
    contentSize,
    statusCode: params.statusCode,
    headers: params.headers,
    downloadDuration: params.downloadDuration,
    contentHash: '', // Will be set by verification
    isVerified: false,
    filePath: params.filePath,
    status: 'completed',
    metadata: params.metadata
  };
}

/**
 * Check if a manual page is valid and complete
 */
export function isValidManualPage(page: ManualPage): boolean {
  return (
    page.id > 0 &&
    page.url.length > 0 &&
    page.htmlContent.length > 1000 && // Minimum content length
    page.statusCode === 200 &&
    page.status === 'completed' &&
    page.filePath.length > 0
  );
}

/**
 * Get manual page file path
 */
export function getManualPageFilePath(outputDirectory: string, id: number): string {
  return `${outputDirectory.replace(/\/$/, '')}/${id}.html`;
}

/**
 * Extract page title from HTML content
 */
export function extractTitleFromHtml(html: string): string | null {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return titleMatch ? titleMatch[1].trim() : null;
}

/**
 * Validate manual page URL format
 */
export function isValidManualUrl(url: string): boolean {
  const manualUrlPattern = /^https:\/\/manual\.bandai-hobby\.net\/menus\/detail\/\d+\/?$/;
  return manualUrlPattern.test(url);
}

/**
 * Extract ID from manual page URL
 */
export function extractIdFromUrl(url: string): number {
  const match = url.match(/\/menus\/detail\/(\d+)\/?$/);
  return match ? parseInt(match[1], 10) : 0;
}