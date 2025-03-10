import { FactDefn, FileData } from '../../../types/typeDefs';
import { logger } from '../../../utils/logger';
import { generateAst } from '../../../utils/astUtils';

export const functionCountFact: FactDefn = {
    name: 'functionCount',
    fn: async (params: any, almanac: any) => {
        try {
            const fileData: FileData = await almanac.factValue('fileData');
            const { tree } = generateAst(fileData);
            
            if (!tree) {
                logger.debug('No AST available for function count analysis');
                return { count: 0 };
            }

            // Find all function nodes
            const functionNodes: any[] = [];
            function visit(node: any) {
                if (node.type === 'function_declaration' || 
                    node.type === 'function_expression' ||
                    node.type === 'arrow_function') {
                    functionNodes.push(node);
                }
                
                for (let child of node.children || []) {
                    visit(child);
                }
            }
            
            visit(tree.rootNode);
            
            const result = {
                count: functionNodes.length,
                functions: functionNodes.map(node => ({
                    name: node.type === 'function_declaration' ? 
                        (node.descendantsOfType('identifier')[0]?.text || 'anonymous') : 
                        'anonymous',
                    location: {
                        start: node.startPosition,
                        end: node.endPosition
                    }
                }))
            };

            logger.debug({
                filePath: fileData.filePath,
                functionCount: result.count,
                functions: result.functions
            }, 'Completed function count analysis');

            // Add result to almanac if resultFact param provided
            if (params?.resultFact) {
                almanac.addRuntimeFact(params.resultFact, result);
            }

            return result;
        } catch (error) {
            logger.error(`Error in function count analysis: ${error}`);
            return { count: 0, functions: [] };
        }
    }
};
