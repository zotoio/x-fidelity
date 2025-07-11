import * as vscode from 'vscode';
import type { ResultMetadata } from '@x-fidelity/types';

export interface AnalysisResult {
  metadata: ResultMetadata;
  diagnostics: Map<string, vscode.Diagnostic[]>;
  timestamp: number;
  duration: number;
  summary: {
    totalIssues: number;
    filesAnalyzed: number;
    analysisTimeMs: number;
    issuesByLevel?: Record<string, number>;
  };
  operationId?: string;
}

export interface AnalysisState {
  status: 'idle' | 'analyzing' | 'complete' | 'error';
  progress?: number;
  currentFile?: string;
  totalFiles?: number;
  error?: Error;
  operationId?: string;
}

// Add string union type for simpler state management
export type AnalysisStateType =
  | 'idle'
  | 'running'
  | 'cancelling'
  | 'completed'
  | 'error';

export { ResultMetadata };
