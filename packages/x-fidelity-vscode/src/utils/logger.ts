import crypto from 'crypto';
import pino from 'pino';
import { maskSensitiveData } from '@x-fidelity/core';

// Initialize variables
let loggerInstance: pino.Logger | undefined;
let loglevel =
  process.env.XFI_LOG_LEVEL ||
  (process.env.NODE_ENV === 'test' ? 'silent' : 'info');
let logPrefix: string = generateLogPrefix();
let logFilePath: string = 'x-fidelity.log'; // Default log file path

/**
 * Generate a unique log prefix for this logger instance
 * This is used to correlate log messages from the same execution
 * @returns {string} A unique prefix for log messages
 */
function generateLogPrefix(): string {
  try {
    // Try to use crypto.randomUUID if available (Node.js 14.17.0+)
    if (crypto.randomUUID) {
      return crypto.randomUUID().substring(0, 8);
    }
    // Fallback to randomBytes if available
    if (crypto.randomBytes) {
      return crypto.randomBytes(4).toString('hex');
    }
  } catch {
    // Fall through to simple fallback
  }

  // Simple fallback for test environments or when crypto is not available
  return Math.random().toString(36).substring(2, 10);
}

// VSCode-specific logger implementation that avoids transport issues
function getLogger(force?: boolean): pino.Logger {
  // Use a simple check for test environment
  const isTestEnv =
    process.env.NODE_ENV === 'test' ||
    typeof (globalThis as any).jest !== 'undefined';

  // Check if we're running on macOS and in VSCode
  const isMacOS = process.platform === 'darwin';
  const isVSCode =
    typeof require !== 'undefined' &&
    (process.env.VSCODE_PID ||
      process.env.VSCODE_CWD ||
      process.argv.some(arg => arg.includes('vscode')));

  if (!loggerInstance || force) {
    const loggerOptions: pino.LoggerOptions = {
      timestamp: pino.stdTimeFunctions.isoTime,
      msgPrefix: `${logPrefix} - `,
      level: loglevel,
      formatters: {
        level: label => ({ level: label }),
        bindings: bindings => bindings,
        log: object => ({
          ...object
        })
      },
      serializers: {
        err: pino.stdSerializers.err,
        error: pino.stdSerializers.err,
        req: (req: any) => maskSensitiveData(pino.stdSerializers.req(req)),
        res: (res: any) => maskSensitiveData(pino.stdSerializers.res(res)),
        '*': (obj: any) => maskSensitiveData(obj)
      },
      redact: {
        paths: [
          'password',
          'apiKey',
          'authorization',
          'cookie',
          'req.headers.authorization',
          'req.headers.cookie',
          'req.body.password',
          'res.headers["set-cookie"]',
          '*.password',
          '*.apiKey',
          '*.secret',
          '*.token'
        ],
        censor: '********'
      }
    };

    // For VSCode extension, avoid file destinations on macOS to prevent fd errors
    if (isTestEnv || (isMacOS && isVSCode)) {
      // In test environment or macOS VSCode, use console output to avoid fd issues
      loggerInstance = pino(loggerOptions);
    } else {
      // In other environments, try file destination with fallback
      try {
        const fs = require('fs');
        const path = require('path');
        const logDir = path.dirname(logFilePath);

        // Ensure directory exists safely
        if (!fs.existsSync(logDir)) {
          fs.mkdirSync(logDir, { recursive: true });
        }

        // Try to create file destination with sync mode for stability
        const fileDestination = pino.destination({
          dest: logFilePath,
          sync: true, // Use sync mode to avoid fd issues
          mkdir: true
        });

        loggerInstance = pino(loggerOptions, fileDestination);
      } catch (error) {
        // Always fallback to console if file logging fails
        console.warn(
          'Failed to create file logger, using console output:',
          error
        );
        loggerInstance = pino(loggerOptions);
      }
    }
  }
  return loggerInstance;
}

// Export the logger instance
export const logger: pino.Logger = getLogger();
