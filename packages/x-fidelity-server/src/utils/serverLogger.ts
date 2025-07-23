import pino from 'pino';
import { ILogger, LogLevel, LogLevelValues, SimpleLoggerConfig, EXECUTION_MODES } from '@x-fidelity/types';
import { shouldUseDirectLogging } from '@x-fidelity/core';

export class ServerLogger implements ILogger {
  private logger: pino.Logger;

  constructor(config: SimpleLoggerConfig = {}) {
    const transport = this.createTransports(config);
    const pinoConfig: pino.LoggerOptions = {
      level: config.level || 'info',
      ...(transport && { transport }) // Only add transport if it's not undefined
    };

    this.logger = pino(pinoConfig);
  }

  private createTransports(config: SimpleLoggerConfig): pino.TransportMultiOptions | pino.TransportSingleOptions | undefined {
    const targets: pino.TransportTargetOptions[] = [];

    // Console transport with fallback for bundled environments
    if (config.enableConsole !== false) {
      // Always use direct logging to avoid transport worker issues
      // This also removes the dependency on pino-pretty
      return undefined;
    }

    // File transport
    if (config.enableFile !== false && config.filePath) {
      try {
        // Ensure directory exists and clear log file
        const fs = require('fs');
        const path = require('path');
        const logDir = path.dirname(config.filePath);
        
        if (!fs.existsSync(logDir)) {
          fs.mkdirSync(logDir, { recursive: true });
        }
        
        // Clear the log file at the start of each execution
        try {
          fs.writeFileSync(config.filePath, '');
        } catch (error) {
          console.warn(`Failed to clear log file ${config.filePath}: ${error}`);
        }
        
        targets.push({
          target: 'pino/file',
          level: config.level || 'info',
          options: {
            destination: config.filePath
          }
        });
      } catch (error) {
        // If file logging fails, just continue with console logging
        console.warn(`Failed to setup file logging: ${error}`);
      }
    }

    if (targets.length === 1) {
      return targets[0];
    }

    return {
      targets
    };
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

  /**
   * Update log level dynamically - useful for long-running server processes
   * @param level The new log level to set
   */
  updateLevel(level: LogLevel): void {
    this.setLevel(level);
  }

  getLevel(): LogLevel {
    return this.logger.level as LogLevel;
  }

  isLevelEnabled(level: LogLevel): boolean {
    const currentLevelValue = LogLevelValues[this.getLevel()];
    const checkLevelValue = LogLevelValues[level];
    return checkLevelValue >= currentLevelValue;
  }

  updateOptions(options?: { enableFileLogging?: boolean; filePath?: string }): void {
    // ServerLogger configuration is set at creation time
    // For now, this is a no-op - dynamic reconfiguration could be added if needed
  }

  // Child logger method removed - use direct context passing instead
}

// Create a default server logger instance
export const logger = new ServerLogger({
  level: (process.env.XFI_LOG_LEVEL as LogLevel) || 'info',
  enableConsole: true,
  enableColors: true
});

// Legacy compatibility functions for existing server code
export function setLogPrefix(prefix: string): void {
  console.warn('setLogPrefix is deprecated with the new logger provider pattern. Use child loggers instead.');
  // No-op for compatibility - child loggers can be used instead
}

export function resetLogPrefix(): void {
  // No-op for compatibility
}

export function setLogLevel(level: LogLevel): void {
  logger.setLevel(level);
}

// Register ServerLogger as the preferred logger for Server and Hook modes
// This will be called when Server package is loaded
try {
  const { LoggerProvider } = require('@x-fidelity/core');
  
  // Register for server mode
  LoggerProvider.registerLoggerFactory(EXECUTION_MODES.SERVER, (level: LogLevel, options?: { enableFileLogging?: boolean; filePath?: string }) => {
    return new ServerLogger({
      level,
      enableConsole: true,
      enableColors: false, // Server mode typically doesn't need colors
      enableFile: options?.enableFileLogging || false,
      filePath: options?.filePath
    });
  });
  
  // Register for hook mode (same as server for now)
  LoggerProvider.registerLoggerFactory(EXECUTION_MODES.HOOK, (level: LogLevel, options?: { enableFileLogging?: boolean; filePath?: string }) => {
    return new ServerLogger({
      level,
      enableConsole: true,
      enableColors: false,
      enableFile: options?.enableFileLogging || false,
      filePath: options?.filePath
    });
  });
} catch (error) {
  // Ignore registration errors - LoggerProvider may not be available in all contexts
} 