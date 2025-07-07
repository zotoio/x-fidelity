import { OperatorDefn } from '@x-fidelity/types';
import { RemoteValidationResult } from '../types';

export const invalidRemoteValidationOperator: OperatorDefn = {
    name: 'invalidRemoteValidation',
    description: 'Checks if remote validation failed',
    fn: (factValue: any, compareToValue: any) => {
        if (!factValue || typeof factValue.isValid !== 'boolean') {
            return false;
        }
        return !factValue.isValid === compareToValue;
    }
};