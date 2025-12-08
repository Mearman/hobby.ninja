/**
 * Progress Tracker
 *
 * Comprehensive progress tracking and error handling system for data operations.
 * Provides real-time progress updates, error recovery, and operation management.
 */

// ============================================================================
// PROGRESS TRACKING TYPES
// ============================================================================

/** Operation status */
export type OperationStatus = "pending" | "running" | "paused" | "completed" | "failed" | "cancelled";

/** Operation priority */
export type OperationPriority = "low" | "normal" | "high" | "critical";

/** Progress update */
export interface ProgressUpdate {
  /** Current progress value */
  current: number;
  /** Total value */
  total: number;
  /** Percentage (0-100) */
  percentage: number;
  /** Human-readable message */
  message?: string;
  /** Estimated time remaining in milliseconds */
  eta?: number;
  /** Processing rate (items/second) */
  rate?: number;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/** Operation configuration */
export interface OperationConfig {
  /** Operation identifier */
  id: string;
  /** Operation name */
  name: string;
  /** Operation description */
  description?: string;
  /** Operation priority */
  priority?: OperationPriority;
  /** Estimated duration in milliseconds */
  estimatedDuration?: number;
  /** Can this operation be paused? */
  pausable?: boolean;
  /** Can this operation be cancelled? */
  cancellable?: boolean;
  /** Progress reporting interval in milliseconds */
  progressInterval?: number;
  /** Maximum execution time in milliseconds */
  timeout?: number;
  /** Retry configuration */
  retry?: {
    maxAttempts: number;
    backoffMs: number;
    maxBackoffMs: number;
  };
  /** Callback functions */
  onProgress?: (progress: ProgressUpdate) => void;
  onComplete?: (result: any) => void;
  onError?: (error: Error) => void;
  onCancel?: () => void;
}

/** Operation state */
export interface OperationState {
  /** Configuration */
  config: OperationConfig;
  /** Current status */
  status: OperationStatus;
  /** Progress information */
  progress: ProgressUpdate;
  /** Operation result (when completed) */
  result?: any;
  /** Error information (when failed) */
  error?: Error;
  /** Creation timestamp */
  createdAt: number;
  /** Start timestamp */
  startedAt?: number;
  /** Completion timestamp */
  completedAt?: number;
  /** Execution time in milliseconds */
  executionTime?: number;
  /** Retry count */
  retryCount: number;
  /** Sub-operations */
  subOperations: string[];
  /** Parent operation */
  parentOperation?: string;
}

/** Error classification */
export interface ErrorClassification {
  /** Error severity */
  severity: "low" | "medium" | "high" | "critical";
  /** Error category */
  category: "network" | "parsing" | "validation" | "timeout" | "memory" | "permission" | "unknown";
  /** Is this error recoverable? */
  recoverable: boolean;
  /** Suggested recovery action */
  recoveryAction?: string;
  /** Should the operation be retried? */
  shouldRetry: boolean;
}

// ============================================================================
// ERROR CLASSIFIER
// ============================================================================

const ErrorClassifier = {
	/**
   * Classify an error and provide recovery suggestions
   */
	classify(error: Error): ErrorClassification {
		const message = error.message.toLowerCase();
		const name = error.name.toLowerCase();

		// Network errors
		if (message.includes("network") || message.includes("fetch") || message.includes("connection")) {
			return {
				severity: "medium",
				category: "network",
				recoverable: true,
				recoveryAction: "Check internet connection and retry",
				shouldRetry: true,
			};
		}

		// Timeout errors
		if (message.includes("timeout") || name.includes("timeout")) {
			return {
				severity: "medium",
				category: "timeout",
				recoverable: true,
				recoveryAction: "Increase timeout duration or reduce batch size",
				shouldRetry: true,
			};
		}

		// JSON parsing errors
		if (message.includes("json") || message.includes("parse") || name.includes("syntaxerror")) {
			return {
				severity: "high",
				category: "parsing",
				recoverable: false,
				recoveryAction: "Check data source format and fix parsing logic",
				shouldRetry: false,
			};
		}

		// Memory errors
		if (message.includes("memory") || message.includes("out of memory")) {
			return {
				severity: "high",
				category: "memory",
				recoverable: true,
				recoveryAction: "Reduce batch size or implement streaming processing",
				shouldRetry: false,
			};
		}

		// Permission errors
		if (message.includes("permission") || message.includes("unauthorized")) {
			return {
				severity: "high",
				category: "permission",
				recoverable: false,
				recoveryAction: "Check authentication and permissions",
				shouldRetry: false,
			};
		}

		// Validation errors
		if (message.includes("validation") || message.includes("invalid")) {
			return {
				severity: "medium",
				category: "validation",
				recoverable: true,
				recoveryAction: "Fix input data and retry",
				shouldRetry: false,
			};
		}

		// Unknown errors
		return {
			severity: "medium",
			category: "unknown",
			recoverable: false,
			recoveryAction: "Check logs and contact support",
			shouldRetry: true,
		};
	},
};

// ============================================================================
// PROGRESS TRACKER CLASS
// ============================================================================

export class ProgressTracker {
	private operations = new Map<string, OperationState>();
	private eventListeners = new Map<string, Array<(event: any) => void>>();
	private operationIdCounter = 0;
	private globalStats = {
		totalOperations: 0,
		completedOperations: 0,
		failedOperations: 0,
		cancelledOperations: 0,
		averageExecutionTime: 0,
	};

