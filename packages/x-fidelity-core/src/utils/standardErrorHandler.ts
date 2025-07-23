import { 
  StandardError, 
  ErrorCode, 
  ErrorHandlingOptions, 
  ErrorRecoveryAction,
  StandardErrorFactory,
  ErrorCorrelation,
  DebugContext,
  getUserFriendlyMessage,
  getTechnicalDetails
} from '@x-fidelity/types';
import { logger } from './logger';
import { ILogger } from '@x-fidelity/types';

/**
 * Standardized Error Handler for X-Fidelity
 * Provides consistent error handling across CLI and VSCode
 */
export class StandardErrorHandler {
  private static instance: StandardErrorHandler;
  private correlations: Map<string, ErrorCorrelation> = new Map();
  private debugContext: DebugContext | null = null;
  
  static getInstance(): StandardErrorHandler {
    if (!this.instance) {
      this.instance = new StandardErrorHandler();
    }
    return this.instance;
  }
  
  /**
   * Handle a standardized error with consistent logging and notification
   */
  async handleError(
    error: StandardError,
    options: ErrorHandlingOptions = {}
  ): Promise<void> {
    const {
      showNotification = true,
      logError = true,
      severity = 'error',
      recoveryActions = [],
      includeDebugInfo = false,
      customReporter
    } = options;
    
    // Add correlation information
    this.addErrorCorrelation(error);
    
    // Log the error with proper formatting
    if (logError) {
      this.logError(error, severity, includeDebugInfo);
    }
    
    // Show user notification if requested
    if (showNotification) {
      await this.showNotification(error, severity, recoveryActions);
    }
    
    // Call custom reporter if provided
    if (customReporter) {
      try {
        await customReporter(error);
      } catch (reporterError) {
        logger.error('Custom error reporter failed', { 
          error: reporterError, 
          originalErrorId: error.errorId 
        });
      }
    }
    
    // Send to telemetry/analytics if configured
    this.sendTelemetry(error);
  }
  
  /**
   * Wrap and handle a regular JavaScript error
   */
  async handleJavaScriptError(
    jsError: Error,
    code: ErrorCode,
    context: Partial<StandardError['context']> = {},
    options: ErrorHandlingOptions = {}
  ): Promise<StandardError> {
    const standardError = StandardErrorFactory.fromError(jsError, code, context);
    await this.handleError(standardError, options);
    return standardError;
  }
  
  /**
   * Create and handle a new error
   */
  async createAndHandleError(
    code: ErrorCode,
    message: string,
    context: Partial<StandardError['context']> = {},
    options: ErrorHandlingOptions = {}
  ): Promise<StandardError> {
    const standardError = StandardErrorFactory.create(code, message, { context });
    await this.handleError(standardError, options);
    return standardError;
  }
  
  /**
   * Set debug context for enhanced error reporting
   */
  setDebugContext(context: DebugContext): void {
    this.debugContext = context;
  }
  
  /**
   * Get current debug context
   */
  getDebugContext(): DebugContext | null {
    return this.debugContext;
  }
  
  /**
   * Create an error correlation for tracking related errors
   */
  createCorrelation(operationId?: string): string {
    const correlationId = `corr-${Date.now()}-${Math.random().toString(36).substring(2)}`;
    const correlation: ErrorCorrelation = {
      correlationId,
      sessionId: StandardErrorFactory['sessionId'],
      operationId,
      relatedErrors: []
    };
    
    this.correlations.set(correlationId, correlation);
    return correlationId;
  }
  
  /**
   * Add error to existing correlation
   */
  addToCorrelation(correlationId: string, errorId: string): void {
    const correlation = this.correlations.get(correlationId);
    if (correlation) {
      correlation.relatedErrors.push(errorId);
    }
  }
  
  /**
   * Get all errors for a correlation
   */
  getCorrelatedErrors(correlationId: string): string[] {
    return this.correlations.get(correlationId)?.relatedErrors || [];
  }
  
  private addErrorCorrelation(error: StandardError): void {
    // Add correlation ID from debug context if available
    if (this.debugContext?.operation) {
      const operationCorrelationId = `op-${this.debugContext.operation}`;
      if (!this.correlations.has(operationCorrelationId)) {
        // Create correlation with specific ID instead of generated one
        const correlation: ErrorCorrelation = {
          correlationId: operationCorrelationId,
          sessionId: StandardErrorFactory['sessionId'],
          operationId: this.debugContext.operation,
          relatedErrors: []
        };
        this.correlations.set(operationCorrelationId, correlation);
      }
      this.addToCorrelation(operationCorrelationId, error.errorId);
    }
  }
  
