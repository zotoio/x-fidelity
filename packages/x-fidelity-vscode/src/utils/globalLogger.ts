import * as vscode from 'vscode';
import { VSCodeLogger } from './vscodeLogger';

/**
 * Global logger instance that ensures all X-Fidelity extension logs
 * go to the same output channel for consistent debugging experience
 */
class GlobalLoggerManager {
  private static instance: GlobalLoggerManager;
  private mainLogger: VSCodeLogger;
  private outputChannel: vscode.OutputChannel;
  private componentLoggers: VSCodeLogger[] = [];

  private constructor() {
    // Create the main output channel that all loggers will share
    this.outputChannel = vscode.window.createOutputChannel('X-Fidelity');
    this.mainLogger = new VSCodeLogger(
      'X-Fidelity',
      undefined,
      '',
      this.outputChannel
    );

    // Set initial log level based on current debug mode setting
    this.updateLogLevelsFromConfig();

    // Listen for configuration changes to update log levels
    vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration('xfidelity.debugMode')) {
        this.updateLogLevelsFromConfig();
      }
    });
  }

  static getInstance(): GlobalLoggerManager {
    if (!GlobalLoggerManager.instance) {
      GlobalLoggerManager.instance = new GlobalLoggerManager();
    }
    return GlobalLoggerManager.instance;
  }

  /**
   * Update all logger levels based on debugMode configuration
   */
  private updateLogLevelsFromConfig(): void {
    const config = vscode.workspace.getConfiguration('xfidelity');
    const debugMode = config.get<boolean>('debugMode', false);

    // Enhanced log level selection based on debug mode
    const logLevel = debugMode ? 'debug' : 'info';

    // Update main logger level
    this.mainLogger.setLevel(logLevel);

    // Update all component logger levels
    this.componentLoggers.forEach(logger => {
      logger.setLevel(logLevel);
    });

    // Enhanced logging with color-coded level indicator
    const levelIndicator = debugMode ? '🔍 DEBUG' : 'ℹ️  INFO';
    this.mainLogger.info(
      `🔧 Debug mode ${debugMode ? 'enabled' : 'disabled'} - log level set to: ${levelIndicator} ${logLevel}`
    );

    // Configure output channel for better filtering
    this.outputChannel.clear(); // Clear previous logs when level changes
    this.outputChannel.appendLine(
      `📊 Log Level Changed: ${levelIndicator} (${logLevel.toUpperCase()})`
    );
    this.outputChannel.appendLine(
      `🔍 Filter logs in Output panel by typing the level name (ERROR, WARN, INFO, DEBUG)`
    );
    this.outputChannel.appendLine('─'.repeat(80));
  }

  /**
   * Get the main logger instance
   */
  getMainLogger(): VSCodeLogger {
    return this.mainLogger;
  }

  /**
   * Create a component-specific logger that shares the same output channel
   * and respects the global debug mode setting
   * @param componentName Name of the component for log prefixing
   */
  createComponentLogger(componentName: string): VSCodeLogger {
    const config = vscode.workspace.getConfiguration('xfidelity');
    const debugMode = config.get<boolean>('debugMode', false);
    const logLevel = debugMode ? 'debug' : 'info';

    const logger = new VSCodeLogger(
      'X-Fidelity',
      undefined,
      componentName,
      this.outputChannel
    );

    // Set the appropriate log level
    logger.setLevel(logLevel);

    // Track this logger so we can update its level when config changes
    this.componentLoggers.push(logger);

    return logger;
  }

  /**
   * Show the X-Fidelity output channel
   */
  showOutputChannel(): void {
    this.outputChannel.show();
  }

  /**
   * Get the shared output channel
   */
  getOutputChannel(): vscode.OutputChannel {
    return this.outputChannel;
  }

  /**
   * Log a user-friendly command execution message
   */
  logCommandExecution(
    commandId: string,
    description: string,
    args?: any[]
  ): void {
    const timestamp = new Date().toLocaleTimeString();
    const argsInfo = args && args.length > 0 ? ` (${args.length} args)` : '';

    this.mainLogger.info(`🔧 [${timestamp}] ${description}${argsInfo}`, {
      command: commandId,
      timestamp
    });
  }

  /**
   * Log a user-friendly command completion message
   */
  logCommandCompletion(
    commandId: string,
    description: string,
    duration: number,
    success: boolean = true
  ): void {
    const timestamp = new Date().toLocaleTimeString();
    const icon = success ? '✅' : '❌';
    const durationStr =
      duration > 1000
        ? `${(duration / 1000).toFixed(1)}s`
        : `${Math.round(duration)}ms`;

    this.mainLogger.debug(
      `${icon} [${timestamp}] ${description} completed in ${durationStr}`,
      {
        command: commandId,
        duration,
        success,
        timestamp
      }
    );
  }

  /**
   * Log a user-friendly error message
   */
  logCommandError(
    commandId: string,
    description: string,
    error: any,
    duration: number
  ): void {
    const timestamp = new Date().toLocaleTimeString();
    const durationStr =
      duration > 1000
        ? `${(duration / 1000).toFixed(1)}s`
        : `${Math.round(duration)}ms`;
    const errorMessage = error instanceof Error ? error.message : String(error);

    this.mainLogger.error(
      `❌ [${timestamp}] ${description} failed after ${durationStr}: ${errorMessage}`,
      {
        command: commandId,
        error: errorMessage,
        duration,
        timestamp
      }
    );
  }

  dispose(): void {
    this.componentLoggers.forEach(logger => {
      if (logger.dispose) {
        logger.dispose();
      }
    });
    this.componentLoggers = [];
    this.outputChannel.dispose();
  }
}

// Export singleton instance and convenience functions
export const globalLogger = GlobalLoggerManager.getInstance();
export const getGlobalLogger = () => globalLogger.getMainLogger();
export const createComponentLogger = (componentName: string) =>
  globalLogger.createComponentLogger(componentName);
export const showXFidelityLogs = () => globalLogger.showOutputChannel();

/**
 * Command execution logging helpers for consistent user-friendly logging
 */
export const commandLogger = {
  execution: (commandId: string, description: string, args?: any[]) =>
    globalLogger.logCommandExecution(commandId, description, args),
  completion: (
    commandId: string,
    description: string,
    duration: number,
    success?: boolean
  ) =>
    globalLogger.logCommandCompletion(
      commandId,
      description,
      duration,
      success
    ),
  error: (
    commandId: string,
    description: string,
    error: any,
    duration: number
  ) => globalLogger.logCommandError(commandId, description, error, duration)
};
