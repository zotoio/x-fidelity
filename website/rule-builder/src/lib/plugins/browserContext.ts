/**
 * Browser Context for X-Fidelity Rule Builder
 * 
 * Provides a mock ExecutionContext that logs to the browser console
 * instead of using Node.js logging infrastructure.
 */

/**
 * Log level type
 */
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error';

/**
 * Browser logger interface compatible with X-Fidelity ILogger
 */
export interface BrowserLogger {
  trace(message: string, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  
  /** Create a child logger with additional context */
  child(bindings: Record<string, unknown>): BrowserLogger;
}

/**
 * Log entry for capturing logs in tests
 */
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  meta?: Record<string, unknown>;
}

/**
 * Configuration for browser logger
 */
export interface BrowserLoggerConfig {
  /** Minimum log level to output */
  minLevel?: LogLevel;
  /** Whether to output to console */
  outputToConsole?: boolean;
  /** Log capture callback for testing */
  onLog?: (entry: LogEntry) => void;
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
};

/**
 * Create a browser-compatible logger
 */
export function createBrowserLogger(
  config: BrowserLoggerConfig = {},
  bindings: Record<string, unknown> = {}
): BrowserLogger {
  const { 
    minLevel = 'info', 
    outputToConsole = true,
    onLog 
  } = config;
  
  const shouldLog = (level: LogLevel): boolean => {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[minLevel];
  };
  
  const formatMessage = (
    level: LogLevel, 
    message: string, 
    meta?: Record<string, unknown>
  ): string => {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    if (Object.keys(bindings).length > 0) {
      const bindingsStr = JSON.stringify(bindings);
      if (meta && Object.keys(meta).length > 0) {
        return `${prefix} ${bindingsStr} ${message} ${JSON.stringify(meta)}`;
      }
      return `${prefix} ${bindingsStr} ${message}`;
    }
    
    if (meta && Object.keys(meta).length > 0) {
      return `${prefix} ${message} ${JSON.stringify(meta)}`;
    }
    return `${prefix} ${message}`;
  };
  
  const log = (level: LogLevel, message: string, meta?: Record<string, unknown>): void => {
    if (!shouldLog(level)) return;
    
    const formattedMessage = formatMessage(level, message, meta);
    
    // Call the log capture callback if provided
    if (onLog) {
      onLog({
        level,
        message,
        timestamp: new Date(),
        meta: { ...bindings, ...meta },
      });
    }
    
    // Output to console if enabled
    if (outputToConsole) {
      switch (level) {
        case 'trace':
        case 'debug':
          console.debug(formattedMessage);
          break;
        case 'info':
          console.info(formattedMessage);
          break;
        case 'warn':
          console.warn(formattedMessage);
          break;
        case 'error':
          console.error(formattedMessage);
          break;
      }
    }
  };
  
  const logger: BrowserLogger = {
    trace: (message: string, meta?: Record<string, unknown>) => log('trace', message, meta),
    debug: (message: string, meta?: Record<string, unknown>) => log('debug', message, meta),
    info: (message: string, meta?: Record<string, unknown>) => log('info', message, meta),
    warn: (message: string, meta?: Record<string, unknown>) => log('warn', message, meta),
    error: (message: string, meta?: Record<string, unknown>) => log('error', message, meta),
    
    child(newBindings: Record<string, unknown>): BrowserLogger {
      return createBrowserLogger(config, { ...bindings, ...newBindings });
    },
  };
  
  return logger;
}

/**
 * Default browser logger instance
 */
export const browserLogger = createBrowserLogger({
  minLevel: 'debug',
  outputToConsole: true,
});

/**
 * Create a silent logger for tests (captures logs without console output)
 */
export function createSilentLogger(
  logCapture: LogEntry[] = []
): { logger: BrowserLogger; logs: LogEntry[] } {
  const logs = logCapture;
  
  const logger = createBrowserLogger({
    minLevel: 'trace',
    outputToConsole: false,
    onLog: (entry) => logs.push(entry),
  });
  
  return { logger, logs };
}
