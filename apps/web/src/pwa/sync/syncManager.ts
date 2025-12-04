/**
 * Background Sync Manager
 *
 * Handles background synchronization for PWA including:
 * - One-time and periodic sync
 * - Sync queue management
 * - Retry mechanisms with exponential backoff
 * - Conflict resolution
 */

import type { PWAConfig, SyncEvent, SyncRegistration } from '../types/pwa';
import { logger } from '../logging/logger';

/**
 * Sync Task Interface
 */
interface SyncTask {
  id: string;
  tag: string;
  data?: any;
  priority: 'low' | 'normal' | 'high';
  retryCount: number;
  maxRetries: number;
  nextRetryTime?: number;
  createdAt: number;
  lastAttempt?: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

/**
 * Sync Queue Manager
 */
class SyncQueue {
  private queue: Map<string, SyncTask> = new Map();
  private processing = new Set<string>();
  private storageKey = 'pwa-sync-queue';

  constructor() {
    this.loadQueue();
  }

  /**
   * Add task to queue
   */
  add(task: Omit<SyncTask, 'id' | 'createdAt' | 'status' | 'retryCount'>): string {
    const id = this.generateId();
    const syncTask: SyncTask = {
      id,
      createdAt: Date.now(),
      status: 'pending',
      retryCount: 0,
      ...task,
    };

    this.queue.set(id, syncTask);
    this.saveQueue();

    logger.debug('Sync task added', {
      id,
      tag: task.tag,
      priority: task.priority,
    });

    return id;
  }

