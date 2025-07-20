import { ILogger, LogLevel, ExecutionMode, EXECUTION_MODES } from '@x-fidelity/types';
import { ExecutionContext } from './executionContext';
import { createDefaultLogger, createVSCodeLogger } from './defaultLogger';

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
   * Get the current execution mode from options or detect from environment
   * @returns The current execution mode
   */
  static getCurrentExecutionMode(): ExecutionMode {
    try {
      // Try to get mode from options
      const { options } = require('../core/options');
      if (options && options.mode) {
        return options.mode as ExecutionMode;
      }
    } catch (error) {
      // Ignore import errors
    }

    // Fallback detection based on environment
    if (typeof window !== 'undefined') {
      return EXECUTION_MODES.VSCODE;
    }
    
    if (process.env.NODE_ENV === 'test') {
      return EXECUTION_MODES.CLI;
    }

    // Check for server indicators
    if (process.env.PORT || process.env.EXPRESS_ENV) {
      return EXECUTION_MODES.SERVER;
    }

    // Default to CLI mode
    return EXECUTION_MODES.CLI;
  }

  /**
   * Get the current logger instance (injected or default) with automatic prefixing
   * Now uses mode-aware logger creation for consistency
   * @returns The current logger instance, wrapped with prefixing if enabled
   * @throws Never throws - always returns a valid logger (fallback if needed)
   */
  static getLogger(): ILogger {
    // If we have an injected logger, use it
    if (this.injectedLogger) {
      if (this.enableAutoPrefixing) {
        return new PrefixingLogger(this.injectedLogger);
      }
      return this.injectedLogger;
    }

    // Otherwise, get logger for current mode
    const currentMode = this.getCurrentExecutionMode();
    const currentLevel = (process.env.XFI_LOG_LEVEL as LogLevel) || 'info';
    
    return this.getLoggerForMode(currentMode, currentLevel);
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
   * Logger factory functions for each mode
   * Can be overridden by packages to provide their specific logger implementations
   */
  private static loggerFactories: Map<ExecutionMode, (level: LogLevel, options?: { enableFileLogging?: boolean; filePath?: string }) => ILogger> = new Map();

  /**
   * Singleton cache for loggers by mode and level combination
   */
  private static loggerCache: Map<string, ILogger> = new Map();

  /**
   * Whether the default factories have been registered
   */
  private static factoriesRegistered: boolean = false;

  /**
   * Register default logger factories for all modes
   * This is called automatically when needed
   */
  private static registerDefaultFactories(): void {
    if (this.factoriesRegistered) {
      return;
    }

    // CLI mode: Use DefaultLogger as default (PinoLogger will be registered by CLI package if needed)
    this.loggerFactories.set(EXECUTION_MODES.CLI, (level: LogLevel, options?: { enableFileLogging?: boolean; filePath?: string }) => {
      const logger = createDefaultLogger('[CLI]');
      logger.setLevel(level);
      return logger;
    });

    // VSCode mode: Use DefaultLogger optimized for extension output
    this.loggerFactories.set(EXECUTION_MODES.VSCODE, (level: LogLevel, options?: { enableFileLogging?: boolean; filePath?: string }) => {
      const logger = createDefaultLogger('[VSCode]');
      logger.setLevel(level);
      return logger;
    });

    // Server mode: Use DefaultLogger as default (ServerLogger will be registered by server package if needed)
    this.loggerFactories.set(EXECUTION_MODES.SERVER, (level: LogLevel, options?: { enableFileLogging?: boolean; filePath?: string }) => {
      const logger = createDefaultLogger('[Server]');
      logger.setLevel(level);
      return logger;
    });

    // Hook mode: Same as server mode for now
    this.loggerFactories.set(EXECUTION_MODES.HOOK, (level: LogLevel, options?: { enableFileLogging?: boolean; filePath?: string }) => {
      return this.loggerFactories.get(EXECUTION_MODES.SERVER)!(level, options);
    });

    this.factoriesRegistered = true;
  }

  /**
   * Register a logger factory for a specific execution mode
   * @param mode The execution mode to register a factory for
   * @param factory Function that creates a logger for the mode
   */
  static registerLoggerFactory(mode: ExecutionMode, factory: (level: LogLevel, options?: { enableFileLogging?: boolean; filePath?: string }) => ILogger): void {
    this.loggerFactories.set(mode, factory);
  }

  /**
   * Get a singleton logger instance for the specified mode and level
   * This is the main public interface for getting loggers
   * @param mode The execution mode
   * @param level The log level
   * @param options Optional configuration for specific modes (e.g., file logging for CLI)
   * @returns A singleton logger instance for the mode/level combination
   */
  static getLoggerForMode(mode: ExecutionMode, level?: LogLevel, options?: { enableFileLogging?: boolean; filePath?: string }): ILogger {
    const logLevel = level || (process.env.XFI_LOG_LEVEL as LogLevel) || 'info';
    const cacheKey = `${mode}:${logLevel}:${JSON.stringify(options || {})}:${this.enableAutoPrefixing}`;
    
    // Return cached logger if available
    const cachedLogger = this.loggerCache.get(cacheKey);
    if (cachedLogger) {
      return cachedLogger;
    }

    // Ensure default factories are registered
    this.registerDefaultFactories();

    // Handle CLI mode with file logging options
    // Note: File logging support depends on CLI package registering a factory that supports it
    if (mode === EXECUTION_MODES.CLI && options?.enableFileLogging) {
      // For file logging, we expect the CLI package to register a specialized factory
      // If not registered, fall back to default factory
    }

    // Get factory for this mode
    const factory = this.loggerFactories.get(mode);
    let baseLogger: ILogger;
    
    if (!factory) {
      // Fallback to default logger
      baseLogger = createDefaultLogger(`[${mode}]`);
      baseLogger.setLevel(logLevel);
    } else {
      // Create logger using factory with options support
      baseLogger = factory(logLevel, options);
    }

    // Apply auto-prefixing if enabled
    const finalLogger = this.enableAutoPrefixing ? new PrefixingLogger(baseLogger) : baseLogger;
    
    this.loggerCache.set(cacheKey, finalLogger);
    return finalLogger;
  }

  /**
   * Create a logger instance optimized for the specified execution mode
   * @param mode The execution mode to create a logger for
   * @param level Optional log level override
   * @returns A logger instance optimized for the specified mode
   * @deprecated Use getLoggerForMode instead for consistent singleton behavior
   */
  static createLoggerForMode(mode: ExecutionMode, level?: LogLevel): ILogger {
    // Delegate to getLoggerForMode for consistency
    // This ensures all logger creation goes through the same path
    return this.getLoggerForMode(mode, level);
  }

  /**
   * Set the current logger to one optimized for the specified mode and level
   * @param mode The execution mode to optimize for
   * @param level Optional log level to set
   */
  static setModeAndLevel(mode: ExecutionMode, level?: LogLevel): void {
    const logger = this.createLoggerForMode(mode, level);
    this.setLogger(logger);
  }

  /**
   * Update the log level for long-running modes (VSCode, Server, Hook)
   * This allows dynamic log level changes without recreating the logger
   * @param level The new log level to set
   */
  static updateLogLevel(level: LogLevel): void {
    const currentLogger = this.getBaseLogger();
    if (currentLogger && typeof currentLogger.setLevel === 'function') {
      currentLogger.setLevel(level);
    }
  }

  /**
   * Set the current logger to one optimized for the specified mode and level
   * This is the main method CLI and other packages should use
   * @param mode The execution mode to optimize for
   * @param level Optional log level to set
   * @param options Optional configuration for specific modes
   */
  static setLoggerForMode(mode: ExecutionMode, level?: LogLevel, options?: { enableFileLogging?: boolean; filePath?: string }): void {
    const logger = this.getLoggerForMode(mode, level, options);
    this.setLogger(logger);
  }

  /**
   * Clear the logger cache (useful for testing or when switching modes)
   */
  static clearCache(): void {
    this.loggerCache.clear();
  }

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