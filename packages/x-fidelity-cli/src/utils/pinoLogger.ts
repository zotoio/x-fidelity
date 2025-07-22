import pino from 'pino';
import { ILogger, SimpleLoggerConfig, LogLevel, LogLevelValues, EXECUTION_MODES } from '@x-fidelity/types';
import { DefaultLogger, options, shouldUseDirectLogging } from '@x-fidelity/core';

/**
 * Enhanced PinoLogger with robust error handling and proper CLI mode detection
 * Provides beautiful colored output for direct CLI usage while respecting VSCode mode
 */
export class PinoLogger implements ILogger {
  private logger: pino.Logger;

  constructor(config: SimpleLoggerConfig = {}) {
    const isDirectCliExecution = this.isDirectCliExecution();
    const shouldUsePrettyFormatting = this.shouldUsePrettyFormatting(config, isDirectCliExecution);
    
    // Create logger with appropriate formatting based on execution context
    this.logger = this.createLogger(config, shouldUsePrettyFormatting, isDirectCliExecution);
  }

  /**
   * Determine if this is a direct CLI execution (user running CLI manually)
   * vs VSCode spawned execution
   */
  private isDirectCliExecution(): boolean {
    // Check explicit mode setting first (most reliable)
    if (options && options.mode) {
      // If mode is explicitly set to CLI, this is direct CLI execution
      // If mode is explicitly set to VSCode, this is VSCode spawned
      return options.mode === EXECUTION_MODES.CLI;
    }

    // Fallback detection based on environment
    // VSCode spawner sets XFI_VSCODE_MODE=true when spawning CLI
    const isVSCodeSpawned = process.env.XFI_VSCODE_MODE === 'true';
    
    // Check for VSCode correlation ID (another indicator of VSCode spawning)
    const hasCorrelationId = process.env.XFI_CORRELATION_ID;
    
    // If VSCode spawned this CLI or has correlation ID, it's not direct execution
    return !isVSCodeSpawned && !hasCorrelationId;
  }

  /**
   * Determine if we should use pretty formatting based on context
   */
  private shouldUsePrettyFormatting(config: SimpleLoggerConfig, isDirectCliExecution: boolean): boolean {
    // If explicitly disabled in config, respect that
    if (config.enableColors === false) {
      return false;
    }

    // For direct CLI execution, always try to use pretty formatting
    if (isDirectCliExecution) {
      // Override VSCode environment variables that might disable formatting
      // These are meant for VSCode output panels, not direct CLI usage
      return true;
    }

    // For VSCode spawned execution, use simpler formatting
    // VSCode output panels work better with plain text
    return false;
  }

  /**
   * Create the appropriate pino logger instance
   */
  private createLogger(config: SimpleLoggerConfig, shouldUsePrettyFormatting: boolean, isDirectCliExecution: boolean): pino.Logger {
    const baseOptions = {
      level: config.level || 'info',
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: {
        level: (label: string) => ({ level: label }),
        log: (object: any) => {
          // Extract and format tree-sitter mode information
          if (object.mode || object.treeSitterMode) {
            object.treeSitterMode = object.mode || object.treeSitterMode;
          }
          
          // Add CLI context markers
          if (object.fileName && !object.context) {
            object.context = 'file-processing';
          }
          
          return object;
        }
      },
      serializers: {
        error: (error: any) => {
          if (error instanceof Error) {
            return {
              type: error.constructor.name,
              message: error.message,
              stack: error.stack,
              code: (error as any).code,
              errno: (error as any).errno,
              syscall: (error as any).syscall,
              path: (error as any).path
            };
          }
          return error;
        }
      }
    };

    if (shouldUsePrettyFormatting) {
      return this.createPrettyLogger(baseOptions, isDirectCliExecution);
    } else {
      // Create plain logger for VSCode mode
      return pino(baseOptions);
    }
  }

