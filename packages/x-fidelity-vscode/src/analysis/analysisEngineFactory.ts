import * as vscode from 'vscode';
import { ConfigManager } from '../configuration/configManager';
import { DiagnosticProvider } from '../diagnostics/diagnosticProvider';
import { CLIAnalysisManager } from './cliAnalysisManager';
import type { IAnalysisEngine } from './analysisEngineInterface';

export type AnalysisEngineType = 'cli';

export interface AnalysisEngineOptions {
  configManager: ConfigManager;
  diagnosticProvider: DiagnosticProvider;
  context: vscode.ExtensionContext;
}

export class AnalysisEngineFactory {
  /**
   * Create CLI analysis engine
   */
  static async create(
    options: AnalysisEngineOptions
  ): Promise<IAnalysisEngine> {
    const { configManager, diagnosticProvider } = options;

    return new CLIAnalysisManager(configManager, diagnosticProvider);
  }

  /**
   * Get available analysis engines
   */
  static getAvailableEngines(): AnalysisEngineType[] {
    return ['cli'];
  }

  /**
   * Validate CLI analysis engine configuration
   */
  static async validateConfiguration(configManager: ConfigManager): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic CLI validation
    return {
      isValid: true,
      errors,
      warnings
    };
  }
}
