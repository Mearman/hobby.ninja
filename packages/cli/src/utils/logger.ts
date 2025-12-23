import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

import { LOG_LEVELS, LOGGING, DIRECTORIES, FILE_PATTERNS, PROGRESS_PERCENTAGES } from "../constants/cli-constants.js";
import type { Context } from "../types/common.js";

export type LogLevel = typeof LOG_LEVELS[keyof typeof LOG_LEVELS];

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Context;
  error?: Error;
  duration?: number;
}

export interface LoggerOptions {
  level: LogLevel;
  logToFile: boolean;
  logToConsole: boolean;
  logFilePath?: string;
  prettyPrint?: boolean;
  includeTimestamp?: boolean;
  maxFileSize?: number; // bytes
  maxFiles?: number;
}

export class Logger {
	private static instance: Logger | undefined;
	private options: LoggerOptions;
	private logFile: string | null = null;
	private logQueue: LogEntry[] = [];
	private isWriting = false;

	private constructor(options: LoggerOptions) {
		this.options = {
			includeTimestamp: true,
			prettyPrint: true,
			maxFileSize: LOGGING.DEFAULT_MAX_FILE_SIZE, // 10MB
			maxFiles: LOGGING.DEFAULT_MAX_FILES,
			...options,
		};
	}

	static getInstance(options?: Partial<LoggerOptions>): Logger {
		if (!Logger.instance) {
			const defaultOptions: LoggerOptions = {
				level: LOG_LEVELS.INFO,
				logToFile: false,
				logToConsole: true,
			};
			Logger.instance = new Logger({ ...defaultOptions, ...options });
		}
		return Logger.instance;
	}

	/**
   * Configure the logger
   */
	configure(options: Partial<LoggerOptions>): void {
		this.options = { ...this.options, ...options };

		if (options.logFilePath || (options.logToFile && !this.logFile)) {
			this.setupLogFile(options.logFilePath).catch((error: unknown) => {
				console.error("Failed to setup log file:", error);
			});
		}
	}

	/**
   * Log an error message
   */
	error(message: string, error?: Error, context?: Context): void {
		this.log(LOG_LEVELS.ERROR, message, error, context);
	}

	/**
   * Log a warning message
   */
	warn(message: string, context?: Context): void {
		this.log(LOG_LEVELS.WARN, message, undefined, context);
	}

	/**
   * Log an info message
   */
	info(message: string, context?: Context): void {
		this.log(LOG_LEVELS.INFO, message, undefined, context);
	}

	/**
   * Log a debug message
   */
	debug(message: string, context?: Context): void {
		this.log(LOG_LEVELS.DEBUG, message, undefined, context);
	}

	/**
   * Log a message with timing
   */
	async time<T>(label: string, fn: () => Promise<T> | T): Promise<T> {
		const start = Date.now();

		this.debug(`Starting: ${label}`);

		try {
			const result = await fn();
			const duration = Date.now() - start;

			this.info(`Completed: ${label}`, { duration });
			return result;
		} catch (error) {
			const duration = Date.now() - start;

			this.error(`Failed: ${label}`, error as Error, { duration });
			throw error;
		}
	}

	/**
   * Log a message
   */
	private log(level: LogLevel, message: string, error?: Error, context?: Context): void {
		// Skip if level is below configured minimum
		if (!this.shouldLog(level)) {
			return;
		}

		const logEntry: LogEntry = {
			timestamp: new Date().toISOString(),
			level,
			message,
			...(context && { context }),
			...(error && {
				error: {
					name: error.name,
					message: error.message,
					stack: error.stack,
				} as Error,
			}),
		};

		// Add to queue
		this.logQueue.push(logEntry);

		// Process queue
		this.processLogQueue().catch((error: unknown) => {
			console.error("Failed to process log queue:", error);
		});
	}

	/**
   * Process the log queue
   */
	private async processLogQueue(): Promise<void> {
		if (this.isWriting || this.logQueue.length === 0) {
			return;
		}

		this.isWriting = true;
		const entriesToProcess = [...this.logQueue];
		this.logQueue = [];

		try {
			// Console logging
			if (this.options.logToConsole) {
				for (const entry of entriesToProcess) {
					this.logToConsole(entry);
				}
			}

			// File logging
			if (this.options.logToFile && this.logFile) {
				await this.logToFile(entriesToProcess);
			}
		} catch (error) {
			// Fallback to console if file logging fails
			console.error("Logger error:", error);
		} finally {
			this.isWriting = false;

			// Process any remaining entries
			if (this.logQueue.length > 0) {
				setImmediate(() => {
					this.processLogQueue().catch((error: unknown) => {
						console.error("Failed to process log queue:", error);
					});
				});
			}
		}
	}

