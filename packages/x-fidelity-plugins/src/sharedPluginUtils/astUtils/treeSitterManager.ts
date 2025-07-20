import { Worker } from 'worker_threads';
import * as path from 'path';
import { logger, getOptions } from '@x-fidelity/core';
import { TreeSitterRequest, TreeSitterResponse } from './treeSitterWorker';
import { ParseResult, parseCode as sharedParseCode } from './treeSitterUtils';

// Set max listeners to reasonable level
process.setMaxListeners(20);

// Global singleton symbol to prevent multiple instances
const GLOBAL_SINGLETON_KEY = Symbol.for('x-fidelity.treeSitterManager');

export class TreeSitterManager {
  private static instance: TreeSitterManager | null = null;
  private worker: Worker | null = null;
  private requestId = 0;
  private pendingRequests = new Map<string, { resolve: Function; reject: Function; timeout?: NodeJS.Timeout }>();
  private isInitialized = false;
  private isShuttingDown = false;

  private constructor() {
    // Prevent multiple instances
    if ((globalThis as any)[GLOBAL_SINGLETON_KEY]) {
      throw new Error('TreeSitterManager instance already exists. Use treeSitterManager singleton instead.');
    }
    (globalThis as any)[GLOBAL_SINGLETON_KEY] = this;
  }

  static getInstance(): TreeSitterManager {
    if ((globalThis as any)[GLOBAL_SINGLETON_KEY]) {
      return (globalThis as any)[GLOBAL_SINGLETON_KEY];
    }
    
    if (!TreeSitterManager.instance) {
      TreeSitterManager.instance = new TreeSitterManager();
    }
    return TreeSitterManager.instance;
  }

  /**
   * Get the worker path with fallback for bundled environments
   */
  private getWorkerPath(): string {
    const fs = require('fs');
    
    const possiblePaths = [
      path.join(__dirname, 'treeSitterWorker.js'),
      path.join(__dirname, '../treeSitterWorker.js'),
      path.join(__dirname, '../../treeSitterWorker.js'),
      path.join(process.cwd(), 'dist/treeSitterWorker.js'),
    ];

    for (const workerPath of possiblePaths) {
      if (fs.existsSync(workerPath)) {
        return workerPath;
      }
    }

    return path.join(__dirname, 'treeSitterWorker.js');
  }

