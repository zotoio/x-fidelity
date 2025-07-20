import pino from 'pino';
import pretty from 'pino-pretty';
import { ILogger, SimpleLoggerConfig, LogLevel, LogLevelValues, EXECUTION_MODES } from '@x-fidelity/types';
import { DefaultLogger, options, shouldUseDirectLogging } from '@x-fidelity/core';

export class PinoLogger implements ILogger {
  private logger: pino.Logger;

  constructor(config: SimpleLoggerConfig = {}) {
    // Enhanced pino-pretty configuration for better datetime and colors
    const prettyOptions = {
      colorize: config.enableColors !== false,
      translateTime: 'SYS:yyyy-mm-dd HH:MM:ss', // More explicit datetime format
      ignore: 'pid,hostname',
      singleLine: false, // Allow multi-line for better readability
      hideObject: false, // Show metadata objects
      colorizeObjects: true, // Enable color for objects too
    };

    this.logger = pino({
      level: config.level || 'info',
      // Add timestamp to base log record for consistency
      timestamp: pino.stdTimeFunctions.isoTime,
    }, pretty(prettyOptions));
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

  // Child logger method removed - use direct context passing instead
  async flush(): Promise<void> {
    return new Promise(async (resolve) => {
      if (this.logger.flush) {
        return this.logger.flush(() => resolve());
      } else {
        // If flush is not available, just resolve immediately
        resolve();
      }
    });
  }

  updateOptions(options?: { enableFileLogging?: boolean; filePath?: string }): void {
    // PinoLogger could potentially support dynamic reconfiguration
    // For now, this is a no-op as pino logger configuration is set at creation time
    // TODO: Implement dynamic file logging configuration if needed
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
      enableColors: true, // Ensure colors are always enabled for CLI
      enableFile: options?.enableFileLogging || false,
      filePath: options?.filePath
    });
  });
} catch (error) {
  // Ignore registration errors - LoggerProvider may not be available in all contexts
} 