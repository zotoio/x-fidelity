import { ScanResult } from '@x-fidelity/types';
import { logger } from './logger';

export function getFormattedDate(): string {
    const now = new Date();
    return now.toISOString().split('T')[0];
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

