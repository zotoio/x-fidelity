import type { FactDefn, FileData} from '@x-fidelity/core';
import { logger, generateAst } from '@x-fidelity/core';

export const astFact: FactDefn = {
    name: 'ast',
    description: 'Generates AST for a file',
    fn: async (params: unknown) => {
        const fileData = params as FileData;
        logger.debug('Generating AST for file:', fileData.filePath);
        return generateAst(fileData);
    }
}; 