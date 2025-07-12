import { ILogger } from '@x-fidelity/types';
import { LoggerProvider } from './loggerProvider';

/**
 * Plugin Logger Utility
 * Provides universal logging capabilities for both internal and external plugins
 * Uses direct context passing instead of child loggers
 */

/**
 * Create a plugin-specific logger with appropriate context
 * @param pluginName The name of the plugin
 * @param additionalContext Additional context to include in logs
 * @returns A logger wrapper that includes plugin context in all log messages
 */
export function createPluginLogger(pluginName: string, additionalContext?: Record<string, any>): ILogger {
  // Ensure LoggerProvider is initialized
  LoggerProvider.ensureInitialized();
  
  const baseLogger = LoggerProvider.getLogger();
  const context = { plugin: pluginName, ...additionalContext };
  
  // Create a wrapper that includes context in all log messages
  return {
    trace: (msgOrMeta: string | any, metaOrMsg?: any) => {
      const message = typeof msgOrMeta === 'string' ? `[${pluginName}] ${msgOrMeta}` : msgOrMeta;
      const meta = typeof msgOrMeta === 'string' ? { ...context, ...metaOrMsg } : { ...context, ...msgOrMeta };
      baseLogger.trace(message, meta);
    },
    debug: (msgOrMeta: string | any, metaOrMsg?: any) => {
      const message = typeof msgOrMeta === 'string' ? `[${pluginName}] ${msgOrMeta}` : msgOrMeta;
      const meta = typeof msgOrMeta === 'string' ? { ...context, ...metaOrMsg } : { ...context, ...msgOrMeta };
      baseLogger.debug(message, meta);
    },
    info: (msgOrMeta: string | any, metaOrMsg?: any) => {
      const message = typeof msgOrMeta === 'string' ? `[${pluginName}] ${msgOrMeta}` : msgOrMeta;
      const meta = typeof msgOrMeta === 'string' ? { ...context, ...metaOrMsg } : { ...context, ...msgOrMeta };
      baseLogger.info(message, meta);
    },
    warn: (msgOrMeta: string | any, metaOrMsg?: any) => {
      const message = typeof msgOrMeta === 'string' ? `[${pluginName}] ${msgOrMeta}` : msgOrMeta;
      const meta = typeof msgOrMeta === 'string' ? { ...context, ...metaOrMsg } : { ...context, ...msgOrMeta };
      baseLogger.warn(message, meta);
    },
    error: (msgOrMeta: string | any, metaOrMsg?: any) => {
      const message = typeof msgOrMeta === 'string' ? `[${pluginName}] ${msgOrMeta}` : msgOrMeta;
      const meta = typeof msgOrMeta === 'string' ? { ...context, ...metaOrMsg } : { ...context, ...msgOrMeta };
      baseLogger.error(message, meta);
    },
    fatal: (msgOrMeta: string | any, metaOrMsg?: any) => {
      const message = typeof msgOrMeta === 'string' ? `[${pluginName}] ${msgOrMeta}` : msgOrMeta;
      const meta = typeof msgOrMeta === 'string' ? { ...context, ...metaOrMsg } : { ...context, ...msgOrMeta };
      baseLogger.fatal(message, meta);
    },
    setLevel: (level: any) => baseLogger.setLevel(level),
    getLevel: () => baseLogger.getLevel(),
    isLevelEnabled: (level: any) => baseLogger.isLevelEnabled(level)
  };
}

/**
 * Get the current system logger (with fallback guarantees)
 * This is the safest way for plugins to get a logger instance
 * @returns The current logger instance (never null)
 */
export function getPluginLogger(): ILogger {
  LoggerProvider.ensureInitialized();
  return LoggerProvider.getLogger();
}

/**
 * Plugin logger utilities object
 * Provides a convenient interface for plugin authors
 */
