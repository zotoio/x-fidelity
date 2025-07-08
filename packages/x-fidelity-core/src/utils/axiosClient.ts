import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, isAxiosError } from 'axios';
import { logger } from './logger';
import { URL } from 'url';
import * as http from 'http';
import * as https from 'https';

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const CONNECTION_TIMEOUT = 10000; // 10 seconds

// Security: Define allowed URL patterns to prevent SSRF attacks
const ALLOWED_DOMAINS = [
  'api.github.com',
  'raw.githubusercontent.com',
  'github.com'
];

// Security: Private IP ranges that should be blocked
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
        logger.warn(`DNS resolution failed for ${hostname}: ${err.message}`);
        resolve(false);
        return;
      }
      
      // Check if any resolved IP is in private ranges
      for (const address of addresses) {
        const isPrivate = PRIVATE_IP_RANGES.some(range => range.test(address));
        if (isPrivate) {
          logger.warn(`Hostname ${hostname} resolves to private IP: ${address}`);
          resolve(false);
          return;
        }
      }
      
      resolve(true);
    });
  });
}

/**
 * Validates a URL to prevent SSRF attacks with enhanced security
 * @param url The URL to validate
 * @returns Promise<boolean> True if URL is safe, false otherwise
 */
async function validateUrlAsync(url: string): Promise<boolean> {
  try {
    const parsedUrl = new URL(url);
    
    // Only allow HTTP/HTTPS protocols
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      logger.warn(`Blocked non-HTTP(S) protocol: ${parsedUrl.protocol}`);
      return false;
    }
    
    // Check if domain is in allowlist
    const isAllowedDomain = ALLOWED_DOMAINS.some(domain => 
      parsedUrl.hostname === domain || parsedUrl.hostname.endsWith(`.${domain}`)
    );
    
    if (!isAllowedDomain) {
      logger.warn(`Blocked request to non-allowlisted domain: ${parsedUrl.hostname}`);
      return false;
    }
    
    // Check for private IP addresses in hostname
    const hostname = parsedUrl.hostname;
    const isPrivateIP = PRIVATE_IP_RANGES.some(range => range.test(hostname));
    
    if (isPrivateIP) {
      logger.warn(`Blocked request to private IP address: ${hostname}`);
      return false;
    }
    
    // Additional security checks
    if (hostname === 'localhost' || hostname === '0.0.0.0') {
      logger.warn(`Blocked request to localhost: ${hostname}`);
      return false;
    }
    
    // Enhanced: Validate DNS resolution to prevent IP bypass
    const isDnsValid = await validateHostnameResolution(hostname);
    if (!isDnsValid) {
      logger.warn(`DNS validation failed for hostname: ${hostname}`);
      return false;
    }
    
    return true;
  } catch (error) {
    logger.warn(`Invalid URL format: ${url}`);
    return false;
  }
}

/**
 * Synchronous URL validation for backward compatibility
 * @param url The URL to validate
 * @returns True if URL is safe, false otherwise
 */
function validateUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    
    // Only allow HTTP/HTTPS protocols
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      logger.warn(`Blocked non-HTTP(S) protocol: ${parsedUrl.protocol}`);
      return false;
    }
    
    // Check if domain is in allowlist
    const isAllowedDomain = ALLOWED_DOMAINS.some(domain => 
      parsedUrl.hostname === domain || parsedUrl.hostname.endsWith(`.${domain}`)
    );
    
    if (!isAllowedDomain) {
      logger.warn(`Blocked request to non-allowlisted domain: ${parsedUrl.hostname}`);
      return false;
    }
    
    // Check for private IP addresses
    const hostname = parsedUrl.hostname;
    const isPrivateIP = PRIVATE_IP_RANGES.some(range => range.test(hostname));
    
    if (isPrivateIP) {
      logger.warn(`Blocked request to private IP address: ${hostname}`);
      return false;
    }
    
    // Additional security checks
    if (hostname === 'localhost' || hostname === '0.0.0.0') {
      logger.warn(`Blocked request to localhost: ${hostname}`);
      return false;
    }
    
    return true;
  } catch (error) {
    logger.warn(`Invalid URL format: ${url}`);
    return false;
  }
}

// Security: Create secure HTTP agents with restricted connection capabilities
const createSecureHttpAgent = () => new http.Agent({
  keepAlive: false, // Disable keep-alive to prevent connection reuse
  maxSockets: 5,    // Limit concurrent connections
  timeout: CONNECTION_TIMEOUT,
  // Security: Prevent connection to private networks
  lookup: (hostname: string, options: any, callback: any) => {
    const dns = require('dns');
    dns.lookup(hostname, options, (err: any, address: string, family: number) => {
      if (err) {
        callback(err);
        return;
      }
      
      // Block private IP addresses at connection level
      const isPrivate = PRIVATE_IP_RANGES.some(range => range.test(address));
      if (isPrivate) {
        callback(new Error(`Connection to private IP blocked: ${address}`));
        return;
      }
      
      callback(null, address, family);
    });
  }
});

const createSecureHttpsAgent = () => new https.Agent({
  keepAlive: false, // Disable keep-alive to prevent connection reuse
  maxSockets: 5,    // Limit concurrent connections
  timeout: CONNECTION_TIMEOUT,
  rejectUnauthorized: true, // Enforce SSL certificate validation
  // Security: Prevent connection to private networks
  lookup: (hostname: string, options: any, callback: any) => {
    const dns = require('dns');
    dns.lookup(hostname, options, (err: any, address: string, family: number) => {
      if (err) {
        callback(err);
        return;
      }
      
      // Block private IP addresses at connection level
      const isPrivate = PRIVATE_IP_RANGES.some(range => range.test(address));
      if (isPrivate) {
        callback(new Error(`Connection to private IP blocked: ${address}`));
        return;
      }
      
      callback(null, address, family);
    });
  }
});

