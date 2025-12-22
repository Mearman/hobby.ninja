import { promises as fs } from "node:fs";
import path from "node:path";

import { DEFAULT_VALUES } from "../constants/cli-constants.js";
import type { CheckpointData, CheckpointMetadata } from "../types/profile-types.js";

export interface CheckpointOptions {
  checkpointFile?: string;
  maxRetries?: number;
}

const DEFAULT_CHECKPOINT_FILE = ".gundam-scraper-checkpoint.json";
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_CLEANUP_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const DEFAULT_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
const DEFAULT_CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const UNKNOWN_ERROR_MESSAGE = "Unknown error";

export class CheckpointManager {
	private checkpointFile: string;
	private maxRetries: number;

	constructor(options: CheckpointOptions = {}) {
		this.checkpointFile = options.checkpointFile ??
      path.join(process.cwd(), DEFAULT_CHECKPOINT_FILE);
		this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
	}

	async saveCheckpoint(data: CheckpointData): Promise<void> {
		try {
			const checkpoint = {
				timestamp: Date.now(),
				data,
				version: "1.0",
				retries: 0,
			};

			const tempFile = `${this.checkpointFile}.tmp`;
			await fs.writeFile(tempFile, JSON.stringify(checkpoint, null, 2), "utf8");
			await fs.rename(tempFile, this.checkpointFile);
		} catch (error) {
			throw new Error(`Failed to save checkpoint: ${error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE}`);
		}
	}

	async loadCheckpoint(): Promise<CheckpointData | null> {
		try {
			const data = await fs.readFile(this.checkpointFile, "utf8");
			const checkpoint: unknown = JSON.parse(data);

			// Validate checkpoint structure
			if (!this.isValidCheckpoint(checkpoint)) {
				throw new Error("Invalid checkpoint format");
			}

			return checkpoint.data as CheckpointData;
		} catch (error) {
			if (error instanceof Error && error.message.includes("ENOENT")) {
				// File doesn't exist - that's okay
				return null;
			}
			console.warn(`Failed to load checkpoint: ${error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE}`);
			return null;
		}
	}

	private isValidCheckpoint(checkpoint: unknown): checkpoint is { data: unknown; timestamp: number; version: string } {
		return (
			typeof checkpoint === "object" &&
			checkpoint !== null &&
			"data" in checkpoint &&
			"timestamp" in checkpoint &&
			"version" in checkpoint
		);
	}

	async updateCheckpoint(updateFn: (data: CheckpointData | null) => CheckpointData): Promise<CheckpointData> {
		const data = await this.loadCheckpoint();
		const updatedData = updateFn(data);
		await this.saveCheckpoint(updatedData);
		return updatedData;
	}

	async deleteCheckpoint(): Promise<void> {
		try {
			await fs.unlink(this.checkpointFile);
		} catch (error) {
			if (error instanceof Error && error.message.includes("ENOENT")) {
				// File doesn't exist - that's okay
				return;
			}
			throw new Error(`Failed to delete checkpoint: ${error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE}`);
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
			const data = await fs.readFile(this.checkpointFile, "utf8");
			const checkpoint: unknown = JSON.parse(data);

			if (!this.isValidCheckpoint(checkpoint)) {
				return null;
			}

			return Date.now() - checkpoint.timestamp;
		} catch {
			return null;
		}
	}

	async isCheckpointExpired(maxAge: number = DEFAULT_MAX_AGE_MS): Promise<boolean> {
		const age = await this.getCheckpointAge();
		return age !== null && age > maxAge;
	}

	async incrementRetries(): Promise<number> {
		const updatedData = await this.updateCheckpoint((data) => {
			if (!data) {
				throw new Error("Cannot increment retries: no checkpoint data found");
			}

			const currentRetries = (data["retries"] as number) || 0;
			const newRetries = currentRetries + 1;
			data["retries"] = newRetries;

			if (newRetries > this.maxRetries) {
				throw new Error(`Maximum retries exceeded (${this.maxRetries})`);
			}

			return data;
		});

		return (updatedData["retries"] as number) || 0;
	}

