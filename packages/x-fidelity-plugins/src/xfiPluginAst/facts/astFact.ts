import { FactDefn, FileData, AstResult } from '@x-fidelity/types';
import { logger, LoggerProvider } from '@x-fidelity/core';
import { generateAst } from '../../sharedPluginUtils/astUtils';

export const astFact: FactDefn = {
    name: 'ast',
    description: 'Uses precomputed AST from file preprocessing or generates AST for code analysis using centralized Tree-sitter worker',
    type: 'iterative-function',  // ✅ Iterative function - runs once per file (default behavior)
    priority: 1,                 // ✅ High priority since other facts depend on AST
    fn: async (params: any, almanac: any) => {
        const startTime = Date.now();
        
        // 🎯 CREATE CORRELATION-AWARE METADATA FOR ALL LOGS
        const createCorrelatedMeta = (additionalMeta: Record<string, any> = {}) => {
            return LoggerProvider.createCorrelationMetadata({
                ...additionalMeta,
                fact: 'ast',
                factType: 'iterative-function',
                factPriority: 1
            });
        };
        
        try {
            const fileData: FileData = await almanac.factValue('fileData');
            
            if (!fileData) {
                logger.debug('AST Fact: No fileData available', createCorrelatedMeta());
                return { tree: null };
            }

            // ✅ USE PRECOMPUTED AST: Check for precomputed AST from fileData collection (priority 15)
            if (fileData.ast) {
                const totalTime = Date.now() - startTime;
                logger.info(`AST Fact: Using precomputed AST for ${fileData.fileName} (${fileData.astGenerationTime || 0}ms)`, 
                    createCorrelatedMeta({
                        fileName: fileData.fileName,
                        astGenerationTime: fileData.astGenerationTime,
                        totalTime,
                        precomputed: true
                    })
                );
                
                // Add the precomputed AST to the almanac for other facts/operators to use
                if (params?.resultFact) {
                    logger.debug(`Adding precomputed AST to almanac: ${params.resultFact}`, createCorrelatedMeta({
                        resultFact: params.resultFact,
                        astSource: 'precomputed'
                    }));
                    almanac.addRuntimeFact(params.resultFact, fileData.ast);
                }
                
                return fileData.ast;
            }

            // ✅ FALLBACK: Generate AST if not precomputed (for backward compatibility or unsupported files)
            logger.info(`AST Fact: No precomputed AST available for ${fileData.fileName}, generating on-demand`, 
                createCorrelatedMeta({
                    fileName: fileData.fileName,
                    fallback: true
                })
            );

            if (!fileData.content && !fileData.fileContent) {
                logger.warn(`AST Fact: No file content available for ${fileData.fileName}`, 
                    createCorrelatedMeta({
                        fileName: fileData.fileName,
                        issue: 'no-content'
                    })
                );
                return { tree: null };
            }

            // Use content or fileContent, whichever is available
            const content = fileData.content || fileData.fileContent;
            if (!content || typeof content !== 'string') {
                logger.warn(`AST Fact: Invalid content type for ${fileData.fileName}`, 
                    createCorrelatedMeta({
                        fileName: fileData.fileName,
                        contentType: typeof content,
                        issue: 'invalid-content-type'
                    })
                );
                return { tree: null };
            }

            const astData = {
                ...fileData,
                content: content
            };

            const astStartTime = Date.now();
            const result: AstResult = await generateAst(astData);
            const astEndTime = Date.now();
            
            const totalTime = astEndTime - startTime;
            const astGenTime = astEndTime - astStartTime;
            
            // 🎯 ALWAYS LOG AST FACT RESULTS AT INFO LEVEL WITH CORRELATION
            if (result.tree) {
                logger.info(`AST Fact: Generated AST for ${fileData.fileName} using ${result.mode || 'unknown'} - Total: ${totalTime}ms, AST: ${astGenTime}ms`, 
                    createCorrelatedMeta({
                        fileName: fileData.fileName,
                        astMode: result.mode,
                        totalTime,
                        astGenTime,
                        success: true,
                        hasErrors: result.hasErrors,
                        fallback: true
                    })
                );
            } else {
                logger.warn(`AST Fact: Failed AST for ${fileData.fileName} using ${result.mode || 'unknown'} - Total: ${totalTime}ms, Reason: ${result.reason}`, 
                    createCorrelatedMeta({
                        fileName: fileData.fileName,
                        astMode: result.mode,
                        totalTime,
                        astGenTime,
                        success: false,
                        reason: result.reason,
                        fallback: true
                    })
                );
            }

            // Add the AST to the almanac for other facts/operators to use
            if (params?.resultFact) {
                logger.debug(`Adding generated AST to almanac: ${params.resultFact}`, createCorrelatedMeta({
                    resultFact: params.resultFact,
                    astSource: 'generated',
                    astMode: result.mode
                }));
                almanac.addRuntimeFact(params.resultFact, result);
            }

            return result;
        } catch (error) {
            const totalTime = Date.now() - startTime;
            // 🎯 ERRORS NEVER HIDDEN - WITH CORRELATION
            logger.error(`AST Fact: Exception after ${totalTime}ms - ${error}`, 
                createCorrelatedMeta({
                    totalTime,
                    errorType: error instanceof Error ? error.constructor.name : 'Unknown',
                    errorMessage: error instanceof Error ? error.message : String(error)
                })
            );
            return { tree: null };
        }
    }
};
