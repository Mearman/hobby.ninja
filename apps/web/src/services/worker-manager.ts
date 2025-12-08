/**
 * Worker Manager
 *
 * Manages Web Worker instances for heavy data processing operations.
 * Provides a simple interface for offloading work to background threads.
 */

import type {
	UnifiedItemNodeType,
	ManualItemNodeType,
	CatalogItemNodeType,
} from "../schemas/universal-graph-schema";

// Local type definitions
export interface FilterOptions {
	[key: string]: any;
}

export interface SearchResult<T = any> {
	items: T[];
	total: number;
	hasMore: boolean;
	offset?: number;
}

// Type aliases for compatibility
export type UnifiedItem = UnifiedItemNodeType;
export type ManualItem = ManualItemNodeType;
export type CatalogItem = CatalogItemNodeType;

// ============================================================================
// WORKER MANAGER TYPES
// ============================================================================

/** Worker task configuration */
interface WorkerTask<T = any> {
  id: string;
  type: "SEARCH" | "AGGREGATE" | "STATISTICS";
  payload: T;
  resolve: (result: any) => void;
  reject: (error: Error) => void;
  timeout?: number;
  onProgress?: (progress: { current: number; total: number; percentage: number; message?: string }) => void;
}

/** Worker pool configuration */
interface WorkerPoolConfig {
  /** Number of worker instances */
  poolSize: number;
  /** Task timeout in milliseconds */
  taskTimeout: number;
  /** Maximum concurrent tasks per worker */
  maxConcurrentTasks: number;
}

/** Worker instance with task queue */
interface WorkerInstance {
  worker: Worker;
  busy: boolean;
  currentTask?: string;
  taskQueue: string[];
  totalTasksProcessed: number;
  lastActivity: number;
}

// ============================================================================
// WORKER MANAGER CLASS
// ============================================================================

export class WorkerManager {
	private workers: WorkerInstance[] = [];
	private tasks = new Map<string, WorkerTask>();
	private config: WorkerPoolConfig;
	private taskIdCounter = 0;
	private isInitialized = false;

	constructor(config: Partial<WorkerPoolConfig> = {}) {
		this.config = {
			poolSize: config.poolSize || Math.min(navigator.hardwareConcurrency || 4, 4),
			taskTimeout: config.taskTimeout || 30_000, // 30 seconds
			maxConcurrentTasks: config.maxConcurrentTasks || 10,
			...config,
		};
	}

	/**
   * Initialize the worker pool
   */
	async initialize(): Promise<void> {
		if (this.isInitialized) {
			return;
		}

		try {
			// Create worker instances
			for (let i = 0; i < this.config.poolSize; i++) {
				const worker = await this.createWorker();
				this.workers.push({
					worker,
					busy: false,
					taskQueue: [],
					totalTasksProcessed: 0,
					lastActivity: Date.now(),
				});
			}

			this.isInitialized = true;
		} catch (error) {
			console.error("Failed to initialize worker pool:", error);
			throw error;
		}
	}

	/**
   * Perform search operation in worker
   */
	async performSearch(
		searchIndex: any[],
		query: string,
		filters: FilterOptions = {},
		options: {
      fieldWeights?: Record<string, number>;
      onProgress?: (progress: any) => void;
      timeout?: number;
    } = {},
	): Promise<SearchResult["items"]> {
		const taskId = this.generateTaskId();

		const task: WorkerTask = {
			id: taskId,
			type: "SEARCH",
			payload: {
				searchIndex,
				query,
				filters,
				fieldWeights: options.fieldWeights,
			},
			onProgress: options.onProgress,
			timeout: options.timeout || this.config.taskTimeout,
			resolve: () => {},
			reject: () => {},
		};

		return new Promise((resolve, reject) => {
			task.resolve = resolve;
			task.reject = reject;

			this.tasks.set(taskId, task);
			this.scheduleTask(taskId);
		});
	}

	/**
   * Perform data aggregation in worker
   */
	async aggregateData(
		unifiedItems: UnifiedItem[],
		manualItems: ManualItem[],
		catalogItems: CatalogItem[],
		options: {
      onProgress?: (progress: any) => void;
      timeout?: number;
    } = {},
	): Promise<{
    aggregated: UnifiedItem[];
    conflicts: Array<{ id: string; field: string; unified: any; manual: any; catalog: any }>;
    statistics: any;
  }> {
		const taskId = this.generateTaskId();

		const task: WorkerTask = {
			id: taskId,
			type: "AGGREGATE",
			payload: {
				unifiedItems,
				manualItems,
				catalogItems,
			},
			onProgress: options.onProgress,
			timeout: options.timeout || this.config.taskTimeout,
			resolve: () => {},
			reject: () => {},
		};

		return new Promise((resolve, reject) => {
			task.resolve = resolve;
			task.reject = reject;

			this.tasks.set(taskId, task);
			this.scheduleTask(taskId);
		});
	}