	/**
   * Create and start a new operation
   */
	createOperation(config: OperationConfig): string {
		const id = config.id || this.generateOperationId();
		const now = Date.now();

		const operation: OperationState = {
			config: {
				...config,
				id,
				priority: config.priority || "normal",
				pausable: config.pausable || false,
				cancellable: config.cancellable || true,
				progressInterval: config.progressInterval || 100,
				timeout: config.timeout || 60_000,
				retry: config.retry || {
					maxAttempts: 3,
					backoffMs: 1000,
					maxBackoffMs: 10_000,
				},
			},
			status: "pending",
			progress: {
				current: 0,
				total: 100,
				percentage: 0,
			},
			createdAt: now,
			retryCount: 0,
			subOperations: [],
		};

		this.operations.set(id, operation);
		this.globalStats.totalOperations++;

		this.emit("operationCreated", { id, operation });

		return id;
	}

	/**
   * Start an operation
   */
	async startOperation(id: string, executor: (operation: { updateProgress: (progress: ProgressUpdate) => void; checkPaused: () => boolean; checkCancelled: () => boolean }) => Promise<any>): Promise<any> {
		const operation = this.operations.get(id);
		if (!operation) {
			throw new Error(`Operation ${id} not found`);
		}

		if (operation.status !== "pending") {
			throw new Error(`Operation ${id} is not in pending state`);
		}

		operation.status = "running";
		operation.startedAt = Date.now();

		this.emit("operationStarted", { id, operation });

		// Set up timeout
		let timeoutId: NodeJS.Timeout | undefined;
		if (operation.config.timeout) {
			timeoutId = setTimeout(() => {
				this.failOperation(id, new Error("Operation timeout"));
			}, operation.config.timeout);
		}

		try {
			const result = await executor({
				updateProgress: (progress) => { this.updateProgress(id, progress); },
				checkPaused: () => this.isPaused(id),
				checkCancelled: () => this.isCancelled(id),
			});

			if (timeoutId) {
				clearTimeout(timeoutId);
			}

			return this.completeOperation(id, result);
		} catch (error) {
			if (timeoutId) {
				clearTimeout(timeoutId);
			}

			const classification = ErrorClassifier.classify(error as Error);

			if (classification.shouldRetry && operation.retryCount < operation.config.retry.maxAttempts) {
				return this.retryOperation(id, error as Error);
			}

			this.failOperation(id, error as Error); return;
		}
	}

