import * as vscode from 'vscode';
import { maskSensitiveData } from '@x-fidelity/core';

// VSCode Logger implementation - no pino, no file descriptors
let outputChannel: vscode.OutputChannel | undefined;
let loglevel =
  process.env.XFI_LOG_LEVEL ||
  (process.env.NODE_ENV === 'test' ? 'silent' : 'info');
let logPrefix: string = generateLogPrefix();

/**
 * Generate a unique log prefix for this logger instance
 * This is used to correlate log messages from the same execution
 * @returns {string} A unique prefix for log messages
 */
function generateLogPrefix(): string {
  // Simple random ID without crypto dependency
  return Math.random().toString(36).substring(2, 10);
}

// VSCode native logger - no file descriptors, uses OutputChannel
function getOutputChannel(): vscode.OutputChannel {
  if (!outputChannel) {
    outputChannel = vscode.window.createOutputChannel('X-Fidelity');
  }
  return outputChannel;
}

type LogLevel =
  | 'trace'
  | 'debug'
  | 'info'
  | 'warn'
  | 'error'
  | 'fatal'
  | 'silent';

function shouldLog(level: LogLevel): boolean {
  const levels: Record<LogLevel, number> = {
    silent: 100,
    fatal: 60,
    error: 50,
    warn: 40,
    info: 30,
    debug: 20,
    trace: 10
  };

  const currentLevel = levels[loglevel as LogLevel] || levels.info;
  return levels[level] >= currentLevel;
}

function formatLogMessage(level: LogLevel, msg: string, obj?: any): string {
  const timestamp = new Date().toISOString();
  const maskedObj = obj ? maskSensitiveData(obj) : '';
  const objStr = maskedObj ? ` ${JSON.stringify(maskedObj)}` : '';
  return `[${timestamp}] ${logPrefix} - ${level.toUpperCase()}: ${msg}${objStr}`;
}

interface Logger {
  trace(msg: string, obj?: any): void;
  debug(msg: string, obj?: any): void;
  info(msg: string, obj?: any): void;
  warn(msg: string, obj?: any): void;
  error(msg: string, obj?: any): void;
  fatal(msg: string, obj?: any): void;
}

function createLogger(): Logger {
  const isTestEnv =
    process.env.NODE_ENV === 'test' ||
    typeof (globalThis as any).jest !== 'undefined';

  return {
    trace: (msg: string, obj?: any) => {
      if (!shouldLog('trace')) {
        return;
      }
      const formatted = formatLogMessage('trace', msg, obj);
      if (isTestEnv) {
        console.log(formatted);
      } else {
        getOutputChannel().appendLine(formatted);
      }
    },
    debug: (msg: string, obj?: any) => {
      if (!shouldLog('debug')) {
        return;
      }
      const formatted = formatLogMessage('debug', msg, obj);
      if (isTestEnv) {
        console.log(formatted);
      } else {
        getOutputChannel().appendLine(formatted);
      }
    },
    info: (msg: string, obj?: any) => {
      if (!shouldLog('info')) {
        return;
      }
      const formatted = formatLogMessage('info', msg, obj);
      if (isTestEnv) {
        console.log(formatted);
      } else {
        getOutputChannel().appendLine(formatted);
      }
    },
    warn: (msg: string, obj?: any) => {
      if (!shouldLog('warn')) {
        return;
      }
      const formatted = formatLogMessage('warn', msg, obj);
      if (isTestEnv) {
        console.warn(formatted);
      } else {
        getOutputChannel().appendLine(formatted);
      }
    },
    error: (msg: string, obj?: any) => {
      if (!shouldLog('error')) {
        return;
      }
      const formatted = formatLogMessage('error', msg, obj);
      if (isTestEnv) {
        console.error(formatted);
      } else {
        getOutputChannel().appendLine(formatted);
      }
    },
    fatal: (msg: string, obj?: any) => {
      if (!shouldLog('fatal')) {
        return;
      }
      const formatted = formatLogMessage('fatal', msg, obj);
      if (isTestEnv) {
        console.error(formatted);
      } else {
        getOutputChannel().appendLine(formatted);
      }
    }
  };
}

// Export the logger instance
export const logger: Logger = createLogger();
