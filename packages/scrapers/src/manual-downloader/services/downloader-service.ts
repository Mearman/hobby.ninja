/**
 * Main downloader service for Bandai Manual Content Downloader
 *
 * Orchestrates the entire download process including discovery,
 * downloading, rate limiting, and progress tracking.
 */

import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { join, dirname } from 'node:path';

import {
  DownloadSession,
  ManualPage,
  ProgressEvent,
  CLIOptions,
  CLIOutput
} from '../types';
import { createManualPage, getManualPageFilePath } from '../types/manual-page';
import { DiscoveryService } from './discovery-service';
import { HttpClient } from './http-client';
import { RateLimiterService } from './rate-limiter-service';
import { LoggingService } from './logging';
import { ConfigurationService } from './configuration';
import { StorageService } from './storage-service';
import { ProgressTracker } from './progress-tracker';
import { StateManager } from './state-manager';
import { computeSHA256 } from '../utils/crypto';
import { ErrorFactory } from './errors';

/**
 * Main downloader service implementation
 */
export class DownloaderService {
  private config: ConfigurationService;
  private discoveryService: DiscoveryService;
  private httpClient: HttpClient;
  private rateLimiter: RateLimiterService;
  private logger: LoggingService;
  private storageService: StorageService;
  private progressTracker: ProgressTracker;
  private stateManager: StateManager;
  private currentSession: DownloadSession | null = null;

  constructor(config?: Partial<ConfigurationService['config']>) {
    this.config = new ConfigurationService();
    this.discoveryService = new DiscoveryService(new HttpClient());
    this.httpClient = new HttpClient();
    this.rateLimiter = new RateLimiterService();
    this.storageService = new StorageService({
      outputDirectory: './data/raw/bandai/manuals',
      createDirectories: true,
      verifyIntegrity: true,
      compressFiles: false
    });
    this.logger = new LoggingService({
      level: 'info',
      enableConsoleOutput: true,
      enableFileOutput: false
    });

    // Initialize progress tracker with logger integration
    this.progressTracker = new ProgressTracker({
      enableLogging: true,
      updateInterval: 1000, // Update every second
      logCallback: (message: string, data?: any) => {
        // Forward progress logs to the main logger
        this.logger.logProgress({
          type: 'progress',
          timestamp: new Date().toISOString(),
          session: {
            id: this.currentSession?.sessionId || '',
            phase: this.currentSession?.currentPhase || '',
            status: this.currentSession?.status || 'unknown'
          },
          progress: {
            totalChecked: this.currentSession?.stats.totalChecked || 0,
            totalDiscovered: this.currentSession?.discoveredIds.length || 0,
            successCount: this.currentSession?.stats.successCount || 0,
            failureCount: this.currentSession?.stats.failureCount || 0,
            percentage: 0,
            speed: 0,
            eta: 0,
            ...data
          },
          message
        });
      }
    });

    // Initialize state manager
    this.stateManager = new StateManager({
      stateDirectory: './data/raw/bandai/manuals/states',
      enableBackups: false
    });

    // Set up progress callback with rich progress information
    this.logger.setProgressCallback((event) => {
      if (this.currentSession) {
        this.currentSession.stats.lastUpdateTime = event.timestamp;

        // Enhance progress event with session data for CLI
        if (event.type === 'progress' && event.progress) {
          const progress = this.progressTracker.getProgress();
          const stats = this.progressTracker.getStatistics();

          // Update progress with comprehensive information
          event.progress = {
            ...event.progress,
            currentId: progress.currentId,
            totalChecked: this.currentSession.stats.totalChecked,
            totalDiscovered: this.currentSession.discoveredIds.length,
            successCount: this.currentSession.stats.successCount,
            failureCount: this.currentSession.stats.failureCount,
            percentage: this.calculateOverallProgress(),
            speed: stats.averageRate * 60, // Convert to per-minute
            eta: stats.estimatedCompletion || 0
          };
        }
      }
    });
  }

