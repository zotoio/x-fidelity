import { performance } from 'perf_hooks';
import { VSCodeLogger } from './vscodeLogger';

export interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

export class PerformanceLogger {
  private metrics: PerformanceMetric[] = [];
  private readonly MAX_METRICS = 1000;
  private logger: VSCodeLogger;

  constructor(private component: string) {
    this.logger = new VSCodeLogger(`Performance-${component}`);
  }

  startOperation(
    operation: string,
    metadata?: Record<string, any>
  ): () => void {
    const startTime = performance.now();
    const operationId = `${operation}-${Date.now()}`;

    this.logger.debug(`Operation started: ${operation}`, {
      operationId,
      ...metadata
    });

    return () => {
      const duration = performance.now() - startTime;

      this.recordMetric({
        operation,
        duration,
        timestamp: Date.now(),
        metadata: { ...metadata, operationId }
      });

      this.logger.debug(`Operation completed: ${operation}`, {
        operationId,
        duration,
        ...metadata
      });

      // Warn about slow operations
      if (duration > 1000) {
        this.logger.warn(`Slow operation detected: ${operation}`, {
          operationId,
          duration,
          ...metadata
        });
      }
    };
  }

  private recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);

    // Keep only recent metrics
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }
  }

  getMetrics(operation?: string): PerformanceMetric[] {
    if (operation) {
      return this.metrics.filter(m => m.operation === operation);
    }
    return [...this.metrics];
  }

  getAverageTime(operation: string): number {
    const operationMetrics = this.getMetrics(operation);
    if (operationMetrics.length === 0) {
      return 0;
    }

    const total = operationMetrics.reduce((sum, m) => sum + m.duration, 0);
    return total / operationMetrics.length;
  }

  getSlowestOperations(limit: number = 10): PerformanceMetric[] {
    return [...this.metrics]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }
}
