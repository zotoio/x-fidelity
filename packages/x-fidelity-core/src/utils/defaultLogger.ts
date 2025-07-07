import { ILogger, LogLevel, LogLevelValues } from '@x-fidelity/types';

// Simple console-based logger for core when no logger is injected
export class DefaultLogger implements ILogger {
  private level: LogLevel = 'info';
  private readonly prefix: string;

  constructor(prefix: string = '[X-Fidelity]') {
    this.prefix = prefix;
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  getLevel(): LogLevel {
    return this.level;
  }

  isLevelEnabled(level: LogLevel): boolean {
    const currentLevelValue = LogLevelValues[this.level];
    const checkLevelValue = LogLevelValues[level];
    return checkLevelValue >= currentLevelValue;
  }

  trace(msgOrMeta: string | any, metaOrMsg?: any): void {
    if (this.isLevelEnabled('trace')) {
      const message = typeof msgOrMeta === 'string' ? msgOrMeta : JSON.stringify(msgOrMeta);
      const meta = typeof msgOrMeta === 'string' ? metaOrMsg : metaOrMsg;
      console.log(`${this.prefix} TRACE: ${message}`, meta || '');
    }
  }

  debug(msgOrMeta: string | any, metaOrMsg?: any): void {
    if (this.isLevelEnabled('debug')) {
      const message = typeof msgOrMeta === 'string' ? msgOrMeta : JSON.stringify(msgOrMeta);
      const meta = typeof msgOrMeta === 'string' ? metaOrMsg : metaOrMsg;
      console.log(`${this.prefix} DEBUG: ${message}`, meta || '');
    }
  }

  info(msgOrMeta: string | any, metaOrMsg?: any): void {
    if (this.isLevelEnabled('info')) {
      const message = typeof msgOrMeta === 'string' ? msgOrMeta : JSON.stringify(msgOrMeta);
      const meta = typeof msgOrMeta === 'string' ? metaOrMsg : metaOrMsg;
      console.log(`${this.prefix} INFO: ${message}`, meta || '');
    }
  }

  warn(msgOrMeta: string | any, metaOrMsg?: any): void {
    if (this.isLevelEnabled('warn')) {
      const message = typeof msgOrMeta === 'string' ? msgOrMeta : JSON.stringify(msgOrMeta);
      const meta = typeof msgOrMeta === 'string' ? metaOrMsg : metaOrMsg;
      console.warn(`${this.prefix} WARN: ${message}`, meta || '');
    }
  }

  error(msgOrMeta: string | any, metaOrMsg?: any): void {
    if (this.isLevelEnabled('error')) {
      const message = typeof msgOrMeta === 'string' ? msgOrMeta : JSON.stringify(msgOrMeta);
      const meta = typeof msgOrMeta === 'string' ? metaOrMsg : metaOrMsg;
      console.error(`${this.prefix} ERROR: ${message}`, meta || '');
    }
  }

  fatal(msgOrMeta: string | any, metaOrMsg?: any): void {
    if (this.isLevelEnabled('fatal')) {
      const message = typeof msgOrMeta === 'string' ? msgOrMeta : JSON.stringify(msgOrMeta);
      const meta = typeof msgOrMeta === 'string' ? metaOrMsg : metaOrMsg;
      console.error(`${this.prefix} FATAL: ${message}`, meta || '');
    }
  }

  child(bindings: any): ILogger {
    const bindingsStr = Object.entries(bindings)
      .map(([key, value]) => `${key}=${value}`)
      .join(' ');
    return new DefaultLogger(`${this.prefix}[${bindingsStr}]`);
  }
} 