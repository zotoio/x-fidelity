/**
 * Abstract logger interface for X-Fidelity
 * Provides a consistent logging API across different environments
 */
export interface ILogger {
  /** Log trace level messages (lowest level) */
  trace(msgOrMeta: string | any, metaOrMsg?: any): void;
  
  /** Log debug level messages */
  debug(msgOrMeta: string | any, metaOrMsg?: any): void;
  
  /** Log info level messages */
  info(msgOrMeta: string | any, metaOrMsg?: any): void;
  
  /** Log warning level messages */
  warn(msgOrMeta: string | any, metaOrMsg?: any): void;
  
  /** Log error level messages */
  error(msgOrMeta: string | any, metaOrMsg?: any): void;
  
  /** Log fatal level messages (highest level) */
  fatal(msgOrMeta: string | any, metaOrMsg?: any): void;
  
  /** Create a child logger with additional context */
  child(bindings: any): ILogger;
  
  /** Set the logging level */
  setLevel(level: LogLevel): void;
  
  /** Get the current logging level */
  getLevel(): LogLevel;
  
  /** Check if a log level is enabled */
  isLevelEnabled(level: LogLevel): boolean;
  
  /** Dispose of logger resources (if applicable) */
  dispose?(): void;
}

/**
 * Logger provider interface for creating logger instances
 */
export interface ILoggerProvider {
  /** Create a new logger instance */
  createLogger(options?: LoggerOptions): ILogger;
  
  /** Dispose of provider resources */
  dispose?(): void;
}

/**
 * Available log levels in order of severity
 */
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * Numeric log level values for comparison
 */
export const LogLevelValues: Record<LogLevel, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60
};

/**
 * Log categories for better organization and filtering
 */
export enum LogCategory {
  System = 'system',
  Analysis = 'analysis',
  Configuration = 'configuration',
  Performance = 'performance',
  Security = 'security',
  User = 'user',
  Extension = 'extension',
  Debug = 'debug',
  Network = 'network',
  Database = 'database',
  Authentication = 'authentication',
  Authorization = 'authorization',
  Validation = 'validation',
  Business = 'business'
}

/**
 * Configuration options for logger creation
 */
export interface LoggerOptions {
  /** Minimum log level to output */
  level?: LogLevel;
  
  /** Prefix to add to all log messages */
  prefix?: string;
  
  /** Additional context to include with all log entries */
  context?: LoggerContext;
  
  /** Whether to enable structured logging */
  structured?: boolean;
  
  /** Whether to include timestamps */
  includeTimestamp?: boolean;
  
  /** Whether to colorize output (if supported) */
  colorize?: boolean;
  
  /** Custom formatting options */
  format?: LoggerFormatOptions;
  
  /** Log category for this logger */
  category?: LogCategory;
  
  /** Whether to enable performance tracking */
  enablePerformanceTracking?: boolean;
  
  /** Whether to enable security features */
  enableSecurityFeatures?: boolean;
}

/**
 * Logger formatting options
 */
export interface LoggerFormatOptions {
  /** Custom timestamp format */
  timestampFormat?: string;
  
  /** Whether to use single line format */
  singleLine?: boolean;
  
  /** Fields to ignore in structured output */
  ignore?: string[];
  
  /** Fields to redact for security */
  redact?: string[];
  
  /** Maximum depth for object serialization */
  maxDepth?: number;
  
  /** Maximum length for string values */
  maxStringLength?: number;
}

/**
 * Enhanced log entry structure for structured logging
 */
export interface LogEntry {
  /** Timestamp of the log entry */
  timestamp: string;
  
  /** Log level */
  level: LogLevel;
  
  /** Log category */
  category: LogCategory;
  
  /** Log message */
  message: string;
  
  /** Additional metadata */
  metadata?: Record<string, any>;
  
  /** Logger context/bindings */
  context?: LoggerContext;
  
  /** Source information */
  source?: LogSource;
  
  /** Session identifier */
  sessionId?: string;
  
  /** User identifier */
  userId?: string;
  
  /** Performance metrics */
  performance?: PerformanceMetrics;
  
  /** Error object (if applicable) */
  error?: Error | ErrorInfo;
}

/**
 * Source information for log entries
 */
export interface LogSource {
  /** Component or module name */
  component: string;
  
  /** Function name (if available) */
  function?: string;
  
  /** File path (if available) */
  file?: string;
  
  /** Line number (if available) */
  line?: number;
  
  /** Column number (if available) */
  column?: number;
}

/**
 * Performance metrics for log entries
 */
export interface PerformanceMetrics {
  /** Operation duration in milliseconds */
  duration?: number;
  
