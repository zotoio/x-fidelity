import { ILogger, LogLevel } from '@x-fidelity/types';

/**
 * Default logger implementation that provides fallback logging
 * when no logger has been injected into the system.
 * 
 * This logger provides console-based logging with environment-aware behavior:
 * - Silent in test environments
 * - Console output in development/production
 * - Proper error handling and graceful degradation
 */
export class DefaultLogger implements ILogger {
  private level: LogLevel = 'info';
  private isTestEnvironment: boolean;
  private prefix: string;

  constructor(prefix?: string) {
    this.prefix = prefix || '[X-Fidelity]';
    this.isTestEnvironment = this.detectTestEnvironment();
  }

  private detectTestEnvironment(): boolean {
    return (
      process.env.NODE_ENV === 'test' ||
      typeof (globalThis as any).jest !== 'undefined' ||
      process.env.JEST_WORKER_ID !== undefined
    );
  }

  private shouldLog(level: LogLevel): boolean {
    // In VSCode mode, allow logging even in test-like environments
    const isVSCodeMode = process.env.XFI_VSCODE_MODE === 'true';
    
    // Always silent in test environment (unless in VSCode mode)
    if (this.isTestEnvironment && !isVSCodeMode) {
      return false;
    }

    // Check if level is enabled
    return this.isLevelEnabled(level);
  }

  private formatMessage(msgOrMeta: string | any, metaOrMsg?: any): string {
    let message: string;

    if (typeof msgOrMeta === 'string') {
      message = msgOrMeta;
    } else if (msgOrMeta && typeof msgOrMeta === 'object') {
      message = JSON.stringify(msgOrMeta);
    } else {
      message = String(msgOrMeta);
    }

    // Use simpler format without timestamp to match Pino logger format better
    let formattedMessage = `${this.prefix} ${message}`;

    if (metaOrMsg) {
      if (typeof metaOrMsg === 'string') {
        formattedMessage += ` ${metaOrMsg}`;
      } else {
        formattedMessage += ` ${JSON.stringify(metaOrMsg)}`;
      }
    }

    return formattedMessage;
  }

  private safeConsoleLog(level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal', message: string): void {
    try {
      switch (level) {
        case 'trace':
        case 'debug':
          console.debug(message);
          break;
        case 'info':
          console.info(message);
          break;
        case 'warn':
          console.warn(message);
          break;
        case 'error':
        case 'fatal':
          console.error(message);
          break;
        default:
          console.log(message);
      }
    } catch (error) {
      // Fallback to basic console.log if specific method fails
      try {
        console.log(message);
      } catch (fallbackError) {
        // If even console.log fails, do nothing (complete fallback)
      }
    }
  }

  trace(msgOrMeta: string | any, metaOrMsg?: any): void {
    if (this.shouldLog('trace')) {
      this.safeConsoleLog('trace', this.formatMessage(msgOrMeta, metaOrMsg));
    }
  }

  debug(msgOrMeta: string | any, metaOrMsg?: any): void {
    if (this.shouldLog('debug')) {
      this.safeConsoleLog('debug', this.formatMessage(msgOrMeta, metaOrMsg));
    }
  }

  info(msgOrMeta: string | any, metaOrMsg?: any): void {
    if (this.shouldLog('info')) {
      this.safeConsoleLog('info', this.formatMessage(msgOrMeta, metaOrMsg));
    }
  }

  warn(msgOrMeta: string | any, metaOrMsg?: any): void {
    if (this.shouldLog('warn')) {
      this.safeConsoleLog('warn', this.formatMessage(msgOrMeta, metaOrMsg));
    }
  }

  error(msgOrMeta: string | any, metaOrMsg?: any): void {
    if (this.shouldLog('error')) {
      this.safeConsoleLog('error', this.formatMessage(msgOrMeta, metaOrMsg));
    }
  }

  fatal(msgOrMeta: string | any, metaOrMsg?: any): void {
    if (this.shouldLog('fatal')) {
      this.safeConsoleLog('fatal', this.formatMessage(msgOrMeta, metaOrMsg));
    }
  }

  child(bindings: any): ILogger {
    // Create child logger with additional context
    const childPrefix = this.prefix + (bindings?.component ? `[${bindings.component}]` : '');
    return new DefaultLogger(childPrefix);
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  getLevel(): LogLevel {
    return this.level;
  }

  isLevelEnabled(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      trace: 0,
      debug: 1,
      info: 2,
      warn: 3,
      error: 4,
      fatal: 5
    };

    return levels[level] >= levels[this.level];
  }

  async flush(): Promise<void> {
    // No flush needed for console logger, resolve immediately
    return Promise.resolve();
  }

  dispose?(): void {
    // No resources to dispose for console-based logger
  }
}

/**
 * Create a silent logger that doesn't output anything
 * Useful for test environments or when complete silence is needed
 */
export class SilentLogger implements ILogger {
  trace(): void {}
  debug(): void {}
  info(): void {}
  warn(): void {}
  error(): void {}
  fatal(): void {}
  child(): ILogger { return new SilentLogger(); }
  setLevel(): void {}
  getLevel(): LogLevel { return 'fatal'; }
  isLevelEnabled(): boolean { return false; }
  async flush(): Promise<void> { return Promise.resolve(); }
  dispose?(): void {}
}

/**
 * Factory function to create appropriate default logger based on environment
 */
export function createDefaultLogger(prefix?: string): ILogger {
  const isTestEnvironment = (
    process.env.NODE_ENV === 'test' ||
    typeof (globalThis as any).jest !== 'undefined' ||
    process.env.JEST_WORKER_ID !== undefined
  );

  //if (isTestEnvironment) {
    return new SilentLogger();
  //}

  //return new DefaultLogger(prefix);
} 