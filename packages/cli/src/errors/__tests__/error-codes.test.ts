/**
 * Tests for error codes and registry
 */

import { describe, it, expect } from 'vitest';
import { ErrorCode, ErrorCategory, ErrorRegistry } from '../error-codes.js';

describe('Error Codes', () => {
  it('should have valid error codes for all categories', () => {
    const allErrors = ErrorRegistry.getAllErrors();

    expect(allErrors.length).toBeGreaterThan(0);

    // Check that all errors have required properties
    allErrors.forEach(error => {
      expect(error).toHaveProperty('code');
      expect(error).toHaveProperty('category');
      expect(error).toHaveProperty('message');
      expect(error).toHaveProperty('userMessage');
      expect(error).toHaveProperty('suggestions');
      expect(error).toHaveProperty('retryable');
      expect(error).toHaveProperty('severity');

      expect(error.suggestions).toBeInstanceOf(Array);
      expect(['low', 'medium', 'high', 'critical']).toContain(error.severity);
      expect(typeof error.retryable).toBe('boolean');
    });
  });

  it('should retrieve error info by code', () => {
    const errorInfo = ErrorRegistry.getErrorInfo(ErrorCode.NETWORK_TIMEOUT);

    expect(errorInfo).toBeDefined();
    expect(errorInfo!.code).toBe(ErrorCode.NETWORK_TIMEOUT);
    expect(errorInfo!.category).toBe(ErrorCategory.NETWORK);
    expect(errorInfo!.message).toContain('timeout');
    expect(errorInfo!.retryable).toBe(true);
  });

  it('should return undefined for unknown error code', () => {
    const errorInfo = ErrorRegistry.getErrorInfo('UNKNOWN_CODE' as ErrorCode);
    expect(errorInfo).toBeUndefined();
  });

  it('should filter errors by category', () => {
    const networkErrors = ErrorRegistry.getErrorsByCategory(ErrorCategory.NETWORK);
    const configErrors = ErrorRegistry.getErrorsByCategory(ErrorCategory.CONFIGURATION);

    expect(networkErrors.length).toBeGreaterThan(0);
    expect(configErrors.length).toBeGreaterThan(0);

    // Verify all returned errors belong to the correct category
    networkErrors.forEach(error => {
      expect(error.category).toBe(ErrorCategory.NETWORK);
    });

    configErrors.forEach(error => {
      expect(error.category).toBe(ErrorCategory.CONFIGURATION);
    });
  });

  it('should register custom errors', () => {
    const customError = {
      code: 'CUSTOM_001' as ErrorCode,
      category: ErrorCategory.SYSTEM,
      message: 'Custom error message',
      userMessage: 'Custom user message',
      suggestions: ['Suggestion 1', 'Suggestion 2'],
      retryable: false,
      severity: 'medium' as const
    };

    ErrorRegistry.registerCustom(customError);

    const retrievedError = ErrorRegistry.getErrorInfo('CUSTOM_001' as ErrorCode);
    expect(retrievedError).toEqual(customError);
  });

  it('should have proper error code format', () => {
    const allErrors = ErrorRegistry.getAllErrors();

    allErrors.forEach(error => {
      const codePattern = /^[A-Z]+_\d{3}$/;
      expect(codePattern.test(error.code)).toBe(true);
    });
  });

  it('should provide meaningful suggestions for retryable errors', () => {
    const retryableErrors = ErrorRegistry.getAllErrors().filter(error => error.retryable);

    retryableErrors.forEach(error => {
      expect(error.suggestions.length).toBeGreaterThan(0);
      // Suggestions should be actionable
      error.suggestions.forEach(suggestion => {
        expect(typeof suggestion).toBe('string');
        expect(suggestion.trim().length).toBeGreaterThan(0);
      });
    });
  });
});