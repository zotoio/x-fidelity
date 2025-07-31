/**
 * Command Validation Security Module
 * Provides secure command execution to prevent injection attacks
 */

import path from 'path';
import { spawn } from 'child_process';
import { securityLogger, SECURITY_CONSTANTS, CommandInjectionError } from './index';

/**
 * @security Immutable command parameter object that prevents injection
 * This class ensures that all command arguments are validated and immutable
 */
export class SafeGitCommand {
  private readonly command: string;
  private readonly args: readonly string[];
  private readonly cwd?: string;
  private readonly timeout?: number;

  constructor(
    command: string,
    args: readonly string[],
    options?: { cwd?: string; timeout?: number }
  ) {
    // Validate command is in allowlist
    if (!SECURITY_CONSTANTS.ALLOWED_GIT_COMMANDS.includes(command as any)) {
      throw new CommandInjectionError(command, '', `Unauthorized git command: ${command}`);
    }

    // Validate all arguments are safe with strict criteria
    for (const arg of args) {
      if (!this.isArgSafe(arg)) {
        throw new CommandInjectionError(command, arg, `Unsafe command argument detected: ${arg}`);
      }
    }

    this.command = command;
    this.args = Object.freeze([...args]); // Immutable copy
    this.cwd = options?.cwd;
    this.timeout = options?.timeout;

    securityLogger.logValidationSuccess('COMMAND_VALIDATION', `${command} ${args.join(' ')}`, {
      command,
      argCount: args.length,
      cwd: this.cwd
    });
  }

  private isArgSafe(arg: string): boolean {
    // Strict validation to prevent any form of injection
    if (typeof arg !== 'string') {
      securityLogger.auditAccess(String(arg), 'COMMAND_ARG_VALIDATION', 'denied', {
        reason: 'Argument is not a string'
      });
      return false;
    }
    
    if (arg.length === 0 || arg.length > SECURITY_CONSTANTS.MAX_COMMAND_ARG_LENGTH) {
      securityLogger.auditAccess(arg, 'COMMAND_ARG_VALIDATION', 'denied', {
        reason: 'Invalid argument length',
        length: arg.length
      });
      return false;
    }
    
    // Check for any shell metacharacters that could be dangerous
    if (SECURITY_CONSTANTS.DANGEROUS_CHARS_REGEX.test(arg)) {
      securityLogger.auditAccess(arg, 'COMMAND_ARG_VALIDATION', 'denied', {
        reason: 'Contains dangerous characters'
      });
      return false;
    }
    
    // Check for path traversal attempts
    if (arg.includes('..') || arg.includes('~')) {
      securityLogger.auditAccess(arg, 'COMMAND_ARG_VALIDATION', 'denied', {
        reason: 'Path traversal attempt'
      });
      return false;
    }
    
    // Check for null bytes or control characters
    if (SECURITY_CONSTANTS.CONTROL_CHARS_REGEX.test(arg)) {
      securityLogger.auditAccess(arg, 'COMMAND_ARG_VALIDATION', 'denied', {
        reason: 'Contains control characters'
      });
      return false;
    }

    securityLogger.auditAccess(arg, 'COMMAND_ARG_VALIDATION', 'allowed', {
      length: arg.length
    });
    
    return true;
  }

  /**
   * Execute the git command with all safety guarantees
   * @returns Promise with command output
   */
  async execute(): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const child = spawn('git', [this.command, ...this.args], {
        cwd: this.cwd,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      // Handle timeout
      let timeoutId: NodeJS.Timeout | undefined;
      if (this.timeout) {
        timeoutId = setTimeout(() => {
          child.kill('SIGTERM');
          reject(new Error(`Git command timed out after ${this.timeout}ms`));
        }, this.timeout);
      }

      child.on('close', (code: number | null) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          reject(new Error(`Git command failed with exit code ${code}: ${stderr}`));
        }
      });

      child.on('error', (error: Error) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        reject(error);
      });
    });
  }

  /**
   * Gets the validated command and arguments for execution
   * @returns Object with command details for secure execution
   */
  getExecutionParams(): {
    command: string;
    args: string[];
    options: { cwd?: string; timeout?: number };
  } {
    return {
      command: 'git',
      args: [this.command, ...this.args],
      options: {
        cwd: this.cwd,
        timeout: this.timeout
      }
    };
  }

  /**
   * Gets a safe string representation for logging
   */
  toString(): string {
    return `git ${this.command} ${this.args.join(' ')}`;
  }
}

/**
 * Validates command arguments for safety
 * @param command The command to validate
 * @param args The arguments to validate
 * @returns True if command and args are safe
 */
export function validateCommand(command: string, args: string[]): boolean {
  try {
    new SafeGitCommand(command as any, args);
    return true;
  } catch (error) {
    securityLogger.auditAccess(`${command} ${args.join(' ')}`, 'COMMAND_VALIDATION', 'denied', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return false;
  }
} 