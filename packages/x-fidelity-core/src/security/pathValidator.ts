/**
 * Path Validation Security Module
 * Provides secure path validation to prevent directory traversal attacks
 */

import path from 'path';
import { securityLogger, SECURITY_CONSTANTS, PathTraversalError } from './index';

/**
 * Validates that a directory path is safe for operations
 * @param dirPath The directory path to validate
 * @returns True if path is safe
 */
export function validateDirectoryPath(dirPath: string): boolean {
  try {
    const resolvedPath = path.resolve(dirPath);
    
    // Must be within allowed prefixes
    const isAllowed = SECURITY_CONSTANTS.ALLOWED_PATH_PREFIXES.some(prefix => 
      resolvedPath.startsWith(path.resolve(prefix))
    );
    
    if (!isAllowed) {
      securityLogger.auditAccess(dirPath, 'PATH_VALIDATION', 'denied', {
        reason: 'Path outside allowed range',
        resolvedPath
      });
      return false;
    }
    
    // Check for path traversal attempts
    if (dirPath.includes('..') || dirPath.includes('\0')) {
      securityLogger.auditAccess(dirPath, 'PATH_VALIDATION', 'denied', {
        reason: 'Path traversal attempt detected'
      });
      return false;
    }

    securityLogger.auditAccess(dirPath, 'PATH_VALIDATION', 'allowed', {
      resolvedPath
    });
    
    return true;
  } catch (error) {
    securityLogger.auditAccess(dirPath, 'PATH_VALIDATION', 'denied', {
      reason: 'Invalid directory path',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return false;
  }
}

/**
 * Creates a secure path by validating and resolving it
 * @param basePath Base path to resolve from
 * @param userPath User-provided path component
 * @returns Secure resolved path
 */
export function createSecurePath(basePath: string, userPath: string): string {
  const resolvedPath = path.resolve(basePath, userPath);
  
  if (!validateDirectoryPath(resolvedPath)) {
    throw new PathTraversalError(userPath, 'Path validation failed');
  }
  
  return resolvedPath;
} 