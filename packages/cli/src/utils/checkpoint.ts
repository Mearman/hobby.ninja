import { promises as fs } from 'fs';
import * as path from 'path';
import { CheckpointData } from '../types/profile-types.js';

export interface CheckpointOptions {
  checkpointFile?: string;
  maxRetries?: number;
}

export class CheckpointManager {
  private checkpointFile: string;
  private maxRetries: number;

  constructor(options: CheckpointOptions = {}) {
    this.checkpointFile = options.checkpointFile ||
      path.join(process.cwd(), '.gundam-scraper-checkpoint.json');
    this.maxRetries = options.maxRetries || 3;
  }

  async saveCheckpoint(data: CheckpointData): Promise<void> {
    try {
      const checkpoint = {
        timestamp: Date.now(),
        data,
        version: '1.0',
        retries: 0
      };

      const tempFile = `${this.checkpointFile}.tmp`;
      await fs.writeFile(tempFile, JSON.stringify(checkpoint, null, 2), 'utf-8');
      await fs.rename(tempFile, this.checkpointFile);
    } catch (error) {
      throw new Error(`Failed to save checkpoint: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async loadCheckpoint(): Promise<CheckpointData | null> {
    try {
      const data = await fs.readFile(this.checkpointFile, 'utf-8');
      const checkpoint = JSON.parse(data);

      // Validate checkpoint structure
      if (!checkpoint.data || !checkpoint.timestamp || !checkpoint.version) {
        throw new Error('Invalid checkpoint format');
      }

      return checkpoint.data as CheckpointData;
    } catch (error) {
      if (error instanceof Error && error.message.includes('ENOENT')) {
        // File doesn't exist - that's okay
        return null;
      }
      console.warn(`Failed to load checkpoint: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }

  async updateCheckpoint(updateFn: (data: CheckpointData | null) => CheckpointData): Promise<CheckpointData> {
    let data = await this.loadCheckpoint();
    const updatedData = updateFn(data);
    await this.saveCheckpoint(updatedData);
    return updatedData;
  }

  async deleteCheckpoint(): Promise<void> {
    try {
      await fs.unlink(this.checkpointFile);
    } catch (error) {
      if (error instanceof Error && error.message.includes('ENOENT')) {
        // File doesn't exist - that's okay
        return;
      }
      throw new Error(`Failed to delete checkpoint: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async checkpointExists(): Promise<boolean> {
    try {
      await fs.access(this.checkpointFile);
      return true;
    } catch {
      return false;
    }
  }

  async getCheckpointAge(): Promise<number | null> {
    try {
      const data = await fs.readFile(this.checkpointFile, 'utf-8');
      const checkpoint = JSON.parse(data);

      if (!checkpoint.timestamp) {
        return null;
      }

      return Date.now() - checkpoint.timestamp;
    } catch {
      return null;
    }
  }

  async isCheckpointExpired(maxAge: number = 24 * 60 * 60 * 1000): Promise<boolean> {
    const age = await this.getCheckpointAge();
    return age !== null && age > maxAge;
  }

  async incrementRetries(): Promise<number> {
    const updatedData = await this.updateCheckpoint((data) => {
      if (!data) {
        throw new Error('Cannot increment retries: no checkpoint data found');
      }

      const currentRetries = (data['retries'] as number) || 0;
      data['retries'] = currentRetries + 1;

      if (data['retries'] > this.maxRetries) {
        throw new Error(`Maximum retries exceeded (${this.maxRetries})`);
      }

      return data;
    });

    return (updatedData['retries'] as number) || 0;
  }

  async getRetries(): Promise<number> {
    const data = await this.loadCheckpoint();
    return (data?.['retries'] as number) || 0;
  }

  async shouldRetry(): Promise<boolean> {
    const retries = await this.getRetries();
    return retries < this.maxRetries;
  }

  // Utility methods for managing different checkpoint types
  async saveScrapeProgress(source: string, remainingUrls: string[], completedUrls: string[], metadata?: Record<string, any>): Promise<void> {
    await this.saveCheckpoint({
      type: 'scrape',
      source,
      remainingUrls,
      completedUrls,
      metadata: metadata || {},
      status: 'in_progress',
      createdAt: Date.now(),
      lastUpdated: Date.now()
    });
  }

  async loadScrapeProgress(): Promise<{
    source: string;
    remainingUrls: string[];
    completedUrls: string[];
    metadata: Record<string, any>;
    status: string;
    createdAt: number;
    lastUpdated: number;
  } | null> {
    const data = await this.loadCheckpoint();

    if (data?.type !== 'scrape') {
      return null;
    }

    return {
      source: (data['source'] as string) || '',
      remainingUrls: (data['remainingUrls'] as string[]) || [],
      completedUrls: (data['completedUrls'] as string[]) || [],
      metadata: (data['metadata'] as Record<string, any>) || {},
      status: (data['status'] as string) || 'unknown',
      createdAt: (data['createdAt'] as number) || Date.now(),
      lastUpdated: (data['lastUpdated'] as number) || Date.now()
    };
  }

  async markScrapeCompleted(): Promise<void> {
    await this.updateCheckpoint((data) => {
      if (!data || data.type !== 'scrape') {
        throw new Error('Cannot mark completed: invalid checkpoint data');
      }

      data['status'] = 'completed';
      data['completedAt'] = Date.now();
      return data;
    });
  }

  async markScrapeFailed(error: Error): Promise<void> {
    await this.updateCheckpoint((data) => {
      if (!data || data.type !== 'scrape') {
        throw new Error('Cannot mark failed: invalid checkpoint data');
      }

      data['status'] = 'failed';
      data['error'] = error.message;
      data['failedAt'] = Date.now();
      return data;
    });
  }
}

// Utility function to create a checkpoint with default options
export function createCheckpointManager(options?: CheckpointOptions): CheckpointManager {
  return new CheckpointManager(options);
}

// Helper for managing checkpoints with automatic cleanup
export class AutoCleanupCheckpointManager extends CheckpointManager {
  private cleanupInterval: NodeJS.Timeout | null = null;
  private cleanupAge: number;

  constructor(options: CheckpointOptions & { cleanupAge?: number } = {}) {
    super(options);
    this.cleanupAge = options.cleanupAge || 7 * 24 * 60 * 60 * 1000; // 7 days default
  }

  startAutoCleanup(intervalMs: number = 60 * 60 * 1000): void {
    this.cleanupInterval = setInterval(async () => {
      if (await this.isCheckpointExpired(this.cleanupAge)) {
        console.log('🧹 Cleaning up expired checkpoint...');
        await this.deleteCheckpoint();
      }
    }, intervalMs);
  }

  stopAutoCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Export convenience functions for common checkpoint operations
export async function saveScrapeCheckpoint(source: string, remainingUrls: string[], completedUrls: string[], metadata?: Record<string, any>): Promise<void> {
  const manager = createCheckpointManager();
  await manager.saveScrapeProgress(source, remainingUrls, completedUrls, metadata);
}

export async function loadScrapeCheckpoint(): Promise<{
  source: string;
  remainingUrls: string[];
  completedUrls: string[];
  metadata: Record<string, any>;
  status: string;
  createdAt: number;
  lastUpdated: number;
} | null> {
  const manager = createCheckpointManager();
  return await manager.loadScrapeProgress();
}