/**
 * Service Worker Logger
 *
 * Production-ready logging system for PWA with support for
 * different log levels, structured logging, and performance monitoring.
 */

/**
 * Log levels in order of severity
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

/**
 * Log entry interface
 */
interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: number;
  context?: any;
  stack?: string;
  url?: string;
  userAgent?: string;
}

/**
 * Logger configuration
 */
interface LoggerConfig {
  level: LogLevel;
  maxLogEntries: number;
  enablePerformanceLogging: boolean;
  enableStructuredLogging: boolean;
  remoteLogging?: {
    enabled: boolean;
    endpoint: string;
    batchSize: number;
    flushInterval: number;
  };
}

/**
 * Logger Class
 *
 * Advanced logging system with structured output, performance tracking,
 * and optional remote logging capabilities.
 */
export class Logger {
  private config: LoggerConfig;
  private logBuffer: LogEntry[] = [];
  private performanceMarks = new Map<string, number>();
  private flushTimer?: number;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: import.meta.env.DEV ? LogLevel.DEBUG : LogLevel.INFO,
      maxLogEntries: 1000,
      enablePerformanceLogging: true,
      enableStructuredLogging: true,
      remoteLogging: {
        enabled: false,
        endpoint: '/api/logs',
        batchSize: 50,
        flushInterval: 30000, // 30 seconds
      },
      ...config,
    };

    this.initializeRemoteLogging();
    this.setupGlobalErrorHandlers();
  }

  /**
   * Initialize remote logging if enabled
   */
  private initializeRemoteLogging(): void {
    if (this.config.remoteLogging?.enabled) {
      this.flushTimer = setInterval(() => {
        this.flushLogs();
      }, this.config.remoteLogging.flushInterval) as unknown as number;
    }
  }

  /**
   * Setup global error handlers
   */
  private setupGlobalErrorHandlers(): void {
    if (typeof self !== 'undefined') {
      self.addEventListener('error', (event) => {
        this.error('Global error', {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack,
        });
      });

      self.addEventListener('unhandledrejection', (event) => {
        this.error('Unhandled promise rejection', {
          reason: event.reason,
          stack: event.reason?.stack,
        });
      });
    }
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: any): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Log info message
   */
  info(message: string, context?: any): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: any): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Log error message
   */
  error(message: string, context?: any): void {
    this.log(LogLevel.ERROR, message, context);
  }

  /**
   * Log fatal message
   */
  fatal(message: string, context?: any): void {
    this.log(LogLevel.FATAL, message, context);
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, context?: any): void {
    // Skip if log level is below threshold
    if (level < this.config.level) {
      return;
    }

    const logEntry: LogEntry = {
      level,
      message,
      timestamp: Date.now(),
      context,
      url: typeof self !== 'undefined' ? self.location?.href : undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    };

    // Add stack trace for errors and fatal errors
    if (level >= LogLevel.ERROR && context?.stack) {
      logEntry.stack = context.stack;
    }

    // Add to buffer
    this.addToBuffer(logEntry);

    // Output to console
    this.outputToConsole(logEntry);

    // Send to remote if enabled
    if (this.config.remoteLogging?.enabled && level >= LogLevel.WARN) {
      this.sendToRemote(logEntry);
    }
  }

  /**
   * Add log entry to buffer with size management
   */
  private addToBuffer(entry: LogEntry): void {
    this.logBuffer.push(entry);

    // Maintain buffer size limit
    if (this.logBuffer.length > this.config.maxLogEntries) {
      this.logBuffer = this.logBuffer.slice(-this.config.maxLogEntries);
    }
  }

  /**
   * Output log entry to console
   */
  private outputToConsole(entry: LogEntry): void {
    const { level, message, context, timestamp } = entry;
    const timeString = new Date(timestamp).toISOString();
    const levelString = LogLevel[level];
    const prefix = `[${timeString}] [${levelString}]`;

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(prefix, message, context);
        break;
      case LogLevel.INFO:
        console.info(prefix, message, context);
        break;
      case LogLevel.WARN:
        console.warn(prefix, message, context);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(prefix, message, context);
        if (entry.stack) {
          console.error(entry.stack);
        }
        break;
    }
  }

  /**
   * Send log entry to remote endpoint
   */
  private sendToRemote(entry: LogEntry): void {
    if (!this.config.remoteLogging?.enabled) {
      return;
    }

    // Add to remote buffer
    if (!this.remoteLogBuffer) {
      this.remoteLogBuffer = [];
    }
    this.remoteLogBuffer.push(entry);

    // Flush if batch size reached
    if (this.remoteLogBuffer.length >= this.config.remoteLogging.batchSize) {
      this.flushLogs();
    }
  }

  private remoteLogBuffer: LogEntry[] = [];

  /**
   * Flush logs to remote endpoint
   */
  private async flushLogs(): Promise<void> {
    if (!this.config.remoteLogging?.enabled || this.remoteLogBuffer.length === 0) {
      return;
    }

    const logsToSend = [...this.remoteLogBuffer];
    this.remoteLogBuffer = [];

    try {
      await fetch(this.config.remoteLogging.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          logs: logsToSend,
          timestamp: Date.now(),
          source: 'service-worker',
        }),
      });

      this.debug('Logs flushed successfully', { count: logsToSend.length });
    } catch (error) {
      this.error('Failed to flush logs', { error, logCount: logsToSend.length });

      // Re-add logs to buffer on failure
      this.remoteLogBuffer.unshift(...logsToSend);

      // Prevent infinite buffer growth
      if (this.remoteLogBuffer.length > this.config.remoteLogging.batchSize * 2) {
        this.remoteLogBuffer = this.remoteLogBuffer.slice(0, this.config.remoteLogging.batchSize);
      }
    }
  }

  /**
   * Start performance measurement
   */
  startPerformanceMark(name: string): void {
    if (!this.config.enablePerformanceLogging) {
      return;
    }

    this.performanceMarks.set(name, performance.now());
    this.debug('Performance mark started', { name });
  }

  /**
   * End performance measurement and log result
   */
  endPerformanceMark(name: string, context?: any): void {
    if (!this.config.enablePerformanceLogging) {
      return;
    }

    const startTime = this.performanceMarks.get(name);
    if (!startTime) {
      this.warn('Performance mark not found', { name });
      return;
    }

    const duration = performance.now() - startTime;
    this.performanceMarks.delete(name);

    const logContext = {
      name,
      duration: Math.round(duration * 100) / 100, // Round to 2 decimal places
      ...context,
    };

    if (duration > 1000) {
      this.warn('Slow performance detected', logContext);
    } else {
      this.debug('Performance measurement', logContext);
    }

    // Record performance for analysis
    this.recordPerformanceMetric(name, duration);
  }

  /**
   * Record performance metric for analysis
   */
  private recordPerformanceMetric(name: string, duration: number): void {
    // Store performance metrics for analysis
    if (!this.performanceMetrics) {
      this.performanceMetrics = new Map();
    }

    if (!this.performanceMetrics.has(name)) {
      this.performanceMetrics.set(name, {
        count: 0,
        total: 0,
        min: Infinity,
        max: -Infinity,
      });
    }

    const metric = this.performanceMetrics.get(name)!;
    metric.count++;
    metric.total += duration;
    metric.min = Math.min(metric.min, duration);
    metric.max = Math.max(metric.max, duration);
  }

  private performanceMetrics?: Map<string, {
    count: number;
    total: number;
    min: number;
    max: number;
  }>;

  /**
   * Get performance metrics summary
   */
  getPerformanceMetrics(): any {
    if (!this.performanceMetrics) {
      return {};
    }

    const summary: any = {};
    this.performanceMetrics.forEach((metric, name) => {
      summary[name] = {
        count: metric.count,
        average: metric.total / metric.count,
        min: metric.min,
        max: metric.max,
        total: metric.total,
      };
    });

    return summary;
  }

  /**
   * Get log entries by level
   */
  getLogEntries(level?: LogLevel, limit?: number): LogEntry[] {
    let entries = this.logBuffer;

    if (level !== undefined) {
      entries = entries.filter(entry => entry.level >= level);
    }

    if (limit) {
      entries = entries.slice(-limit);
    }

    return entries;
  }

  /**
   * Get log statistics
   */
  getLogStatistics(): any {
    const stats = {
      total: this.logBuffer.length,
      byLevel: {
        debug: 0,
        info: 0,
        warn: 0,
        error: 0,
        fatal: 0,
      },
      oldest: 0,
      newest: 0,
      performanceMetrics: this.getPerformanceMetrics(),
    };

    this.logBuffer.forEach(entry => {
      switch (entry.level) {
        case LogLevel.DEBUG:
          stats.byLevel.debug++;
          break;
        case LogLevel.INFO:
          stats.byLevel.info++;
          break;
        case LogLevel.WARN:
          stats.byLevel.warn++;
          break;
        case LogLevel.ERROR:
          stats.byLevel.error++;
          break;
        case LogLevel.FATAL:
          stats.byLevel.fatal++;
          break;
      }
    });

    if (this.logBuffer.length > 0) {
      stats.oldest = this.logBuffer[0].timestamp;
      stats.newest = this.logBuffer[this.logBuffer.length - 1].timestamp;
    }

    return stats;
  }

  /**
   * Export logs for analysis
   */
  exportLogs(): string {
    const exportData = {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      config: {
        level: LogLevel[this.config.level],
        maxLogEntries: this.config.maxLogEntries,
      },
      logs: this.logBuffer,
      statistics: this.getLogStatistics(),
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logBuffer = [];
    this.performanceMetrics?.clear();
    this.remoteLogBuffer = [];
    this.performanceMarks.clear();
    this.info('Logs cleared');
  }

  /**
   * Update log level
   */
  setLogLevel(level: LogLevel): void {
    this.config.level = level;
    this.info('Log level updated', { newLevel: LogLevel[level] });
  }

  /**
   * Get current log level
   */
  getLogLevel(): LogLevel {
    return this.config.level;
  }

  /**
   * Cleanup and destroy logger
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    // Flush any remaining logs
    this.flushLogs();

    this.clearLogs();
  }
}

// Create singleton logger instance
export const logger = new Logger();

export default logger;