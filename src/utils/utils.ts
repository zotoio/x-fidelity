import { ScanResult } from "../types/typeDefs";

export const countRuleFailures = (scanResults: ScanResult[], level?: string): number => {
    return scanResults.reduce((total, scanResult) => {
        const filteredErrors = level 
            ? scanResult.errors.filter(error => error.level === level)
            : scanResult.errors;
        return total + filteredErrors.length;
    }, 0);
}
export function safeStringify(obj: any, indent = 2): string {
    const cache = new Set();
    return JSON.stringify(obj, (key, value) => {
        if (typeof value === 'object' && value !== null) {
            if (cache.has(value)) {
                return '[Circular]';
            }
            cache.add(value);
        }
        return value;
    }, indent);
}export function safeClone(obj: any): any {
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

