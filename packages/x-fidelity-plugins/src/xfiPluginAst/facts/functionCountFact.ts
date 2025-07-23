import { FactDefn, FileData, AstResult } from '@x-fidelity/types';
import { logger } from '@x-fidelity/core';

export const functionCountFact: FactDefn = {
    name: 'functionCount',
    description: 'Counts the number of functions in a file using precomputed AST',
    type: 'iterative-function',  // ✅ Iterative function - runs once per file (default behavior)
    priority: 2,                 // ✅ Lower priority than AST fact (depends on AST)
    fn: async (params: unknown, almanac?: any) => {
        try {
            // Get fileData from almanac - SAME AS FUNCTIONCOMPLEXITY
            const fileData = await almanac?.factValue('fileData');
            
            if (!fileData) {
                logger.debug('No fileData available for functionCount fact');
                return { count: 0 };
            }

            if (!fileData.content && !fileData.fileContent) {
                logger.debug('No file content available for functionCount fact');
                return { count: 0 };
            }

            // ✅ USE PRECOMPUTED AST: Get precomputed AST from fileData (no fallback needed)
            let astResult = fileData.ast;
            
            // If no precomputed AST, try to get from almanac (for backward compatibility)
            if (!astResult) {
                try {
                    astResult = await almanac?.factValue('ast');
                } catch (error) {
                    logger.debug('No AST available for functionCount fact');
                }
            }

            if (!astResult || !astResult.tree) {
                logger.debug(`No AST available for ${fileData.fileName || 'unknown file'} in functionCount fact`);
                return { count: 0 };
            }

            let count = 0;

            // In tree-sitter, the tree object IS the root node itself!
            const rootNode = astResult.rootNode || astResult.tree;
            if (!rootNode) {
                logger.debug(`No AST root node available for ${fileData.fileName || 'unknown file'}`);
                return { count: 0 };
            }

            // Enhanced function detection for TypeScript and JavaScript
            
            // Recursive function to traverse the AST
            const traverse = (node: any) => {
                // Check if the current node is a function
                if (node.type === 'function_declaration' || 
                    node.type === 'arrow_function' || 
                    node.type === 'function_expression' ||
                    node.type === 'method_definition' ||
                    node.type === 'function' ||
                    node.type === 'generator_function' ||
                    node.type === 'async_function' ||
                    node.type === 'generator_function_declaration' ||
                    node.type === 'async_function_declaration') {
                    count++;
                }
                
                // Recursively traverse child nodes
                if (node.children) {
                    for (const child of node.children) {
                        traverse(child);
                    }
                }
            };

            traverse(rootNode);

            logger.debug(`Found ${count} functions in ${fileData.fileName || 'unknown file'}`);
            return { count };

        } catch (error) {
            logger.error(`Error in functionCount fact: ${error}`);
            return { count: 0 };
        }
    }
};
