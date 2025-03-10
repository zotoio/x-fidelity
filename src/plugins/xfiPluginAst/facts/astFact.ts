import { FactDefn, FileData } from '../../../types/typeDefs';
import { logger } from '../../../utils/logger';
import { generateAst } from '../../../utils/astUtils';

export const astFact: FactDefn = {
    name: 'ast',
    fn: async (params: any, almanac: any) => {
        try {
            const fileData: FileData = await almanac.factValue('fileData');
            const result = generateAst(fileData);

            // Add the AST to the almanac for other facts/operators to use
            if (params?.resultFact) {
                logger.debug({ resultFact: params.resultFact }, 'Adding AST to almanac');
                almanac.addRuntimeFact(params.resultFact, result);
            }

            return result;
        } catch (error) {
            logger.error(`Error in AST fact: ${error}`);
            return { tree: null };
        }
    }
};
