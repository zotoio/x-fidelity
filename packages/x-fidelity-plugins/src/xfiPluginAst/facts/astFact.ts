import { FactDefn, FileData } from '@x-fidelity/types';
import { logger } from '@x-fidelity/core';
import { generateAst } from '../../sharedPluginUtils/astUtils';

export const astFact: FactDefn = {
    name: 'ast',
    description: 'Uses precomputed AST from file preprocessing or generates AST for code analysis using centralized Tree-sitter worker',
    type: 'iterative-function',  // ✅ Iterative function - runs once per file (default behavior)
    priority: 1,                 // ✅ High priority since other facts depend on AST
    fn: async (params: any, almanac: any) => {
        const startTime = Date.now();
        try {
            const fileData: FileData = await almanac.factValue('fileData');
            
            if (!fileData) {
                logger.debug('No fileData available for AST generation');
                return { tree: null };
            }

            // ✅ OPTIMIZATION: Check for precomputed AST first
            if (fileData.ast) {
                logger.debug(`[AST Optimization] Using precomputed AST for ${fileData.fileName} (generated in ${fileData.astGenerationTime || 0}ms)`);
                
                // Add the precomputed AST to the almanac for other facts/operators to use
                if (params?.resultFact) {
                    logger.debug('Adding precomputed AST to almanac:', params.resultFact);
                    almanac.addRuntimeFact(params.resultFact, fileData.ast);
                }
                
                return fileData.ast;
            }

            // ✅ FALLBACK: Generate AST if not precomputed (for backward compatibility)
            logger.debug(`[AST Fallback] No precomputed AST found for ${fileData.fileName}, generating on-demand`);

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
            const result = await generateAst(astData);
            const astEndTime = Date.now();
            
            const totalTime = astEndTime - startTime;
            const astGenTime = astEndTime - astStartTime;
            
            logger.debug(`AST TIMING: ${fileData.fileName} - Total: ${totalTime}ms, AST Gen: ${astGenTime}ms, Content size: ${content.length} chars`);

            // Add the AST to the almanac for other facts/operators to use
            if (params?.resultFact) {
                logger.debug('Adding generated AST to almanac:', params.resultFact);
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
