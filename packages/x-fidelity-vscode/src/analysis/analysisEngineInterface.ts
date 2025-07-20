import * as vscode from 'vscode';
import type { AnalysisResult } from './types';

type SimpleAnalysisState = 'idle' | 'analyzing' | 'complete' | 'error';

/**
 * Analysis trigger sources for different types of analysis runs
 */
export type AnalysisTriggerSource =
  | 'manual'
  | 'automatic'
  | 'periodic'
  | 'file-save';

/**
 * Common interface for all analysis engines (extension and CLI)
 */
export interface IAnalysisEngine extends vscode.Disposable {
  // State management
  readonly isAnalysisRunning: boolean;

  // Event emitters - using compatible method names
  readonly onStateChanged: vscode.Event<SimpleAnalysisState>;
  readonly onComplete: vscode.Event<AnalysisResult>;

  // Core analysis methods
  runAnalysis(options?: {
    forceRefresh?: boolean;
    triggerSource?: AnalysisTriggerSource;
  }): Promise<AnalysisResult | null>;
  cancelAnalysis(): Promise<void>;

  // Result management
  getCurrentResults(): AnalysisResult | null;

  // Performance tracking
  getPerformanceMetrics(): any;

  // Logging
  getLogger(): any;

  // CLI access (for CLI-based engines)
  getCLISpawner?(): any;
}

/**
 * Extended interface for AnalysisManager with additional methods
 */
export interface IExtensionAnalysisEngine extends IAnalysisEngine {
  // Extension-specific methods
  scheduleAnalysis(delayMs?: number): void;
  startPeriodicAnalysis(): Promise<void>;
  stopPeriodicAnalysis(): void;

  // Legacy event names for backward compatibility
  readonly onDidAnalysisComplete: vscode.Event<AnalysisResult>;
  readonly onDidAnalysisStateChange: vscode.Event<SimpleAnalysisState>;
}

/**
 * Type guard to check if engine is extension-based
 */
export function isExtensionAnalysisEngine(
  engine: IAnalysisEngine
): engine is IExtensionAnalysisEngine {
  return 'scheduleAnalysis' in engine && 'startPeriodicAnalysis' in engine;
}

/**
 * Helper to safely call extension-specific methods
 */
export function callIfExtensionEngine<T>(
  engine: IAnalysisEngine,
  method: keyof IExtensionAnalysisEngine,
  args: any[] = []
): T | undefined {
  if (
    isExtensionAnalysisEngine(engine) &&
    typeof engine[method] === 'function'
  ) {
    return (engine[method] as any)(...args);
  }
  return undefined;
}

/**
 * Helper to get the appropriate event for state changes
 */
export function getStateChangeEvent(
  engine: IAnalysisEngine
): vscode.Event<SimpleAnalysisState> {
  if (isExtensionAnalysisEngine(engine)) {
    // Use legacy event name for AnalysisManager
    return engine.onDidAnalysisStateChange;
  }
  return engine.onStateChanged;
}

/**
 * Helper to get the appropriate event for analysis completion
 */
export function getCompletionEvent(
  engine: IAnalysisEngine
): vscode.Event<AnalysisResult> {
  if (isExtensionAnalysisEngine(engine)) {
    // Use legacy event name for AnalysisManager
    return engine.onDidAnalysisComplete;
  }
  return engine.onComplete;
}
