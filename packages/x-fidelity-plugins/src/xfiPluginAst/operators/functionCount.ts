import { OperatorDefn } from '@x-fidelity/types';

export const functionCountOperator: OperatorDefn<{ count: number }, number> = {
    name: 'functionCount',
    description: 'Checks if the number of functions in a file exceeds a threshold',
    fn: (factValue, compareToValue) => {
        if (!factValue || typeof factValue.count !== 'number') {
            return false;
        }
        return factValue.count > compareToValue;
    }
};
