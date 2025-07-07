/**
 * Standardized Error Handling System for X-Fidelity
 * Provides consistent error types, codes, and handling across CLI and VSCode
 */

/** Standard error categories */
export type ErrorCategory = 
  | 'CONFIGURATION'
  | 'PLUGIN'
  | 'ANALYSIS'
  | 'FILESYSTEM'
  | 'NETWORK'
  | 'VALIDATION'
  | 'RUNTIME'
  | 'USER_INPUT';

/** Standard error codes for consistent identification */
export enum ErrorCode {
  // Configuration errors (1000-1099)
  CONFIG_NOT_FOUND = 1001,
  CONFIG_INVALID = 1002,
  CONFIG_PARSE_ERROR = 1003,
  ARCHETYPE_NOT_FOUND = 1004,
  ARCHETYPE_INVALID = 1005,
  
  // Plugin errors (1100-1199)
  PLUGIN_NOT_FOUND = 1101,
  PLUGIN_LOAD_FAILED = 1102,
  PLUGIN_INVALID = 1103,
  PLUGIN_FUNCTION_NOT_FOUND = 1104,
  PLUGIN_EXECUTION_FAILED = 1105,
  
  // Analysis errors (1200-1299)
  ANALYSIS_FAILED = 1201,
  ANALYSIS_TIMEOUT = 1202,
  ANALYSIS_CANCELLED = 1203,
  RULE_EXECUTION_FAILED = 1204,
  FACT_COLLECTION_FAILED = 1205,
  
  // Filesystem errors (1300-1399)
  FILE_NOT_FOUND = 1301,
  FILE_READ_ERROR = 1302,
  FILE_WRITE_ERROR = 1303,
  DIRECTORY_NOT_FOUND = 1304,
  PERMISSION_DENIED = 1305,
  
  // Network errors (1400-1499)
  NETWORK_TIMEOUT = 1401,
  NETWORK_CONNECTION_FAILED = 1402,
  REMOTE_SERVER_ERROR = 1403,
  API_RATE_LIMIT = 1404,
  
  // Validation errors (1500-1599)
  INVALID_INPUT = 1501,
  SCHEMA_VALIDATION_FAILED = 1502,
  SECURITY_VIOLATION = 1503,
  
  // Runtime errors (1600-1699)
  INITIALIZATION_FAILED = 1601,
  DEPENDENCY_MISSING = 1602,
  MEMORY_ERROR = 1603,
  UNEXPECTED_ERROR = 1699,
  RUNTIME_ERROR
}

/** Enhanced error information with standardized structure */
export interface StandardError {
  /** Unique error code for identification */
  code: ErrorCode;
  
  /** Error category for grouping */
  category: ErrorCategory;
  
  /** Human-readable error message */
  message: string;
  
  /** Technical details for debugging */
  details?: string;
  
  /** Context information */
  context?: {
    /** Component where error occurred */
    component: 'CLI' | 'VSCode' | 'Core' | 'Plugin';
    
    /** Function/method name */
    function?: string;
    
    /** File path if relevant */
    filePath?: string;
    
    /** Rule name if relevant */
    ruleName?: string;
    
    /** Plugin name if relevant */
    pluginName?: string;
    
    /** Additional context data */
    extra?: Record<string, any>;
  };
  
  /** Original error if this wraps another error */
  cause?: Error | StandardError;
  
  /** Stack trace */
  stack?: string;
  
  /** Timestamp */
  timestamp: string;
  
  /** Unique error ID for correlation */
  errorId: string;
}

/** Error severity levels */
export type ErrorSeverity = 'fatal' | 'error' | 'warning' | 'info';

/** Error recovery actions */
export interface ErrorRecoveryAction {
  /** Action label */
  label: string;
  
  /** Action callback */
  action: () => void | Promise<void>;
  
  /** Whether this action is primary */
  isPrimary?: boolean;
}

/** Standardized error handling options */
export interface ErrorHandlingOptions {
  /** Whether to show user notification */
  showNotification?: boolean;
  
  /** Whether to log the error */
  logError?: boolean;
  
  /** Error severity */
  severity?: ErrorSeverity;
  
  /** Recovery actions */
  recoveryActions?: ErrorRecoveryAction[];
  
  /** Whether to include debug information */
  includeDebugInfo?: boolean;
  
  /** Custom error reporter */
  customReporter?: (error: StandardError) => void | Promise<void>;
}

/** Error correlation for tracking related errors across components */
export interface ErrorCorrelation {
  /** Correlation ID linking related errors */
  correlationId: string;
  
