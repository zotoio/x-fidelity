/**
 * URL Validation Security Module
 * Provides comprehensive URL validation to prevent SSRF attacks
 */

import { URL } from 'url';
import { logger } from '../utils/logger';

// Security constants for URL validation
const ALLOWED_DOMAINS = ['api.github.com', 'raw.githubusercontent.com', 'github.com'];
const MAX_URL_LENGTH = 2048;

// SSRF Error class for URL validation
class SSRFError extends Error {
  constructor(url: string, reason: string) {
    super(`SSRF attempt blocked: ${reason}`);
    this.name = 'SSRFError';
    logger.error({ security: true, url, reason }, this.message);
  }
}

// Security audit logging for URL validation
const auditLogger = {
  logAccess: (resource: string, action: string, result: 'allowed' | 'denied', details?: Record<string, any>) => {
    logger.info({ 
      security: true, 
      resource, 
      action, 
      result,
      details: details || {},
      timestamp: new Date().toISOString()
    }, `Security audit: ${result.toUpperCase()} - ${action} on ${resource}`);
  },
  logValidation: (type: string, input: string, details?: Record<string, any>) => {
    logger.debug({
      security: true,
      validation: true,
      type,
      inputLength: input.length,
      details: details || {},
      timestamp: new Date().toISOString()
    }, `Security validation passed: ${type}`);
  },
  logViolation: (type: string, source: string, details: Record<string, any>) => {
    logger.error({
      security: true,
      violation: true,
      type,
      source,
      details,
      timestamp: new Date().toISOString()
    }, `SECURITY VIOLATION: ${type} from ${source}`);
  }
};

// Private IP ranges that should be blocked
const PRIVATE_IP_RANGES = [
  /^10\./,                    // 10.0.0.0/8
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,  // 172.16.0.0/12
  /^192\.168\./,              // 192.168.0.0/16
  /^127\./,                   // 127.0.0.0/8 (localhost)
  /^169\.254\./,              // 169.254.0.0/16 (link-local)
  /^0\./,                     // 0.0.0.0/8
  /^224\./,                   // 224.0.0.0/8 (multicast)
  /^240\./,                   // 240.0.0.0/8 (experimental)
  /^::1$/,                    // IPv6 localhost
  /^fe80:/,                   // IPv6 link-local
  /^fc00:/,                   // IPv6 unique local
  /^fd00:/                    // IPv6 unique local
];

/**
 * Enhanced DNS resolution to prevent SSRF via IP address bypass
 * @param hostname The hostname to resolve
 * @returns Promise<boolean> True if hostname resolves to safe IP
 */
async function validateHostnameResolution(hostname: string): Promise<boolean> {
  return new Promise((resolve) => {
    // Skip DNS resolution in test environment to prevent flaky tests
    if (process.env.NODE_ENV === 'test') {
      resolve(true);
      return;
    }
    
    const dns = require('dns');
    dns.resolve4(hostname, (err: any, addresses: string[]) => {
             if (err) {
         auditLogger.logViolation('DNS_RESOLUTION_FAILURE', hostname, {
           error: err.message
         });
         resolve(false);
         return;
       }
       
       // Check if any resolved IP is in private ranges
       for (const address of addresses) {
         const isPrivate = PRIVATE_IP_RANGES.some(range => range.test(address));
         if (isPrivate) {
           auditLogger.logViolation('PRIVATE_IP_RESOLUTION', hostname, {
             resolvedIP: address
           });
           resolve(false);
           return;
         }
       }
       
       auditLogger.logValidation('DNS_RESOLUTION', hostname, {
         resolvedAddresses: addresses
       });
      resolve(true);
    });
  });
}

/**
 * Creates a sanitized, immutable URL string that static analysis tools can trust
 * @security This function sanitizes URLs to prevent SSRF attacks
 * @param userProvidedUrl User-provided URL that may be malicious
 * @returns Sanitized URL string guaranteed to be safe for HTTP requests
 */
export function createSanitizedUrl(userProvidedUrl: string): string {
  // Step 1: Parse and validate structure
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(userProvidedUrl);
  } catch (error) {
    throw new SSRFError(userProvidedUrl, 'Invalid URL format');
  }

  // Step 2: Protocol enforcement (check first for clearer error messages)
  if (parsedUrl.protocol !== 'https:') {
    throw new SSRFError(userProvidedUrl, `Only HTTPS allowed, got: ${parsedUrl.protocol}`);
  }

  // Step 3: Check for localhost first (more specific error)
  if (parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '0.0.0.0') {
    throw new SSRFError(userProvidedUrl, `Blocked request to localhost: ${parsedUrl.hostname}`);
  }

  // Step 4: Check for private IP addresses (more specific error)
  const isPrivateIP = PRIVATE_IP_RANGES.some(range => range.test(parsedUrl.hostname));
  if (isPrivateIP) {
    throw new SSRFError(userProvidedUrl, `Blocked request to private IP address: ${parsedUrl.hostname}`);
  }

  // Step 5: Explicit domain allowlist check (general fallback)
  if (!ALLOWED_DOMAINS.includes(parsedUrl.hostname)) {
    throw new SSRFError(userProvidedUrl, `Domain not in allowlist: ${parsedUrl.hostname}`);
  }

  // Step 6: Reconstruct URL from validated components (removes any injection)
  const sanitizedUrl = `https://${parsedUrl.hostname}${parsedUrl.pathname}${parsedUrl.search}`;
  
  // Step 7: Final validation of reconstructed URL
  if (sanitizedUrl.length > MAX_URL_LENGTH) {
    throw new SSRFError(userProvidedUrl, 'URL too long - possible attack');
  }

  auditLogger.logValidation('URL_SANITIZATION', userProvidedUrl, {
    sanitizedUrl,
    hostname: parsedUrl.hostname
  });

  return sanitizedUrl;
}

