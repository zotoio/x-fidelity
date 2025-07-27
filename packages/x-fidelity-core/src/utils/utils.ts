import { ScanResult } from '@x-fidelity/types';
import { logger } from './logger';

export function getFormattedDate(): string {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const timestamp = now.getTime();
    return `${date}-${timestamp}`;
}

export const countRuleFailures = (scanResults: ScanResult[], level?: string): number => {
    return scanResults.reduce((total, scanResult) => {
        const filteredErrors = level 
            ? scanResult.errors.filter(error => error.level === level)
            : scanResult.errors;
        return total + filteredErrors.length;
    }, 0);
}

export function safeStringify(obj: any): string {
    logger.trace({ obj }, 'safeStringify object');
    return JSON.stringify(obj, null, 2);
}

export function safeClone(obj: any): any {
    const seen = new WeakSet();
    return JSON.parse(JSON.stringify(obj, (key, value) => {
        if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) {
                return '[Circular]';
            }
            seen.add(value);
        }
        return value;
    }));
}

/**
 * Creates a localized timestamp with GMT offset showing local time
 * @returns Formatted timestamp like "2025-07-27 16:22 GMT+1000"
 */
export function createLocalizedTimestamp(): string {
  const now = new Date();
  
  // Get timezone offset in minutes and convert to GMT offset format
  const offsetMinutes = now.getTimezoneOffset();
  const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
  const offsetMins = Math.abs(offsetMinutes) % 60;
  const offsetSign = offsetMinutes <= 0 ? '+' : '-'; // Note: getTimezoneOffset returns positive for behind UTC
  const offsetString = `GMT${offsetSign}${offsetHours.toString().padStart(2, '0')}${offsetMins.toString().padStart(2, '0')}`;
  
  // Format as local date and time with GMT offset
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes} ${offsetString}`;
}

/**
 * Creates an ISO timestamp with local timezone offset for logging
 * @returns Formatted timestamp like "2025-07-27T16:22GMT+1000"
 */
export function createLocalizedISOTimestamp(): string {
  const now = new Date();
  
  // Get timezone offset in minutes and convert to GMT offset format
  const offsetMinutes = now.getTimezoneOffset();
  const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
  const offsetMins = Math.abs(offsetMinutes) % 60;
  const offsetSign = offsetMinutes <= 0 ? '+' : '-';
  const offsetString = `GMT${offsetSign}${offsetHours.toString().padStart(2, '0')}${offsetMins.toString().padStart(2, '0')}`;
  
  // Format as local date and time in ISO-like format with GMT offset
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}${offsetString}`;
}

