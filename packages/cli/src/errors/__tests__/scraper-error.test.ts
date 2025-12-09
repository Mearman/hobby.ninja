/**
 * Tests for ScraperError class
 */

import { describe, it, expect } from 'vitest';
import { ScraperError, ErrorCode, ErrorCategory } from '../scraper-error.js';

describe('ScraperError', () => {
  it('should create a ScraperError with all required properties', () => {
    const error = new ScraperError(ErrorCode.NETWORK_TIMEOUT, {
      url: 'https://example.com',
      retryCount: 1
    });

    expect(error.name).toBe('ScraperError');
    expect(error.code).toBe(ErrorCode.NETWORK_TIMEOUT);
    expect(error.category).toBe(ErrorCategory.NETWORK);
    expect(error.retryable).toBe(true);
    expect(error.context.url).toBe('https://example.com');
    expect(error.context.retryCount).toBe(1);
    expect(error.metadata.timestamp).toBeDefined();
  });

  it('should create error from generic Error with auto-detection', () => {
    const genericError = new Error('ENOTFOUND: getaddrinfo');
    const scraperError = ScraperError.fromError(genericError, { url: 'https://example.com' });

    expect(scraperError).toBeInstanceOf(ScraperError);
    expect(scraperError.code).toBe(ErrorCode.NETWORK_DNS_RESOLUTION);
    expect(scraperError.category).toBe(ErrorCategory.NETWORK);
    expect(scraperError.metadata.originalError).toBe(genericError);
  });

  it('should create network-specific errors', () => {
    const error = ScraperError.network(
      ErrorCode.NETWORK_CONNECTION_FAILED,
      'https://example.com',
      500
    );

    expect(error.code).toBe(ErrorCode.NETWORK_CONNECTION_FAILED);
    expect(error.context.url).toBe('https://example.com');
    expect(error.context.statusCode).toBe(500);
    expect(error.context.operation).toBe('http_request');
  });

  it('should create filesystem-specific errors', () => {
    const error = ScraperError.filesystem(
      ErrorCode.FS_FILE_NOT_FOUND,
      '/path/to/file.txt',
      'read'
    );

    expect(error.code).toBe(ErrorCode.FS_FILE_NOT_FOUND);
    expect(error.context.filePath).toBe('/path/to/file.txt');
    expect(error.context.operation).toBe('read');
  });

  it('should create configuration-specific errors', () => {
    const error = ScraperError.configuration(
      ErrorCode.CONFIG_VALIDATION_FAILED,
      'timeout'
    );

    expect(error.code).toBe(ErrorCode.CONFIG_VALIDATION_FAILED);
    expect(error.context.configKey).toBe('timeout');
    expect(error.context.operation).toBe('configuration');
  });

  it('should generate detailed string representation', () => {
    const error = ScraperError.scraping(
      ErrorCode.SCRAPE_PAGE_NOT_FOUND,
      'https://example.com',
      '.product-list'
    );

    const detailed = error.toDetailedString();

    expect(detailed).toContain('Error: SCRAPE_001');
    expect(detailed).toContain('Category: SCRAPING');
    expect(detailed).toContain('URL: https://example.com');
    expect(detailed).toContain('Selector: .product-list');
    expect(detailed).toContain('Timestamp:');
  });

  it('should generate user-friendly message with suggestions', () => {
    const error = ScraperError.network(
      ErrorCode.NETWORK_TIMEOUT,
      'https://example.com'
    );

    const userMessage = error.toUserMessage();

    expect(userMessage).toContain('took too long to complete');
    expect(userMessage).toContain('Suggestions:');
    expect(userMessage).toContain('https://example.com');
    expect(userMessage).toContain('Error Code: NETWORK_002');
  });

  it('should serialize to JSON correctly', () => {
    const originalError = new Error('Original error');
    const error = new ScraperError(
      ErrorCode.DATA_VALIDATION_FAILED,
      { fieldName: 'price', value: 'invalid' },
      originalError
    );

    const json = error.toJSON();

    expect(json.code).toBe(ErrorCode.DATA_VALIDATION_FAILED);
    expect(json.category).toBe(ErrorCategory.DATA);
    expect(json.context.fieldName).toBe('price');
    expect(json.context.value).toBe('invalid');
    expect(json.metadata.originalError).toEqual({
      name: 'Error',
      message: 'Original error'
    });
  });

  it('should determine retry logic correctly', () => {
    const retryableError = ScraperError.network(
      ErrorCode.NETWORK_TIMEOUT,
      'https://example.com'
    );

    const nonRetryableError = ScraperError.scraping(
      ErrorCode.SCRAPE_ACCESS_DENIED,
      'https://example.com'
    );

    expect(retryableError.shouldRetry()).toBe(true);
    expect(nonRetryableError.shouldRetry()).toBe(false);
  });

  it('should calculate retry delay with exponential backoff', () => {
    const error = ScraperError.network(
      ErrorCode.NETWORK_TIMEOUT,
      'https://example.com',
      undefined,
      undefined
    );

    // Test without retry count
    expect(error.getRetryDelay()).toBeGreaterThan(0);

    // Test with retry count
    const errorWithRetries = error.withContext({ retryCount: 2 });
    const delay = errorWithRetries.getRetryDelay();

    // Should be greater than base delay due to exponential backoff
    expect(delay).toBeGreaterThan(1000);
    expect(delay).toBeLessThan(30000); // Max 30 seconds
  });

  it('should create copy with updated context', () => {
    const error = ScraperError.network(
      ErrorCode.NETWORK_TIMEOUT,
      'https://example.com'
    );

    const updatedError = error.withContext({
      retryCount: 2,
      statusCode: 504
    });

    expect(updatedError.code).toBe(error.code);
    expect(updatedError.context.url).toBe('https://example.com');
    expect(updatedError.context.retryCount).toBe(2);
    expect(updatedError.context.statusCode).toBe(504);
  });

  it('should detect HTTP status codes in generic errors', () => {
    const httpError = new Error('Request failed');
    (httpError as Error & { status?: number }).status = 404;

    const scraperError = ScraperError.fromError(httpError);

    expect(scraperError.code).toBe(ErrorCode.SCRAPE_PAGE_NOT_FOUND);
  });

  it('should handle unknown error codes gracefully', () => {
    expect(() => {
      new ScraperError('UNKNOWN_CODE' as ErrorCode, {});
    }).toThrow('Unknown error code: UNKNOWN_CODE');
  });
});