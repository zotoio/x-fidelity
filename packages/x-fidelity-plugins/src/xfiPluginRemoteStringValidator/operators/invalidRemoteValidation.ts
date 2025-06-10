import { OperatorDefn } from '@x-fidelity/types';
import { RemoteValidationResult } from '@x-fidelity/types';

export const invalidRemoteValidationOperator: OperatorDefn<RemoteValidationResult, boolean> = {
    name: 'invalidRemoteValidation',
    description: 'Checks if remote validation failed',
    fn: (factValue, compareToValue) => {
        if (!factValue || typeof factValue.isValid !== 'boolean') {
            return false;
        }
        return !factValue.isValid === compareToValue;
    }
};