  /**
   * Create logger with pretty formatting, with fallback handling
   */
  private createPrettyLogger(baseOptions: any, isDirectCliExecution: boolean): pino.Logger {
    try {
      // Try to load pino-pretty at runtime
      const pretty = require('pino-pretty');
      
      const prettyOptions = {
        // Force colors on for direct CLI execution, ignoring environment variables
        colorize: true,
        translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l o',  // Added 'o' for timezone offset
        ignore: 'pid,hostname',
        singleLine: false,
        // Hide metadata object at INFO level and above (INFO=30, WARN=40, ERROR=50, FATAL=60)
        // Show metadata only at DEBUG (20) and TRACE (10) levels for debugging
        hideObject: (log: any) => {
          const level = log.level;
          // Show metadata only for DEBUG (20) and TRACE (10) levels
          return level >= 30; // Hide for INFO (30) and above
        },
        colorizeObjects: true,
        levelFirst: false, // Keep level after timestamp
        // Enhanced message formatting with correlation ID support
        messageFormat: (log: any, messageKey: string) => {
          const message = log[messageKey];
          
          // Add correlation ID if present (matching screenshot format)
          const correlationId = log.correlationId;
          const correlationPrefix = correlationId ? `[${correlationId}] ` : '';
          
          // Add tree-sitter mode indicator if present
          if (log.treeSitterMode) {
            return `${correlationPrefix}[${log.treeSitterMode}] ${message}`;
          }
          
          // Add performance indicators for timing
          if (log.performanceCategory) {
            const perfIcon = log.performanceCategory === 'slow' ? '[SLOW]' : 
                            log.performanceCategory === 'normal' ? '[FAST]' : '[PERF]';
            return `${correlationPrefix}${perfIcon} ${message}`;
          }
          
          return `${correlationPrefix}${message}`;
        }
        // Removed customPrettifiers - let pino-pretty handle level colors with default configuration
      };

      return pino(baseOptions, pretty(prettyOptions));
    } catch (error) {
      // If pino-pretty fails to load, fall back to custom pretty formatter
      console.warn('Warning: pino-pretty not available, using fallback formatter');
      return this.createFallbackPrettyLogger(baseOptions, isDirectCliExecution);
    }
  }

  /**
   * Create a fallback pretty logger if pino-pretty is not available
   */
  private createFallbackPrettyLogger(baseOptions: any, isDirectCliExecution: boolean): pino.Logger {
    const stream = {
      write: (chunk: string) => {
        try {
          const logObj = JSON.parse(chunk);
          
          // Format timestamp with timezone offset like the main formatter
          const date = new Date(logObj.time);
          const timestamp = date.toISOString().replace('T', ' ').replace('Z', '') + 
                           ' ' + date.toTimeString().slice(9, 14); // Add timezone offset
          
          // Color mapping matching the main formatter
          const colorMap: Record<string, string> = {
            '60': '\x1b[95mFATAL\x1b[0m', // Bright Magenta
            '50': '\x1b[91mERROR\x1b[0m', // Bright Red
            '40': '\x1b[93mWARN \x1b[0m', // Bright Yellow
            '30': '\x1b[96mINFO \x1b[0m', // Bright Cyan
            '20': '\x1b[92mDEBUG\x1b[0m', // Bright Green
            '10': '\x1b[37mTRACE\x1b[0m'  // White
          };
          
          const levelStr = colorMap[String(logObj.level)] || `\x1b[37mLEVEL_${logObj.level}\x1b[0m`;
          const colorizedTimestamp = isDirectCliExecution ? `\x1b[90m${timestamp}\x1b[0m` : timestamp;
          
          const message = logObj.msg || '';
          
          // Add correlation ID if present (matching screenshot format)
          const correlationId = logObj.correlationId;
          const correlationPrefix = correlationId ? `[${correlationId}] ` : '';
          
          const formatted = `${colorizedTimestamp} ${levelStr} ${correlationPrefix}${message}`;
          
          // Only show metadata for DEBUG (20) and TRACE (10) levels
          const level = logObj.level;
          const shouldShowMetadata = level < 30; // Show only for DEBUG and TRACE
          
          // Add metadata if present and level allows it
          if (shouldShowMetadata && (logObj.correlationId || logObj.treeSitterMode || Object.keys(logObj).length > 4)) {
            const metadata = { ...logObj };
            delete metadata.time;
            delete metadata.level;
            delete metadata.msg;
            delete metadata.pid;
            delete metadata.hostname;
            
            if (Object.keys(metadata).length > 0) {
              console.log(formatted);
              console.log(`    ${JSON.stringify(metadata, null, 2).replace(/\n/g, '\n    ')}`);
              return;
            }
          }
          
          console.log(formatted);
        } catch (e) {
          // If JSON parsing fails, just output the raw chunk
          process.stdout.write(chunk);
        }
      }
    };

    return pino(baseOptions, stream);
  }

