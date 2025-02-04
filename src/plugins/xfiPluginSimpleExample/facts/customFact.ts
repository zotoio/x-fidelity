import { FactDefn } from '../../../types/typeDefs';

export const customFact: FactDefn = {
    name: 'customFact',
    fn: async () => {
        return { result: 'custom fact data' };
    }
};