  /**
   * Initialize the Tree-sitter manager
   */
  async initialize(): Promise<void> {
    const options = getOptions();
    
    if (this.isInitialized && !this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = false;

    // If worker is disabled, just mark as initialized for direct parsing
    if (!options.enableTreeSitterWorker) {
      this.isInitialized = true;
      const mode = options.enableTreeSitterWasm ? 'WASM direct' : 'native direct';
      logger.info(`🔧 Tree-sitter Manager: Using ${mode} parsing mode`);
      return;
    }

    try {
      // Clean up existing worker
      if (this.worker) {
        await this.cleanup();
      }

      // Create and initialize worker
      const workerPath = this.getWorkerPath();
      this.worker = new Worker(workerPath);

      this.worker.on('message', (response: TreeSitterResponse) => {
        this.handleWorkerMessage(response);
      });

      this.worker.on('error', (error) => {
        logger.error('[Tree-sitter Manager] Worker error:', error);
        this.cleanup();
      });

      this.worker.on('exit', (code) => {
        if (code !== 0) {
          logger.error(`[Tree-sitter Manager] Worker stopped with exit code ${code}`);
        }
        this.cleanup();
      });

      // Wait for worker ready and initialize
      await this.waitForWorkerReady();
      
      const result = await this.sendRequest('initialize', {
        useWasm: options.enableTreeSitterWasm,
        wasmConfig: {
          wasmPath: options.wasmPath,
          languagesPath: options.wasmLanguagesPath,
          timeout: options.wasmTimeout
        }
      });

      if (result.success) {
        this.isInitialized = true;
        const mode = options.enableTreeSitterWasm ? 'WASM worker' : 'native worker';
        logger.info(`[Tree-sitter Manager] Initialized in ${mode} mode`);
      } else {
        throw new Error(`Worker initialization failed: ${result.error}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn(`[Tree-sitter Manager] Worker initialization failed: ${errorMessage}, falling back to direct parsing`);
      await this.cleanup();
      this.isInitialized = true; // Allow direct parsing fallback
    }
  }

  /**
   * Parse code using worker or direct parsing as fallback
   */
  async parseCode(code: string, language: 'javascript' | 'typescript', fileName: string): Promise<ParseResult> {
    const options = getOptions();

    // Use direct parsing if worker is disabled or not ready
    if (!options.enableTreeSitterWorker || !this.isWorkerReady()) {
      return this.parseCodeDirectly(code, language, fileName);
    }

    try {
      const result = await this.sendRequest('parse', { code, language, fileName });
      if (result.success) {
        return result.data as ParseResult;
      } else {
        throw new Error(result.error || 'Parse request failed');
      }
    } catch (error) {
      logger.warn(`[Tree-sitter Manager] Worker parsing failed, falling back to direct: ${error}`);
      return this.parseCodeDirectly(code, language, fileName);
    }
  }

  /**
   * Parse code directly without worker using shared utilities
   */
  private async parseCodeDirectly(code: string, language: 'javascript' | 'typescript', fileName: string): Promise<ParseResult> {
    const options = getOptions();
    
    return sharedParseCode(code, language, fileName, {
      useWasm: options.enableTreeSitterWasm,
      wasmConfig: {
        wasmPath: options.wasmPath,
        languagesPath: options.wasmLanguagesPath,
        timeout: options.wasmTimeout
      },
      mode: 'direct'
    });
  }



  /**
   * Check if the manager is ready for parsing
   */
  isReady(): boolean {
    return this.isInitialized && !this.isShuttingDown;
  }

  /**
   * Check if the worker is ready (for worker mode only)
   */
  private isWorkerReady(): boolean {
    return this.isInitialized && !this.isShuttingDown && this.worker !== null;
  }

  private async waitForWorkerReady(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker not created'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Worker ready timeout'));
      }, 30000);

      const messageHandler = (message: any) => {
        if (message.id === 'worker-ready') {
          clearTimeout(timeout);
          this.worker!.off('message', messageHandler);
          resolve();
        }
      };

      this.worker.on('message', messageHandler);
    });
  }

  private async sendRequest(type: 'initialize' | 'parse' | 'shutdown', data?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker not available'));
        return;
      }

      const id = `req-${++this.requestId}`;
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout: ${type}`));
      }, 30000);

      this.pendingRequests.set(id, { resolve, reject, timeout });

      const request: TreeSitterRequest = { id, type, data };
      this.worker.postMessage(request);
    });
  }

  private handleWorkerMessage(response: TreeSitterResponse): void {
    const { id, success, data, error } = response;
    const pending = this.pendingRequests.get(id);

    if (pending) {
      this.pendingRequests.delete(id);
      if (pending.timeout) {
        clearTimeout(pending.timeout);
      }

      if (success) {
        pending.resolve({ success: true, data });
      } else {
        pending.reject(new Error(error || 'Unknown worker error'));
      }
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.isInitialized = false;
    this.isShuttingDown = true;

    // Clear pending requests
    for (const [id, pending] of this.pendingRequests) {
      if (pending.timeout) {
        clearTimeout(pending.timeout);
      }
      pending.reject(new Error('Manager shutting down'));
    }
    this.pendingRequests.clear();

    // Terminate worker
    if (this.worker) {
      try {
        await this.sendRequest('shutdown').catch(() => {});
        await this.worker.terminate();
      } catch (error) {
        // Ignore cleanup errors
      }
      this.worker = null;
    }
  }

  /**
   * Shutdown the manager
   */
  async shutdown(): Promise<void> {
    await this.cleanup();
  }
}

// Export singleton instance
export const treeSitterManager = TreeSitterManager.getInstance(); 