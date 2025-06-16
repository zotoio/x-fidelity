import * as vscode from 'vscode';
import type { ResultMetadata } from '@x-fidelity/types';

export interface AnalysisResult {
  metadata: ResultMetadata;
  diagnostics: Map<string, vscode.Diagnostic[]>;
  timestamp: number;
  duration: number;
}

export interface AnalysisState {
  status: 'idle' | 'analyzing' | 'complete' | 'error';
  progress?: number;
  currentFile?: string;
  totalFiles?: number;
  error?: Error;
}

export { ResultMetadata }; 