	/**
   * Update operation progress
   */
	updateProgress(id: string, progress: ProgressUpdate): void {
		const operation = this.operations.get(id);
		if (operation?.status !== "running") {
			return;
		}

		// Update progress
		operation.progress = {
			...progress,
			percentage: Math.min(Math.max((progress.current / progress.total) * 100, 0), 100),
		};

		// Calculate ETA and rate if we have start time
		if (operation.startedAt) {
			const elapsed = Date.now() - operation.startedAt;
			const rate = progress.current / (elapsed / 1000);
			const remaining = (progress.total - progress.current) / rate;

			operation.progress.rate = rate;
			operation.progress.eta = remaining * 1000;
		}

		this.emit("progressUpdated", { id, operation, progress: operation.progress });

		// Call progress callback
		if (operation.config.onProgress) {
			operation.config.onProgress(operation.progress);
		}
	}

	/**
   * Complete an operation
   */
	completeOperation(id: string, result?: any): any {
		const operation = this.operations.get(id);
		if (!operation) {
			throw new Error(`Operation ${id} not found`);
		}

		operation.status = "completed";
		operation.result = result;
		operation.completedAt = Date.now();

		if (operation.startedAt) {
			operation.executionTime = operation.completedAt - operation.startedAt;
			this.updateGlobalStats(operation.executionTime);
		}

		this.globalStats.completedOperations++;

		this.emit("operationCompleted", { id, operation, result });

		if (operation.config.onComplete) {
			operation.config.onComplete(result);
		}

		// Clean up after delay
		setTimeout(() => {
			this.cleanupOperation(id);
		}, 5000);

		return result;
	}

	/**
   * Fail an operation
   */
	failOperation(id: string, error: Error): void {
		const operation = this.operations.get(id);
		if (!operation) {
			return;
		}

		operation.status = "failed";
		operation.error = error;
		operation.completedAt = Date.now();

		if (operation.startedAt) {
			operation.executionTime = operation.completedAt - operation.startedAt;
		}

		this.globalStats.failedOperations++;

		this.emit("operationFailed", { id, operation, error });

		if (operation.config.onError) {
			operation.config.onError(error);
		}

		// Clean up after delay
		setTimeout(() => {
			this.cleanupOperation(id);
		}, 30_000); // Keep failed operations longer for debugging
	}

	/**
   * Retry an operation
   */
	async retryOperation(id: string, error: Error): Promise<any> {
		const operation = this.operations.get(id);
		if (!operation) {
			throw new Error(`Operation ${id} not found`);
		}

		operation.retryCount++;
		operation.status = "pending";

		const classification = ErrorClassifier.classify(error);

		// Calculate backoff delay
		const backoffMs = Math.min(
			operation.config.retry?.backoffMs * Math.pow(2, operation.retryCount - 1),
			operation.config.retry?.maxBackoffMs || 30000,
		);

		this.emit("operationRetry", { id, operation, error, backoffMs });

		// Wait before retrying
		await new Promise(resolve => setTimeout(resolve, backoffMs));

		// The operation will be retried by the caller
		throw error; // Re-throw to trigger retry logic
	}

	/**
   * Pause an operation
   */
	pauseOperation(id: string): boolean {
		const operation = this.operations.get(id);
		if (!operation || !operation.config.pausable || operation.status !== "running") {
			return false;
		}

		operation.status = "paused";
		this.emit("operationPaused", { id, operation });

		return true;
	}

	/**
   * Resume a paused operation
   */
	resumeOperation(id: string): boolean {
		const operation = this.operations.get(id);
		if (operation?.status !== "paused") {
			return false;
		}

		operation.status = "running";
		this.emit("operationResumed", { id, operation });

		return true;
	}

	/**
   * Cancel an operation
   */
	cancelOperation(id: string): boolean {
		const operation = this.operations.get(id);
		if (!operation || !operation.config.cancellable || ["completed", "failed", "cancelled"].includes(operation.status)) {
			return false;
		}

		operation.status = "cancelled";
		operation.completedAt = Date.now();

		if (operation.startedAt) {
			operation.executionTime = operation.completedAt - operation.startedAt;
		}

		this.globalStats.cancelledOperations++;

		this.emit("operationCancelled", { id, operation });

		if (operation.config.onCancel) {
			operation.config.onCancel();
		}

		// Clean up after delay
		setTimeout(() => {
			this.cleanupOperation(id);
		}, 5000);

		return true;
	}

