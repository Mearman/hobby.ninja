/**
 * Cryptographic utilities for Bandai Manual Content Downloader
 *
 * Provides SHA-256 hashing and content integrity verification
 * functionality using Node.js built-in crypto module.
 *
 * @version 1.0.0
 * @since 2025-12-05
 */

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

/**
 * Compute SHA-256 hash of string content
 *
 * @param content Text content to hash
 * @returns SHA-256 hash as hex string
 */
export function computeSHA256(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

/**
 * Compute SHA-256 hash of file content
 *
 * @param filePath Path to file to hash
 * @returns Promise resolving to SHA-256 hash as hex string
 */
export async function computeFileSHA256(filePath: string): Promise<string> {
  try {
    const content = await readFile(filePath, 'utf8');
    return computeSHA256(content);
  } catch (error) {
    throw new Error(`Failed to compute SHA-256 hash for file ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Verify content integrity using SHA-256 hash
 *
 * @param content Content to verify
 * @param expectedHash Expected SHA-256 hash
 * @returns True if content matches expected hash
 */
export function verifyContentIntegrity(content: string, expectedHash: string): boolean {
  const actualHash = computeSHA256(content);
  return actualHash === expectedHash.toLowerCase();
}

/**
 * Verify file integrity using SHA-256 hash
 *
 * @param filePath Path to file to verify
 * @param expectedHash Expected SHA-256 hash
 * @returns Promise resolving to true if file matches expected hash
 */
export async function verifyFileIntegrity(filePath: string, expectedHash: string): Promise<boolean> {
  try {
    const actualHash = await computeFileSHA256(filePath);
    return actualHash === expectedHash.toLowerCase();
  } catch (error) {
    // If we can't read the file, consider verification failed
    return false;
  }
}

/**
 * Generate UUID v4 for session identification
 *
 * @returns UUID v4 string
 */
export function generateUUID(): string {
  return createHash('sha256')
    .update(Date.now().toString() + Math.random().toString())
    .digest('hex')
    .substring(0, 32)
    .replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
}

/**
 * Generate simple hash for deduplication
 *
 * @param data Data to hash
 * @returns Simple hash string
 */
export function generateSimpleHash(data: string): string {
  return createHash('md5').update(data).digest('hex').substring(0, 16);
}