import { FactDefn, FileData } from '@x-fidelity/types';
import { logger } from '@x-fidelity/core';
import { generateAst } from '../../sharedPluginUtils/astUtils';

export const astFact: FactDefn = {
    name: 'ast',
    description: 'Generates AST for code analysis',
    fn: async (params: any, almanac: any) => {
        const startTime = Date.now();
        try {
            const fileData: FileData = await almanac.factValue('fileData');
            
            if (!fileData) {
                logger.debug('No fileData available for AST generation');
                return { tree: null };
            }

            if (!fileData.content && !fileData.fileContent) {
                logger.debug('No file content available for AST generation');
                return { tree: null };
            }

            // Use content or fileContent, whichever is available
            const content = fileData.content || fileData.fileContent;
            if (!content || typeof content !== 'string') {
                logger.debug('File content is not a valid string for AST generation');
                return { tree: null };
            }

            const astData = {
                ...fileData,
                content: content
            };

            const astStartTime = Date.now();
            const result = generateAst(astData);
            const astEndTime = Date.now();
            
            const totalTime = astEndTime - startTime;
            const astGenTime = astEndTime - astStartTime;
            
            logger.debug(`AST TIMING: ${fileData.fileName} - Total: ${totalTime}ms, AST Gen: ${astGenTime}ms, Content size: ${content.length} chars`);

            // Add the AST to the almanac for other facts/operators to use
            if (params?.resultFact) {
                logger.debug('Adding AST to almanac:', params.resultFact);
                almanac.addRuntimeFact(params.resultFact, result);
            }

            return result;
        } catch (error) {
            const totalTime = Date.now() - startTime;
            logger.error(`AST TIMING: Error after ${totalTime}ms - ${error}`);
            return { tree: null };
        }
    }
};
