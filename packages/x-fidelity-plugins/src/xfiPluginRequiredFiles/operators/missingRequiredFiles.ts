import { OperatorDefn } from '@x-fidelity/types';
// TODO: Import logger from core package when available
import { logger } from '@x-fidelity/core';

interface RequiredFilesResult {
    missing: string[];
    total: number;
    found: number;
}

export const missingRequiredFilesOperator: OperatorDefn = {
    name: 'missingRequiredFiles',
    description: 'Checks if the number of missing required files exceeds a threshold',
    fn: (factValue: any, compareToValue: any) => {
        if (!factValue || !Array.isArray(factValue.missing)) {
            return false;
        }
        return factValue.missing.length > compareToValue;
    }
};
