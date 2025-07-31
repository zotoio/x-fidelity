/**
 * X-Fidelity Security Module
 * Centralized security utilities for all packages
 */

import { logger } from '../utils/logger';

/**
 * Security audit logging utility
 * Provides consistent security event logging across all packages
 */
export const securityLogger = {
  /**
   * Log security-related access attempts
   * @param resource The resource being accessed
   * @param action The action being performed
   * @param result Whether the action was allowed or denied
   * @param details Additional context for the security event
   */
  auditAccess: (
    resource: string, 
    action: string, 
    result: 'allowed' | 'denied',
    details?: Record<string, any>
  ) => {
    logger.info({ 
      security: true, 
      resource, 
      action, 
      result,
      details: details || {},
      timestamp: new Date().toISOString(),
      severity: result === 'denied' ? 'warning' : 'info'
    }, `Security audit: ${result.toUpperCase()} - ${action} on ${resource}`);
  },

  /**
   * Log security violations or attacks
   * @param attackType Type of attack detected
   * @param source Source of the attack (IP, user, etc.)
   * @param details Attack details
   */
  logSecurityViolation: (
    attackType: string,
    source: string,
    details: Record<string, any>
  ) => {
    logger.error({
      security: true,
      violation: true,
      attackType,
      source,
      details,
      timestamp: new Date().toISOString(),
      severity: 'critical'
    }, `SECURITY VIOLATION: ${attackType} from ${source}`);
  },

  /**
   * Log successful security validations
   * @param validationType Type of validation performed
   * @param input The input that was validated
   * @param details Additional validation context
   */
  logValidationSuccess: (
    validationType: string,
    input: string,
    details?: Record<string, any>
  ) => {
    logger.debug({
      security: true,
      validation: true,
      validationType,
      inputLength: input.length,
      details: details || {},
      timestamp: new Date().toISOString()
    }, `Security validation passed: ${validationType}`);
  }
};

/**
 * Security configuration constants
 */
export const SECURITY_CONSTANTS = {
  // URL Security
  ALLOWED_DOMAINS: ['api.github.com', 'raw.githubusercontent.com', 'github.com'],
  MAX_URL_LENGTH: 2048,
  
  // Command Security
  ALLOWED_GIT_COMMANDS: ['clone', 'fetch', 'checkout', 'pull'] as const,
  MAX_COMMAND_ARG_LENGTH: 500,
  
  // Input Security
  MAX_INPUT_LENGTH: 10000,
  DANGEROUS_CHARS_REGEX: /[;|&`$(){}[\]<>'"\\*?]/,
  CONTROL_CHARS_REGEX: /[\x00-\x1f\x7f]/,
} as const;

/**
 * Mutable security configuration
 */
export const MUTABLE_SECURITY_CONFIG = {
  // Path Security - this can be updated at runtime
  ALLOWED_PATH_PREFIXES: ['/tmp/', process.cwd()],
};

/**
 * Update the allowed path prefixes for security validation
 * @param newPaths Array of allowed path prefixes
 */
export function updateAllowedPaths(newPaths: string[]): void {
  MUTABLE_SECURITY_CONFIG.ALLOWED_PATH_PREFIXES = [...newPaths];
}

/**
 * Security error types for consistent error handling
 */
export class SecurityError extends Error {
  constructor(
    public readonly securityType: string,
    message: string,
    public readonly details?: Record<string, any>
  ) {
    super(message);
    this.name = 'SecurityError';
    
    // Log the security error
    securityLogger.logSecurityViolation(securityType, 'unknown', {
      message,
      details: details || {}
    });
  }
}

export class SSRFError extends SecurityError {
  constructor(url: string, reason: string) {
    super('SSRF', `SSRF attempt blocked: ${reason}`, { url });
  }
}

export class CommandInjectionError extends SecurityError {
  constructor(command: string, argument: string, reason: string) {
    super('CommandInjection', `Command injection attempt blocked: ${reason}`, { 
      command, 
      argument 
    });
  }
}

export class PathTraversalError extends SecurityError {
  constructor(path: string, reason: string) {
    super('PathTraversal', `Path traversal attempt blocked: ${reason}`, { path });
  }
} 