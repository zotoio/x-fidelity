import { OperatorDefn } from '@x-fidelity/types';
import { pluginLogger } from '@x-fidelity/core';

/**
 * Example custom operator that performs simple equality comparison
 * Demonstrates basic operator implementation pattern
 */
interface CustomFactResult {
    value: string | null;
}

export const customOperator: OperatorDefn = {
    name: 'customOperator',
    description: 'A simple example operator with enhanced logging support',
    fn: (factValue: any, operatorValue: any) => {
        // Create operator-specific logger
        const operatorLogger = pluginLogger.createOperationLogger('xfi-plugin-simple-example', 'customOperator');
        
        try {
            operatorLogger.debug('Executing custom operator', {
                factValue: typeof factValue,
                operatorValue: typeof operatorValue,
                factValueSample: factValue !== null && factValue !== undefined ? String(factValue).substring(0, 100) : 'null/undefined'
            });

            // Extract value from factValue object and check if it's truthy and equals operatorValue
            const extractedValue = factValue && factValue.value;
            const result = Boolean(extractedValue) && extractedValue === operatorValue;

            operatorLogger.debug('Custom operator completed', {
                result,
                extractedValue,
                operatorValue,
                comparison: `${extractedValue} === ${operatorValue} && truthy check`
            });

            return result;
        } catch (error) {
            operatorLogger.error('Error in customOperator:', error);
            return false;
        }
    }
};
