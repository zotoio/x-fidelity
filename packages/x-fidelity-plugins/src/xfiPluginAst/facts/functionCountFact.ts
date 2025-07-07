import { FactDefn, FileData } from '@x-fidelity/types';
import { AstResult, generateAst } from '../../sharedPluginUtils/astUtils';
import { logger } from '@x-fidelity/core';

export const functionCountFact: FactDefn = {
    name: 'functionCount',
    description: 'Counts the number of functions in a file using precomputed AST',
    type: 'iterative-function',  // ✅ Iterative function - runs once per file (default behavior)
    priority: 2,                 // ✅ Lower priority than AST fact (depends on AST)
    fn: async (params: unknown, almanac?: any) => {
        try {
            const fileData = params as FileData;
            const ast = await almanac?.factValue('ast') as AstResult;
            let count = 0;

            if (!ast || !ast.rootNode) {
                return { count: 0 };
            }

            const visit = (node: any) => {
                if (node.type === 'function_declaration' || node.type === 'arrow_function') {
                    count++;
                }

                for (const child of node.children || []) {
                    visit(child);
                }
            };

            visit(ast.rootNode);
            return { count };
        } catch (error) {
            logger.error('Error in functionCount fact:', error);
            return { count: 0 };
        }
    }
};