	/**
   * Calculate statistics in worker
   */
	async calculateStatistics(
		items: UnifiedItem[],
		options: {
      onProgress?: (progress: any) => void;
      timeout?: number;
    } = {},
	): Promise<{
    byGrade: Record<string, number>;
    byScale: Record<string, number>;
    bySeries: Record<string, number>;
    byReleaseYear: Record<string, number>;
    sourceCoverage: any;
    qualityMetrics: any;
  }> {
		const taskId = this.generateTaskId();

		const task: WorkerTask = {
			id: taskId,
			type: "STATISTICS",
			payload: { items },
			onProgress: options.onProgress,
			timeout: options.timeout || this.config.taskTimeout,
			resolve: () => {},
			reject: () => {},
		};

		return new Promise((resolve, reject) => {
			task.resolve = resolve;
			task.reject = reject;

			this.tasks.set(taskId, task);
			this.scheduleTask(taskId);
		});
	}

	/**
   * Get worker pool statistics
   */
	getStats() {
		const busyWorkers = this.workers.filter(w => w.busy).length;

		// Calculate total queued tasks using a for loop instead of reduce
		let totalQueuedTasks = 0;
		for (const worker of this.workers) {
			totalQueuedTasks += worker.taskQueue.length;
		}

		return {
			poolSize: this.config.poolSize,
			busyWorkers,
			idleWorkers: this.config.poolSize - busyWorkers,
			totalQueuedTasks,
			activeTasks: this.tasks.size,
			workers: this.workers.map(w => ({
				busy: w.busy,
				currentTask: w.currentTask,
				queueLength: w.taskQueue.length,
				tasksProcessed: w.totalTasksProcessed,
				lastActivity: w.lastActivity,
			})),
		};
	}

	/**
   * Terminate all workers and clean up
   */
	async terminate(): Promise<void> {
		// Cancel all pending tasks
		for (const [, task] of this.tasks) {
			task.reject(new Error("Worker pool terminated"));
		}
		this.tasks.clear();

		// Terminate workers
		await Promise.all(
			this.workers.map(workerInstance => {
				workerInstance.worker.terminate();
				return Promise.resolve();
			}),
		);

		this.workers = [];
		this.isInitialized = false;
	}

	// ============================================================================
	// PRIVATE METHODS
	// ============================================================================

