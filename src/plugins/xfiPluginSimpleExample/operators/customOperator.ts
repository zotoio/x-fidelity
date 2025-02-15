import { OperatorDefn } from '../../../types/typeDefs';

export const customOperator: OperatorDefn = {
    name: 'customOperator',
    fn: (factValue: any, expectedValue: any) => {
        return factValue === expectedValue;
    }
};
