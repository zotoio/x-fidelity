import { FactDefn, FileData } from '@x-fidelity/types';
import { logger, generateAst } from '@x-fidelity/core';

export const astFact: FactDefn = {
    name: 'ast',
    description: 'Generates AST for code analysis',
    fn: async (params: any, almanac: any) => {
        try {
            const fileData: FileData = await almanac.factValue('fileData');
            const result = generateAst(fileData);

            // Add the AST to the almanac for other facts/operators to use
            if (params?.resultFact) {
                console.trace({ resultFact: params.resultFact }, 'Adding AST to almanac');
                almanac.addRuntimeFact(params.resultFact, result);
            }

            return result;
        } catch (error) {
            console.error(`Error in AST fact: ${error}`);
            return { tree: null };
        }
    }
}; 