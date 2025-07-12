import pino from 'pino';
import { ILogger, SimpleLoggerConfig, LogLevel, LogLevelValues } from '@x-fidelity/types';

export class PinoLogger implements ILogger {
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
        // Ensure directory exists
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
          // Silent fail - log file clearing is not critical
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
        // Silent fail - file logging is not critical
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

  async flush(): Promise<void> {
    return new Promise((resolve) => {
      if (this.logger.flush) {
        this.logger.flush(() => resolve());
      } else {
        // If flush is not available, just resolve immediately
        resolve();
      }
    });
  }
} 