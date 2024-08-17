import { ScanResult } from "../types/typeDefs";

export const countRuleFailures = (scanResults: ScanResult[], level?: string): number => {
    return scanResults.reduce((total, scanResult) => {
        const filteredErrors = level 
            ? scanResult.errors.filter(error => error.level === level)
            : scanResult.errors;
        return total + filteredErrors.length;
    }, 0);
}