  /**
   * Get next task to process
   */
  getNext(): SyncTask | null {
    const now = Date.now();
    const availableTasks = Array.from(this.queue.values())
      .filter(task =>
        task.status === 'pending' &&
        !this.processing.has(task.id) &&
        (!task.nextRetryTime || task.nextRetryTime <= now)
      )
      .sort((a, b) => {
        // Sort by priority first
        const priorityOrder = { high: 3, normal: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;

        // Then by creation time
        return a.createdAt - b.createdAt;
      });

    return availableTasks[0] || null;
  }

  /**
   * Mark task as running
   */
  startProcessing(taskId: string): void {
    this.processing.add(taskId);
    const task = this.queue.get(taskId);
    if (task) {
      task.status = 'running';
      task.lastAttempt = Date.now();
      this.saveQueue();
    }
  }

  /**
   * Mark task as completed
   */
  completeTask(taskId: string): void {
    const task = this.queue.get(taskId);
    if (task) {
      task.status = 'completed';
      this.processing.delete(taskId);
      this.saveQueue();
      logger.debug('Sync task completed', {
        id: taskId,
        tag: task.tag,
        duration: Date.now() - task.lastAttempt!,
      });
    }
  }

  /**
   * Mark task as failed and schedule retry
   */
  failTask(taskId: string, error?: any): void {
    const task = this.queue.get(taskId);
    if (task) {
      task.retryCount++;
      task.lastAttempt = Date.now();

      if (task.retryCount >= task.maxRetries) {
        task.status = 'failed';
        logger.error('Sync task failed permanently', {
          id: taskId,
          tag: task.tag,
          retryCount: task.retryCount,
          error,
        });
      } else {
        task.status = 'pending';
        task.nextRetryTime = this.calculateRetryDelay(task.retryCount);
        logger.warn('Sync task failed, scheduling retry', {
          id: taskId,
          tag: task.tag,
          retryCount: task.retryCount,
          nextRetry: new Date(task.nextRetryTime!).toISOString(),
        });
      }

      this.processing.delete(taskId);
      this.saveQueue();
    }
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(retryCount: number): number {
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 32s, 60s, 60s...
    const baseDelay = 1000;
    const maxDelay = 60000;
    const delay = Math.min(baseDelay * Math.pow(2, retryCount - 1), maxDelay);

    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.3 * delay;
    return Date.now() + delay + jitter;
  }

  /**
   * Get tasks by tag
   */
  getByTag(tag: string): SyncTask[] {
    return Array.from(this.queue.values()).filter(task => task.tag === tag);
  }

  /**
   * Get task by ID
   */
  getById(id: string): SyncTask | undefined {
    return this.queue.get(id);
  }

  /**
   * Clear completed tasks
   */
  clearCompleted(): void {
    const before = this.queue.size;
    for (const [id, task] of this.queue.entries()) {
      if (task.status === 'completed') {
        this.queue.delete(id);
      }
    }
    this.saveQueue();
    logger.debug('Completed tasks cleared', {
      cleared: before - this.queue.size,
      remaining: this.queue.size,
    });
  }

  /**
   * Get queue statistics
   */
  getStats(): any {
    const tasks = Array.from(this.queue.values());
    return {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      running: tasks.filter(t => t.status === 'running').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length,
      processing: this.processing.size,
    };
  }

  /**
   * Generate unique task ID
   */
  private generateId(): string {
    return `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Save queue to IndexedDB
   */
  private async saveQueue(): Promise<void> {
    try {
      const queueData = Array.from(this.queue.entries());
      if ('indexedDB' in self) {
        await this.saveToIndexedDB(queueData);
      }
    } catch (error) {
      logger.error('Failed to save sync queue', { error });
    }
  }

  /**
   * Load queue from IndexedDB
   */
  private async loadQueue(): Promise<void> {
    try {
      if ('indexedDB' in self) {
        const queueData = await this.loadFromIndexedDB();
        this.queue = new Map(queueData);
        logger.debug('Sync queue loaded', {
          tasks: this.queue.size,
        });
      }
    } catch (error) {
      logger.error('Failed to load sync queue', { error });
    }
  }

  /**
   * Save to IndexedDB
   */
  private async saveToIndexedDB(data: Array<[string, SyncTask]>): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('PWA-SyncDB', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['sync-queue'], 'readwrite');
        const store = transaction.objectStore('sync-queue');

        // Clear existing data
        const clearRequest = store.clear();
        clearRequest.onerror = () => reject(clearRequest.error);
        clearRequest.onsuccess = () => {
          // Add new data
          const addRequests = data.map(([id, task]) => {
            const addRequest = store.add({ id, task });
            return new Promise<void>((resolveAdd, rejectAdd) => {
              addRequest.onerror = () => rejectAdd(addRequest.error);
              addRequest.onsuccess = () => resolveAdd();
            });
          });

          Promise.all(addRequests)
            .then(() => {
              transaction.oncomplete = () => resolve();
              transaction.onerror = () => reject(transaction.error);
            })
            .catch(reject);
        };
      };

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('sync-queue')) {
          db.createObjectStore('sync-queue', { keyPath: 'id' });
        }
      };
    });
  }

  /**
   * Load from IndexedDB
   */
  private async loadFromIndexedDB(): Promise<Array<[string, SyncTask]>> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('PWA-SyncDB', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('sync-queue')) {
          resolve([]);
          return;
        }

        const transaction = db.transaction(['sync-queue'], 'readonly');
        const store = transaction.objectStore('sync-queue');
        const getRequest = store.getAll();

        getRequest.onerror = () => reject(getRequest.error);
        getRequest.onsuccess = () => {
          const data = getRequest.result.map((item: any) => [item.id, item.task]);
          resolve(data);
        };
      };
    });
  }
}

/**
 * Sync Manager Class
 */
export class SyncManager {
  private config: PWAConfig;
  private queue: SyncQueue;
  private syncHandlers = new Map<string, (data?: any) => Promise<void>>();
  private isProcessing = false;

  constructor(config: PWAConfig) {
    this.config = config;
    this.queue = new SyncQueue();
    this.initializeSyncHandlers();
  }

  /**
   * Initialize sync handlers
   */
  private initializeSyncHandlers(): void {
    // Default sync handlers
    this.registerHandler('sync-user-data', this.syncUserData.bind(this));
    this.registerHandler('sync-photos', this.syncPhotos.bind(this));
    this.registerHandler('sync-messages', this.syncMessages.bind(this));
    this.registerHandler('sync-actions', this.syncActions.bind(this));
  }

  /**
   * Initialize the sync manager
   */
  async initialize(): Promise<void> {
    logger.info('Sync Manager initializing');

    // Start processing any pending tasks
    this.startProcessing();

    logger.info('Sync Manager initialized', {
      pendingTasks: this.queue.getStats().pending,
    });
  }

  /**
   * Handle sync event from service worker
   */
  async handleSync(event: SyncEvent): Promise<void> {
    logger.info('Processing sync event', {
      tag: event.tag,
      lastChance: event.lastChance,
    });

    try {
      await this.processSyncTasks(event.tag);
    } catch (error) {
      logger.error('Sync event processing failed', {
        tag: event.tag,
        error,
      });
      throw error;
    }
  }

  /**
   * Process all tasks for a specific tag
   */
  private async processSyncTasks(tag: string): Promise<void> {
    const tasks = this.queue.getByTag(tag).filter(t => t.status === 'pending');

    if (tasks.length === 0) {
      logger.debug('No pending tasks for sync tag', { tag });
      return;
    }

    logger.info('Processing sync tasks', {
      tag,
      taskCount: tasks.length,
    });

    for (const task of tasks) {
      await this.processTask(task);
    }
  }

  /**
   * Process individual sync task
   */
  private async processTask(task: SyncTask): Promise<void> {
    if (this.isProcessing) {
      return; // Prevent concurrent processing
    }

    this.queue.startProcessing(task.id);
    this.isProcessing = true;

    try {
      const handler = this.syncHandlers.get(task.tag);
      if (!handler) {
        throw new Error(`No sync handler for tag: ${task.tag}`);
      }

      logger.debug('Executing sync handler', {
        taskId: task.id,
        tag: task.tag,
      });

      await handler(task.data);
      this.queue.completeTask(task.id);

    } catch (error) {
      logger.error('Sync task failed', {
        taskId: task.id,
        tag: task.tag,
        error,
      });

      this.queue.failTask(task.id, error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Request background sync
   */
  async requestSync(tag: string, data?: any, priority: 'low' | 'normal' | 'high' = 'normal'): Promise<string> {
    if (!this.config.sync.enabled) {
      throw new Error('Background sync is disabled');
    }

    // Register with browser's sync manager if available
    if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register(tag);
        logger.debug('Background sync registered', { tag });
      } catch (error) {
        logger.warn('Failed to register background sync', { tag, error });
      }
    }

    // Add to internal queue
    const taskId = this.queue.add({
      tag,
      data,
      priority,
      maxRetries: this.getMaxRetries(priority),
    });

    // Start processing
    this.startProcessing();

    return taskId;
  }

  /**
   * Register sync handler
   */
  registerHandler(tag: string, handler: (data?: any) => Promise<void>): void {
    this.syncHandlers.set(tag, handler);
    logger.debug('Sync handler registered', { tag });
  }

  /**
   * Unregister sync handler
   */
  unregisterHandler(tag: string): void {
    this.syncHandlers.delete(tag);
    logger.debug('Sync handler unregistered', { tag });
  }

  /**
   * Start processing queued tasks
   */
  private startProcessing(): void {
    const processNext = async () => {
      if (this.isProcessing) {
        return;
      }

      const task = this.queue.getNext();
      if (task) {
        await this.processTask(task);
        // Continue processing
        setTimeout(processNext, 100);
      }
    };

    processNext();
  }

  /**
   * Handle connection changes
   */
  handleConnectionChange(isOnline: boolean): void {
    logger.debug('Connection status changed', { isOnline });

    if (isOnline) {
      // Start processing queued tasks when back online
      this.startProcessing();
    }
  }

  /**
   * Get max retries based on priority
   */
  private getMaxRetries(priority: 'low' | 'normal' | 'high'): number {
    switch (priority) {
      case 'high': return 5;
      case 'normal': return 3;
      case 'low': return 1;
      default: return 3;
    }
  }

  /**
   * Default sync handlers
   */
  private async syncUserData(data?: any): Promise<void> {
    logger.debug('Syncing user data', { data });

    // Simulate API call
    await this.simulateApiCall('/api/sync/user', data);

    logger.info('User data synced successfully');
  }

  private async syncPhotos(data?: any): Promise<void> {
    logger.debug('Syncing photos', { data });

    // Simulate file upload
    await this.simulateApiCall('/api/sync/photos', data);

    logger.info('Photos synced successfully');
  }

  private async syncMessages(data?: any): Promise<void> {
    logger.debug('Syncing messages', { data });

    // Simulate message sync
    await this.simulateApiCall('/api/sync/messages', data);

    logger.info('Messages synced successfully');
  }

  private async syncActions(data?: any): Promise<void> {
    logger.debug('Syncing actions', { data });

    // Simulate action sync
    await this.simulateApiCall('/api/sync/actions', data);

    logger.info('Actions synced successfully');
  }

  /**
   * Simulate API call with realistic delays
   */
  private async simulateApiCall(endpoint: string, data?: any): Promise<void> {
    const delay = Math.random() * 2000 + 500; // 500-2500ms delay

    // Simulate network failure (10% chance)
    if (Math.random() < 0.1) {
      throw new Error(`Network error calling ${endpoint}`);
    }

    await new Promise(resolve => setTimeout(resolve, delay));

    logger.debug('API call completed', {
      endpoint,
      duration: delay,
      data,
    });
  }

  /**
   * Get sync statistics
   */
  getStats(): any {
    return {
      queue: this.queue.getStats(),
      handlers: Array.from(this.syncHandlers.keys()),
      isProcessing: this.isProcessing,
      config: {
        enabled: this.config.sync.enabled,
        syncTasks: this.config.sync.syncTasks,
      },
    };
  }

  /**
   * Clear completed tasks
   */
  clearCompleted(): void {
    this.queue.clearCompleted();
  }

  /**
   * Get sync status
   */
  async getSyncStatus(): Promise<any> {
    try {
      if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
        const registration = await navigator.serviceWorker.ready;
        const tags = await registration.sync.getTags();

        return {
          browserSyncSupported: true,
          registeredTags: tags,
          internalQueue: this.getStats(),
        };
      }

      return {
        browserSyncSupported: false,
        internalQueue: this.getStats(),
      };
    } catch (error) {
      logger.error('Failed to get sync status', { error });
      return {
        browserSyncSupported: false,
        internalQueue: this.getStats(),
        error: error.message,
      };
    }
  }
}