	/**
   * Generate unique task ID
   */
	private generateTaskId(): string {
		return `task_${++this.taskIdCounter}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
	}

	/**
   * Create a new worker instance
   */
	private async createWorker(): Promise<Worker> {
		try {
			// Create worker from blob URL for inline worker
			const workerCode = `
        ${this.getWorkerCode()}
      `;

			const blob = new Blob([workerCode], { type: "application/javascript" });
			const workerUrl = URL.createObjectURL(blob);

			const worker = new Worker(workerUrl);

			// Set up message handler
			worker.addEventListener("message", this.handleWorkerMessage.bind(this));
			worker.addEventListener("error", this.handleWorkerError.bind(this));

			return worker;
		} catch (error) {
			console.error("Failed to create worker:", error);
			throw error;
		}
	}

	/**
   * Schedule a task to be executed by a worker
   */
	private scheduleTask(taskId: string): void {
		const task = this.tasks.get(taskId);
		if (!task) {
			return;
		}

		// Find available worker
		const availableWorker = this.workers.find(w => !w.busy);
		if (availableWorker) {
			this.executeTask(availableWorker, taskId);
		} else {
			// Add to queue of least busy worker using for loop instead of reduce
			let leastBusyWorker = this.workers[0];
			let minQueueLength = leastBusyWorker.taskQueue.length;

			for (let i = 1; i < this.workers.length; i++) {
				const currentWorker = this.workers[i];
				if (currentWorker.taskQueue.length < minQueueLength) {
					leastBusyWorker = currentWorker;
					minQueueLength = currentWorker.taskQueue.length;
				}
			}

			leastBusyWorker.taskQueue.push(taskId);
		}
	}

	/**
   * Execute a task on a specific worker
   */
	private executeTask(workerInstance: WorkerInstance, taskId: string): void {
		const task = this.tasks.get(taskId);
		if (!task) {
			return;
		}

		workerInstance.busy = true;
		workerInstance.currentTask = taskId;
		workerInstance.lastActivity = Date.now();

		// Set up timeout
		const timeoutId = setTimeout(() => {
			this.handleTaskTimeout(taskId);
		}, task.timeout || this.config.taskTimeout);

		// Send task to worker
		workerInstance.worker.postMessage({
			id: taskId,
			type: task.type,
			payload: task.payload,
		});

		// Store timeout ID for cleanup
		(task as any).timeoutId = timeoutId;
	}

	/**
   * Handle message from worker
   */
	private handleWorkerMessage(event: MessageEvent): void {
		const { id, type, payload } = event.data;

		if (type === "PROGRESS") {
			// Handle progress update
			const task = this.tasks.get(id);
			if (task?.onProgress) {
				task.onProgress(payload);
			}
			return;
		}

		// Find the worker that sent this message
		const workerInstance = this.workers.find(w => w.currentTask === id);
		if (!workerInstance) {
			return;
		}

		// Clear timeout
		const task = this.tasks.get(id);
		if (task && (task as any).timeoutId) {
			clearTimeout((task as any).timeoutId);
		}

		// Mark worker as available
		workerInstance.busy = false;
		workerInstance.currentTask = undefined;
		workerInstance.totalTasksProcessed++;

		// Process result
		if (type === "SUCCESS") {
			task?.resolve(payload);
		} else if (type === "ERROR") {
			task?.reject(new Error(payload));
		}

		// Remove task from queue
		this.tasks.delete(id);

		// Process next task in queue
		const nextTaskId = workerInstance.taskQueue.shift();
		if (nextTaskId) {
			this.executeTask(workerInstance, nextTaskId);
		}
	}

	/**
   * Handle worker error
   */
	private handleWorkerError(event: ErrorEvent): void {
		console.error("Worker error:", event.error);

		// Find affected worker and reset it
		const workerIndex = this.workers.findIndex(w => w.worker === event.target);
		if (workerIndex !== -1) {
			const workerInstance = this.workers[workerIndex];

			// Fail current task
			if (workerInstance.currentTask) {
				const task = this.tasks.get(workerInstance.currentTask);
				if (task) {
					task.reject(new Error("Worker error occurred"));
					this.tasks.delete(workerInstance.currentTask);
				}
			}

			// Reset worker
			workerInstance.busy = false;
			workerInstance.currentTask = undefined;
			workerInstance.taskQueue = [];

			// Recreate worker
			this.recreateWorker(workerIndex);
		}
	}

	/**
   * Handle task timeout
   */
	private handleTaskTimeout(taskId: string): void {
		const task = this.tasks.get(taskId);
		if (!task) {
			return;
		}

		task.reject(new Error("Task timeout"));

		// Find and reset worker
		const workerInstance = this.workers.find(w => w.currentTask === taskId);
		if (workerInstance) {
			workerInstance.busy = false;
			workerInstance.currentTask = undefined;
		}

		this.tasks.delete(taskId);
	}

	/**
   * Recreate a failed worker
   */
	private async recreateWorker(index: number): Promise<void> {
		try {
			const oldWorker = this.workers[index];
			oldWorker.worker.terminate();

			const newWorker = await this.createWorker();
			this.workers[index] = {
				...oldWorker,
				worker: newWorker,
				busy: false,
				currentTask: undefined,
				taskQueue: [],
			};
		} catch (error) {
			console.error("Failed to recreate worker:", error);
		}
	}

	/**
   * Get worker code as string
   */
	private getWorkerCode(): string {
		// This should contain the worker code from dataWorker.ts
		// For now, return a basic implementation
		return `
      // Basic worker implementation
      self.addEventListener('message', async (event) => {
        const { id, type, payload } = event.data;

        try {
          switch (type) {
            case 'SEARCH':
              // Basic search implementation
              const results = [];
              self.postMessage({ id, type: 'SUCCESS', payload: results });
              break;

            case 'AGGREGATE':
              // Basic aggregation implementation
              const aggregationResult = { aggregated: [], conflicts: [], statistics: {} };
              self.postMessage({ id, type: 'SUCCESS', payload: aggregationResult });
              break;

            case 'STATISTICS':
              // Basic statistics implementation
              const stats = {};
              self.postMessage({ id, type: 'SUCCESS', payload: stats });
              break;

            default:
              throw new Error('Unknown task type: ' + type);
          }
        } catch (error) {
          self.postMessage({
            id,
            type: 'ERROR',
            payload: error.message
          });
        }
      });
    `;
	}
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

/** Global worker manager instance */
export const workerManager = new WorkerManager();

/** Initialize promise - tracks if initialization is in progress */
let initPromise: Promise<void> | null = null;

/**
 * Get worker manager instance, initializing if necessary
 */
export function getWorkerManager(): WorkerManager {
	// Start initialization if not already done or in progress
	if (!initPromise) {
		initPromise = workerManager.initialize().catch(error => {
			console.warn("Failed to auto-initialize worker manager:", error);
			// Reset promise so initialization can be retried
			initPromise = null;
		});
	}
	return workerManager;
}