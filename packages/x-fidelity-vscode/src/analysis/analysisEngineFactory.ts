import * as vscode from 'vscode';
import { ConfigManager } from '../configuration/configManager';
import { DiagnosticProvider } from '../diagnostics/diagnosticProvider';
import { AnalysisManager } from './analysisManager';
import { CLIAnalysisManager } from './cliAnalysisManager';
import { VSCodeLogger } from '../utils/vscodeLogger';
import type { IAnalysisEngine } from './analysisEngineInterface';

export interface AnalysisEngineOptions {
  configManager: ConfigManager;
  diagnosticProvider: DiagnosticProvider;
  context: vscode.ExtensionContext;
}

export class AnalysisEngineFactory {
  private static logger = new VSCodeLogger('AnalysisEngineFactory');

  /**
   * Create the appropriate analysis engine based on configuration
   */
  static async create(
    options: AnalysisEngineOptions
  ): Promise<IAnalysisEngine> {
    const { configManager, diagnosticProvider } = options;
    const config = configManager.getConfig();

    this.logger.info(`Creating analysis engine: ${config.analysisEngine}`);

    if (config.analysisEngine === 'cli') {
      return await this.createCLIEngine(configManager, diagnosticProvider);
    } else {
      return this.createExtensionEngine(configManager, diagnosticProvider);
    }
  }

  /**
   * Create CLI analysis engine with validation
   */
  private static async createCLIEngine(
    configManager: ConfigManager,
    diagnosticProvider: DiagnosticProvider
  ): Promise<IAnalysisEngine> {
    const cliManager = new CLIAnalysisManager(
      configManager,
      diagnosticProvider
    );

    // Test CLI availability
    const binaryInfo = await cliManager.detectCLIBinary();

    if (binaryInfo.source === 'not-found') {
      this.logger.warn('CLI binary not found, but CLI mode requested');

      // Show user notification with options
      const choice = await vscode.window.showWarningMessage(
        'X-Fidelity CLI binary not found. Install it globally or switch to extension mode?',
        'Install CLI',
        'Switch to Extension Mode',
        'Configure Path'
      );

      switch (choice) {
        case 'Install CLI':
          await this.showInstallInstructions();
          break;
        case 'Switch to Extension Mode':
          await configManager.updateConfig({ analysisEngine: 'extension' });
          return this.createExtensionEngine(
            configManager,
            diagnosticProvider
          ) as IAnalysisEngine;
        case 'Configure Path':
          await this.showPathConfiguration(configManager);
          break;
      }
    } else {
      this.logger.info(
        `CLI engine ready: ${binaryInfo.path} (${binaryInfo.source}, v${binaryInfo.version})`
      );

      // Show success notification for first-time CLI users
      const config = configManager.getConfig();
      if (!config.debugMode) {
        vscode.window.showInformationMessage(
          `✅ X-Fidelity CLI mode enabled (${binaryInfo.source}, v${binaryInfo.version})`
        );
      }
    }

    return cliManager;
  }

  /**
   * Create extension analysis engine
   */
  private static createExtensionEngine(
    configManager: ConfigManager,
    diagnosticProvider: DiagnosticProvider
  ): IAnalysisEngine {
    this.logger.info('Extension analysis engine created');
    return new AnalysisManager(configManager, diagnosticProvider);
  }

  /**
   * Show CLI installation instructions
   */
  private static async showInstallInstructions(): Promise<void> {
    const choice = await vscode.window.showInformationMessage(
      'Install X-Fidelity CLI globally for better performance',
      { modal: true },
      'Open Terminal',
      'Copy Command',
      'Cancel'
    );

    const installCommand = 'npm install -g @x-fidelity/cli';

    switch (choice) {
      case 'Open Terminal':
        const terminal = vscode.window.createTerminal('X-Fidelity CLI Install');
        terminal.show();
        terminal.sendText(installCommand);
        break;
      case 'Copy Command':
        await vscode.env.clipboard.writeText(installCommand);
        vscode.window.showInformationMessage(
          'Install command copied to clipboard'
        );
        break;
    }
  }

  /**
   * Show path configuration dialog
   */
  private static async showPathConfiguration(
    configManager: ConfigManager
  ): Promise<void> {
    const currentPath = configManager.getConfig().cliBinaryPath;

    const newPath = await vscode.window.showInputBox({
      prompt: 'Enter the path to X-Fidelity CLI binary',
      placeHolder:
        'e.g., /usr/local/bin/xfidelity or C:\\Program Files\\nodejs\\xfidelity.cmd',
      value: currentPath,
      validateInput: value => {
        if (!value || value.trim().length === 0) {
          return 'Path cannot be empty';
        }
        return null;
      }
    });

    if (newPath) {
      await configManager.updateConfig({ cliBinaryPath: newPath.trim() });
      vscode.window.showInformationMessage(
        'CLI binary path updated. Try running analysis again.'
      );
    }
  }

  /**
   * Get recommended analysis engine based on system capabilities
   */
  static async getRecommendedEngine(): Promise<'extension' | 'cli'> {
    try {
      // Create temporary CLI manager to test availability
      const tempManager = new CLIAnalysisManager(
        {} as ConfigManager,
        {} as DiagnosticProvider
      );

      const binaryInfo = await tempManager.detectCLIBinary();
      tempManager.dispose();

      // Recommend CLI if available
      return binaryInfo.source !== 'not-found' ? 'cli' : 'extension';
    } catch {
      return 'extension';
    }
  }

  /**
   * Auto-detect and suggest optimal analysis engine
   */
  static async autoDetectAndSuggest(
    configManager: ConfigManager
  ): Promise<void> {
    const config = configManager.getConfig();

    // Skip if user has explicitly set CLI mode or if we've already asked
    if (config.analysisEngine === 'cli' || config.debugMode) {
      return;
    }

    const recommended = await this.getRecommendedEngine();

    if (recommended === 'cli' && config.analysisEngine === 'extension') {
      const choice = await vscode.window.showInformationMessage(
        '🚀 X-Fidelity CLI detected! Switch to CLI mode for better performance?',
        'Switch to CLI',
        'Keep Extension Mode',
        "Don't Ask Again"
      );

      switch (choice) {
        case 'Switch to CLI':
          await configManager.updateConfig({ analysisEngine: 'cli' });
          vscode.window.showInformationMessage(
            '✅ Switched to CLI mode. Restart analysis to use the faster CLI engine.'
          );
          break;
        case "Don't Ask Again":
          // Set a flag to not ask again (we could add this to config)
          this.logger.info('User opted out of CLI mode suggestions');
          break;
      }
    }
  }
}
