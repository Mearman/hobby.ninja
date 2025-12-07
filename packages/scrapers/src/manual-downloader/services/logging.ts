/**
 * Logging service for Bandai Manual Content Downloader
 *
 * Provides structured logging with multiple output levels and
 * progress tracking capabilities for CLI operations.
 *
 * @version 1.0.0
 * @since 2025-12-05
 */

import { ProgressEvent } from "../types";

import { ErrorInfo } from "./errors";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: any;
  error?: ErrorInfo;
}

/**
 * Logging configuration
 */
export interface LoggingConfig {
  level: LogLevel;
  enableConsoleOutput: boolean;
  enableFileOutput: boolean;
  logFilePath?: string;
  enableColors: boolean;
  enableTimestamps: boolean;
}

/**
 * Default logging configuration
 */
const DEFAULT_CONFIG: LoggingConfig = {
	level: "info",
	enableConsoleOutput: true,
	enableFileOutput: false,
	enableColors: true,
	enableTimestamps: true,
};

/**
 * Logging service class
 */
export class LoggingService {
	private config: LoggingConfig;
	private logEntries: LogEntry[] = [];
	private progressCallback?: (event: ProgressEvent) => void;

	constructor(config: Partial<LoggingConfig> = {}) {
		this.config = { ...DEFAULT_CONFIG, ...config };
	}

	/**
   * Set progress event callback
   */
	setProgressCallback(callback: (event: ProgressEvent) => void): void {
		this.progressCallback = callback;
	}

	/**
   * Log debug message
   */
	debug(message: string, context?: any): void {
		this.log("debug", message, context);
	}

	/**
   * Log info message
   */
	info(message: string, context?: any): void {
		this.log("info", message, context);
	}

	/**
   * Log warning message
   */
	warn(message: string, context?: any): void {
		this.log("warn", message, context);
	}

	/**
   * Log error message
   */
	error(message: string, error?: ErrorInfo | Error, context?: any): void {
		const errorInfo = error instanceof Error ? this.errorToErrorInfo(error) : error;
		this.log("error", message, context, errorInfo);
	}

	/**
   * Generic log method
   */
	private log(level: LogLevel, message: string, context?: any, error?: ErrorInfo): void {
		const entry: LogEntry = {
			level,
			message,
			timestamp: new Date().toISOString(),
			context,
			error,
		};

		this.logEntries.push(entry);

		// Filter by level
		if (!this.shouldLog(level)) {
			return;
		}

		// Console output
		if (this.config.enableConsoleOutput) {
			this.outputToConsole(entry);
		}

		// File output
		if (this.config.enableFileOutput && this.config.logFilePath) {
			this.outputToFile(entry);
		}
	}

	/**
   * Check if message should be logged based on level
   */
	private shouldLog(level: LogLevel): boolean {
		const levels: Record<LogLevel, number> = {
			debug: 0,
			info: 1,
			warn: 2,
			error: 3,
		};

		return levels[level] >= levels[this.config.level];
	}

	/**
   * Output log entry to console
   */
	private outputToConsole(entry: LogEntry): void {
		let output = "";

		// Add timestamp if enabled
		if (this.config.enableTimestamps) {
			output += `[${entry.timestamp}] `;
		}

		// Add level
		output += `[${entry.level.toUpperCase()}] `;

		// Add message
		output += entry.message;

		// Add context if available
		if (entry.context) {
			output += ` ${JSON.stringify(entry.context)}`;
		}

		// Add error details if available
		if (entry.error) {
			output += ` Error: ${entry.error.message}`;
			if (entry.error.code) {
				output += ` (${entry.error.code})`;
			}
		}

		// Apply colors if enabled
		if (this.config.enableColors) {
			output = this.applyColors(output, entry.level);
		}

		// Output to appropriate console stream
		switch (entry.level) {
			case "error": {
				console.error(output);
				break;
			}
			case "warn": {
				console.warn(output);
				break;
			}
			default: {
				console.log(output);
			}
		}
	}

