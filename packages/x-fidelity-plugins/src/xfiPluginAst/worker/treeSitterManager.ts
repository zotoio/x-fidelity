import { Worker } from 'worker_threads';
import * as path from 'path';
import { logger } from '@x-fidelity/core';
import { TreeSitterRequest, TreeSitterResponse, ParseResult } from './treeSitterWorker';

// Set max listeners to reasonable level - we should only have one TreeSitter worker
process.setMaxListeners(20);

// Global singleton symbol to prevent multiple instances
const GLOBAL_SINGLETON_KEY = Symbol.for('x-fidelity.treeSitterManager');

export class TreeSitterManager {
  private static instance: TreeSitterManager | null = null;
  private worker: Worker | null = null;
  private requestId = 0;
  private pendingRequests = new Map<string, { resolve: Function; reject: Function; timeout?: NodeJS.Timeout }>();
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;
  private lastInitializationError: string | null = null;
  private isShuttingDown = false;
  private initializationMutex = false; // Simple mutex for initialization

  private constructor() {
    // Prevent multiple instances even across different contexts
    if ((globalThis as any)[GLOBAL_SINGLETON_KEY]) {
      throw new Error('TreeSitterManager instance already exists. Use treeSitterManager singleton instead.');
    }
    (globalThis as any)[GLOBAL_SINGLETON_KEY] = this;
  }

  static getInstance(): TreeSitterManager {
    // Check for existing global instance first
    if ((globalThis as any)[GLOBAL_SINGLETON_KEY]) {
      return (globalThis as any)[GLOBAL_SINGLETON_KEY];
    }
    
    if (!TreeSitterManager.instance) {
      TreeSitterManager.instance = new TreeSitterManager();
    }
    return TreeSitterManager.instance;
  }

  /**
   * Reset the singleton instance (for testing purposes only)
   * @internal
   */
  static resetInstance(): void {
    if (TreeSitterManager.instance) {
      TreeSitterManager.instance.cleanup();
      TreeSitterManager.instance = null;
    }
    delete (globalThis as any)[GLOBAL_SINGLETON_KEY];
  }

  /**
   * Initialize the Tree-sitter worker with mutex protection
   */
  async initialize(): Promise<void> {
    // Quick check if already initialized
    if (this.isInitialized && !this.isShuttingDown) {
      logger.debug('[TreeSitter Manager] Already initialized, skipping');
      return;
    }

    // Mutex protection: wait for any ongoing initialization to complete
    if (this.initializationMutex) {
      logger.debug('[TreeSitter Manager] Initialization mutex locked, waiting...');
      // Wait for the current initialization to complete
      while (this.initializationMutex) {
        await new Promise(resolve => setTimeout(resolve, 10)); // 10ms polling
      }
      
      // Check again after waiting
      if (this.isInitialized && !this.isShuttingDown) {
        logger.debug('[TreeSitter Manager] Initialization completed by another caller');
        return;
      }
    }

    // Check if initialization is already in progress
    if (this.initializationPromise) {
      logger.debug('[TreeSitter Manager] Initialization already in progress, waiting...');
      return this.initializationPromise;
    }

    // Acquire mutex
    this.initializationMutex = true;
    logger.debug('[TreeSitter Manager] Acquired initialization mutex');

    try {
      // Double-check after acquiring mutex
      if (this.isInitialized && !this.isShuttingDown) {
        logger.debug('[TreeSitter Manager] Already initialized after acquiring mutex, skipping');
        return;
      }

      // Reset shutdown flag
      this.isShuttingDown = false;
      this.initializationPromise = this.doInitialize();
      await this.initializationPromise;
    } finally {
      // Always release mutex
      this.initializationMutex = false;
      logger.debug('[TreeSitter Manager] Released initialization mutex');
    }
  }