  private logError(error: StandardError, severity: string, includeDebugInfo: boolean): void {
    const logData: any = {
      errorId: error.errorId,
      code: error.code,
      category: error.category,
      message: error.message,
      component: error.context?.component,
      timestamp: error.timestamp
    };
    
    // Add context information
    if (error.context) {
      logData.context = {
        component: error.context.component,
        function: error.context.function,
        filePath: error.context.filePath,
        ruleName: error.context.ruleName,
        pluginName: error.context.pluginName
      };
      
      if (error.context.extra) {
        logData.extra = error.context.extra;
      }
    }
    
    // Add debug information if requested
    if (includeDebugInfo && this.debugContext) {
      logData.debug = this.debugContext;
    }
    
    // Add stack trace and cause information
    if (error.stack) {
      logData.stack = error.stack;
    }
    
    if (error.cause) {
      logData.cause = {
        message: error.cause.message,
        stack: error.cause.stack || error.cause.toString()
      };
    }
    
    // Log with appropriate level
    switch (severity) {
      case 'fatal':
        logger.fatal(logData, `[${error.code}] ${error.message}`);
        break;
      case 'error':
        logger.error(logData, `[${error.code}] ${error.message}`);
        break;
      case 'warning':
        logger.warn(logData, `[${error.code}] ${error.message}`);
        break;
      case 'info':
        logger.info(logData, `[${error.code}] ${error.message}`);
        break;
      default:
        logger.error(logData, `[${error.code}] ${error.message}`);
    }
  }
  
  private async showNotification(
    error: StandardError,
    severity: string,
    recoveryActions: ErrorRecoveryAction[]
  ): Promise<void> {
    const userMessage = getUserFriendlyMessage(error);
    const technicalDetails = getTechnicalDetails(error);
    
    // Check if we're in a VSCode environment
    if (this.isVSCodeEnvironment()) {
      await this.showVSCodeNotification(error, userMessage, technicalDetails, severity, recoveryActions);
    } else {
      // CLI environment - show console notification
      this.showCLINotification(error, userMessage, technicalDetails, severity, recoveryActions);
    }
  }
  
  private async showVSCodeNotification(
    error: StandardError,
    userMessage: string,
    technicalDetails: string,
    severity: string,
    recoveryActions: ErrorRecoveryAction[]
  ): Promise<void> {
    try {
      // Dynamic import to avoid loading VSCode API in CLI
      // Wrap in try-catch for bundled environments where vscode isn't available
      let vscode: any;
      try {
        // Use Function constructor to hide import from bundlers
        const dynamicImport = new Function('moduleName', 'return import(moduleName)');
        vscode = await dynamicImport('vscode');
      } catch (importError) {
        // VSCode module not available - fallback to CLI notification
        this.showCLINotification(error, userMessage, technicalDetails, severity, recoveryActions);
        return;
      }
      
      const actions = ['Show Details', ...recoveryActions.map(a => a.label)];
      
      let choice: string | undefined;
      
      switch (severity) {
        case 'fatal':
        case 'error':
          choice = await vscode.window.showErrorMessage(userMessage, { modal: true }, ...actions);
          break;
        case 'warning':
          choice = await vscode.window.showWarningMessage(userMessage, ...actions);
          break;
        case 'info':
          choice = await vscode.window.showInformationMessage(userMessage, ...actions);
          break;
        default:
          choice = await vscode.window.showErrorMessage(userMessage, ...actions);
      }
      
      // Handle user choice
      if (choice === 'Show Details') {
        await vscode.window.showInformationMessage(
          `Error Details:\n\n${technicalDetails}`,
          { modal: true }
        );
      } else if (choice) {
        const action = recoveryActions.find(a => a.label === choice);
        if (action) {
          try {
            await action.action();
          } catch (actionError) {
            logger.error('Recovery action failed', { 
              action: action.label, 
              error: actionError,
              originalErrorId: error.errorId 
            });
          }
        }
      }
    } catch (e) {
      // Fallback to console if VSCode API is not available
      this.showCLINotification(error, userMessage, technicalDetails, severity, recoveryActions);
    }
  }
  
