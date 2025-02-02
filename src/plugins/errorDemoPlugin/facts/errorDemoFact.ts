import { FactDefn } from '../../../types/typeDefs';

export const errorDemoFact: FactDefn = {
    name: 'errorDemoFact',
    fn: async (params: any) => {
        // Demonstrate different error scenarios based on params
        switch(params?.errorType) {
            case 'fact-error':
                const error = new Error('Fact execution failed');
                (error as any).isFactError = true;
                throw error;
            
            case 'async-error':
                await new Promise(resolve => setTimeout(resolve, 100));
                throw new Error('Async fact error occurred');
            
            case 'validation-error':
                throw new Error('Fact validation failed');
            
            default:
                return { result: params?.value || 'default value' };
        }
    }
};
