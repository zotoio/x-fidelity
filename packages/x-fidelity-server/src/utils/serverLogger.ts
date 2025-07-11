import pino from 'pino';
import { ILogger, LogLevel, LogLevelValues, SimpleLoggerConfig } from '@x-fidelity/types';

export class ServerLogger implements ILogger {
  private logger: pino.Logger;

  constructor(config: SimpleLoggerConfig = {}) {
    const pinoConfig: pino.LoggerOptions = {
      level: config.level || 'info',
      transport: this.createTransports(config)
    };

    this.logger = pino(pinoConfig);
  }

  private createTransports(config: SimpleLoggerConfig): pino.TransportMultiOptions | pino.TransportSingleOptions {
    const targets: pino.TransportTargetOptions[] = [];

    // Console transport
    if (config.enableConsole !== false) {
      targets.push({
        target: 'pino-pretty',
        level: config.level || 'info',
        options: {
          colorize: config.enableColors !== false,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname'
        }
      });
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

  getLevel(): LogLevel {
    return this.logger.level as LogLevel;
  }

  isLevelEnabled(level: LogLevel): boolean {
    const currentLevelValue = LogLevelValues[this.getLevel()];
    const checkLevelValue = LogLevelValues[level];
    return checkLevelValue >= currentLevelValue;
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