import { OperatorDefn } from '../../../types/typeDefs';

export const errorDemoOperator: OperatorDefn = {
    name: 'errorDemoOperator',
    fn: (factValue: any, expectedValue: any) => {
        // Demonstrate different error scenarios based on input
        switch(expectedValue) {
            case 'throw-operator-error':
                const error = new Error('Operator execution failed');
                (error as any).isOperatorError = true;
                throw error;
            
            case 'throw-plugin-error':
                throw new Error('Plugin-level error occurred');
            
            case 'throw-fatal':
                const fatalError = new Error('Fatal operator error');
                (fatalError as any).isFatal = true;
                throw fatalError;
            
            default:
                return factValue === expectedValue;
        }
    }
};
