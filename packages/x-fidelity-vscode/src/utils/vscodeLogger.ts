import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ILogger, LogLevel, LogLevelValues } from '@x-fidelity/types';

export class VSCodeLogger implements ILogger {
  private level: LogLevel = 'info';
  private outputChannel: vscode.OutputChannel;
  private logFilePath?: string;
  private prefix: string;
  private ownsChannel: boolean = true;

  constructor(
    name: string = 'X-Fidelity',
    logFilePath?: string,
    prefix: string = '',
    existingChannel?: vscode.OutputChannel
  ) {
    if (existingChannel) {
      this.outputChannel = existingChannel;
      this.ownsChannel = false;
    } else {
      try {
        this.outputChannel = vscode.window.createOutputChannel(name);
        this.ownsChannel = true;
      } catch (error) {
        // If creating output channel fails, create a fallback that logs to console
        // This can happen in test environments or when VSCode API is not available
        console.warn(
          `Failed to create VSCode output channel "${name}": ${error}. Falling back to console logging.`
        );
        this.outputChannel = this.createFallbackChannel(name);
        this.ownsChannel = true;
      }
    }

    this.logFilePath = logFilePath;
    this.prefix = prefix;

    // Ensure log directory exists and clear log file at start of execution
    if (this.logFilePath) {
      const logDir = path.dirname(this.logFilePath);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      // Clear the log file at the start of each execution
      try {
        fs.writeFileSync(this.logFilePath, '');
      } catch (error) {
        console.warn(`Failed to clear log file ${this.logFilePath}: ${error}`);
      }
    }
  }

  private createFallbackChannel(name: string): vscode.OutputChannel {
    // Create a mock output channel that logs to console as fallback
    return {
      name: name,
      appendLine: (value: string) => console.log(`[${name}] ${value}`),
      append: (value: string) => console.log(`[${name}] ${value}`),
      clear: () => console.log(`[${name}] Clear requested`),
      show: () => console.log(`[${name}] Show requested`),
      hide: () => console.log(`[${name}] Hide requested`),
      dispose: () => console.log(`[${name}] Dispose requested`),
      replace: () => console.log(`[${name}] Replace requested`)
    } as vscode.OutputChannel;
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

  private formatMessage(
    level: LogLevel,
    msgOrMeta: string | any,
    metaOrMsg?: any
  ): string {
    const timestamp = new Date().toISOString();
    const levelStr = level.toUpperCase().padEnd(5);

    let message: string;
    let meta: any;

    if (typeof msgOrMeta === 'string') {
      message = msgOrMeta;
      meta = metaOrMsg;
    } else {
      message = metaOrMsg || this.safeStringify(msgOrMeta);
      meta = msgOrMeta;
    }

    const prefixStr = this.prefix ? `[${this.prefix}] ` : '';
    let logLine = `${timestamp} ${levelStr} ${prefixStr}${message}`;

    if (meta && typeof meta === 'object') {
      logLine += ` ${this.safeStringify(meta)}`;
    } else if (meta) {
      logLine += ` ${meta}`;
    }

    return logLine;
  }

  private safeStringify(obj: any): string {
    if (obj === null || obj === undefined) {
      return String(obj);
    }

    if (
      typeof obj === 'string' ||
      typeof obj === 'number' ||
      typeof obj === 'boolean'
    ) {
      return String(obj);
    }

    if (typeof obj === 'function') {
      return '[Function]';
    }

    if (obj instanceof Error) {
      return `Error: ${obj.message}`;
    }

    if (typeof obj === 'object') {
      try {
        // Use a replacer function to handle circular references and non-serializable objects
        return JSON.stringify(
          obj,
          (key, value) => {
            // Handle circular references
            if (typeof value === 'object' && value !== null) {
              if (this.hasCircularReference(value)) {
                return '[Circular Reference]';
              }
            }

            // Handle functions
            if (typeof value === 'function') {
              return '[Function]';
            }

            // Handle VSCode objects that might not serialize well
            if (value && typeof value === 'object') {
              if (value.constructor && value.constructor.name) {
                const constructorName = value.constructor.name;
                if (
                  constructorName.includes('Uri') ||
                  constructorName.includes('Range') ||
                  constructorName.includes('Position') ||
                  constructorName.includes('Diagnostic') ||
                  constructorName.includes('OutputChannel')
                ) {
                  return `[${constructorName}]`;
                }
              }
            }

            return value;
          },
          2
        );
      } catch (error) {
        return `[Object - Serialization Failed: ${error}]`;
      }
    }

    return String(obj);
  }

  private hasCircularReference(obj: any, seen = new WeakSet()): boolean {
    if (obj === null || typeof obj !== 'object') {
      return false;
    }

    if (seen.has(obj)) {
      return true;
    }

    seen.add(obj);

    try {
      for (const key in obj) {
        if (
          obj.hasOwnProperty(key) &&
          this.hasCircularReference(obj[key], seen)
        ) {
          return true;
        }
      }
    } catch {
      // If we can't iterate over the object, assume it might be problematic
      return true;
    }

    return false;
  }

  private log(level: LogLevel, msgOrMeta: string | any, metaOrMsg?: any): void {
    if (!this.isLevelEnabled(level)) {
      return;
    }

    const formattedMessage = this.formatMessage(level, msgOrMeta, metaOrMsg);

    // Output to VSCode output channel
    this.outputChannel.appendLine(formattedMessage);

    // Write to file if configured
    if (this.logFilePath) {
      try {
        fs.appendFileSync(this.logFilePath, formattedMessage + '\n');
      } catch (error) {
        // Fallback to console if file write fails
        console.error('Failed to write to log file:', error);
        console.log(formattedMessage);
      }
    }
  }

  trace(msgOrMeta: string | any, metaOrMsg?: any): void {
    this.log('trace', msgOrMeta, metaOrMsg);
  }

  debug(msgOrMeta: string | any, metaOrMsg?: any): void {
    this.log('debug', msgOrMeta, metaOrMsg);
  }

  info(msgOrMeta: string | any, metaOrMsg?: any): void {
    this.log('info', msgOrMeta, metaOrMsg);
  }

  warn(msgOrMeta: string | any, metaOrMsg?: any): void {
    this.log('warn', msgOrMeta, metaOrMsg);
  }

  error(msgOrMeta: string | any, metaOrMsg?: any): void {
    this.log('error', msgOrMeta, metaOrMsg);
  }

  fatal(msgOrMeta: string | any, metaOrMsg?: any): void {
    this.log('fatal', msgOrMeta, metaOrMsg);
  }

  child(bindings: any): ILogger {
    const bindingsStr = Object.entries(bindings)
      .map(([key, value]) => `${key}=${value}`)
      .join(' ');
    const childPrefix = this.prefix
      ? `${this.prefix}[${bindingsStr}]`
      : bindingsStr;

    // Create a child logger that shares the same output channel
    return new VSCodeLogger(
      this.outputChannel.name,
      this.logFilePath,
      childPrefix,
      this.outputChannel // Pass the existing channel to share it
    );
  }

  dispose(): void {
    // Only dispose the channel if this logger owns it
    if (this.ownsChannel) {
      this.outputChannel.dispose();
    }
  }

  show(): void {
    this.outputChannel.show();
  }

  getOutputChannel(): vscode.OutputChannel {
    return this.outputChannel;
  }
}