	/**
   * Log to console
   */
	private logToConsole(entry: LogEntry): void {
		const levelColors: Record<LogLevel, string> = {
			error: LOGGING.ANSI_COLORS.RED,
			warn: LOGGING.ANSI_COLORS.YELLOW,
			info: LOGGING.ANSI_COLORS.BLUE,
			debug: LOGGING.ANSI_COLORS.WHITE,
		};

		const resetColor = LOGGING.ANSI_COLORS.RESET;
		const color = levelColors[entry.level];

		let logMessage = "";

		if (this.options.includeTimestamp) {
			logMessage += `${color}[${entry.timestamp}]${resetColor} `;
		}

		logMessage += `${color}[${entry.level.toUpperCase()}]${resetColor} ${entry.message}`;

		if (entry.duration !== undefined) {
			logMessage += ` ${color}(${entry.duration}ms)${resetColor}`;
		}

		if (entry.context && Object.keys(entry.context).length > 0) {
			logMessage += `\n${color}Context:${resetColor} ${JSON.stringify(entry.context, null, PROGRESS_PERCENTAGES.COMPLETE)}`;
		}

		if (entry.error) {
			logMessage += `\n${color}Error:${resetColor} ${entry.error.message}`;
			if (entry.error.stack) {
				logMessage += `\n${color}Stack:${resetColor} ${entry.error.stack}`;
			}
		}

		// Choose appropriate console method
		switch (entry.level) {
			case LOG_LEVELS.ERROR: {
				console.error(logMessage);
				break;
			}
			case LOG_LEVELS.WARN: {
				console.warn(logMessage);
				break;
			}
			case LOG_LEVELS.DEBUG: {
				console.debug(logMessage);
				break;
			}
			default: {
				console.log(logMessage);
			}
		}
	}

	/**
   * Log to file
   */
	private async logToFile(entries: LogEntry[]): Promise<void> {
		if (!this.logFile) return;

		const logLines = entries.map(entry => {
			const logData = {
				...entry,
				context: entry.context,
				error: entry.error,
			};

			return this.options.prettyPrint ? JSON.stringify(logData, null, PROGRESS_PERCENTAGES.COMPLETE) : JSON.stringify(logData);
		});

		const logContent = logLines.join("\n") + "\n";

		// Check file size and rotate if necessary
		await this.rotateLogFileIfNeeded();

		await fs.appendFile(this.logFile, logContent, "utf8");
	}

	/**
   * Setup log file
   */
	private async setupLogFile(customPath?: string): Promise<void> {
		if (customPath) {
			this.logFile = customPath;
		} else {
			// Create default log file path
			const logDir = path.join(homedir(), DIRECTORIES.LOGS);
			await fs.mkdir(logDir, { recursive: true });

			const timestamp = new Date().toISOString().replaceAll(/[:.]/g, "-");
			this.logFile = path.join(logDir, `scraping-${timestamp}.log`);
		}

		// Ensure log directory exists
		const logDir = path.dirname(this.logFile);
		await fs.mkdir(logDir, { recursive: true });
	}

	/**
   * Rotate log file if it gets too large
   */
	private async rotateLogFileIfNeeded(): Promise<void> {
		if (!this.logFile) return;

		try {
			const stats = await fs.stat(this.logFile);
			const maxFileSize = this.options.maxFileSize ?? LOGGING.DEFAULT_MAX_FILE_SIZE;
			if (stats.size < maxFileSize) {
				return;
			}

			// File is too large, rotate it
			const timestamp = new Date().toISOString().replaceAll(/[:.]/g, "-");
			const rotatedFile = this.logFile.replace(/\.log$/, `-${timestamp}.log`);

			await fs.rename(this.logFile, rotatedFile);

			// Clean up old log files
			await this.cleanupOldLogFiles();
		} catch (error) {
			console.warn("Warning: Failed to rotate log file:", error);
		}
	}

	/**
   * Clean up old log files
   */
	private async cleanupOldLogFiles(): Promise<void> {
		if (!this.logFile) return;

		try {
			const logDir = path.dirname(this.logFile);
			const files = await fs.readdir(logDir);

			const fileStats = await Promise.all(
				files
					.filter(file => file.endsWith(FILE_PATTERNS.LOG_EXTENSION))
					.map(file => path.join(logDir, file))
					.map(async (filePath) => {
						try {
							const stats = await fs.stat(filePath);
							return {
								path: filePath,
								mtime: stats.mtime,
							};
						} catch {
							return null;
						}
					}),
			);

			const logFiles = fileStats.filter(Boolean) as Array<{ path: string; mtime: Date }>;

			// Sort by modification time (newest first)
			logFiles.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

			// Keep only the most recent files
			const filesToDelete = logFiles.slice(this.options.maxFiles);

			for (const file of filesToDelete) {
				try {
					await fs.unlink(file.path);
				} catch (error) {
					console.warn(`Warning: Failed to delete old log file ${file.path}:`, error);
				}
			}
		} catch (error) {
			console.warn("Warning: Failed to cleanup old log files:", error);
		}
	}

	/**
   * Check if a log level should be processed
   */
	private shouldLog(level: LogLevel): boolean {
		return LOGGING.LOG_LEVEL_PRIORITIES[level] <= LOGGING.LOG_LEVEL_PRIORITIES[this.options.level];
	}

	/**
   * Flush any pending logs
   */
	async flush(): Promise<void> {
		while (this.logQueue.length > 0 || this.isWriting) {
			await new Promise(resolve => setTimeout(resolve, LOGGING.FLUSH_DELAY));
		}
	}

	/**
   * Get current log file path
   */
	getLogFilePath(): string | null {
		return this.logFile;
	}

	/**
   * Get current log level
   */
	getLogLevel(): LogLevel {
		return this.options.level;
	}
}