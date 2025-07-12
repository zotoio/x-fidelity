import { ILogger, LogLevel } from '@x-fidelity/types';
import { ExecutionContext } from './executionContext';
import { createDefaultLogger } from './defaultLogger';

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

  // Child logger method removed - use direct context passing instead

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
 * Enhanced Logger provider that allows injecting a logger instance with automatic fallback
 * and ensures universal logging availability for plugins
 */
class LoggerProvider {
  private static injectedLogger: ILogger | null = null;
  private static defaultLogger: ILogger | null = null;
  private static enableAutoPrefixing: boolean = true;
  private static isInitialized: boolean = false;

  /**
   * Ensure the logger provider is initialized with a default logger
   * This guarantees that getLogger() will always return a valid logger instance
   */
  static ensureInitialized(): void {
    if (!this.isInitialized) {
      this.defaultLogger = createDefaultLogger('[X-Fidelity-Core]');
      this.isInitialized = true;
    }
  }

  /**
   * Set the logger instance to be used throughout the system
   * @param logger The logger instance to inject
   */
  static setLogger(logger: ILogger): void {
    this.ensureInitialized();
    this.injectedLogger = logger;
  }

  /**
   * Get the current logger instance (injected or default) with automatic prefixing
   * @returns The current logger instance, wrapped with prefixing if enabled
   * @throws Never throws - always returns a valid logger (fallback if needed)
   */
  static getLogger(): ILogger {
    this.ensureInitialized();
    
    // Use injected logger if available, otherwise use default
    const baseLogger = this.injectedLogger || this.defaultLogger!;
    
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
    this.ensureInitialized();
    return this.injectedLogger || this.defaultLogger!;
  }

  /**
   * Enable or disable automatic prefixing
   * @param enabled Whether to enable automatic prefixing
   */
  static setAutoPrefixing(enabled: boolean): void {
    this.enableAutoPrefixing = enabled;
  }

  /**
   * Check if a logger has been injected (not using default)
   * @returns True if a logger has been injected
   */
  static hasInjectedLogger(): boolean {
    return this.injectedLogger !== null;
  }

  /**
   * Check if any logger is available (injected or default)
   * @returns True if any logger is available (should always be true after ensureInitialized)
   */
  static hasLogger(): boolean {
    this.ensureInitialized();
    return this.injectedLogger !== null || this.defaultLogger !== null;
  }

  /**
   * Clear the injected logger (useful for testing)
   * Will fall back to default logger
   */
  static clearInjectedLogger(): void {
    this.injectedLogger = null;
  }

  /**
   * Reset the provider to uninitialized state (useful for testing)
   */
  static reset(): void {
    this.injectedLogger = null;
    this.defaultLogger = null;
    this.isInitialized = false;
  }

  // Child logger creation methods removed - use direct context passing instead

  /**
   * Initialize the logger provider with a default logger for universal availability
   * This method ensures plugins always have access to logging, even if no logger is injected
   * This method is idempotent and safe to call multiple times
   */
  static initializeForPlugins(): void {
    if (this.isInitialized) {
      // Already initialized - skip to prevent duplicate initialization
      return;
    }
    
    this.ensureInitialized();
    // Log that the system is ready for plugin logging
    this.getLogger().debug('Logger provider initialized for universal plugin logging');
  }
}

export { LoggerProvider, PrefixingLogger }; 