  /** Session ID */
  sessionId: string;
  
  /** Operation ID (e.g., analysis run) */
  operationId?: string;
  
  /** Related error IDs */
  relatedErrors: string[];
}

/** Debug context information */
export interface DebugContext {
  /** Current operation */
  operation: string;
  
  /** Component state */
  state: Record<string, any>;
  
  /** Configuration snapshot */
  config: Record<string, any>;
  
  /** Environment information */
  environment: {
    platform: string;
    version: string;
    nodeVersion?: string;
    vscodeVersion?: string;
  };
  
  /** Performance metrics */
  metrics?: {
    startTime: number;
    memoryUsage: number;
    activeOperations: string[];
  };
}

/** Standard error factory for creating consistent errors */
export class StandardErrorFactory {
  private static errorCounter = 0;
  private static sessionId = Date.now().toString(36);
  
  static create(
    code: ErrorCode,
    message: string,
    options: {
      category?: ErrorCategory;
      details?: string;
      context?: Partial<StandardError['context']>;
      cause?: Error | StandardError;
      severity?: ErrorSeverity;
    } = {}
  ): StandardError {
    const errorId = `${this.sessionId}-${++this.errorCounter}`;
    
    return {
      code,
      category: options.category || this.getCategoryFromCode(code),
      message,
      details: options.details,
      context: options.context as StandardError['context'],
      cause: options.cause,
      stack: new Error().stack,
      timestamp: new Date().toISOString(),
      errorId
    };
  }
  
  static fromError(error: Error, code: ErrorCode, context?: Partial<StandardError['context']>): StandardError {
    return this.create(code, error.message, {
      details: error.stack,
      cause: error,
      context
    });
  }
  
  private static getCategoryFromCode(code: ErrorCode): ErrorCategory {
    if (code >= 1000 && code < 1100) return 'CONFIGURATION';
    if (code >= 1100 && code < 1200) return 'PLUGIN';
    if (code >= 1200 && code < 1300) return 'ANALYSIS';
    if (code >= 1300 && code < 1400) return 'FILESYSTEM';
    if (code >= 1400 && code < 1500) return 'NETWORK';
    if (code >= 1500 && code < 1600) return 'VALIDATION';
    if (code >= 1600 && code < 1700) return 'RUNTIME';
    return 'RUNTIME';
  }
}

/** Error message templates for consistency */
export const ErrorMessages = {
  [ErrorCode.CONFIG_NOT_FOUND]: (archetype: string) => 
    `Configuration not found for archetype '${archetype}'. Ensure the archetype exists or check your configuration path.`,
  
  [ErrorCode.PLUGIN_LOAD_FAILED]: (pluginName: string, reason: string) =>
    `Failed to load plugin '${pluginName}': ${reason}. Check plugin installation and compatibility.`,
  
  [ErrorCode.ANALYSIS_FAILED]: (reason: string) =>
    `Analysis failed: ${reason}. Review your project configuration and try again.`,
  
  [ErrorCode.FILE_NOT_FOUND]: (filePath: string) =>
    `File not found: ${filePath}. Verify the file exists and you have read permissions.`,
  
  [ErrorCode.NETWORK_TIMEOUT]: (url: string) =>
    `Network request timed out for ${url}. Check your internet connection and try again.`,
  
  [ErrorCode.INVALID_INPUT]: (field: string, value: string) =>
    `Invalid input for ${field}: '${value}'. Please provide a valid value.`
} as const;

/** Helper function to get user-friendly error message */
export function getUserFriendlyMessage(error: StandardError): string {
  const template = ErrorMessages[error.code as keyof typeof ErrorMessages];
  if (typeof template === 'function') {
    // Extract relevant parameters from context
    const context = error.context?.extra || {};
    const values = Object.values(context) as string[];
    return (template as any)(...values);
  }
  return error.message;
}

/** Helper function to get technical error details */
export function getTechnicalDetails(error: StandardError): string {
  const parts: string[] = [];
  
  parts.push(`Error Code: ${error.code}`);
  parts.push(`Category: ${error.category}`);
  parts.push(`Component: ${error.context?.component || 'Unknown'}`);
  
  if (error.context?.function) {
    parts.push(`Function: ${error.context.function}`);
  }
  
  if (error.context?.filePath) {
    parts.push(`File: ${error.context.filePath}`);
  }
  
  if (error.details) {
    parts.push(`Details: ${error.details}`);
  }
  
  parts.push(`Time: ${error.timestamp}`);
  parts.push(`Error ID: ${error.errorId}`);
  
  return parts.join('\n');
} 