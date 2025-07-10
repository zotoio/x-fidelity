import * as vscode from 'vscode';
import { ConfigManager } from '../configuration/configManager';
import { DiagnosticProvider } from '../diagnostics/diagnosticProvider';
import { AnalysisManager } from './analysisManager';
import { CLIAnalysisManager } from './cliAnalysisManager';
import type { IAnalysisEngine } from './analysisEngineInterface';

export type AnalysisEngineType = 'extension' | 'cli';

export interface AnalysisEngineOptions {
  configManager: ConfigManager;
  diagnosticProvider: DiagnosticProvider;
  context: vscode.ExtensionContext;
}

export class AnalysisEngineFactory {
  /**
   * Create analysis engine based on configuration
   */
  static async create(
    options: AnalysisEngineOptions
  ): Promise<IAnalysisEngine> {
    const { configManager, diagnosticProvider, context } = options;
    const config = configManager.getConfig();

    // Simplified: Always use CLI analysis manager
    return new CLIAnalysisManager(configManager, diagnosticProvider);
  }

  /**
   * Auto-detect and suggest CLI mode if available
   */
  static async autoDetectAndSuggest(
    configManager: ConfigManager
  ): Promise<void> {
    // Simplified: CLI is always available since we're using embedded CLI
    return;
  }

  /**
   * Get available analysis engines
   */
  static getAvailableEngines(): AnalysisEngineType[] {
    return ['cli']; // Only CLI is available now
  }

  /**
   * Validate analysis engine configuration
   */
  static async validateConfiguration(configManager: ConfigManager): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Simplified validation for CLI-only mode
    return {
      isValid: true,
      errors,
      warnings
    };
  }
}
