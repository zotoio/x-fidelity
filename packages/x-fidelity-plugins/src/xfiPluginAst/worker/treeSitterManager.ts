import { Worker } from 'worker_threads';
import * as path from 'path';
import { logger, getOptions } from '@x-fidelity/core';
import { TreeSitterRequest, TreeSitterResponse, ParseResult, WasmConfig } from './treeSitterWorker';

// Set max listeners to reasonable level - we should only have one TreeSitter worker
process.setMaxListeners(20);

// Global singleton symbol to prevent multiple instances
const GLOBAL_SINGLETON_KEY = Symbol.for('x-fidelity.treeSitterManager');

export interface TreeSitterManagerConfig {
  useWasm?: boolean;
  wasmConfig?: WasmConfig;
  fallbackToNative?: boolean;
}

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
  private config: TreeSitterManagerConfig = {};
  private currentMode: 'native' | 'wasm' | 'unknown' = 'unknown';

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
   * Configure the Tree-sitter manager (must be called before initialize)
   */
  configure(config: TreeSitterManagerConfig): void {
    if (this.isInitialized) {
      logger.warn('[TreeSitter Manager] Cannot configure after initialization');
      return;
    }
    
    this.config = {
      useWasm: false,  // Default to native for backward compatibility
      fallbackToNative: true,  // Enable fallback by default
      ...config
    };
    
    logger.debug('[TreeSitter Manager] Configured:', this.config);
  }

  /**
   * Initialize the Tree-sitter worker with mutex protection
   */
  async initialize(config?: TreeSitterManagerConfig): Promise<void> {
    // Check if TreeSitter worker is disabled - skip initialization
    const coreOptions = getOptions();
    if (coreOptions.disableTreeSitterWorker) {
      logger.info('[TreeSitter Manager] Worker disabled, skipping worker initialization (direct parsing mode)');
      this.isInitialized = true; // Mark as initialized to allow direct parsing
      this.currentMode = 'native';
      return;
    }

    // Apply configuration if provided
    if (config) {
      this.configure(config);
    }

    // Auto-configure from core options if not explicitly set
    if (!this.config.useWasm && !config?.useWasm) {
      const coreOptionsAgain = getOptions();
      if (coreOptionsAgain.useWasmTreeSitter) {
        this.config.useWasm = true;
        this.config.wasmConfig = {
          wasmPath: coreOptionsAgain.wasmPath,
          languagesPath: coreOptionsAgain.wasmLanguagesPath,
          timeout: coreOptionsAgain.wasmTimeout
        };
        logger.info('[TreeSitter Manager] Auto-configured for WASM mode from core options');
      }
    }

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
      const mode = this.config.useWasm ? 'WASM' : 'native';
      logger.info(`[TreeSitter Manager] Initializing Tree-sitter worker in ${mode} mode...`);
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

      // Initialize Tree-sitter in the worker with configuration
      logger.debug(`[TreeSitter Manager] Sending initialization request to worker (${mode} mode)...`);
      const initResult = await this.sendRequest('initialize', {
        useWasm: this.config.useWasm,
        wasmConfig: this.config.wasmConfig
      });

      if (initResult.success) {
        this.isInitialized = true;
        this.currentMode = initResult.data?.mode || 'unknown';
        logger.info(`[TreeSitter Manager] Worker initialized successfully in ${this.currentMode} mode`);
        
        // Log status for debugging
        const status = initResult.data;
        if (status) {
          logger.debug('[TreeSitter Manager] Worker status:', {
            mode: status.mode,
            wasmAvailable: status.wasmAvailable,
            nativeAvailable: status.nativeAvailable,
            supportedLanguages: status.supportedLanguages
          });
        }
      } else {
        throw new Error(`Worker initialization failed: ${initResult.error || 'Unknown error'}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.lastInitializationError = errorMessage;
      logger.error(`[TreeSitter Manager] Initialization failed: ${errorMessage}`);
      this.initializationPromise = null;
      await this.cleanup();
      throw new Error(`TreeSitter manager initialization failed: ${errorMessage}`);
    }
  }

  /**
   * Parse code using the Tree-sitter worker
   * NOTE: TreeSitter manager MUST be pre-initialized before calling this method
   */
  async parseCode(code: string, language: 'javascript' | 'typescript', fileName: string): Promise<ParseResult> {
    // Check if TreeSitter worker is disabled - fall back to direct parsing
    const coreOptions = getOptions();
    if (coreOptions.disableTreeSitterWorker) {
      logger.debug('[TreeSitter Manager] Worker disabled, falling back to direct parsing');
      return this.parseCodeDirectly(code, language, fileName);
    }

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
   * Parse code directly without worker (fallback for when worker is disabled)
   */
  private async parseCodeDirectly(code: string, language: 'javascript' | 'typescript', fileName: string): Promise<ParseResult> {
    const startTime = Date.now();
    
    try {
      // Try native Tree-sitter first
      const TreeSitter = require('tree-sitter');
      const JavaScript = require('tree-sitter-javascript');
      const TreeSitterTypescript = require('tree-sitter-typescript');
      
      const parser = new TreeSitter();
      const lang = language === 'typescript' ? TreeSitterTypescript.typescript : JavaScript;
      
      if (!lang) {
        throw new Error(`Language not available: ${language}`);
      }
      
      parser.setLanguage(lang);
      const tree = parser.parse(code);
      const parseTime = Date.now() - startTime;
      
      // Convert to serializable format (same as worker)
      const serializableTree = this.nodeToSerializable(tree.rootNode);
      
      logger.debug(`[TreeSitter Manager] Direct parsing completed for ${fileName} in ${parseTime}ms`);
      
      return {
        tree: serializableTree,
        rootNode: serializableTree,
        mode: 'native-direct',
        parseTime
      };
    } catch (error) {
      const parseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn(`[TreeSitter Manager] Direct parsing failed for ${fileName}: ${errorMessage}`);
      
      return {
        tree: null,
        reason: `Direct parsing failed: ${errorMessage}`,
        mode: 'native-direct',
        parseTime
      };
    }
  }

  /**
   * Convert Tree-sitter node to serializable format (same logic as worker)
   */
  private nodeToSerializable(node: any): any {
    return {
      type: node.type,
      startPosition: node.startPosition,
      endPosition: node.endPosition,
      startIndex: node.startIndex,
      endIndex: node.endIndex,
      text: node.text,
      children: node.children?.map((child: any) => this.nodeToSerializable(child)) || []
    };
  }

  /**
   * Get the current parsing mode
   */
  getCurrentMode(): 'native' | 'wasm' | 'unknown' {
    return this.currentMode;
  }

  /**
   * Check if the manager is configured for WASM mode
   */
  isWasmMode(): boolean {
    return this.config.useWasm === true;
  }

  /**
   * Get configuration
   */
  getConfig(): TreeSitterManagerConfig {
    return { ...this.config };
  }

  private async waitForWorkerReady(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker not created'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Worker ready timeout'));
      }, 30000); // 30 second timeout

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

  private async sendRequest(type: 'initialize' | 'parse' | 'getStatus' | 'shutdown', data?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker not available'));
        return;
      }

      const id = `req-${++this.requestId}`;
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout: ${type}`));
      }, 30000); // 30 second timeout

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

  private handleWorkerError(error: Error): void {
    logger.error('[TreeSitter Manager] Worker error:', error);
    
    // Reject all pending requests
    for (const [id, pending] of this.pendingRequests) {
      if (pending.timeout) {
        clearTimeout(pending.timeout);
      }
      pending.reject(new Error(`Worker error: ${error.message}`));
    }
    this.pendingRequests.clear();
    
    // Mark as not initialized
    this.isInitialized = false;
    this.lastInitializationError = error.message;
  }

  /**
   * Check if the manager is ready for parsing
   */
  isReady(): boolean {
    return this.isInitialized && !this.isShuttingDown && this.worker !== null;
  }

  /**
   * Get detailed status for debugging
   */
  getDetailedStatus(): any {
    return {
      isInitialized: this.isInitialized,
      isShuttingDown: this.isShuttingDown,
      hasWorker: this.worker !== null,
      workerThreadId: this.worker?.threadId,
      lastInitializationError: this.lastInitializationError,
      pendingRequests: this.pendingRequests.size,
      currentMode: this.currentMode,
      config: this.config
    };
  }

  /**
   * Get worker status from worker thread
   */
  async getWorkerStatus(): Promise<any> {
    if (!this.isReady()) {
      return null;
    }

    try {
      const result = await this.sendRequest('getStatus');
      return result.success ? result.data : null;
    } catch (error) {
      logger.error('[TreeSitter Manager] Failed to get worker status:', error);
      return null;
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    logger.debug('[TreeSitter Manager] Cleaning up resources...');
    
    this.isInitialized = false;
    this.isShuttingDown = true;
    this.initializationPromise = null;
    this.currentMode = 'unknown';

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
        // Try graceful shutdown first
        await this.sendRequest('shutdown').catch(() => {
          // Ignore errors during shutdown
        });
      } catch (error) {
        // Ignore shutdown errors
      }

      try {
        await this.worker.terminate();
      } catch (error) {
        logger.warn('[TreeSitter Manager] Error terminating worker:', error);
      }
      
      this.worker = null;
    }

    logger.debug('[TreeSitter Manager] Cleanup completed');
  }

  /**
   * Shutdown the manager
   */
  async shutdown(): Promise<void> {
    await this.cleanup();
  }
}

// Export singleton instance - this is the preferred way to access the TreeSitter manager
export const treeSitterManager = TreeSitterManager.getInstance(); 