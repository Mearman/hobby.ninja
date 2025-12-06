/**
 * Ink-based UI component for Wayback Machine submission progress
 *
 * Uses @inkjs/ui components (ProgressBar, Spinner) for rich CLI output.
 */

import React from 'react';
import { render, Box, Text } from 'ink';
import { ProgressBar, Spinner } from '@inkjs/ui';

/** A single log entry for the scrolling log */
export interface LogEntry {
	url: string;
	status: 'success' | 'failed' | 'skipped' | 'cached';
	message?: string;
	/** Number of retry attempts (0 = first try succeeded) */
	retryCount?: number;
	/** Archive age info when skipped due to existing archive */
	archiveAge?: string;
	/** Whether the age check came from cache */
	fromCache?: boolean;
}

export interface WaybackStats {
	/** Total URLs to process */
	total: number;
	/** URLs processed so far */
	processed: number;
	/** Successfully archived */
	successful: number;
	/** Failed to archive */
	failed: number;
	/** Skipped (already archived recently) */
	skipped: number;
	/** Archive age stats */
	ageStats: {
		tooNew: number;
		needsUpdate: number;
		notArchived: number;
	};
	/** Cache stats */
	cacheStats?: {
		hits: number;
		misses: number;
		size: number;
	};
	/** Current item being processed */
	currentItem?: {
		sourceType: 'manual' | 'catalog';
		itemId: string;
		field: string;
	};
	/** Whether processing is complete */
	isComplete?: boolean;
	/** Elapsed time in ms */
	elapsedMs?: number;
	/** Recent log entries for scrolling display */
	recentLogs?: LogEntry[];
}

interface WaybackProgressProps {
	stats: WaybackStats;
}

function formatDuration(ms: number): string {
	const seconds = Math.floor(ms / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);

	if (hours > 0) {
		return `${hours}h ${minutes % 60}m`;
	}
	if (minutes > 0) {
		return `${minutes}m ${seconds % 60}s`;
	}
	return `${seconds}s`;
}

function WaybackProgressUI({ stats }: WaybackProgressProps) {
	const progress = stats.total > 0 ? Math.round((stats.processed / stats.total) * 100) : 0;
	const elapsed = stats.elapsedMs ? formatDuration(stats.elapsedMs) : '0s';

	// Estimate remaining time
	let eta = '';
	if (stats.processed > 0 && stats.elapsedMs && !stats.isComplete) {
		const avgTimePerItem = stats.elapsedMs / stats.processed;
		const remaining = (stats.total - stats.processed) * avgTimePerItem;
		eta = formatDuration(remaining);
	}

	return (
		<Box flexDirection="column" paddingX={1}>
			{/* Header with spinner or completion status */}
			<Box marginBottom={1}>
				{stats.isComplete ? (
					<Text color="green" bold>
						Wayback Submission Complete!
					</Text>
				) : (
					<Box>
						<Spinner label="Submitting to Wayback Machine..." />
					</Box>
				)}
			</Box>

			{/* Progress bar */}
			<Box marginBottom={1}>
				<Box width={50}>
					<ProgressBar value={progress} />
				</Box>
				<Text>
					{' '}
					{stats.processed}/{stats.total} ({progress}%)
				</Text>
				{eta && (
					<Text color="gray">
						{' '}
						ETA: {eta}
					</Text>
				)}
			</Box>

			{/* Current item being processed */}
			{stats.currentItem && !stats.isComplete && (
				<Box marginBottom={1}>
					<Text color="gray">
						Current: [{stats.currentItem.sourceType}:{stats.currentItem.itemId}] {stats.currentItem.field}
					</Text>
				</Box>
			)}

			{/* Stats row */}
			<Box>
				<Text color="green">Archived: {stats.successful}</Text>
				<Text> </Text>
				<Text color="yellow">Skipped: {stats.skipped}</Text>
				<Text> </Text>
				<Text color={stats.failed > 0 ? 'red' : 'gray'}>Failed: {stats.failed}</Text>
			</Box>

			{/* Age analysis row */}
			<Box marginTop={1}>
				<Text color="cyan">Age Analysis: </Text>
				<Text color="gray">Too recent: {stats.ageStats.tooNew}</Text>
				<Text> </Text>
				<Text color="blue">Needs update: {stats.ageStats.needsUpdate}</Text>
				<Text> </Text>
				<Text color="magenta">Not archived: {stats.ageStats.notArchived}</Text>
			</Box>

			{/* Cache stats row */}
			{stats.cacheStats && (
				<Box marginTop={1}>
					<Text color="cyan">Cache: </Text>
					<Text color="green">Hits: {stats.cacheStats.hits}</Text>
					<Text> </Text>
					<Text color="yellow">Misses: {stats.cacheStats.misses}</Text>
					<Text> </Text>
					<Text color="gray">
						({stats.cacheStats.hits + stats.cacheStats.misses > 0
							? Math.round((stats.cacheStats.hits / (stats.cacheStats.hits + stats.cacheStats.misses)) * 100)
							: 0}% hit rate, {stats.cacheStats.size} cached)
					</Text>
				</Box>
			)}

			{/* Elapsed time */}
			{stats.elapsedMs !== undefined && (
				<Box marginTop={1}>
					<Text color="gray">Elapsed: {elapsed}</Text>
				</Box>
			)}

			{/* Scrolling log of recent URLs */}
			{stats.recentLogs && stats.recentLogs.length > 0 && (
				<Box marginTop={1} flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1}>
					<Text color="gray" dimColor>Recent activity:</Text>
					{stats.recentLogs.map((log, i) => {
						const statusIcon = log.status === 'success' ? '✓' :
							log.status === 'failed' ? '✗' :
							log.status === 'cached' ? '⚡' : '○';
						const statusColor = log.status === 'success' ? 'green' :
							log.status === 'failed' ? 'red' :
							log.status === 'cached' ? 'cyan' : 'yellow';
						// Truncate URL to fit in terminal
						const maxUrlLen = 50;
						const displayUrl = log.url.length > maxUrlLen
							? '...' + log.url.slice(-maxUrlLen + 3)
							: log.url;
						// Build detail string with extra info
						const details: string[] = [];
						if (log.retryCount && log.retryCount > 0) {
							details.push(`${log.retryCount} retries`);
						}
						if (log.archiveAge) {
							details.push(`age: ${log.archiveAge}`);
						}
						if (log.fromCache) {
							details.push('cached');
						}
						if (log.message && !log.archiveAge) {
							details.push(log.message);
						}
						const detailStr = details.length > 0 ? ` (${details.join(', ')})` : '';
						return (
							<Box key={i}>
								<Text color={statusColor}>{statusIcon}</Text>
								<Text> </Text>
								<Text color="gray">{displayUrl}</Text>
								{detailStr && (
									<Text color="gray" dimColor>{detailStr}</Text>
								)}
							</Box>
						);
					})}
				</Box>
			)}
		</Box>
	);
}