  private showCLINotification(
    error: StandardError,
    userMessage: string,
    technicalDetails: string,
    severity: string,
    recoveryActions: ErrorRecoveryAction[]
  ): void {
    const icon = this.getSeverityIcon(severity);
    const colorCode = this.getSeverityColor(severity);
    
    console.error(`\n${colorCode}${icon} X-Fidelity Error [${error.code}]${this.getColorReset()}`);
    console.error(`${colorCode}${userMessage}${this.getColorReset()}\n`);
    
    if (error.context?.component) {
      console.error(`Component: ${error.context.component}`);
    }
    
    if (error.context?.function) {
      console.error(`Function: ${error.context.function}`);
    }
    
    if (error.context?.filePath) {
      console.error(`File: ${error.context.filePath}`);
    }
    
    console.error(`Error ID: ${error.errorId}`);
    console.error(`Time: ${error.timestamp}\n`);
    
    // Show recovery actions if available
    if (recoveryActions.length > 0) {
      console.error('Suggested actions:');
      recoveryActions.forEach((action, index) => {
        const marker = action.isPrimary ? '→' : '•';
        console.error(`  ${marker} ${action.label}`);
      });
      console.error('');
    }
    
    // Show technical details in debug mode
    if (process.env.XFI_DEBUG === 'true' || process.env.NODE_ENV === 'development') {
      console.error('Technical Details:');
      console.error(technicalDetails);
    } else {
      console.error('Run with XFI_DEBUG=true for technical details\n');
    }
  }
  
  private sendTelemetry(error: StandardError): void {
    // Send error telemetry data if telemetry is enabled
    // This is a placeholder for telemetry integration
    if (process.env.XFI_TELEMETRY_ENABLED === 'true') {
      const telemetryData = {
        type: 'error',
        errorCode: error.code,
        category: error.category,
        component: error.context?.component,
        timestamp: error.timestamp,
        // Don't send sensitive data in telemetry
        hasStackTrace: !!error.stack,
        hasCause: !!error.cause
      };
      
      // Send to telemetry service (implementation would go here)
      logger.debug('Sending error telemetry', { telemetryData });
    }
  }
  
  private isVSCodeEnvironment(): boolean {
    try {
      // Check for VSCode-specific environment variables or globals
      return typeof globalThis !== 'undefined' && 
             'vscode' in globalThis ||
             process.env.VSCODE_PID !== undefined ||
             process.env.VSCODE_NLS_CONFIG !== undefined;
    } catch {
      return false;
    }
  }
  
  private getSeverityIcon(severity: string): string {
    switch (severity) {
      case 'fatal': return '💀';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '❌';
    }
  }
  
  private getSeverityColor(severity: string): string {
    // Colors disabled - return empty string
    return '';
  }
  
  private getColorReset(): string {
    // Colors disabled - return empty string
    return '';
  }
}

// Create and export singleton instance
export const standardErrorHandler = StandardErrorHandler.getInstance();

// Helper functions for common error patterns
export async function handleConfigurationError(
  error: Error, 
  archetype?: string, 
  filePath?: string
): Promise<StandardError> {
  return standardErrorHandler.handleJavaScriptError(
    error,
    ErrorCode.CONFIG_NOT_FOUND,
    {
      component: 'Core',
      function: 'handleConfigurationError',
      filePath,
      extra: { archetype }
    },
    {
      showNotification: true,
      severity: 'error',
      recoveryActions: [
        {
          label: 'Check Configuration',
          action: () => {
            logger.info('Please verify your archetype configuration and file paths');
          },
          isPrimary: true
        }
      ]
    }
  );
}

export async function handlePluginError(
  error: Error,
  pluginName: string,
  functionName?: string
): Promise<StandardError> {
  return standardErrorHandler.handleJavaScriptError(
    error,
    ErrorCode.PLUGIN_LOAD_FAILED,
    {
      component: 'Plugin',
      function: functionName,
      pluginName,
      extra: { pluginName }
    },
    {
      showNotification: true,
      severity: 'error',
      recoveryActions: [
        {
          label: 'Retry Plugin Load',
          action: () => {
            logger.info(`Retrying plugin load for ${pluginName}`);
          }
        },
        {
          label: 'Skip Plugin',
          action: () => {
            logger.info(`Skipping plugin ${pluginName} and continuing`);
          }
        }
      ]
    }
  );
}

export async function handleAnalysisError(
  error: Error,
  filePath?: string,
  ruleName?: string
): Promise<StandardError> {
  return standardErrorHandler.handleJavaScriptError(
    error,
    ErrorCode.ANALYSIS_FAILED,
    {
      component: 'Core',
      function: 'handleAnalysisError',
      filePath,
      ruleName,
      extra: { filePath, ruleName }
    },
    {
      showNotification: true,
      severity: 'warning',
      recoveryActions: [
        {
          label: 'Skip File',
          action: () => {
            logger.info(`Skipping analysis of ${filePath}`);
          }
        },
        {
          label: 'Retry Analysis',
          action: () => {
            logger.info('Retrying analysis');
          },
          isPrimary: true
        }
      ]
    }
  );
} 