/**
 * Input Sanitization Security Module
 * Provides general input validation and sanitization utilities
 */

import { securityLogger, SECURITY_CONSTANTS, SecurityError } from './index';

/**
 * Sanitizes a string input by removing dangerous characters
 * @param input The input string to sanitize
 * @param maxLength Maximum allowed length
 * @returns Sanitized string
 */
export function sanitizeString(input: string, maxLength: number = SECURITY_CONSTANTS.MAX_INPUT_LENGTH): string {
  if (typeof input !== 'string') {
    throw new SecurityError('INPUT_VALIDATION', 'Input must be a string');
  }
  
  if (input.length > maxLength) {
    securityLogger.auditAccess(input, 'STRING_SANITIZATION', 'denied', {
      reason: 'Input too long',
      length: input.length,
      maxLength
    });
    throw new SecurityError('INPUT_VALIDATION', `Input too long: ${input.length} > ${maxLength}`);
  }
  
  // Remove control characters
  const sanitized = input.replace(SECURITY_CONSTANTS.CONTROL_CHARS_REGEX, '');
  
  securityLogger.logValidationSuccess('STRING_SANITIZATION', input, {
    originalLength: input.length,
    sanitizedLength: sanitized.length
  });
  
  return sanitized;
}

/**
 * Validates that an input contains only safe characters
 * @param input The input to validate
 * @param allowDangerous Whether to allow dangerous characters
 * @returns True if input is safe
 */
export function validateInput(input: string, allowDangerous: boolean = false): boolean {
  if (typeof input !== 'string') {
    securityLogger.auditAccess(String(input), 'INPUT_VALIDATION', 'denied', {
      reason: 'Non-string input'
    });
    return false;
  }
  
  if (input.length > SECURITY_CONSTANTS.MAX_INPUT_LENGTH) {
    securityLogger.auditAccess(input, 'INPUT_VALIDATION', 'denied', {
      reason: 'Input too long',
      length: input.length
    });
    return false;
  }
  
  if (!allowDangerous && SECURITY_CONSTANTS.DANGEROUS_CHARS_REGEX.test(input)) {
    securityLogger.auditAccess(input, 'INPUT_VALIDATION', 'denied', {
      reason: 'Contains dangerous characters'
    });
    return false;
  }
  
  if (SECURITY_CONSTANTS.CONTROL_CHARS_REGEX.test(input)) {
    securityLogger.auditAccess(input, 'INPUT_VALIDATION', 'denied', {
      reason: 'Contains control characters'
    });
    return false;
  }

  securityLogger.auditAccess(input, 'INPUT_VALIDATION', 'allowed', {
    length: input.length
  });
  
  return true;
}

/**
 * Validates an email address format
 * @param email The email to validate
 * @returns True if email format is valid
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValid = emailRegex.test(email) && email.length <= 254;
  
  securityLogger.auditAccess(email, 'EMAIL_VALIDATION', isValid ? 'allowed' : 'denied', {
    length: email.length
  });
  
  return isValid;
} 