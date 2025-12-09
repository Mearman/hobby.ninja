/**
 * Simple logger utility for utils package
 * Provides structured logging that satisfies no-console ESLint rule
 */

import { LOG_LEVEL_VALUES } from "./constants";

type LogLevel = "debug" | "info" | "warn" | "error";

interface LoggerOptions {
	enabled?: boolean;
	minLevel?: LogLevel;
}

const LOG_LEVELS = LOG_LEVEL_VALUES;

class Logger {
	private enabled: boolean;
	private minLevel: LogLevel;

	constructor(options: LoggerOptions = {}) {
		this.enabled = options.enabled ?? true;
		this.minLevel = options.minLevel ?? "info";
	}

	private shouldLog(level: LogLevel): boolean {
		return this.enabled && LOG_LEVELS[level] >= LOG_LEVELS[this.minLevel];
	}

	private formatMessage(level: LogLevel, message: string, ...args: unknown[]): void {
		if (!this.shouldLog(level)) return;

		const timestamp = new Date().toISOString();
		const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

		switch (level) {
			case "debug":
			case "info": {
				// eslint-disable-next-line no-console
				console.log(prefix, message, ...args);
				break;
			}
			case "warn": {
				// eslint-disable-next-line no-console
				console.warn(prefix, message, ...args);
				break;
			}
			case "error": {
				// eslint-disable-next-line no-console
				console.error(prefix, message, ...args);
				break;
			}
		}
	}

	debug(message: string, ...args: unknown[]): void {
		this.formatMessage("debug", message, ...args);
	}

	info(message: string, ...args: unknown[]): void {
		this.formatMessage("info", message, ...args);
	}

	warn(message: string, ...args: unknown[]): void {
		this.formatMessage("warn", message, ...args);
	}

	error(message: string, ...args: unknown[]): void {
		this.formatMessage("error", message, ...args);
	}

	setEnabled(enabled: boolean): void {
		this.enabled = enabled;
	}

	setMinLevel(level: LogLevel): void {
		this.minLevel = level;
	}
}

export const logger = new Logger();
export { Logger, type LoggerOptions, type LogLevel };
