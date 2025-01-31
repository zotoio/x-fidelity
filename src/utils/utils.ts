import { ScanResult } from "../types/typeDefs";

export const countRuleFailures = (scanResults: ScanResult[], level?: string): number => {
    return scanResults.reduce((total, scanResult) => {
        const filteredErrors = level 
            ? scanResult.errors.filter(error => error.level === level)
            : scanResult.errors;
        return total + filteredErrors.length;
    }, 0);
}
import { logger } from './logger';

export function safeStringify(obj: any): string {
    return logger.debug({ obj }, 'Serializing object').obj;
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

