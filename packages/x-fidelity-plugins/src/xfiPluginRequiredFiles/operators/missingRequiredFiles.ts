import { OperatorDefn } from '@x-fidelity/types';
import { logger } from '@x-fidelity/core';

interface RequiredFilesResult {
    missing: string[];
    total: number;
    found: number;
}

export const missingRequiredFilesOperator: OperatorDefn = {
    name: 'missingRequiredFiles',
    description: 'Checks if the number of missing required files exceeds a threshold',
    fn: (factValue: RequiredFilesResult, compareToValue: any) => {
        logger.debug('factValue', factValue);
        logger.debug('compareToValue', compareToValue);
        if (!factValue || !Array.isArray(factValue.missing)) {
            return false;
        }
        return factValue.missing.length > compareToValue;
    }
};
