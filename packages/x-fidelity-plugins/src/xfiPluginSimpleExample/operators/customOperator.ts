import { OperatorDefn } from '@x-fidelity/types';
import { logger } from '@x-fidelity/core';

/**
 * Example custom operator that performs simple equality comparison
 * Demonstrates basic operator implementation pattern
 */
interface CustomFactResult {
    value: string | null;
}

export const customOperator: OperatorDefn = {
    name: 'customOperator',
    description: 'A simple example operator',
    fn: (factValue: CustomFactResult, compareToValue: any) => {
        if (!factValue || !factValue.value) {
            return false;
        }
        return factValue.value === compareToValue;
    }
};
