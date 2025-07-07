import { Worker } from 'worker_threads';
import * as path from 'path';
import { logger } from '@x-fidelity/core';
import { TreeSitterRequest, TreeSitterResponse, ParseResult } from './treeSitterWorker';

export class TreeSitterManager {
  private static instance: TreeSitterManager | null = null;
  private worker: Worker | null = null;
  private requestId = 0;
  private pendingRequests = new Map<string, { resolve: Function; reject: Function; timeout?: NodeJS.Timeout }>();
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;
  private lastInitializationError: string | null = null;

  private constructor() {}

  static getInstance(): TreeSitterManager {
    if (!TreeSitterManager.instance) {
      TreeSitterManager.instance = new TreeSitterManager();
    }
    return TreeSitterManager.instance;
  }

  /**
   * Initialize the Tree-sitter worker
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.debug('[TreeSitter Manager] Already initialized, skipping');
      return;
    }

    if (this.initializationPromise) {
      logger.debug('[TreeSitter Manager] Initialization already in progress, waiting...');
      return this.initializationPromise;
    }

    this.initializationPromise = this.doInitialize();
    return this.initializationPromise;
  }

  private async doInitialize(): Promise<void> {
    try {
      logger.info('[TreeSitter Manager] Initializing Tree-sitter worker...');
      this.lastInitializationError = null;

      // Create worker thread
      const workerPath = path.join(__dirname, 'treeSitterWorker.js');
      logger.debug(`[TreeSitter Manager] Creating worker from path: ${workerPath}`);
      this.worker = new Worker(workerPath);

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
   */
  async parseCode(code: string, language: 'javascript' | 'typescript', fileName: string): Promise<ParseResult> {
    // Auto-recovery: if not ready, try to initialize first
    if (!this.isReady()) {
      logger.debug('[TreeSitter Manager] Manager not ready, attempting initialization...');
      try {
        await this.initialize();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`[TreeSitter Manager] Auto-recovery initialization failed: ${errorMessage}`);
        return {
          tree: null,
          reason: `Auto-recovery failed: ${errorMessage}`
        };
      }
    }

    // Double-check readiness after potential initialization
    if (!this.isInitialized || !this.worker) {
      const status = this.getDetailedStatus();
      logger.warn('[TreeSitter Manager] Still not ready after initialization attempt', status);
      return {
        tree: null,
        reason: `Manager not ready: ${status.lastInitializationError || 'Unknown error'}`
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
    if (!this.worker) {
      return;
    }

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
    if (this.worker) {
      this.worker.terminate().catch(() => {
        // Ignore termination errors
      });
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

// Export singleton instance
export const treeSitterManager = TreeSitterManager.getInstance(); 