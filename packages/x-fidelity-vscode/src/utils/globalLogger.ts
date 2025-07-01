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

  private constructor() {
    // Create the main output channel that all loggers will share
    this.outputChannel = vscode.window.createOutputChannel('X-Fidelity');
    this.mainLogger = new VSCodeLogger(
      'X-Fidelity',
      undefined,
      '',
      this.outputChannel
    );
  }

  static getInstance(): GlobalLoggerManager {
    if (!GlobalLoggerManager.instance) {
      GlobalLoggerManager.instance = new GlobalLoggerManager();
    }
    return GlobalLoggerManager.instance;
  }

  /**
   * Get the main logger instance
   */
  getMainLogger(): VSCodeLogger {
    return this.mainLogger;
  }

  /**
   * Create a component-specific logger that shares the same output channel
   * @param componentName Name of the component for log prefixing
   */
  createComponentLogger(componentName: string): VSCodeLogger {
    return new VSCodeLogger(
      'X-Fidelity',
      undefined,
      componentName,
      this.outputChannel
    );
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
export const logCommandStart = (
  commandId: string,
  description: string,
  args?: any[]
) => globalLogger.logCommandExecution(commandId, description, args);

export const logCommandSuccess = (
  commandId: string,
  description: string,
  duration: number
) => globalLogger.logCommandCompletion(commandId, description, duration, true);

export const logCommandError = (
  commandId: string,
  description: string,
  error: any,
  duration: number
) => globalLogger.logCommandError(commandId, description, error, duration);
