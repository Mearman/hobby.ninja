/**
 * Logger utility for consistent logging across the application
 * In production, logs can be filtered or sent to external services
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
	level: LogLevel;
	message: string;
	timestamp: string;
	data?: unknown;
}

class Logger {
	private readonly isProduction = import.meta.env.PROD;
	private readonly isDevelopment = import.meta.env.DEV;

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

		if (this.isProduction && level === 'debug') {
			return; // Skip debug logs in production
		}

		const logMethod = level === 'warn' ? 'warn' : level === 'error' ? 'error' : 'log';
		const prefix = `[${entry.timestamp}] ${level.toUpperCase()}:`;

		if (data) {
			console[logMethod](prefix, message, data);
		} else {
			console[logMethod](prefix, message);
		}
	}

	debug(message: string, data?: unknown): void {
		this.log('debug', message, data);
	}

	info(message: string, data?: unknown): void {
		this.log('info', message, data);
	}

	warn(message: string, data?: unknown): void {
		this.log('warn', message, data);
	}

	error(message: string, data?: unknown): void {
		this.log('error', message, data);
	}

	// Group methods for related logs
	group(label: string, collapsed = false): void {
		if (this.isProduction) return;

		if (collapsed) {
			console.groupCollapsed(label);
		} else {
			console.group(label);
		}
	}

	groupEnd(): void {
		if (this.isProduction) return;
		console.groupEnd();
	}

	// Performance logging
	time(label: string): void {
		if (this.isProduction) return;
		console.time(label);
	}

	timeEnd(label: string): void {
		if (this.isProduction) return;
		console.timeEnd(label);
	}
}

export const logger = new Logger();