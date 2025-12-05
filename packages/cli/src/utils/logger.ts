import { promises as fs } from 'fs';
import * as path from 'path';
import { homedir } from 'os';

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
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
  private static instance: Logger;
  private options: LoggerOptions;
  private logFile: string | null = null;
  private logQueue: LogEntry[] = [];
  private isWriting: boolean = false;

  private constructor(options: LoggerOptions) {
    this.options = {
      includeTimestamp: true,
      prettyPrint: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      ...options
    };
  }

  static getInstance(options?: Partial<LoggerOptions>): Logger {
    if (!Logger.instance) {
      const defaultOptions: LoggerOptions = {
        level: 'info',
        logToFile: false,
        logToConsole: true
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
      this.setupLogFile(options.logFilePath);
    }
  }

  /**
   * Log an error message
   */
  error(message: string, error?: Error, context?: Record<string, any>): void {
    this.log('error', message, error, context);
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: Record<string, any>): void {
    this.log('warn', message, undefined, context);
  }

  /**
   * Log an info message
   */
  info(message: string, context?: Record<string, any>): void {
    this.log('info', message, undefined, context);
  }

  /**
   * Log a debug message
   */
  debug(message: string, context?: Record<string, any>): void {
    this.log('debug', message, undefined, context);
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
  private log(level: LogLevel, message: string, error?: Error, context?: Record<string, any>): void {
    // Skip if level is below configured minimum
    if (!this.shouldLog(level)) {
      return;
    }

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } as Error : undefined
    };

    // Add to queue
    this.logQueue.push(logEntry);

    // Process queue
    this.processLogQueue();
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
      console.error('Logger error:', error);
    } finally {
      this.isWriting = false;

      // Process any remaining entries
      if (this.logQueue.length > 0) {
        setImmediate(() => this.processLogQueue());
      }
    }
  }

  /**
   * Log to console
   */
  private logToConsole(entry: LogEntry): void {
    const levelColors: Record<LogLevel, string> = {
      error: '\x1b[31m', // Red
      warn: '\x1b[33m',  // Yellow
      info: '\x1b[36m',  // Blue
      debug: '\x1b[37m'  // White
    };

    const resetColor = '\x1b[0m';
    const color = levelColors[entry.level];

    let logMessage = '';

    if (this.options.includeTimestamp) {
      logMessage += `${color}[${entry.timestamp}]${resetColor} `;
    }

    logMessage += `${color}[${entry.level.toUpperCase()}]${resetColor} ${entry.message}`;

    if (entry.duration !== undefined) {
      logMessage += ` ${color}(${entry.duration}ms)${resetColor}`;
    }

    if (entry.context && Object.keys(entry.context).length > 0) {
      logMessage += `\n${color}Context:${resetColor} ${JSON.stringify(entry.context, null, 2)}`;
    }

    if (entry.error) {
      logMessage += `\n${color}Error:${resetColor} ${entry.error.message}`;
      if (entry.error.stack) {
        logMessage += `\n${color}Stack:${resetColor} ${entry.error.stack}`;
      }
    }

    // Choose appropriate console method
    switch (entry.level) {
      case 'error':
        console.error(logMessage);
        break;
      case 'warn':
        console.warn(logMessage);
        break;
      case 'debug':
        console.debug(logMessage);
        break;
      default:
        console.log(logMessage);
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
        error: entry.error
      };

      if (this.options.prettyPrint) {
        return JSON.stringify(logData, null, 2);
      } else {
        return JSON.stringify(logData);
      }
    });

    const logContent = logLines.join('\n') + '\n';

    // Check file size and rotate if necessary
    await this.rotateLogFileIfNeeded();

    await fs.appendFile(this.logFile, logContent, 'utf-8');
  }

  /**
   * Setup log file
   */
  private async setupLogFile(customPath?: string): Promise<void> {
    if (customPath) {
      this.logFile = customPath;
    } else {
      // Create default log file path
      const logDir = path.join(homedir(), '.gundam-scraper', 'logs');
      await fs.mkdir(logDir, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
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
      if (stats.size < this.options.maxFileSize!) {
        return;
      }

      // File is too large, rotate it
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const rotatedFile = this.logFile.replace(/\.log$/, `-${timestamp}.log`);

      await fs.rename(this.logFile, rotatedFile);

      // Clean up old log files
      await this.cleanupOldLogFiles();
    } catch (error) {
      console.warn('Warning: Failed to rotate log file:', error);
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
          .filter(file => file.endsWith('.log'))
          .map(file => path.join(logDir, file))
          .map(async (filePath) => {
            try {
              const stats = await fs.stat(filePath);
              return {
                path: filePath,
                mtime: stats.mtime
              };
            } catch {
              return null;
            }
          })
      );

      const logFiles = fileStats.filter(Boolean) as Array<{ path: string; mtime: Date }>;

      // Sort by modification time (newest first)
      logFiles.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

      // Keep only the most recent files
      const filesToDelete = logFiles.slice(this.options.maxFiles!);

      for (const file of filesToDelete) {
        try {
          await fs.unlink(file.path);
        } catch (error) {
          console.warn(`Warning: Failed to delete old log file ${file.path}:`, error);
        }
      }
    } catch (error) {
      console.warn('Warning: Failed to cleanup old log files:', error);
    }
  }

  /**
   * Check if a log level should be processed
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };

    return levels[level] <= levels[this.options.level];
  }

  /**
   * Flush any pending logs
   */
  async flush(): Promise<void> {
    while (this.logQueue.length > 0 || this.isWriting) {
      await new Promise(resolve => setTimeout(resolve, 100));
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

export default Logger;