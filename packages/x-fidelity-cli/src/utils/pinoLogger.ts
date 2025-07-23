import pino from 'pino';
import { ILogger, SimpleLoggerConfig, LogLevel, LogLevelValues, EXECUTION_MODES } from '@x-fidelity/types';
import { options } from '@x-fidelity/core';

/**
 * Raw pino log chunk format as received from pino logger
 * This represents the raw JSON format that pino outputs
 */
interface PinoLogChunk {
  /** Pino timestamp (ISO string or number) */
  time: string | number;
  
  /** Pino log level as number (10=trace, 20=debug, 30=info, 40=warn, 50=error, 60=fatal) */
  level: number;
  
  /** Pino message field */
  msg?: string;
  
  /** Process ID from pino */
  pid?: number;
  
  /** Hostname from pino */
  hostname?: string;
  
  /** Correlation ID for request tracing */
  correlationId?: string;
  
  /** Tree-sitter mode information */
  treeSitterMode?: string;
  
  /** Any additional pino properties */
  [key: string]: any;
}

/**
 * Enhanced PinoLogger with robust error handling and proper CLI mode detection
 * Provides beautiful colored output for direct CLI usage while respecting VSCode mode
 */
export class PinoLogger implements ILogger {
  private logger: pino.Logger;

  constructor(config: SimpleLoggerConfig = {}) {
    const isDirectCliExecution = this.isDirectCliExecution();
    const shouldEnableColors = this.shouldEnableColors(config, isDirectCliExecution);
    
    // Always use pretty formatting, but conditionally enable colors
    this.logger = this.createLogger(config, shouldEnableColors, isDirectCliExecution);
  
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
   * Determine if colors should be enabled based on context
   */
  private shouldEnableColors(config: SimpleLoggerConfig, isDirectCliExecution: boolean): boolean {
    // If explicitly disabled in config or CI environment, disable colors
    if (config.enableColors === false || process.env.CI === 'true') {
      return false;
    }

    // For direct CLI execution, enable colors by default
    if (isDirectCliExecution) {
      return true;
    }

    // For VSCode spawned execution, disable colors by default
    // VSCode output panels work better with plain text
    return false;
  }

  /**
   * Create the appropriate pino logger instance
   */
  private createLogger(config: SimpleLoggerConfig, shouldEnableColors: boolean, isDirectCliExecution: boolean): pino.Logger {
    const baseOptions: pino.LoggerOptions = {
      level: config.level || 'info',
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: {
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

    // Always use pretty logger, pass color enablement flag
    return this.createPrettyLogger(baseOptions, config, shouldEnableColors, isDirectCliExecution);
  }

  /**
   * Create a pretty logger
   */
  private createPrettyLogger(loggerOptions: pino.LoggerOptions, config: SimpleLoggerConfig, shouldEnableColors: boolean, isDirectCliExecution: boolean): pino.Logger {
    const stream: pino.DestinationStream = {
      write: (chunk) => {
        try {
          const logObj: PinoLogChunk = JSON.parse(chunk);
          
          // Format timestamp in local timezone with proper offset
          const date = new Date(logObj.time);
          
          // Get local time components
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          const seconds = String(date.getSeconds()).padStart(2, '0');
          const ms = String(date.getMilliseconds()).padStart(3, '0');
          
          // Get timezone offset in proper format (e.g., +1000, -0500)
          const timezoneOffset = -date.getTimezoneOffset(); // getTimezoneOffset returns negative for positive offsets
          const offsetHours = Math.floor(Math.abs(timezoneOffset) / 60);
          const offsetMinutes = Math.abs(timezoneOffset) % 60;
          const offsetSign = timezoneOffset >= 0 ? '+' : '-';
          const formattedOffset = `${offsetSign}${String(offsetHours).padStart(2, '0')}${String(offsetMinutes).padStart(2, '0')}`;
          
          const timestamp = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${ms} ${formattedOffset}`;
          
          // Map pino level numbers to level names
          const levelMap: Record<number, string> = {
            10: 'trace',
            20: 'debug', 
            30: 'info',
            40: 'warn',
            50: 'error',
            60: 'fatal'
          };
          
          const levelName = levelMap[logObj.level] || 'unknown';
          
          // Color mapping - only apply if colors are enabled
          const colorMap: Record<string, string> = shouldEnableColors ? {
            'fatal': '\x1b[95mFATAL\x1b[0m', // Bright Magenta
            'error': '\x1b[91mERROR\x1b[0m', // Bright Red
            'warn': '\x1b[93mWARN\x1b[0m', // Bright Yellow
            'info': '\x1b[92mINFO\x1b[0m', // Bright Green
            'debug': '\x1b[92mDEBUG\x1b[0m', // Bright Green
            'trace': '\x1b[37mTRACE\x1b[0m'  // White
          } : {
            'fatal': 'FATAL',
            'error': 'ERROR', 
            'warn': 'WARN',
            'info': 'INFO',
            'debug': 'DEBUG',
            'trace': 'TRACE'
          };
          
          const levelStr = colorMap[levelName] || (shouldEnableColors ? `\x1b[37m${levelName.toUpperCase()}\x1b[0m` : levelName.toUpperCase());
          const colorizedTimestamp = (shouldEnableColors && isDirectCliExecution) ? `\x1b[90m${timestamp}\x1b[0m` : timestamp;
          
          const message = logObj.msg || '';
          
          // Add correlation ID if present - conditionally colored
          const correlationId = logObj.correlationId;
          const correlationPrefix = correlationId ? 
            (shouldEnableColors ? `[\x1b[33m${correlationId}\x1b[0m] ` : `[${correlationId}] `) : '';
          
          // Format message - conditionally colored
          const formattedMessage = shouldEnableColors ? `\x1b[36m${message}\x1b[0m` : message;
          const formatted = `${colorizedTimestamp} ${levelStr} ${correlationPrefix}${formattedMessage}`;
          
          // Only show metadata for DEBUG (20) and TRACE (10) levels
          const level = logObj.level;
          const shouldShowMetadata = level < 30; // Show only for DEBUG and TRACE
          
          // Add metadata if present and level allows it
          if (shouldShowMetadata && (logObj.correlationId || logObj.treeSitterMode || Object.keys(logObj).length > 4)) {
            const metadata: any = { ...logObj };
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

    return pino(loggerOptions, stream);
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