  private async doInitialize(): Promise<void> {
    try {
      logger.info('[TreeSitter Manager] Initializing Tree-sitter worker...');
      this.lastInitializationError = null;

      // Check if worker already exists (safety check)
      if (this.worker) {
        logger.debug('[TreeSitter Manager] Worker already exists, cleaning up first...');
        await this.cleanup();
      }

      // Create worker thread
      const workerPath = path.join(__dirname, 'treeSitterWorker.js');
      logger.debug(`[TreeSitter Manager] Creating worker from path: ${workerPath}`);
      logger.debug(`[TreeSitter Manager] Current process listeners before worker creation: ${process.listenerCount('exit')}`);
      
      this.worker = new Worker(workerPath);
      
      logger.debug(`[TreeSitter Manager] Worker created, process listeners after creation: ${process.listenerCount('exit')}`);
      logger.debug(`[TreeSitter Manager] Worker thread ID: ${this.worker.threadId}`);

      // Set up message handling
      this.worker.on('message', (response: TreeSitterResponse) => {
        this.handleWorkerMessage(response);
      });

      this.worker.on('error', (error) => {
        logger.error('[TreeSitter Manager] Worker error:', error);
        this.handleWorkerError(error);
      });

      this.worker.on('exit', (code) => {
        if (code !== 0) {
          logger.error(`[TreeSitter Manager] Worker stopped with exit code ${code}`);
        }
        this.cleanup();
      });

      // Wait for worker to be ready
      logger.debug('[TreeSitter Manager] Waiting for worker to be ready...');
      await this.waitForWorkerReady();

      // Initialize Tree-sitter in the worker
      logger.debug('[TreeSitter Manager] Sending initialization request to worker...');
      const initResult = await this.sendRequest('initialize', undefined);
      
      if (!initResult.success) {
        const errorMsg = `Worker initialization failed: ${initResult.error}`;
        this.lastInitializationError = errorMsg;
        throw new Error(errorMsg);
      }

      this.isInitialized = true;
      logger.info('[TreeSitter Manager] Tree-sitter worker initialized successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.lastInitializationError = errorMessage;
      this.cleanup();
      logger.error(`[TreeSitter Manager] Initialization failed: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Parse code using the Tree-sitter worker
   * NOTE: TreeSitter manager MUST be pre-initialized before calling this method
   */
  async parseCode(code: string, language: 'javascript' | 'typescript', fileName: string): Promise<ParseResult> {
    // Fail fast if not ready - no auto-recovery to prevent multiple worker creation
    if (!this.isReady()) {
      const status = this.getDetailedStatus();
      logger.error('[TreeSitter Manager] Manager not ready - must be pre-initialized', status);
      return {
        tree: null,
        reason: `Manager not ready: ${status.lastInitializationError || 'Manager not pre-initialized'}`
      };
    }

    // Ensure worker is available
    if (!this.isInitialized || !this.worker) {
      const status = this.getDetailedStatus();
      logger.error('[TreeSitter Manager] Worker not available', status);
      return {
        tree: null,
        reason: `Worker not available: ${status.lastInitializationError || 'Worker not initialized'}`
      };
    }

    try {
      const result = await this.sendRequest('parse', {
        code,
        language,
        fileName
      });

      if (result.success) {
        return result.data as ParseResult;
      } else {
        return {
          tree: null,
          reason: result.error || 'Parse request failed'
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`[TreeSitter Manager] Parse error: ${errorMessage}`);
      return {
        tree: null,
        reason: `Parse error: ${errorMessage}`
      };
    }
  }

  /**
   * Get worker status
   */
  async getStatus(): Promise<any> {
    if (!this.worker) {
      return {
        isInitialized: false,
        error: 'Worker not created'
      };
    }

    try {
      const result = await this.sendRequest('getStatus');
      return result.success ? result.data : { error: result.error };
    } catch (error) {
      return {
        isInitialized: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Shutdown the worker
   */
  async shutdown(): Promise<void> {
    if (!this.worker || this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    logger.debug('[TreeSitter Manager] Shutting down worker...');

    try {
      await this.sendRequest('shutdown', undefined, 2000); // 2 second timeout
    } catch (error) {
      logger.warn('[TreeSitter Manager] Graceful shutdown failed, terminating worker');
    }

    this.cleanup();
  }

  /**
   * Send a request to the worker
   */
  private async sendRequest(
    type: TreeSitterRequest['type'],
    data?: any,
    timeoutMs: number = 30000
  ): Promise<TreeSitterResponse> {
    if (!this.worker) {
      throw new Error('Worker not available');
    }

    const id = `req-${++this.requestId}`;
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      this.pendingRequests.set(id, {
        resolve: (response: TreeSitterResponse) => {
          clearTimeout(timeout);
          resolve(response);
        },
        reject: (error: Error) => {
          clearTimeout(timeout);
          reject(error);
        },
        timeout
      });

      const request: TreeSitterRequest = { id, type, data };
      
      // Safely post message only if worker still exists
      if (this.worker) {
        this.worker.postMessage(request);
      } else {
        // Clean up and reject if worker became null
        this.pendingRequests.delete(id);
        clearTimeout(timeout);
        reject(new Error('Worker became unavailable'));
      }
    });
  }

  /**
   * Handle messages from the worker
   */
  private handleWorkerMessage(response: TreeSitterResponse): void {
    if (response.id === 'worker-ready') {
      // Worker is ready - this is handled in waitForWorkerReady
      return;
    }

    const pending = this.pendingRequests.get(response.id);
    if (pending) {
      this.pendingRequests.delete(response.id);
      if (pending.timeout) {
        clearTimeout(pending.timeout);
      }
      pending.resolve(response);
    }
  }

  /**
   * Handle worker errors
   */
  private handleWorkerError(error: Error): void {
    logger.error('[TreeSitter Manager] Worker error:', error);
    
    // Reject all pending requests
    for (const [id, pending] of this.pendingRequests.entries()) {
      if (pending.timeout) {
        clearTimeout(pending.timeout);
      }
      pending.reject(new Error(`Worker error: ${error.message}`));
    }
    this.pendingRequests.clear();
    
    this.cleanup();
  }

  /**
   * Wait for worker to signal it's ready
   */
  private async waitForWorkerReady(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Worker ready timeout'));
      }, 10000); // 10 second timeout

      const messageHandler = (response: TreeSitterResponse) => {
        if (response.id === 'worker-ready') {
          clearTimeout(timeout);
          // Safely remove listener only if worker still exists
          if (this.worker) {
            this.worker.off('message', messageHandler);
          }
          resolve();
        }
      };

      // Only add listener if worker exists
      if (this.worker) {
        this.worker.on('message', messageHandler);
      } else {
        clearTimeout(timeout);
        reject(new Error('Worker not available'));
      }
    });
  }

  /**
   * Clean up resources
   */
  private cleanup(): void {
    logger.debug('[TreeSitter Manager] Cleaning up resources...');
    
    if (this.worker) {
      try {
        // Remove all listeners before terminating to clean up exit listeners
        this.worker.removeAllListeners();
        this.worker.terminate().catch(() => {
          // Ignore termination errors
        });
      } catch (error) {
        logger.debug('[TreeSitter Manager] Error during worker cleanup:', error);
      }
      this.worker = null;
    }

    // Clear all pending requests
    for (const [id, pending] of this.pendingRequests.entries()) {
      if (pending.timeout) {
        clearTimeout(pending.timeout);
      }
      pending.reject(new Error('Worker terminated'));
    }
    this.pendingRequests.clear();

    this.isInitialized = false;
    this.initializationPromise = null;
    this.isShuttingDown = false;
    this.initializationMutex = false; // Reset mutex on cleanup
    // Note: We don't reset lastInitializationError here to preserve error info for debugging
  }

  /**
   * Check if the manager is ready
   */
  isReady(): boolean {
    return this.isInitialized && this.worker !== null;
  }

  /**
   * Get detailed status for debugging
   */
  getDetailedStatus() {
    return {
      isInitialized: this.isInitialized,
      hasWorker: this.worker !== null,
      isReady: this.isReady(),
      lastInitializationError: this.lastInitializationError,
      hasInitializationPromise: this.initializationPromise !== null,
      pendingRequestsCount: this.pendingRequests.size
    };
  }
}

// Export singleton instance - this is the preferred way to access the TreeSitter manager
export const treeSitterManager = TreeSitterManager.getInstance(); 