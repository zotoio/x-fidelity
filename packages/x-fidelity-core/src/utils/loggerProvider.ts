import { ILogger, LogLevel } from '@x-fidelity/types';
import { DefaultLogger } from './defaultLogger';
import { ExecutionContext } from './executionContext';

/**
 * Logger wrapper that automatically prefixes all messages with execution ID
 */
class PrefixingLogger implements ILogger {
  private baseLogger: ILogger;
  private staticPrefix?: string;

  constructor(baseLogger: ILogger, staticPrefix?: string) {
    this.baseLogger = baseLogger;
    this.staticPrefix = staticPrefix;
  }

  /**
   * Get the current prefix (static or from execution context)
   */
  private getPrefix(): string {
    if (this.staticPrefix) {
      return this.staticPrefix;
    }
    return ExecutionContext.getExecutionPrefix();
  }

  /**
   * Add prefix to a message
   */
  private prefixMessage(msgOrMeta: string | any): string | any {
    const prefix = this.getPrefix();
    
    if (!prefix) {
      return msgOrMeta;
    }

    // If it's a string message, prefix it
    if (typeof msgOrMeta === 'string') {
      return `${prefix} ${msgOrMeta}`;
    }

    // Handle null and undefined by converting to string and prefixing
    if (msgOrMeta === null || msgOrMeta === undefined) {
      return `${prefix} ${String(msgOrMeta)}`;
    }

    // If it's an object with a message property, prefix that
    if (msgOrMeta && typeof msgOrMeta === 'object' && typeof msgOrMeta.message === 'string') {
      return {
        ...msgOrMeta,
        message: `${prefix} ${msgOrMeta.message}`
      };
    }

    // Otherwise return as-is
    return msgOrMeta;
  }

  trace(msgOrMeta: string | any, metaOrMsg?: any): void {
    this.baseLogger.trace(this.prefixMessage(msgOrMeta), metaOrMsg);
  }

  debug(msgOrMeta: string | any, metaOrMsg?: any): void {
    this.baseLogger.debug(this.prefixMessage(msgOrMeta), metaOrMsg);
  }

  info(msgOrMeta: string | any, metaOrMsg?: any): void {
    this.baseLogger.info(this.prefixMessage(msgOrMeta), metaOrMsg);
  }

  warn(msgOrMeta: string | any, metaOrMsg?: any): void {
    this.baseLogger.warn(this.prefixMessage(msgOrMeta), metaOrMsg);
  }

  error(msgOrMeta: string | any, metaOrMsg?: any): void {
    this.baseLogger.error(this.prefixMessage(msgOrMeta), metaOrMsg);
  }

  fatal(msgOrMeta: string | any, metaOrMsg?: any): void {
    this.baseLogger.fatal(this.prefixMessage(msgOrMeta), metaOrMsg);
  }

  child(bindings: any): ILogger {
    // Create child from base logger and wrap it with prefixing
    const childBaseLogger = this.baseLogger.child(bindings);
    return new PrefixingLogger(childBaseLogger, this.staticPrefix);
  }

  setLevel(level: LogLevel): void {
    this.baseLogger.setLevel(level);
  }

  getLevel(): LogLevel {
    return this.baseLogger.getLevel();
  }

  isLevelEnabled(level: LogLevel): boolean {
    return this.baseLogger.isLevelEnabled(level);
  }

  dispose?(): void {
    if (this.baseLogger.dispose) {
      this.baseLogger.dispose();
    }
  }

  /**
   * Get the underlying base logger (for cases where direct access is needed)
   */
  getBaseLogger(): ILogger {
    return this.baseLogger;
  }
}

/**
 * Logger provider that allows injecting a logger instance and automatically prefixes all messages
 */
class LoggerProvider {
  private static injectedLogger: ILogger | null = null;
  private static defaultLogger: ILogger = new DefaultLogger('[X-Fidelity-Core]');
  private static enableAutoPrefixing: boolean = true;

  /**
   * Set the logger instance to be used throughout the system
   * @param logger The logger instance to inject
   */
  static setLogger(logger: ILogger): void {
    this.injectedLogger = logger;
  }

  /**
   * Get the current logger instance (injected or default) with automatic prefixing
   * @returns The current logger instance, wrapped with prefixing if enabled
   */
  static getLogger(): ILogger {
    const baseLogger = this.injectedLogger || this.defaultLogger;
    
    // Wrap with prefixing logger if enabled
    if (this.enableAutoPrefixing) {
      return new PrefixingLogger(baseLogger);
    }
    
    return baseLogger;
  }

  /**
   * Get the raw base logger without prefixing (for special cases)
   * @returns The raw logger instance without any wrapping
   */
  static getBaseLogger(): ILogger {
    return this.injectedLogger || this.defaultLogger;
  }

  /**
   * Enable or disable automatic prefixing
   * @param enabled Whether to enable automatic prefixing
   */
  static setAutoPrefixing(enabled: boolean): void {
    this.enableAutoPrefixing = enabled;
  }

  /**
   * Check if a logger has been injected
   * @returns True if a logger has been injected
   */
  static hasInjectedLogger(): boolean {
    return this.injectedLogger !== null;
  }

  /**
   * Clear the injected logger (useful for testing)
   */
  static clearInjectedLogger(): void {
    this.injectedLogger = null;
  }

  /**
   * Create a child logger from the current logger with automatic execution context and prefixing
   * @param bindings Additional context for the child logger
   * @returns A child logger instance with automatic prefixing
   */
  static createChildLogger(bindings: any): ILogger {
    // Automatically include execution context in all child loggers
    const executionBindings = ExecutionContext.createLoggerBindings(bindings);
    return this.getLogger().child(executionBindings);
  }

  /**
   * Create a child logger with execution context for a specific operation
   * @param operation The operation name
   * @param additionalBindings Additional context
   * @returns A child logger instance with automatic prefixing
   */
  static createOperationLogger(operation: string, additionalBindings?: any): ILogger {
    const bindings = { operation, ...additionalBindings };
    return this.createChildLogger(bindings);
  }

  /**
   * Create a child logger with execution context for a specific component
   * @param component The component name
   * @param additionalBindings Additional context
   * @returns A child logger instance with automatic prefixing
   */
  static createComponentLogger(component: string, additionalBindings?: any): ILogger {
    const bindings = { component, ...additionalBindings };
    return this.createChildLogger(bindings);
  }
}

export { LoggerProvider, PrefixingLogger }; 