  /** Memory usage in bytes */
  memoryUsage?: number;
  
  /** Memory delta in bytes */
  memoryDelta?: number;
  
  /** CPU usage percentage */
  cpuUsage?: number;
  
  /** Custom performance metrics */
  custom?: Record<string, number>;
}

/**
 * Enhanced error information
 */
export interface ErrorInfo {
  /** Error name */
  name: string;
  
  /** Error message */
  message: string;
  
  /** Error stack trace */
  stack?: string;
  
  /** Error code */
  code?: string | number;
  
  /** Additional error context */
  context?: Record<string, any>;
  
  /** Inner/cause error */
  cause?: ErrorInfo;
}

/**
 * Logger context for child loggers and structured logging
 */
export interface LoggerContext {
  /** Component or module name */
  component?: string;
  
  /** Service name */
  service?: string;
  
  /** Operation or process identifier */
  operation?: string;
  
  /** Request identifier */
  requestId?: string;
  
  /** Session identifier */
  sessionId?: string;
  
  /** User identifier */
  userId?: string;
  
  /** Trace identifier for distributed tracing */
  traceId?: string;
  
  /** Span identifier for distributed tracing */
  spanId?: string;
  
  /** Environment (development, staging, production) */
  environment?: string;
  
  /** Version information */
  version?: string;
  
  /** Additional custom context */
  [key: string]: any;
}

/**
 * Provider configuration interface for different logging implementations
 */
export interface LoggerProviderConfig {
  /** Provider name */
  name: string;
  
  /** Default log level */
  defaultLevel?: LogLevel;
  
  /** Whether to enable structured logging by default */
  structured?: boolean;
  
  /** Whether to include timestamps by default */
  includeTimestamp?: boolean;
  
  /** Default formatting options */
  format?: LoggerFormatOptions;
  
  /** Security configuration */
  security?: SecurityConfig;
  
  /** Performance configuration */
  performance?: PerformanceConfig;
  
  /** Provider-specific options */
  providerOptions?: Record<string, any>;
}

/**
 * Security configuration for logging
 */
export interface SecurityConfig {
  /** Whether to enable sensitive data masking */
  enableDataMasking?: boolean;
  
  /** Patterns for detecting sensitive data */
  sensitiveDataPatterns?: RegExp[];
  
  /** Fields to redact */
  redactFields?: string[];
  
  /** Whether to enable audit logging */
  enableAuditLogging?: boolean;
  
  /** Maximum log entry size */
  maxLogEntrySize?: number;
}

/**
 * Performance configuration for logging
 */
export interface PerformanceConfig {
  /** Whether to enable performance tracking */
  enableTracking?: boolean;
  
  /** Batch size for log entries */
  batchSize?: number;
  
  /** Batch interval in milliseconds */
  batchInterval?: number;
  
  /** Maximum number of log entries to keep in memory */
  maxLogEntries?: number;
  
  /** Whether to enable memory usage tracking */
  enableMemoryTracking?: boolean;
  
  /** Whether to enable CPU usage tracking */
  enableCpuTracking?: boolean;
}

/**
 * Log filter interface for filtering log entries
 */
export interface LogFilter {
  /** Filter by log level */
  level?: LogLevel | LogLevel[];
  
  /** Filter by category */
  category?: LogCategory | LogCategory[];
  
  /** Filter by component */
  component?: string | string[];
  
  /** Filter by text content */
  text?: string | RegExp;
  
  /** Filter by time range */
  timeRange?: {
    start?: Date;
    end?: Date;
  };
  
  /** Custom filter function */
  custom?: (entry: LogEntry) => boolean;
}

/**
 * Log aggregation interface for combining multiple log sources
 */
export interface LogAggregator {
  /** Add a log source */
  addSource(source: ILogger, name: string): void;
  
  /** Remove a log source */
  removeSource(name: string): void;
  
  /** Get aggregated logs */
  getLogs(filter?: LogFilter): LogEntry[];
  
  /** Clear all logs */
  clear(): void;
  
  /** Export logs */
  export(format: 'json' | 'csv' | 'text'): string;
}

/**
 * Log transport interface for sending logs to external systems
 */
export interface LogTransport {
  /** Transport name */
  name: string;
  
  /** Send log entry */
  send(entry: LogEntry): Promise<void>;
  
  /** Send multiple log entries */
  sendBatch(entries: LogEntry[]): Promise<void>;
  
  /** Check if transport is available */
  isAvailable(): boolean;
  
  /** Configure transport */
  configure(config: Record<string, any>): void;
  
  /** Dispose transport resources */
  dispose(): void;
} 