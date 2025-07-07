import * as vscode from 'vscode';

export interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

export interface PerformanceReport {
  extensionId: string;
  sessionId: string;
  startTime: number;
  metrics: PerformanceMetric[];
  memoryUsage: {
    initial: number;
    current: number;
    peak: number;
  };
  summary: {
    activationTime: number;
    totalOperations: number;
    averageOperationTime: number;
    slowestOperation: string;
    fastestOperation: string;
  };
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, PerformanceMetric> = new Map();
  private sessionId: string;
  private startTime: number;
  private initialMemory: number;
  private peakMemory: number;

  // Performance thresholds (configurable)
  private readonly SLOW_OPERATION_THRESHOLD = 1000; // 1 second
  private readonly MEMORY_WARNING_THRESHOLD = 100 * 1024 * 1024; // 100MB

  private constructor() {
    this.sessionId = `perf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.startTime = performance.now();
    this.initialMemory = process.memoryUsage().heapUsed;
    this.peakMemory = this.initialMemory;

    // Start memory monitoring
    this.startMemoryTracking();
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Start timing an operation
   */
  startOperation(name: string, metadata?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      name,
      startTime: performance.now(),
      metadata
    };

    this.metrics.set(name, metric);
  }

  /**
   * End timing an operation
   */
  endOperation(name: string, additionalMetadata?: Record<string, any>): number {
    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`Performance metric '${name}' not found`);
      return 0;
    }

    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;

    // Merge additional metadata
    if (additionalMetadata) {
      metric.metadata = { ...metric.metadata, ...additionalMetadata };
    }

    // Log slow operations
    if (metric.duration > this.SLOW_OPERATION_THRESHOLD) {
      console.warn(
        `Slow operation detected: ${name} took ${metric.duration.toFixed(2)}ms`
      );
    }

    return metric.duration;
  }

  /**
   * Time a function execution
   */
  async timeOperation<T>(
    name: string,
    operation: () => Promise<T> | T,
    metadata?: Record<string, any>
  ): Promise<T> {
    this.startOperation(name, metadata);
    try {
      const result = await operation();
      this.endOperation(name, { success: true });
      return result;
    } catch (error) {
      this.endOperation(name, {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Record a custom metric
   */
  recordMetric(
    name: string,
    value: number,
    unit: string = 'ms',
    metadata?: Record<string, any>
  ): void {
    const metric: PerformanceMetric = {
      name,
      startTime: performance.now(),
      endTime: performance.now(),
      duration: value,
      metadata: { unit, ...metadata }
    };

    this.metrics.set(`${name}-${Date.now()}`, metric);
  }

  /**
   * Get current memory usage
   */
  getCurrentMemoryUsage(): number {
    const currentMemory = process.memoryUsage().heapUsed;
    if (currentMemory > this.peakMemory) {
      this.peakMemory = currentMemory;
    }

    if (currentMemory > this.MEMORY_WARNING_THRESHOLD) {
      console.warn(
        `High memory usage: ${(currentMemory / 1024 / 1024).toFixed(2)}MB`
      );
    }

    return currentMemory;
  }

  /**
   * Generate performance report
   */
  generateReport(): PerformanceReport {
    const currentTime = performance.now();
    const completedMetrics = Array.from(this.metrics.values()).filter(
      m => m.duration !== undefined
    );

    const durations = completedMetrics.map(m => m.duration!);
    const averageTime =
      durations.length > 0
        ? durations.reduce((a, b) => a + b, 0) / durations.length
        : 0;

    const slowest = completedMetrics.reduce(
      (prev, current) => (current.duration! > prev.duration! ? current : prev),
      completedMetrics[0]
    );

    const fastest = completedMetrics.reduce(
      (prev, current) => (current.duration! < prev.duration! ? current : prev),
      completedMetrics[0]
    );

    return {
      extensionId: 'x-fidelity-vscode',
      sessionId: this.sessionId,
      startTime: this.startTime,
      metrics: Array.from(this.metrics.values()),
      memoryUsage: {
        initial: this.initialMemory,
        current: this.getCurrentMemoryUsage(),
        peak: this.peakMemory
      },
      summary: {
        activationTime: currentTime - this.startTime,
        totalOperations: completedMetrics.length,
        averageOperationTime: averageTime,
        slowestOperation: slowest?.name || 'none',
        fastestOperation: fastest?.name || 'none'
      }
    };
  }

  /**
   * Export performance data for analysis
   */
  exportPerformanceData(): string {
    const report = this.generateReport();
    return JSON.stringify(report, null, 2);
  }

  /**
   * Clear all metrics
   */
  reset(): void {
    this.metrics.clear();
    this.startTime = performance.now();
    this.initialMemory = process.memoryUsage().heapUsed;
    this.peakMemory = this.initialMemory;
  }

  /**
   * Get metrics by pattern
   */
  getMetricsByPattern(pattern: RegExp): PerformanceMetric[] {
    return Array.from(this.metrics.values()).filter(metric =>
      pattern.test(metric.name)
    );
  }

  /**
   * Log performance summary to console
   */
  logSummary(): void {
    const report = this.generateReport();

    console.group('🚀 X-Fidelity Performance Summary');
    console.log(`Session: ${report.sessionId}`);
    console.log(`Total runtime: ${report.summary.activationTime.toFixed(2)}ms`);
    console.log(`Operations: ${report.summary.totalOperations}`);
    console.log(
      `Average operation time: ${report.summary.averageOperationTime.toFixed(2)}ms`
    );
    console.log(
      `Memory usage: ${(report.memoryUsage.current / 1024 / 1024).toFixed(2)}MB (peak: ${(report.memoryUsage.peak / 1024 / 1024).toFixed(2)}MB)`
    );

    if (report.summary.slowestOperation !== 'none') {
      console.log(`Slowest operation: ${report.summary.slowestOperation}`);
    }

    console.groupEnd();
  }

  /**
   * Start automatic memory tracking
   */
  private startMemoryTracking(): void {
    const trackMemory = () => {
      this.getCurrentMemoryUsage();
      setTimeout(trackMemory, 10000); // Check every 10 seconds
    };

    setTimeout(trackMemory, 10000);
  }

  /**
   * Create a decorator for timing methods
   */
  static createTimingDecorator(name?: string) {
    return function (
      target: any,
      propertyName: string,
      descriptor: PropertyDescriptor
    ) {
      const method = descriptor.value;
      const operationName =
        name || `${target.constructor.name}.${propertyName}`;

      descriptor.value = async function (...args: any[]) {
        const monitor = PerformanceMonitor.getInstance();
        return monitor.timeOperation(operationName, () =>
          method.apply(this, args)
        );
      };
    };
  }
}

// Export convenience function for global use
export const performanceMonitor = PerformanceMonitor.getInstance();

// VSCode Command for showing performance report
export function registerPerformanceCommands(
  context: vscode.ExtensionContext
): void {
  const showPerformanceReport = vscode.commands.registerCommand(
    'xfidelity.showPerformanceReport',
    () => {
      const report = performanceMonitor.generateReport();

      const panel = vscode.window.createWebviewPanel(
        'xfidelityPerformance',
        'X-Fidelity Performance Report',
        vscode.ViewColumn.One,
        { enableScripts: true }
      );

      panel.webview.html = generatePerformanceReportHTML(report);
    }
  );

  const exportPerformanceData = vscode.commands.registerCommand(
    'xfidelity.exportPerformanceData',
    async () => {
      const data = performanceMonitor.exportPerformanceData();
      const uri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(
          `x-fidelity-performance-${Date.now()}.json`
        ),
        filters: { 'JSON Files': ['json'] }
      });

      if (uri) {
        await vscode.workspace.fs.writeFile(uri, Buffer.from(data, 'utf8'));
        vscode.window.showInformationMessage(
          'Performance data exported successfully'
        );
      }
    }
  );

  context.subscriptions.push(showPerformanceReport, exportPerformanceData);
}

function generatePerformanceReportHTML(report: PerformanceReport): string {
  return `<!DOCTYPE html>
<html>
<head>
    <title>X-Fidelity Performance Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 20px; }
        .metric { margin: 10px 0; padding: 10px; border-left: 3px solid #007acc; background: #f5f5f5; }
        .summary { background: #e8f4fd; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .slow { border-left-color: #ff6b6b; background: #ffe0e0; }
        .fast { border-left-color: #51cf66; background: #e0ffe0; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f2f2f2; }
    </style>
</head>
<body>
    <h1>🚀 X-Fidelity Performance Report</h1>
    
    <div class="summary">
        <h2>Summary</h2>
        <p><strong>Session:</strong> ${report.sessionId}</p>
        <p><strong>Total Runtime:</strong> ${report.summary.activationTime.toFixed(2)}ms</p>
        <p><strong>Operations:</strong> ${report.summary.totalOperations}</p>
        <p><strong>Average Operation Time:</strong> ${report.summary.averageOperationTime.toFixed(2)}ms</p>
        <p><strong>Memory Usage:</strong> ${(report.memoryUsage.current / 1024 / 1024).toFixed(2)}MB 
           (Peak: ${(report.memoryUsage.peak / 1024 / 1024).toFixed(2)}MB)</p>
    </div>
    
    <h2>Operations</h2>
    <table>
        <thead>
            <tr>
                <th>Operation</th>
                <th>Duration (ms)</th>
                <th>Status</th>
                <th>Metadata</th>
            </tr>
        </thead>
        <tbody>
            ${report.metrics
              .filter(m => m.duration !== undefined)
              .map(
                metric => `
                <tr class="${metric.duration! > 1000 ? 'slow' : metric.duration! < 100 ? 'fast' : ''}">
                    <td>${metric.name}</td>
                    <td>${metric.duration!.toFixed(2)}</td>
                    <td>${metric.metadata?.success !== false ? '✅' : '❌'}</td>
                    <td>${JSON.stringify(metric.metadata || {})}</td>
                </tr>
              `
              )
              .join('')}
        </tbody>
    </table>
</body>
</html>`;
}