	/**
   * Apply colors to log output
   */
	private applyColors(output: string, level: LogLevel): string {
		const colors = {
			reset: "\u001B[0m",
			bright: "\u001B[1m",
			dim: "\u001B[2m",
			red: "\u001B[31m",
			green: "\u001B[32m",
			yellow: "\u001B[33m",
			blue: "\u001B[34m",
			magenta: "\u001B[35m",
			cyan: "\u001B[36m",
			white: "\u001B[37m",
		};

		const levelColors = {
			debug: colors.dim,
			info: colors.blue,
			warn: colors.yellow,
			error: colors.red,
		};

		const color = levelColors[level] || colors.reset;
		return `${color}${output}${colors.reset}`;
	}

	/**
   * Output log entry to file (simplified)
   */
	private outputToFile(entry: LogEntry): void {
		// In a real implementation, this would write to a file
		// For now, just collect entries for potential file output
		if (this.logEntries.length > 1000) {
			// Prevent memory issues by limiting stored entries
			this.logEntries = this.logEntries.slice(-500);
		}
	}

	/**
   * Convert Error to ErrorInfo
   */
	private errorToErrorInfo(error: Error): ErrorInfo {
		return {
			type: "network", // Default type
			code: "UNKNOWN_ERROR",
			message: error.message,
			timestamp: new Date().toISOString(),
			retryCount: 0,
			recoverable: false,
			suggestedAction: "Check error details and retry",
		};
	}

	/**
   * Log progress event
   */
	logProgress(event: ProgressEvent): void {
		this.info(`Progress: ${event.type}`, {
			sessionId: event.session.id,
			phase: event.session.phase,
			status: event.session.status,
			progress: event.progress,
		});

		// Call progress callback if set
		if (this.progressCallback) {
			try {
				this.progressCallback(event);
			} catch (error) {
				this.error("Progress callback failed", error instanceof Error ? error : new Error(String(error)));
			}
		}
	}

	/**
   * Log download progress
   */
	logDownloadProgress(sessionId: string, currentId: number, totalChecked: number, discovered: number): void {
		const percentage = totalChecked > 0 ? Math.round((currentId / totalChecked) * 100) : 0;

		this.info(`Downloading manuals: ${currentId}/${totalChecked} (${percentage}%) - ${discovered} found`, {
			sessionId,
			currentId,
			totalChecked,
			discovered,
			percentage,
		});
	}

	/**
   * Log discovery progress
   */
	logDiscoveryProgress(sessionId: string, rangeStart: number, rangeEnd: number, discoveredIds: number[]): void {
		this.info(`Discovery progress: range ${rangeStart}-${rangeEnd}, found ${discoveredIds.length} manuals`, {
			sessionId,
			rangeStart,
			rangeEnd,
			discoveredCount: discoveredIds.length,
			discoveredIds,
		});
	}

	/**
   * Log error with recovery suggestion
   */
	logErrorWithRecovery(message: string, error: ErrorInfo): void {
		this.error(message, error);
		if (error.suggestedAction) {
			this.info(`Recovery suggestion: ${error.suggestedAction}`);
		}
	}

	/**
   * Get all log entries
   */
	getLogEntries(): LogEntry[] {
		return [...this.logEntries];
	}

	/**
   * Get log entries by level
   */
	getLogEntriesByLevel(level: LogLevel): LogEntry[] {
		return this.logEntries.filter(entry => entry.level === level);
	}

	/**
   * Clear log entries
   */
	clearLogs(): void {
		this.logEntries = [];
	}

	/**
   * Set log level
   */
	setLevel(level: LogLevel): void {
		this.config.level = level;
	}

	/**
   * Get current log level
   */
	getLevel(): LogLevel {
		return this.config.level;
	}
}

/**
 * Create logging service instance
 */
export function createLogger(config?: Partial<LoggingConfig>): LoggingService {
	return new LoggingService(config);
}

/**
 * Default logger instance
 */
export const logger = createLogger();