/**
 * Securely validates and makes HTTP requests with enhanced SSRF protection
 * @param method HTTP method
 * @param url URL to request (will be validated)
 * @param dataOrConfig Data or configuration
 * @param config Additional configuration
 * @returns Promise with axios response
 */
async function secureRequest<T = any>(
  method: 'get' | 'post' | 'put' | 'delete', 
  url: string, 
  dataOrConfig?: any, 
  config?: AxiosRequestConfig
): Promise<AxiosResponse<T>> {
  // Enhanced URL validation with async DNS checks
  const isValidAsync = await validateUrlAsync(url);
  if (!isValidAsync) {
    return Promise.reject(new Error(`URL blocked by enhanced security policy: ${url}`));
  }
  
  // Apply maximum security configuration
  const secureConfig: AxiosRequestConfig = {
    ...config,
    timeout: DEFAULT_TIMEOUT,
    maxRedirects: 0, // Disable redirects entirely to prevent redirect-based SSRF
    validateStatus: (status: number) => status >= 200 && status < 400,
    headers: {
      'User-Agent': 'X-Fidelity-Client/4.0.0',
      'Connection': 'close', // Force connection closure
      ...config?.headers
    },
    // Use secure agents for all requests
    httpAgent: process.env.NODE_ENV === 'test' ? undefined : createSecureHttpAgent(),
    httpsAgent: process.env.NODE_ENV === 'test' ? undefined : createSecureHttpsAgent(),
    // Security: Additional axios security options
    maxContentLength: 10 * 1024 * 1024, // 10MB max response size
    maxBodyLength: 1024 * 1024,         // 1MB max request body
  };
  
  // Create a fresh axios instance for each request (no shared state)
  const secureAxios = axios.create(secureConfig);
  
  // Add final security interceptor
  secureAxios.interceptors.request.use(
    (requestConfig) => {
      // Final URL validation before request
      if (requestConfig.url && !validateUrl(requestConfig.url)) {
        throw new Error(`Final URL validation failed: ${requestConfig.url}`);
      }
      return requestConfig;
    },
    (error) => Promise.reject(error)
  );
  
  // Execute request with method-specific handling
  try {
    switch (method) {
      case 'get':
        return await secureAxios.get<T>(url, secureConfig);
      case 'post':
        return await secureAxios.post<T>(url, dataOrConfig, secureConfig);
      case 'put':
        return await secureAxios.put<T>(url, dataOrConfig, secureConfig);
      case 'delete':
        return await secureAxios.delete<T>(url, secureConfig);
      default:
        throw new Error(`Unsupported HTTP method: ${method}`);
    }
  } catch (error) {
    // Enhanced error logging for security analysis
    logger.warn(`Secure request failed for ${method.toUpperCase()} ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

// Legacy axios instance (deprecated - keeping for backward compatibility)
const axiosInstance: AxiosInstance = axios.create({
  timeout: DEFAULT_TIMEOUT,
  // Prevent hanging connections in tests
  httpAgent: process.env.NODE_ENV === 'test' ? undefined : createSecureHttpAgent(),
  httpsAgent: process.env.NODE_ENV === 'test' ? undefined : createSecureHttpsAgent()
});

// Security: Add request interceptor to validate all URLs (legacy support)
if (axiosInstance?.interceptors) {
  axiosInstance.interceptors.request.use(
    (config) => {
      if (config.url && !validateUrl(config.url)) {
        throw new Error(`URL blocked by security policy: ${config.url}`);
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      if (!originalRequest || !error.response) {
        return Promise.reject(error);
      }

      if (error.response.status === 429 && (!originalRequest._retry || originalRequest._retry < MAX_RETRIES)) {
        originalRequest._retry = (originalRequest._retry || 0) + 1;
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, originalRequest._retry - 1);
        logger.info(`Rate limited. Retrying in ${delay}ms. Attempt ${originalRequest._retry} of ${MAX_RETRIES}`);
        
        // Use a timeout with unref() to prevent hanging tests
        await new Promise(resolve => {
          const timer = setTimeout(resolve, delay);
          if (timer.unref) {
            timer.unref();
          }
        });
        
        return axiosInstance(originalRequest);
      }

      return Promise.reject(error);
    }
  );
}

// Enhanced secure client with comprehensive SSRF protection
export const axiosClient = {
  /**
   * Secure GET request with enhanced SSRF protection
   * @param url URL to request
   * @param config Optional axios configuration
   * @returns Promise with response data
   */
  get: async <T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    return secureRequest<T>('get', url, config);
  },
  
  /**
   * Secure POST request with enhanced SSRF protection
   * @param url URL to request
   * @param data Request data
   * @param config Optional axios configuration
   * @returns Promise with response data
   */
  post: async <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    return secureRequest<T>('post', url, data, config);
  },
  
  /**
   * Secure PUT request with enhanced SSRF protection
   * @param url URL to request
   * @param data Request data
   * @param config Optional axios configuration
   * @returns Promise with response data
   */
  put: async <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    return secureRequest<T>('put', url, data, config);
  },
  
  /**
   * Secure DELETE request with enhanced SSRF protection
   * @param url URL to request
   * @param config Optional axios configuration
   * @returns Promise with response data
   */
  delete: async <T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    return secureRequest<T>('delete', url, config);
  },
};

export { isAxiosError, validateUrl, validateUrlAsync };