  async initialize(options: CLIOptions): Promise<string> {
    try {
      this.logger.info('Initializing downloader service');

      // Create new session (or use existing for resume)
      const sessionId = options.resume && options.sessionId ? options.sessionId : randomUUID();
      const targetUrl = options.url || this.config.get('targetUrl');
      const outputDirectory = options.output || this.config.get('outputDirectory');

      this.currentSession = {
        sessionId,
        startTime: new Date().toISOString(),
        targetUrl,
        outputDirectory,
        status: 'initializing',
        currentPhase: 'range-discovery',
        lastProcessedId: 0,
        discoveredIds: [],
        failedIds: [],
        queuedIds: [],
        config: this.config.getSessionConfig(),
        stats: {
          totalChecked: 0,
          successCount: 0,
          failureCount: 0,
          skippedCount: 0,
          verifiedCount: 0,
          averageResponseTime: 0,
          totalBytesDownloaded: 0,
          discoveryRate: 0,
          downloadRate: 0,
          currentSpeed: 0,
          estimatedTimeRemaining: 0,
          progressPercentage: 0,
          lastUpdateTime: new Date().toISOString()
        },
        checkpoint: {
          lastCheckpointTime: new Date().toISOString(),
          checkpointCount: 0,
          checkpointSize: 0,
          lastCheckpointSuccessful: true,
          availableCheckpoints: [],
          integrityHash: ''
        }
      };

      // Handle resume functionality during initialization
      if (options.resume && options.sessionId) {
        const lastCheckedId = await this.stateManager.loadLastCheckedId(options.sessionId);
        if (lastCheckedId !== null) {
          this.logger.info(`Resuming from last checked ID: ${lastCheckedId}`);
          session.lastProcessedId = lastCheckedId;
          session.status = 'resuming';
        }
      }

      // Ensure output directory exists
      await fs.mkdir(outputDirectory, { recursive: true });

      this.logger.info('Downloader service initialized', { sessionId, targetUrl, outputDirectory });
      this.logProgress('completion', {
        sessionId,
        phase: 'initialization',
        status: 'completed',
        progress: {
          totalChecked: 0,
          totalDiscovered: 0,
          successCount: 0,
          failureCount: 0,
          percentage: 0,
          speed: 0,
          eta: 0
        }
      });

      return sessionId;

    } catch (error) {
      throw ErrorFactory.configuration('INITIALIZATION_FAILED',
        `Failed to initialize downloader: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async startDownload(options: CLIOptions): Promise<CLIOutput> {
    try {
      this.logger.info('Starting manual download process');

      if (!this.currentSession) {
        await this.initialize(options);
      }

      const session = this.currentSession!;

      // Update session status
      session.status = 'discovering';
      session.currentPhase = 'range-discovery';
      this.logProgress('progress', {
        sessionId: session.sessionId,
        phase: 'range-discovery',
        status: 'discovering',
        progress: session.stats
      });

      // Step 1: Discover valid manual IDs
      this.logger.info('Starting ID discovery process');
      const discoveryResult = await this.discoveryService.discoverRange(
        session.targetUrl,
        {
          timeLimit: options.maxRuntime ? options.maxRuntime * 60 * 1000 : undefined,
          detectGaps: true
        }
      );

      session.discoveredIds = discoveryResult.validIds;
      session.queuedIds = [...discoveryResult.validIds];

      this.logger.info(`Discovery completed: found ${discoveryResult.validIds.length} manuals in range ${discoveryResult.minId}-${discoveryResult.maxId}`);
      this.logProgress('progress', {
        sessionId: session.sessionId,
        phase: 'discovery',
        status: 'completed',
        progress: {
          totalChecked: discoveryResult.idsTested,
          totalDiscovered: discoveryResult.validIds.length,
          successCount: 0,
          failureCount: 0,
          percentage: 10, // Discovery phase complete
          speed: discoveryResult.idsTested / (discoveryResult.discoveryDuration / 1000),
          eta: this.estimateTimeRemaining(discoveryResult.validIds.length, 0)
        }
      });

      // Step 2: Download discovered manuals
      session.status = 'downloading';
      session.currentPhase = 'bulk-download';

      this.logger.info(`Starting download of ${discoveryResult.validIds.length} manuals`);
      const downloadResults = await this.downloadManuals(session.queuedIds);

      // Step 3: Update final session state
      session.status = 'completed';
      session.endTime = new Date().toISOString();
      session.duration = new Date(session.endTime).getTime() - new Date(session.startTime).getTime();

      const successCount = downloadResults.filter(r => r.success).length;
      session.stats.successCount = successCount;
      session.stats.failureCount = downloadResults.length - successCount;

      this.logger.info(`Download completed: ${successCount} successful, ${downloadResults.length - successCount} failed`);

      // Return CLI output
      return {
        status: 'success',
        message: `Successfully downloaded ${successCount} manuals from ${discoveryResult.validIds.length} discovered IDs`,
        results: {
          session,
          downloadedFiles: downloadResults.filter(r => r.success).map(r => r.filePath!),
          errors: downloadResults.filter(r => !r.success).map(r => r.error || 'Unknown error'),
          statistics: session.stats
        }
      };

    } catch (error) {
      if (this.currentSession) {
        this.currentSession.status = 'failed';
        this.currentSession.endTime = new Date().toISOString();
      }

      this.logger.error('Download process failed', ErrorFactory.process(error));

      return {
        status: 'error',
        message: `Download failed: ${error instanceof Error ? error.message : String(error)}`,
        error: ErrorFactory.process(error)
      };
    }
  }

  private async downloadManuals(ids: number[]): Promise<Array<{
    success: boolean;
    filePath?: string;
    error?: string;
    manual?: ManualPage;
  }>> {
    const results: Array<{
      success: boolean;
      filePath?: string;
      error?: string;
      manual?: ManualPage;
    }> = [];

      for (const id of ids) {
      try {
        // Update progress tracker before processing
        this.progressTracker.updateCurrentId(id);

        const manual = await this.downloadSingleManual(id);
        results.push({
          success: true,
          filePath: manual.filePath,
          manual
        });

        // Record successful download
        this.progressTracker.recordFoundPage(id);

        this.currentSession!.stats.successCount++;
        this.currentSession!.stats.totalBytesDownloaded += manual.contentSize;

      } catch (error) {
        // Record error
        this.progressTracker.recordError(id, error instanceof Error ? error.message : String(error));

        this.logger.error(`Failed to download manual ${id}`, ErrorFactory.process(error));
        results.push({
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });

        this.currentSession!.failureCount++;
        this.currentSession!.failedIds.push(id);
      }

      // Save state after each ID for resume capability
      await this.stateManager.saveLastCheckedId(
        this.currentSession!.sessionId,
        id,
        {
          targetUrl: this.currentSession!.targetUrl,
          userAgent: this.config.get('userAgent')
        }
      );

      // Rate limiting
      await this.rateLimiter.wait();
    }

    return results;
  }

  private async downloadSingleManual(id: number): Promise<ManualPage> {
    const url = `${this.currentSession!.targetUrl}${id}/`;
    const startTime = Date.now();

    // Rate limiting before request
    await this.rateLimiter.wait();
    this.rateLimiter.startRequest();

    try {
      // Download content
      const response = await this.httpClient.get(url, {
        timeout: this.config.get('timeout'),
        headers: {
          'User-Agent': this.config.get('userAgent'),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive'
        }
      });

      const downloadDuration = Date.now() - startTime;
      this.rateLimiter.endRequest(true);

      // Validate response
      if (response.statusCode !== 200) {
        throw new Error(`HTTP ${response.statusCode}: ${response.statusText}`);
      }

      if (!response.data || response.data.length < 1000) {
        throw new Error('Content too short or empty');
      }

      // Create file path
      const filePath = getManualPageFilePath(this.currentSession!.outputDirectory, id);
      const contentHash = computeSHA256(response.data);

      // Write to file
      await fs.mkdir(dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, response.data, 'utf8');

      // Create manual page entity
      const manual = createManualPage({
        id,
        url,
        htmlContent: response.data,
        statusCode: response.statusCode,
        headers: response.headers,
        downloadDuration,
        filePath,
        metadata: {
          title: this.extractTitle(response.data),
          fileSize: response.data.length,
          lastModified: response.headers['last-modified']
        }
      });

      manual.contentHash = contentHash;
      manual.isVerified = await this.verifyManualContent(manual);

      return manual;

    } catch (error) {
      this.rateLimiter.endRequest(false);
      throw error;
    }
  }

  private async verifyManualContent(manual: ManualPage): Promise<boolean> {
    try {
      // Basic integrity checks
      if (manual.htmlContent.length < 1000) return false;
      if (!manual.htmlContent.includes('<html')) return false;

      // Verify content hash matches
      const computedHash = computeSHA256(manual.htmlContent);
      return computedHash === manual.contentHash;

    } catch (error) {
      this.logger.warn(`Content verification failed for manual ${manual.id}`, ErrorFactory.process(error));
      return false;
    }
  }

  private extractTitle(html: string): string | null {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      return titleMatch[1].trim();
    }

    // Try to extract from meta title if HTML title not found
    const metaTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
    if (metaTitleMatch) {
      return metaTitleMatch[1].trim();
    }

    return null;
  }

  private calculateCurrentSpeed(): number {
    if (!this.currentSession) return 0;

    const elapsed = Date.now() - new Date(this.currentSession.startTime).getTime();
    if (elapsed === 0) return 0;

    return (this.currentSession.stats.totalChecked / elapsed) * 1000 * 60; // per minute
  }

  private estimateTimeRemaining(remaining: number, completed: number): number {
    if (completed === 0) return 0;

    const avgTimePerManual = (Date.now() - new Date(this.currentSession!.startTime).getTime()) / completed;
    return Math.round((remaining * avgTimePerManual) / 1000);
  }

  private logProgress(type: ProgressEvent['type'], event: Partial<ProgressEvent>): void {
    this.logger.logProgress({
      type,
      timestamp: new Date().toISOString(),
      session: {
        id: this.currentSession?.sessionId || '',
        phase: this.currentSession?.currentPhase || '',
        status: this.currentSession?.status || 'unknown'
      },
      progress: {
        totalChecked: this.currentSession?.stats.totalChecked || 0,
        totalDiscovered: this.currentSession?.discoveredIds.length || 0,
        successCount: this.currentSession?.stats.successCount || 0,
        failureCount: this.currentSession?.stats.failureCount || 0,
        percentage: 0,
        speed: 0,
        eta: 0,
        ...event.progress
      },
      message: event.message
    });
  }

  // Public getters
  get currentSessionStatus(): DownloadSession | null {
    return this.currentSession ? { ...this.currentSession } : null;
  }

  getProgress(): DownloadProgress | null {
    if (!this.currentSession) return null;

    const trackerProgress = this.progressTracker.getProgress();
    const stats = this.progressTracker.getStatistics();

    return {
      status: this.currentSession.status as any,
      totalChecked: trackerProgress.totalChecked,
      discoveredIds: this.currentSession.discoveredIds,
      successCount: trackerProgress.pagesFound,
      failureCount: trackerProgress.errors,
      currentId: trackerProgress.currentId || undefined,
      startTime: new Date(this.currentSession.startTime).getTime(),
      estimatedTimeRemaining: stats.estimatedCompletion || 0,
      requestsPerSecond: trackerProgress.requestsPerSecond
    };
  }

  /**
   * Calculate overall progress percentage
   */
  private calculateOverallProgress(): number {
    if (!this.currentSession || this.currentSession.discoveredIds.length === 0) {
      return 0;
    }

    const totalIds = this.currentSession.discoveredIds.length;
    const processedIds = this.currentSession.stats.successCount + this.currentSession.stats.failureCount;

    return Math.min((processedIds / totalIds) * 100, 100);
  }

  async pause(): Promise<void> {
    if (this.currentSession) {
      this.currentSession.status = 'paused';
      this.logger.info('Download process paused');
    }
  }

  async resume(): Promise<void> {
    if (this.currentSession && this.currentSession.status === 'paused') {
      this.currentSession.status = 'downloading';
      this.logger.info('Download process resumed');
    }
  }

  async stop(): Promise<void> {
    if (this.currentSession) {
      this.currentSession.status = 'completed';
      this.currentSession.endTime = new Date().toISOString();

      // Clear state file when completed successfully
      await this.stateManager.clearState(this.currentSession.sessionId);

      this.logger.info('Download process stopped');
    }
  }
}