	async getRetries(): Promise<number> {
		const data = await this.loadCheckpoint();
		return (data?.["retries"] as number) || 0;
	}

	async shouldRetry(): Promise<boolean> {
		const retries = await this.getRetries();
		return retries < this.maxRetries;
	}

	// Utility methods for managing different checkpoint types
	async saveScrapeProgress(source: string, remainingUrls: string[], completedUrls: string[], metadata?: CheckpointMetadata): Promise<void> {
		const now = Date.now();
		await this.saveCheckpoint({
			type: "scrape",
			source,
			timestamp: now,
			remainingUrls,
			completedUrls,
			metadata: metadata ?? {},
			status: "in_progress",
			createdAt: now,
			lastUpdated: now,
		});
	}

	async loadScrapeProgress(): Promise<{
    source: string;
    remainingUrls: string[];
    completedUrls: string[];
    metadata: CheckpointMetadata;
    status: string;
    createdAt: number;
    lastUpdated: number;
  } | null> {
		const data = await this.loadCheckpoint();

		if (data?.type !== "scrape") {
			return null;
		}

		return {
			source: typeof data.source === "string" ? data.source : "",
			remainingUrls: Array.isArray(data["remainingUrls"]) ? (data["remainingUrls"] as string[]) : [],
			completedUrls: Array.isArray(data["completedUrls"]) ? (data["completedUrls"] as string[]) : [],
			metadata: (typeof data["metadata"] === "object" && data["metadata"] !== null) ? (data["metadata"] as CheckpointMetadata) : {},
			status: typeof data["status"] === "string" ? data["status"] : DEFAULT_VALUES.UNKNOWN_STATUS,
			createdAt: typeof data["createdAt"] === "number" ? data["createdAt"] : Date.now(),
			lastUpdated: typeof data["lastUpdated"] === "number" ? data["lastUpdated"] : Date.now(),
		};
	}

	async markScrapeCompleted(): Promise<void> {
		await this.updateCheckpoint((data) => {
			if (data?.type !== "scrape") {
				throw new Error("Cannot mark completed: invalid checkpoint data");
			}

			data["status"] = "completed";
			data["completedAt"] = Date.now();
			return data;
		});
	}

	async markScrapeFailed(error: Error): Promise<void> {
		await this.updateCheckpoint((data) => {
			if (data?.type !== "scrape") {
				throw new Error("Cannot mark failed: invalid checkpoint data");
			}

			data["status"] = "failed";
			data["error"] = error.message;
			data["failedAt"] = Date.now();
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
		this.cleanupAge = options.cleanupAge ?? DEFAULT_CLEANUP_AGE_MS;
	}

	startAutoCleanup(intervalMs: number = DEFAULT_CLEANUP_INTERVAL_MS): void {
		this.cleanupInterval = setInterval(() => {
			void this.cleanupExpiredCheckpoint();
		}, intervalMs);
	}

	private async cleanupExpiredCheckpoint(): Promise<void> {
		if (await this.isCheckpointExpired(this.cleanupAge)) {
			console.log("🧹 Cleaning up expired checkpoint...");
			await this.deleteCheckpoint();
		}
	}

	stopAutoCleanup(): void {
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
			this.cleanupInterval = null;
		}
	}
}

// Export convenience functions for common checkpoint operations
export async function saveScrapeCheckpoint(source: string, remainingUrls: string[], completedUrls: string[], metadata?: CheckpointMetadata): Promise<void> {
	const manager = createCheckpointManager();
	await manager.saveScrapeProgress(source, remainingUrls, completedUrls, metadata);
}

export async function loadScrapeCheckpoint(): Promise<{
  source: string;
  remainingUrls: string[];
  completedUrls: string[];
  metadata: CheckpointMetadata;
  status: string;
  createdAt: number;
  lastUpdated: number;
} | null> {
	const manager = createCheckpointManager();
	return await manager.loadScrapeProgress();
}