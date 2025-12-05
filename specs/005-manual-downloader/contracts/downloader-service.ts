/**
 * Downloader Service Contract
 *
 * Main orchestration interface for the manual download system.
 * Coordinates discovery, downloading, and storage operations.
 *
 * @version 1.0.0
 * @since 2025-12-05
 */

import {
  DownloadSession,
  ManualPage,
  CLIOptions,
  CLIOutput,
  ProgressEvent,
  OperationStatus
} from '../data-model';

/**
 * Main downloader service interface
 * Provides high-level orchestration for the entire download process
 */
export interface IDownloaderService {
  /** Service configuration */
  readonly config: DownloaderConfig;

  /** Current session information */
  readonly currentSession: DownloadSession | null;

  /** Event emitter for progress updates */
  readonly events: EventEmitter;

  /**
   * Initialize the downloader service with configuration
   * @param config Service configuration
   */
  initialize(config: DownloaderConfig): Promise<void>;

  /**
   * Start a new download session
   * @param options Command line options
   * @returns Promise resolving to session ID
   */
  startSession(options: CLIOptions): Promise<string>;

  /**
   * Resume an existing download session
   * @param sessionId Session ID to resume
   * @returns Promise resolving to resumed session
   */
  resumeSession(sessionId: string): Promise<DownloadSession>;

  /**
   * Pause the current download session
   * @param createCheckpoint Whether to create a checkpoint before pausing
   * @returns Promise resolving when session is paused
   */
  pauseSession(createCheckpoint: boolean = true): Promise<void>;

  /**
   * Stop the current download session
   * @param saveState Whether to save final state
   * @returns Promise resolving when session is stopped
   */
  stopSession(saveState: boolean = true): Promise<void>;

  /**
   * Get current session status
   * @returns Current session information or null
   */
  getSessionStatus(): DownloadSession | null;

  /**
   * Get list of all available sessions
   * @returns Array of session metadata
   */
  getAvailableSessions(): Promise<SessionMetadata[]>;

  /**
   * Execute download process with given options
   * @param options CLI options
   * @returns Promise resolving to operation results
   */
  execute(options: CLIOptions): Promise<CLIOutput>;

  /**
   * Cleanup resources and shutdown service
   * @returns Promise resolving when cleanup is complete
   */
  shutdown(): Promise<void>;
}

/**
 * Service configuration interface
 */
export interface DownloaderConfig {
  /** Base configuration for all operations */
  baseConfig: {
    workingDirectory: string;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    maxConcurrentSessions: number;
    defaultTimeout: number;
  };

  /** Service implementations */
  services: {
    discovery: IDiscoveryService;
    storage: IStorageService;
    resume: IResumeService;
    rateLimiter: IRateLimiterService;
    validation: IValidationService;
    httpClient: IHttpClient;
    logger: ILogger;
  };

  /** Feature flags and options */
  features: {
    enableCompression: boolean;
    enableVerification: boolean;
    enableDetailedLogging: boolean;
    enableMetrics: boolean;
  };
}

/**
 * Session metadata for listing available sessions
 */
export interface SessionMetadata {
  /** Session identifier */
  sessionId: string;

  /** Session creation timestamp */
  createdAt: string;

  /** Session last update timestamp */
  lastUpdate: string;

  /** Session status */
  status: OperationStatus;

  /** Target URL pattern */
  targetUrl: string;

  /** Progress percentage */
  progress: number;

  /** Number of discovered IDs */
  discoveredCount: number;

  /** Number of completed downloads */
  completedCount: number;

  /** Estimated remaining time in seconds */
  estimatedTimeRemaining: number;

  /** Whether session can be resumed */
  isResumable: boolean;

  /** Session size in bytes */
  sessionSize: number;
}

/**
 * Event emitter interface for progress reporting
 */
export interface IEventEmitter {
  /**
   * Register event listener
   * @param event Event name
   * @param listener Event listener function
   */
  on(event: 'progress' | 'error' | 'completion' | 'checkpoint', listener: (event: ProgressEvent) => void): void;

  /**
   * Register one-time event listener
   * @param event Event name
   * @param listener Event listener function
   */
  once(event: 'progress' | 'error' | 'completion' | 'checkpoint', listener: (event: ProgressEvent) => void): void;

  /**
   * Remove event listener
   * @param event Event name
   * @param listener Event listener function
   */
  off(event: 'progress' | 'error' | 'completion' | 'checkpoint', listener: (event: ProgressEvent) => void): void;

  /**
   * Emit event to all listeners
   * @param event Event name
   * @param data Event data
   */
  emit(event: 'progress' | 'error' | 'completion' | 'checkpoint', data: ProgressEvent): void;
}

/**
 * Mock event emitter implementation for testing
 */
export class MockEventEmitter implements IEventEmitter {
  private listeners: Map<string, Array<(event: ProgressEvent) => void>> = new Map();

  on(event: string, listener: (event: ProgressEvent) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }

  once(event: string, listener: (event: ProgressEvent) => void): void {
    const onceWrapper = (eventData: ProgressEvent) => {
      listener(eventData);
      this.off(event, onceWrapper);
    };
    this.on(event, onceWrapper);
  }

  off(event: string, listener: (event: ProgressEvent) => void): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(listener);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  emit(event: string, data: ProgressEvent): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  /** Clear all listeners (for testing) */
  clear(): void {
    this.listeners.clear();
  }

  /** Get number of listeners for event (for testing) */
  listenerCount(event: string): number {
    return this.listeners.get(event)?.length || 0;
  }
}

/**
 * Service factory interface for dependency injection
 */
export interface IDownloaderServiceFactory {
  /**
   * Create downloader service instance with injected dependencies
   * @param config Service configuration
   * @returns Configured downloader service instance
   */
  create(config: DownloaderConfig): IDownloaderService;

  /**
   * Create downloader service with default configuration
   * @returns Configured downloader service with defaults
   */
  createWithDefaults(): IDownloaderService;

  /**
   * Create downloader service for testing with mocked dependencies
   * @param mockConfig Optional mock configuration
   * @returns Downloader service with mocked dependencies
   */
  createForTesting(mockConfig?: Partial<DownloaderConfig>): IDownloaderService;
}

/**
 * Downloader service implementation requirements
 */
export interface IDownloaderServiceRequirements {
  /** Required service dependencies */
  dependencies: {
    discovery: IDiscoveryService;
    storage: IStorageService;
    resume: IResumeService;
    rateLimiter: IRateLimiterService;
    validation: IValidationService;
    httpClient: IHttpClient;
    logger: ILogger;
  };

  /** Performance requirements */
  performance: {
    minProcessingSpeed: number;    // IDs per minute
    maxMemoryUsage: number;        // MB
    maxDiskUsage: number;          // GB
    resumeTimeLimit: number;       // seconds
  };

  /** Reliability requirements */
  reliability: {
    maxFailureRate: number;        // percentage
    minSuccessRate: number;        // percentage
    checkpointInterval: number;    // processed items
    maxRetryAttempts: number;      // attempts
  };
}

// Import dependencies (these would be defined in other contract files)
import { IDiscoveryService } from './discovery-service';
import { IStorageService } from './storage-service';
import { IResumeService } from './resume-service';
import { IRateLimiterService } from './rate-limiter-service';
import { IValidationService } from './validation-service';
import { IHttpClient } from './http-client';
import { ILogger } from './logging';