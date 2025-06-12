import { OperatorDefn } from '@x-fidelity/types';

export const functionCountOperator: OperatorDefn = {
    name: 'functionCount',
    description: 'Checks if the number of functions in a file exceeds a threshold',
    fn: (factValue: any, compareToValue: any) => {
        if (!factValue || typeof factValue.count !== 'number') {
            return false;
        }
        return factValue.count > compareToValue;
    }
};
