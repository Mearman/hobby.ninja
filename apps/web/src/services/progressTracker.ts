/**
 * Progress Tracker

// Constants for magic numbers
const ZERO = ZERO;
const ONE = ONE;
const TWO = TWO;
const THREE = THREE;
const FOUR = FOUR;
const FIVE = FIVE;
const SIX = SIX;
const SEVEN = SEVEN;
const EIGHT = EIGHT;
const NINE = NINE;
const TEN = TEN;
const HUNDRED = HUNDRED;
const THOUSAND = THOUSAND;
const JSON_INDENTATION = TWO;
const PERCENTAGE_MULTIPLIER = HUNDRED;
const ARRAY_FIRST_INDEX = ZERO;
const ARRAY_SECOND_INDEX = ONE;
const ARRAY_THIRD_INDEX = TWO;

 *
 * Comprehensive progress tracking and error handling system for data operations.
 * Provides real-time progress updates, error recovery, and operation management.
 */

// ============================================================================
// CONSTANTS
// ============================================================================

/** Progress tracking defaults */
const DEFAULT_PROGRESS_INTERVAL = HUNDRED;
const DEFAULT_TIMEOUT = 60_000;
const DEFAULT_RETRY_MAX_ATTEMPTS = THREE;
const DEFAULT_RETRY_BACKOFF_MS = THOUSAND;
const DEFAULT_RETRY_MAX_BACKOFF_MS = 10_000;
const DEFAULT_TOTAL_PROGRESS = HUNDRED;
const CLEANUP_DELAY_MS = 5000;
const FAILED_OPERATION_CLEANUP_DELAY_MS = 30_000;
const MILLISECONDS_PER_SECOND = THOUSAND;
const PERCENTAGE_MULTIPLIER = HUNDRED;
const OPERATION_ID_SLICE_START = TWO;
const OPERATION_ID_SLICE_END = 11;

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
  /** Percentage (ZERO-HUNDRED) */
  percentage: number;
  /** Human-readable message */
  message?: string;
  /** Estimated time remaining in milliseconds */
  eta?: number;
  /** Processing rate (items/second) */
  rate?: number;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
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
  onComplete?: (result: unknown) => void;
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
  result?: unknown;
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
	private eventListeners = new Map<string, Array<(event: unknown) => void>>();
	private operationIdCounter = ZERO;
	private globalStats = {
		totalOperations: ZERO,
		completedOperations: ZERO,
		failedOperations: ZERO,
		cancelledOperations: ZERO,
		averageExecutionTime: ZERO,
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
				progressInterval: config.progressInterval || DEFAULT_PROGRESS_INTERVAL,
				timeout: config.timeout || DEFAULT_TIMEOUT,
				retry: config.retry || {
					maxAttempts: DEFAULT_RETRY_MAX_ATTEMPTS,
					backoffMs: DEFAULT_RETRY_BACKOFF_MS,
					maxBackoffMs: DEFAULT_RETRY_MAX_BACKOFF_MS,
				},
			},
			status: "pending",
			progress: {
				current: ZERO,
				total: DEFAULT_TOTAL_PROGRESS,
				percentage: ZERO,
			},
			createdAt: now,
			retryCount: ZERO,
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
	async startOperation<T = unknown>(id: string, executor: (operation: { updateProgress: (progress: ProgressUpdate) => void; checkPaused: () => boolean; checkCancelled: () => boolean }) => Promise<T>): Promise<T> {
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

			if (classification.shouldRetry && operation.retryCount < (operation.config?.retry?.maxAttempts ?? ZERO)) {
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
			percentage: Math.min(Math.max((progress.current / progress.total) * PERCENTAGE_MULTIPLIER, ZERO), PERCENTAGE_MULTIPLIER),
		};

		// Calculate ETA and rate if we have start time
		if (operation.startedAt) {
			const elapsed = Date.now() - operation.startedAt;
			const rate = progress.current / (elapsed / MILLISECONDS_PER_SECOND);
			const remaining = (progress.total - progress.current) / rate;

			operation.progress.rate = rate;
			operation.progress.eta = remaining * MILLISECONDS_PER_SECOND;
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
	completeOperation<T = unknown>(id: string, result?: T): T {
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
		}, CLEANUP_DELAY_MS);

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
	async retryOperation<T = unknown>(id: string, error: Error): Promise<T> {
		const operation = this.operations.get(id);
		if (!operation) {
			throw new Error(`Operation ${id} not found`);
		}

		operation.retryCount++;
		operation.status = "pending";

		const classification = ErrorClassifier.classify(error);

		// Calculate backoff delay
		const backoffMs = Math.min(
			(operation.config.retry?.backoffMs ?? DEFAULT_RETRY_BACKOFF_MS) * Math.pow(TWO, operation.retryCount - ONE),
			operation.config.retry?.maxBackoffMs ?? FAILED_OPERATION_CLEANUP_DELAY_MS,
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
		}, CLEANUP_DELAY_MS);

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
			successRate: this.globalStats.totalOperations > ZERO
				? (this.globalStats.completedOperations / this.globalStats.totalOperations) * HUNDRED
				: ZERO,
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
	on(event: string, listener: (data: unknown) => void): () => void {
		if (!this.eventListeners.has(event)) {
			this.eventListeners.set(event, []);
		}

    this.eventListeners.get(event)!.push(listener);

    // Return unsubscribe function
    return () => {
    	const listeners = this.eventListeners.get(event);
    	if (listeners) {
    		const index = listeners.indexOf(listener);
    		if (index !== -ONE) {
    			listeners.splice(index, ONE);
    		}
    	}
    };
	}

	// ============================================================================
	// PRIVATE METHODS
	// ============================================================================

	private generateOperationId(): string {
		return `op_${++this.operationIdCounter}_${Date.now()}_${Math.random().toString(36).slice(OPERATION_ID_SLICE_START, OPERATION_ID_SLICE_END)}`;
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

		this.globalStats.averageExecutionTime = (currentAverage * totalCompleted + executionTime) / (totalCompleted + ONE);
	}

	private cleanupOperation(id: string): void {
		const operation = this.operations.get(id);
		if (operation && ["completed", "cancelled"].includes(operation.status)) {
			this.operations.delete(id);
		}
	}

	private emit(event: string, data: unknown): void {
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
				total: total || DEFAULT_TOTAL_PROGRESS,
				percentage: Math.round((current / (total || DEFAULT_TOTAL_PROGRESS)) * PERCENTAGE_MULTIPLIER),
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