import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, isAxiosError } from 'axios';
import { logger } from './logger';

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const CONNECTION_TIMEOUT = 10000; // 10 seconds

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

export const axiosClient = {
  get: <T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => 
    axiosInstance.get(url, config),
  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => 
    axiosInstance.post(url, data, config),
  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => 
    axiosInstance.put(url, data, config),
  delete: <T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => 
    axiosInstance.delete(url, config),
};

export { isAxiosError };
