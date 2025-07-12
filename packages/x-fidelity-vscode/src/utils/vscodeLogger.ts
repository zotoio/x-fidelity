import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ILogger, LogLevel, LogLevelValues } from '@x-fidelity/types';
import { EnhancedLogger, EnhancedLoggerConfig } from '../../../core/src/utils/enhancedLogger';

export class VSCodeLogger extends EnhancedLogger {
  private outputChannel: vscode.OutputChannel;
  private ownsChannel: boolean = true;

  constructor(
    name: string = 'X-Fidelity',
    logFilePath?: string,
    prefix: string = '',
    existingChannel?: vscode.OutputChannel
  ) {
    const baseLogger = new SimpleLogger(name, logFilePath, prefix, existingChannel);
    const config: EnhancedLoggerConfig = {
      baseLogger,
      component: 'VSCode',
      context: { prefix }
    };
    super(config);

    this.outputChannel = baseLogger.getOutputChannel();
    this.ownsChannel = baseLogger.ownsChannel;
  }

  trace(msgOrMeta: string | any, metaOrMsg?: any): void {
    super.trace(msgOrMeta, metaOrMsg);
  }

  debug(msgOrMeta: string | any, metaOrMsg?: any): void {
    super.debug(msgOrMeta, metaOrMsg);
  }

  info(msgOrMeta: string | any, metaOrMsg?: any): void {
    super.info(msgOrMeta, metaOrMsg);
  }

  warn(msgOrMeta: string | any, metaOrMsg?: any): void {
    super.warn(msgOrMeta, metaOrMsg);
  }

  error(msgOrMeta: string | any, metaOrMsg?: any): void {
    super.error(msgOrMeta, metaOrMsg);
  }

  fatal(msgOrMeta: string | any, metaOrMsg?: any): void {
    super.fatal(msgOrMeta, metaOrMsg);
  }

  show(): void {
    this.outputChannel.show();
  }

  getOutputChannel(): vscode.OutputChannel {
    return this.outputChannel;
  }

  dispose(): void {
    super.dispose();
    if (this.ownsChannel) {
      this.outputChannel.dispose();
    }
  }
}

class SimpleLogger implements ILogger {
  private level: LogLevel = 'info';
  outputChannel: vscode.OutputChannel;
  private logFilePath?: string;
  private prefix: string;
  ownsChannel: boolean = true;

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
        this.outputChannel = this.createFallbackChannel(name);
        this.ownsChannel = true;
      }
    }

    this.logFilePath = logFilePath;
    this.prefix = prefix;

    if (this.logFilePath) {
      const logDir = path.dirname(this.logFilePath);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
    }
  }

  private createFallbackChannel(name: string): vscode.OutputChannel {
    return {
      name: name,
      appendLine: (value: string) => console.log(`[${name}] ${value}`),
      append: (value: string) => console.log(`[${name}] ${value}`),
      clear: () => {},
      show: () => {},
      hide: () => {},
      dispose: () => {},
      replace: () => {}
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
      message = metaOrMsg || JSON.stringify(msgOrMeta);
      meta = msgOrMeta;
    }

    const prefixStr = this.prefix ? `[${this.prefix}] ` : '';
    let logLine = `${timestamp} ${levelStr} ${prefixStr}${message}`;

    if (meta && typeof meta === 'object') {
      logLine += ` ${JSON.stringify(meta)}`;
    } else if (meta) {
      logLine += ` ${meta}`;
    }

    return logLine;
  }

  private log(level: LogLevel, msgOrMeta: string | any, metaOrMsg?: any): void {
    if (!this.isLevelEnabled(level)) {
      return;
    }

    const formattedMessage = this.formatMessage(level, msgOrMeta, metaOrMsg);

    this.outputChannel.appendLine(formattedMessage);

    if (this.logFilePath) {
      try {
        fs.appendFileSync(this.logFilePath, formattedMessage + '\n');
      } catch (error) {}
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

    return new SimpleLogger(
      this.outputChannel.name,
      this.logFilePath,
      childPrefix,
      this.outputChannel
    );
  }

  dispose(): void {
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
