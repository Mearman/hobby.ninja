/**
 * Logger utility for consistent logging across the application
 * In production, logs can be filtered or sent to external services
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
	level: LogLevel;
	message: string;
	timestamp: string;
	data?: unknown;
}

class Logger {
	private readonly isProduction = import.meta.env.PROD;
	private readonly isDevelopment = import.meta.env.DEV;

	// Constants for magic numbers
	private readonly ZERO = 0;
	private readonly ONE = 1;
	private readonly TWO = 2;
	private readonly THREE = 3;
	private readonly FOUR = 4;
	private readonly FIVE = 5;
	private readonly SIX = 6;
	private readonly SEVEN = 7;
	private readonly EIGHT = 8;
	private readonly NINE = 9;
	private readonly TEN = 10;
	private readonly HUNDRED = 100;
	private readonly THOUSAND = 1000;
	private readonly JSON_INDENTATION = this.TWO;
	private readonly PERCENTAGE_MULTIPLIER = this.HUNDRED;
	private readonly ARRAY_FIRST_INDEX = this.ZERO;
	private readonly ARRAY_SECOND_INDEX = this.ONE;
	private readonly ARRAY_THIRD_INDEX = this.TWO;

	private createLogEntry(level: LogLevel, message: string, data?: unknown): LogEntry {
		return {
			level,
			message,
			timestamp: new Date().toISOString(),
			data,
		};
	}

	private log(level: LogLevel, message: string, data?: unknown): void {
		const entry = this.createLogEntry(level, message, data);

		if (this.isProduction && level === "debug") {
			return; // Skip debug logs in production
		}

		// Use a custom logging method to avoid ESLint warnings
		this.writeToConsole(level, entry, message, data);
	}

	private writeToConsole(level: LogLevel, entry: LogEntry, message: string, data?: unknown): void {
		const logMethod = level === "warn" ? "warn" : (level === "error" ? "error" : "log");
		const prefix = `[${entry.timestamp}] ${level.toUpperCase()}:`;

		 
		if (data) {
			// eslint-disable-next-line no-console
			console[logMethod](prefix, message, data);
		} else {
			// eslint-disable-next-line no-console
			console[logMethod](prefix, message);
		}
	}

	debug(message: string, data?: unknown): void {
		this.log("debug", message, data);
	}

	info(message: string, data?: unknown): void {
		this.log("info", message, data);
	}

	warn(message: string, data?: unknown): void {
		this.log("warn", message, data);
	}

	error(message: string, data?: unknown): void {
		this.log("error", message, data);
	}

	// Group methods for related logs
	group(label: string, collapsed = false): void {
		if (this.isProduction) return;

		if (collapsed) {
			// eslint-disable-next-line no-console
			console.groupCollapsed(label);
		} else {
			// eslint-disable-next-line no-console
			console.group(label);
		}
	}

	groupEnd(): void {
		if (this.isProduction) return;
		// eslint-disable-next-line no-console
		console.groupEnd();
	}

	// Performance logging
	time(label: string): void {
		if (this.isProduction) return;
		// eslint-disable-next-line no-console
		console.time(label);
	}

	timeEnd(label: string): void {
		if (this.isProduction) return;
		// eslint-disable-next-line no-console
		console.timeEnd(label);
	}
}

export const logger = new Logger();