	/**
   * Get operation state
   */
	getOperation(id: string): OperationState | undefined {
		return this.operations.get(id);
	}

	/**
   * Get all operations
   */
	getOperations(): OperationState[] {
		return [...this.operations.values()];
	}

	/**
   * Get operations by status
   */
	getOperationsByStatus(status: OperationStatus): OperationState[] {
		return this.getOperations().filter(op => op.status === status);
	}

	/**
   * Get global statistics
   */
	getGlobalStats() {
		return {
			...this.globalStats,
			successRate: this.globalStats.totalOperations > 0
				? (this.globalStats.completedOperations / this.globalStats.totalOperations) * 100
				: 0,
			averageExecutionTime: this.globalStats.averageExecutionTime,
			currentOperations: this.getOperationsByStatus("running").length,
			queuedOperations: this.getOperationsByStatus("pending").length,
		};
	}

	/**
   * Clear completed operations
   */
	clearCompleted(): number {
		const completedIds = [...this.operations.keys()]
			.filter(id => {
				const op = this.operations.get(id);
				return op && ["completed", "failed", "cancelled"].includes(op.status);
			});

		for (const id of completedIds) this.operations.delete(id);

		return completedIds.length;
	}

	/**
   * Add event listener
   */
	on(event: string, listener: (data: any) => void): () => void {
		if (!this.eventListeners.has(event)) {
			this.eventListeners.set(event, []);
		}

    this.eventListeners.get(event)!.push(listener);

    // Return unsubscribe function
    return () => {
    	const listeners = this.eventListeners.get(event);
    	if (listeners) {
    		const index = listeners.indexOf(listener);
    		if (index !== -1) {
    			listeners.splice(index, 1);
    		}
    	}
    };
	}

	// ============================================================================
	// PRIVATE METHODS
	// ============================================================================

	private generateOperationId(): string {
		return `op_${++this.operationIdCounter}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
	}

	private isPaused(id: string): boolean {
		const operation = this.operations.get(id);
		return operation?.status === "paused" || false;
	}

	private isCancelled(id: string): boolean {
		const operation = this.operations.get(id);
		return operation?.status === "cancelled" || false;
	}

	private updateGlobalStats(executionTime: number): void {
		const totalCompleted = this.globalStats.completedOperations;
		const currentAverage = this.globalStats.averageExecutionTime;

		this.globalStats.averageExecutionTime = (currentAverage * totalCompleted + executionTime) / (totalCompleted + 1);
	}

	private cleanupOperation(id: string): void {
		const operation = this.operations.get(id);
		if (operation && ["completed", "cancelled"].includes(operation.status)) {
			this.operations.delete(id);
		}
	}

	private emit(event: string, data: any): void {
		const listeners = this.eventListeners.get(event);
		if (listeners) {
			for (const listener of listeners) {
				try {
					listener(data);
				} catch (error) {
					console.error("Error in event listener:", error);
				}
			}
		}
	}
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create a progress tracker with default configuration
 */
export function createProgressTracker(): ProgressTracker {
	return new ProgressTracker();
}

/**
 * Execute an operation with automatic progress tracking
 */
export async function executeWithProgress<T>(
	tracker: ProgressTracker,
	config: OperationConfig,
	executor: (updateProgress: (current: number, total: number, message?: string) => void) => Promise<T>,
): Promise<T> {
	const operationId = tracker.createOperation(config);

	return tracker.startOperation(operationId, async ({ updateProgress }) => {
		return executor((current, total, message) => {
			updateProgress({
				current,
				total: total || 100,
				percentage: Math.round((current / (total || 100)) * 100),
				message,
			});
		});
	});
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

/** Global progress tracker instance */
export const progressTracker = new ProgressTracker();