export const pluginLogger = {
  /**
   * Get a logger instance (guaranteed to be available)
   * @returns The current logger instance
   */
  getLogger: getPluginLogger,
  
  /**
   * Create a plugin-specific logger with context
   * @param pluginName The name of the plugin
   * @param additionalContext Additional context to include in logs
   * @returns A logger instance specifically configured for the plugin
   */
  createLogger: createPluginLogger,
  
  /**
   * Create a logger for a specific plugin operation
   * @param pluginName The name of the plugin
   * @param operation The operation being performed
   * @param additionalContext Additional context to include in logs
   * @returns A logger instance specifically configured for the plugin operation
   */
  createOperationLogger: (pluginName: string, operation: string, additionalContext?: Record<string, any>): ILogger => {
    return createPluginLogger(pluginName, { operation, ...additionalContext });
  },
  
  /**
   * Create a logger for a specific plugin fact
   * @param pluginName The name of the plugin
   * @param factName The name of the fact
   * @param additionalContext Additional context to include in logs
   * @returns A logger instance specifically configured for the plugin fact
   */
  createFactLogger: (pluginName: string, factName: string, additionalContext?: Record<string, any>): ILogger => {
    return createPluginLogger(pluginName, { fact: factName, ...additionalContext });
  },
  
  /**
   * Create a logger for a specific plugin operator
   * @param pluginName The name of the plugin
   * @param operatorName The name of the operator
   * @param additionalContext Additional context to include in logs
   * @returns A logger instance specifically configured for the plugin operator
   */
  createOperatorLogger: (pluginName: string, operatorName: string, additionalContext?: Record<string, any>): ILogger => {
    return createPluginLogger(pluginName, { operator: operatorName, ...additionalContext });
  },
  
  /**
   * Check if the logger provider has been initialized
   * @returns True if the logger provider is ready for use
   */
  isInitialized: (): boolean => {
    return LoggerProvider.hasLogger();
  },
  
  /**
   * Initialize the logger provider for plugin use
   * This ensures all plugins have access to logging
   */
  initializeForPlugins: (): void => {
    LoggerProvider.initializeForPlugins();
  }
};

/**
 * Legacy compatibility function
 * @deprecated Use pluginLogger.getLogger() instead
 */
export function getLogger(): ILogger {
  return getPluginLogger();
}

/**
 * Plugin context logger interface
 * Provides a consistent interface for plugin initialization
 */
export interface PluginLoggerContext {
  /**
   * Main logger instance for the plugin
   */
  logger: ILogger;
  
  /**
   * Create a logger for specific operations
   * @param operation The operation name
   * @param additionalContext Additional context
   * @returns A logger instance with operation context
   */
  createOperationLogger: (operation: string, additionalContext?: Record<string, any>) => ILogger;
  
  /**
   * Create a logger for specific facts
   * @param factName The fact name
   * @param additionalContext Additional context
   * @returns A logger instance with fact context
   */
  createFactLogger: (factName: string, additionalContext?: Record<string, any>) => ILogger;
  
  /**
   * Create a logger for specific operators
   * @param operatorName The operator name
   * @param additionalContext Additional context
   * @returns A logger instance with operator context
   */
  createOperatorLogger: (operatorName: string, additionalContext?: Record<string, any>) => ILogger;
}

/**
 * Create a plugin logger context for plugin initialization
 * @param pluginName The name of the plugin
 * @returns A plugin logger context object
 */
export function createPluginLoggerContext(pluginName: string): PluginLoggerContext {
  const baseLogger = createPluginLogger(pluginName);
  
  return {
    logger: baseLogger,
    createOperationLogger: (operation: string, additionalContext?: Record<string, any>) => {
      return pluginLogger.createOperationLogger(pluginName, operation, additionalContext);
    },
    createFactLogger: (factName: string, additionalContext?: Record<string, any>) => {
      return pluginLogger.createFactLogger(pluginName, factName, additionalContext);
    },
    createOperatorLogger: (operatorName: string, additionalContext?: Record<string, any>) => {
      return pluginLogger.createOperatorLogger(pluginName, operatorName, additionalContext);
    }
  };
} 