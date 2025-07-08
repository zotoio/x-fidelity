import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, isAxiosError } from 'axios';
import { logger } from './logger';
import { URL } from 'url';

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
 * Validates a URL to prevent SSRF attacks
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

/**
 * Securely validates and makes HTTP requests with SSRF protection
 * @param url The URL to request
 * @param config Optional axios configuration
 * @returns Promise with axios response
 */
function secureRequest<T = any>(
  method: 'get' | 'post' | 'put' | 'delete', 
  url: string, 
  dataOrConfig?: any, 
  config?: AxiosRequestConfig
): Promise<AxiosResponse<T>> {
  // Validate URL before making request
  if (!validateUrl(url)) {
    throw new Error(`URL blocked by security policy: ${url}`);
  }
  
  // Apply security headers
  const secureConfig = {
    ...config,
    headers: {
      'User-Agent': 'X-Fidelity-Client/4.0.0',
      ...config?.headers
    },
    // Prevent following redirects to untrusted domains
    maxRedirects: 3,
    validateStatus: (status: number) => status >= 200 && status < 400
  };
  
  if (!axiosInstance) {
    throw new Error('Axios instance not initialized');
  }
  
  switch (method) {
    case 'get':
      return axiosInstance.get(url, secureConfig);
    case 'post':
      return axiosInstance.post(url, dataOrConfig, secureConfig);
    case 'put':
      return axiosInstance.put(url, dataOrConfig, secureConfig);
    case 'delete':
      return axiosInstance.delete(url, secureConfig);
    default:
      throw new Error(`Unsupported HTTP method: ${method}`);
  }
}

const axiosInstance: AxiosInstance = axios.create({
  timeout: DEFAULT_TIMEOUT,
  // Prevent hanging connections in tests
  httpAgent: process.env.NODE_ENV === 'test' ? undefined : new (require('http').Agent)({
    keepAlive: true,
    keepAliveMsecs: 30000,
    timeout: CONNECTION_TIMEOUT,
    maxSockets: 50,
    maxFreeSockets: 10
  }),
  httpsAgent: process.env.NODE_ENV === 'test' ? undefined : new (require('https').Agent)({
    keepAlive: true,
    keepAliveMsecs: 30000,
    timeout: CONNECTION_TIMEOUT,
    maxSockets: 50,
    maxFreeSockets: 10
  })
});

// Security: Add request interceptor to validate all URLs
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

export const axiosClient = {
  get: <T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => 
    secureRequest('get', url, config),
  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => 
    secureRequest('post', url, data, config),
  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => 
    secureRequest('put', url, data, config),
  delete: <T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => 
    secureRequest('delete', url, config),
};

export { isAxiosError, validateUrl };