  trace(msgOrMeta: string | any, metaOrMsg?: any): void {
    if (typeof msgOrMeta === 'string') {
      this.logger.trace(metaOrMsg, msgOrMeta);
    } else {
      this.logger.trace(msgOrMeta, metaOrMsg);
    }
  }

  debug(msgOrMeta: string | any, metaOrMsg?: any): void {
    if (typeof msgOrMeta === 'string') {
      this.logger.debug(metaOrMsg, msgOrMeta);
    } else {
      this.logger.debug(msgOrMeta, metaOrMsg);
    }
  }

  info(msgOrMeta: string | any, metaOrMsg?: any): void {
    if (typeof msgOrMeta === 'string') {
      this.logger.info(metaOrMsg, msgOrMeta);
    } else {
      this.logger.info(msgOrMeta, metaOrMsg);
    }
  }

  warn(msgOrMeta: string | any, metaOrMsg?: any): void {
    if (typeof msgOrMeta === 'string') {
      this.logger.warn(metaOrMsg, msgOrMeta);
    } else {
      this.logger.warn(msgOrMeta, metaOrMsg);
    }
  }

  error(msgOrMeta: string | any, metaOrMsg?: any): void {
    if (typeof msgOrMeta === 'string') {
      this.logger.error(metaOrMsg, msgOrMeta);
    } else {
      this.logger.error(msgOrMeta, metaOrMsg);
    }
  }

  fatal(msgOrMeta: string | any, metaOrMsg?: any): void {
    if (typeof msgOrMeta === 'string') {
      this.logger.fatal(metaOrMsg, msgOrMeta);
    } else {
      this.logger.fatal(msgOrMeta, metaOrMsg);
    }
  }

  setLevel(level: LogLevel): void {
    this.logger.level = level;
  }

  getLevel(): LogLevel {
    return this.logger.level as LogLevel;
  }

  isLevelEnabled(level: LogLevel): boolean {
    const currentLevelValue = LogLevelValues[this.getLevel()];
    const checkLevelValue = LogLevelValues[level];
    return checkLevelValue >= currentLevelValue;
  }

  async flush(): Promise<void> {
    return new Promise(async (resolve) => {
      if (this.logger.flush) {
        return this.logger.flush(() => resolve());
      } else {
        resolve();
      }
    });
  }

  updateOptions(options?: { enableFileLogging?: boolean; filePath?: string }): void {
    // PinoLogger could potentially support dynamic reconfiguration
    // For now, this is a no-op as pino logger configuration is set at creation time
  }
}

// Register PinoLogger as the preferred logger for CLI mode
// This will be called when CLI package is loaded
try {
  const { LoggerProvider } = require('@x-fidelity/core');
  LoggerProvider.registerLoggerFactory(EXECUTION_MODES.CLI, (level: LogLevel, options?: { enableFileLogging?: boolean; filePath?: string }) => {
    return new PinoLogger({
      level,
      enableConsole: true,
      enableColors: true, // This will be overridden based on execution context
      enableFile: options?.enableFileLogging || false,
      filePath: options?.filePath
    });
  });
} catch (error) {
  // Ignore registration errors - LoggerProvider may not be available in all contexts
} 