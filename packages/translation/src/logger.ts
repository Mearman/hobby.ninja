/**
 * Logger utility for the translation package.
 *
 * This logger respects the environment and can be configured to disable logging in production.
 * It provides typed logging methods with different levels and supports contextual logging.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LoggerConfig {
	/** Enable or disable logging entirely */
	enabled: boolean;
	/** Minimum log level to output */
	level: LogLevel;
	/** Include timestamp in logs */
	timestamp: boolean;
	/** Prefix for all log messages */
	prefix?: string;
}

/**
 * Default logger configuration
 */
const DEFAULT_CONFIG: LoggerConfig = {
	enabled: typeof process !== "undefined" && process.env?.["NODE_ENV"] !== "production",
	level: "info",
	timestamp: true,
	prefix: "[Translation]",
};

/**
 * Environment-aware logger for the translation package
 */
export class Logger {
	private config: LoggerConfig;

	constructor(config: Partial<LoggerConfig> = {}) {
		this.config = { ...DEFAULT_CONFIG, ...config };
	}

	/**
	 * Update logger configuration
	 */
	updateConfig(config: Partial<LoggerConfig>): void {
		this.config = { ...this.config, ...config };
	}

	/**
	 * Get current logger configuration
	 */
	getConfig(): LoggerConfig {
		return { ...this.config };
	}

	/**
	 * Check if a log level should be output based on current configuration
	 */
	private shouldLog(level: LogLevel): boolean {
		if (!this.config.enabled) return false;

		const levels: Record<LogLevel, number> = {
			debug: 0,
			info: 1,
			warn: 2,
			error: 3,
		};

		return levels[level] >= levels[this.config.level];
	}

	/**
	 * Format log message with timestamp and prefix
	 */
	private formatMessage(level: LogLevel, message: string, context?: string): string {
		const parts: string[] = [];

		if (this.config.timestamp) {
			parts.push(`[${new Date().toISOString()}]`);
		}

		if (this.config.prefix) {
			parts.push(this.config.prefix);
		}

		parts.push(`[${level.toUpperCase()}]`);

		if (context) {
			parts.push(`(${context})`);
		}

		parts.push(message);

		return parts.join(" ");
	}

	/**
	 * Log debug message
	 */
	debug(message: string, data?: unknown, context?: string): void {
		if (this.shouldLog("debug")) {
			const formattedMessage = this.formatMessage("debug", message, context);
			if (data === undefined) {
				console.debug(formattedMessage);
			} else {
				console.debug(formattedMessage, data);
			}
		}
	}

	/**
	 * Log info message
	 */
	info(message: string, data?: unknown, context?: string): void {
		if (this.shouldLog("info")) {
			const formattedMessage = this.formatMessage("info", message, context);
			if (data === undefined) {
				console.info(formattedMessage);
			} else {
				console.info(formattedMessage, data);
			}
		}
	}

	/**
	 * Log warning message
	 */
	warn(message: string, data?: unknown, context?: string): void {
		if (this.shouldLog("warn")) {
			const formattedMessage = this.formatMessage("warn", message, context);
			if (data === undefined) {
				console.warn(formattedMessage);
			} else {
				console.warn(formattedMessage, data);
			}
		}
	}

	/**
	 * Log error message
	 */
	error(message: string, data?: unknown, context?: string): void {
		if (this.shouldLog("error")) {
			const formattedMessage = this.formatMessage("error", message, context);
			if (data === undefined) {
				console.error(formattedMessage);
			} else {
				console.error(formattedMessage, data);
			}
		}
	}

	/**
	 * Create a child logger with additional context
	 */
	child(context: string, additionalConfig: Partial<LoggerConfig> = {}): Logger {
		const prefix = this.config.prefix ? `${this.config.prefix}:${context}` : `[${context}]`;
		return new Logger({
			...this.config,
			...additionalConfig,
			prefix,
		});
	}
}

/**
 * Default logger instance
 */
export const logger = new Logger();

/**
 * Convenience functions for direct logger usage
 */
export const log = {
	debug: (message: string, data?: unknown, context?: string) => logger.debug(message, data, context),
	info: (message: string, data?: unknown, context?: string) => logger.info(message, data, context),
	warn: (message: string, data?: unknown, context?: string) => logger.warn(message, data, context),
	error: (message: string, data?: unknown, context?: string) => logger.error(message, data, context),
};