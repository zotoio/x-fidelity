import * as vscode from 'vscode';
import { Worker } from 'worker_threads';
import * as path from 'path';
import { logger } from './logger';

export interface WorkerTask {
  id: string;
  type: 'ast-analysis' | 'file-scan' | 'data-transform';
  data: any;
  timeout?: number;
}

export interface WorkerResult {
  id: string;
  success: boolean;
  data?: any;
  error?: string;
  duration: number;
}

/**
 * Worker Manager for offloading CPU-intensive tasks to separate threads
 * Improves VSCode extension responsiveness by preventing UI blocking
 */
export class WorkerManager implements vscode.Disposable {
  private workers: Map<string, Worker> = new Map();
  private activeJobs: Map<
    string,
    { resolve: Function; reject: Function; timeout?: NodeJS.Timeout }
  > = new Map();
  private workerPool: Worker[] = [];
  private readonly maxWorkers = 4;
  private readonly defaultTimeout = 30000; // 30 seconds
  private disposables: vscode.Disposable[] = [];

  constructor(private context: vscode.ExtensionContext) {
    this.initializeWorkerPool();
  }

  private initializeWorkerPool(): void {
    const workerScript = path.join(
      this.context.extensionPath,
      'dist',
      'worker.js'
    );

    for (let i = 0; i < this.maxWorkers; i++) {
      try {
        const worker = new Worker(workerScript);
        this.setupWorkerEventHandlers(worker, i);
        this.workerPool.push(worker);
        logger.info(`Worker ${i} initialized successfully`);
      } catch (error) {
        logger.error(`Failed to initialize worker ${i}:`, error);
      }
    }

    logger.info(
      `Worker pool initialized with ${this.workerPool.length} workers`
    );
  }

  private setupWorkerEventHandlers(worker: Worker, workerId: number): void {
    worker.on('message', (result: WorkerResult) => {
      this.handleWorkerMessage(result);
    });

    worker.on('error', (error: Error) => {
      logger.error(`Worker ${workerId} error:`, error);
      this.handleWorkerError(error, workerId);
    });

    worker.on('exit', (code: number) => {
      if (code !== 0) {
        logger.error(`Worker ${workerId} exited with code ${code}`);
      }
    });
  }

  private handleWorkerMessage(result: WorkerResult): void {
    const job = this.activeJobs.get(result.id);
    if (job) {
      if (job.timeout) {
        clearTimeout(job.timeout);
      }

      this.activeJobs.delete(result.id);

      if (result.success) {
        job.resolve(result);
      } else {
        job.reject(new Error(result.error || 'Worker task failed'));
      }

      logger.debug(
        `Worker task ${result.id} completed in ${result.duration}ms`
      );
    }
  }

  private handleWorkerError(error: Error, workerId: number): void {
    // Find and reject all jobs for this worker
    for (const [_jobId, job] of this.activeJobs.entries()) {
      job.reject(error);
      if (job.timeout) {
        clearTimeout(job.timeout);
      }
    }

    this.activeJobs.clear();
    logger.error(
      `Worker ${workerId} encountered error, all jobs cancelled:`,
      error
    );
  }

  private getAvailableWorker(): Worker | null {
    // Simple round-robin selection for now
    // Could be enhanced with load balancing
    return this.workerPool.length > 0 ? this.workerPool[0] : null;
  }

  /**
   * Execute AST analysis in a worker thread
   */
  public async runAstAnalysis(
    files: Array<{ path: string; content: string }>
  ): Promise<WorkerResult> {
    const task: WorkerTask = {
      id: `ast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'ast-analysis',
      data: { files },
      timeout: 60000 // 1 minute for AST analysis
    };

    return this.executeTask(task);
  }

  /**
   * Execute file system scanning in a worker thread
   */
  public async runFileScan(
    directory: string,
    patterns: string[]
  ): Promise<WorkerResult> {
    const task: WorkerTask = {
      id: `scan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'file-scan',
      data: { directory, patterns },
      timeout: 30000 // 30 seconds for file scanning
    };

    return this.executeTask(task);
  }

  /**
   * Execute data transformation in a worker thread
   */
  public async runDataTransform(
    data: any,
    transformType: string
  ): Promise<WorkerResult> {
    const task: WorkerTask = {
      id: `transform-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'data-transform',
      data: { data, transformType },
      timeout: 15000 // 15 seconds for data transformation
    };

    return this.executeTask(task);
  }

  private async executeTask(task: WorkerTask): Promise<WorkerResult> {
    const worker = this.getAvailableWorker();
    if (!worker) {
      throw new Error('No available workers');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.activeJobs.delete(task.id);
        reject(
          new Error(
            `Worker task ${task.id} timed out after ${task.timeout || this.defaultTimeout}ms`
          )
        );
      }, task.timeout || this.defaultTimeout);

      this.activeJobs.set(task.id, { resolve, reject, timeout });

      worker.postMessage(task);
      logger.debug(`Worker task ${task.id} (${task.type}) started`);
    });
  }

  /**
   * Get worker pool statistics
   */
  public getStats(): {
    totalWorkers: number;
    activeJobs: number;
    availableWorkers: number;
  } {
    return {
      totalWorkers: this.workerPool.length,
      activeJobs: this.activeJobs.size,
      availableWorkers: this.workerPool.length
    };
  }

  /**
   * Cancel all active jobs
   */
  public cancelAllJobs(): void {
    for (const [_jobId, job] of this.activeJobs.entries()) {
      if (job.timeout) {
        clearTimeout(job.timeout);
      }
      job.reject(new Error('Job cancelled'));
    }

    this.activeJobs.clear();
    logger.info('All worker jobs cancelled');
  }

  dispose(): void {
    this.cancelAllJobs();

    // Terminate all workers
    for (const worker of this.workerPool) {
      worker.terminate();
    }

    this.workerPool.length = 0;
    this.workers.clear();
    this.disposables.forEach(d => d.dispose());

    logger.info('WorkerManager disposed');
  }
}