/** Maximum number of log entries to display */
const MAX_LOG_ENTRIES = 8;

/**
 * Progress renderer that can be updated during Wayback submission
 */
export class WaybackProgressRenderer {
	private rerender: ((node: React.ReactNode) => void) | null = null;
	private unmount: (() => void) | null = null;
	private stats: WaybackStats;
	private startTime: number = 0;
	private logEntries: LogEntry[] = [];

	constructor(total: number) {
		this.stats = {
			total,
			processed: 0,
			successful: 0,
			failed: 0,
			skipped: 0,
			ageStats: {
				tooNew: 0,
				needsUpdate: 0,
				notArchived: 0,
			},
			isComplete: false,
			recentLogs: [],
		};
	}

	/**
	 * Start rendering the progress UI
	 */
	start(): void {
		this.startTime = Date.now();
		const { rerender, unmount } = render(<WaybackProgressUI stats={this.stats} />);
		this.rerender = rerender;
		this.unmount = unmount;
	}

	/**
	 * Update progress stats and re-render
	 */
	update(partial: Partial<WaybackStats>): void {
		this.stats = {
			...this.stats,
			...partial,
			elapsedMs: Date.now() - this.startTime,
			recentLogs: this.logEntries,
		};
		if (this.rerender) {
			this.rerender(<WaybackProgressUI stats={this.stats} />);
		}
	}

	/**
	 * Add a log entry to the scrolling log
	 */
	log(entry: LogEntry): void {
		this.logEntries.push(entry);
		// Keep only the most recent entries
		if (this.logEntries.length > MAX_LOG_ENTRIES) {
			this.logEntries = this.logEntries.slice(-MAX_LOG_ENTRIES);
		}
	}

	/**
	 * Mark as complete
	 */
	complete(): void {
		this.stats = {
			...this.stats,
			isComplete: true,
			elapsedMs: Date.now() - this.startTime,
			currentItem: undefined,
			recentLogs: this.logEntries,
		};
		if (this.rerender) {
			this.rerender(<WaybackProgressUI stats={this.stats} />);
		}
	}

	/**
	 * Clean up the renderer
	 */
	cleanup(): void {
		if (this.unmount) {
			this.unmount();
		}
	}

	/**
	 * Get current stats
	 */
	getStats(): WaybackStats {
		return { ...this.stats };
	}
}