/**
 * Validates a URL to prevent SSRF attacks with enhanced security (async version)
 * @param url The URL to validate
 * @returns Promise<boolean> True if URL is safe, false otherwise
 */
export async function validateUrlAsync(url: string): Promise<boolean> {
  try {
    const parsedUrl = new URL(url);
    
    // Only allow HTTPS protocol for enhanced security
    if (parsedUrl.protocol !== 'https:') {
      auditLogger.logAccess(url, 'URL_VALIDATION', 'denied', {
        reason: 'Only HTTPS allowed',
        protocol: parsedUrl.protocol
      });
      return false;
    }
    
    // Check if domain is in allowlist
    const isAllowedDomain = ALLOWED_DOMAINS.some(domain => 
      parsedUrl.hostname === domain || parsedUrl.hostname.endsWith(`.${domain}`)
    );
    
    if (!isAllowedDomain) {
      auditLogger.logAccess(url, 'URL_VALIDATION', 'denied', {
        reason: 'Domain not in allowlist',
        hostname: parsedUrl.hostname
      });
      return false;
    }
    
    // Check for private IP addresses in hostname
    const hostname = parsedUrl.hostname;
    const isPrivateIP = PRIVATE_IP_RANGES.some(range => range.test(hostname));
    
    if (isPrivateIP) {
      auditLogger.logAccess(url, 'URL_VALIDATION', 'denied', {
        reason: 'Private IP address',
        hostname
      });
      return false;
    }
    
    // Additional security checks
    if (hostname === 'localhost' || hostname === '0.0.0.0') {
      auditLogger.logAccess(url, 'URL_VALIDATION', 'denied', {
        reason: 'Localhost access',
        hostname
      });
      return false;
    }
    
    // Enhanced: Validate DNS resolution to prevent IP bypass
    const isDnsValid = await validateHostnameResolution(hostname);
    if (!isDnsValid) {
      auditLogger.logAccess(url, 'URL_VALIDATION', 'denied', {
        reason: 'DNS validation failed',
        hostname
      });
      return false;
    }

    auditLogger.logAccess(url, 'URL_VALIDATION', 'allowed', {
      hostname,
      protocol: parsedUrl.protocol
    });
    
    return true;
  } catch (error) {
    auditLogger.logAccess(url, 'URL_VALIDATION', 'denied', {
      reason: 'Invalid URL format',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return false;
  }
}

/**
 * Synchronous URL validation for backward compatibility
 * @param url The URL to validate
 * @returns True if URL is safe, false otherwise
 */
export function validateUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    
    // Only allow HTTPS protocol for enhanced security
    if (parsedUrl.protocol !== 'https:') {
      auditLogger.logAccess(url, 'URL_VALIDATION_SYNC', 'denied', {
        reason: 'Only HTTPS allowed',
        protocol: parsedUrl.protocol
      });
      return false;
    }
    
    // Check if domain is in allowlist
    const isAllowedDomain = ALLOWED_DOMAINS.some(domain => 
      parsedUrl.hostname === domain || parsedUrl.hostname.endsWith(`.${domain}`)
    );
    
    if (!isAllowedDomain) {
      auditLogger.logAccess(url, 'URL_VALIDATION_SYNC', 'denied', {
        reason: 'Domain not in allowlist',
        hostname: parsedUrl.hostname
      });
      return false;
    }
    
    // Check for private IP addresses
    const hostname = parsedUrl.hostname;
    const isPrivateIP = PRIVATE_IP_RANGES.some(range => range.test(hostname));
    
    if (isPrivateIP) {
      auditLogger.logAccess(url, 'URL_VALIDATION_SYNC', 'denied', {
        reason: 'Private IP address',
        hostname
      });
      return false;
    }
    
    // Additional security checks
    if (hostname === 'localhost' || hostname === '0.0.0.0') {
      auditLogger.logAccess(url, 'URL_VALIDATION_SYNC', 'denied', {
        reason: 'Localhost access',
        hostname
      });
      return false;
    }

    auditLogger.logAccess(url, 'URL_VALIDATION_SYNC', 'allowed', {
      hostname,
      protocol: parsedUrl.protocol
    });
    
    return true;
  } catch (error) {
    auditLogger.logAccess(url, 'URL_VALIDATION_SYNC', 'denied', {
      reason: 'Invalid URL format',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return false;
  }
} 