import { FactDefn, FileData } from '../../../types/typeDefs';
import { logger } from '../../../utils/logger';
import { SyntaxNode } from 'tree-sitter';
import { generateAst } from '../../../utils/astUtils';

export const functionComplexityFact: FactDefn = {
    name: 'functionComplexity',
    fn: async (params: any, almanac: any) => {
        try {
            const fileData: FileData = await almanac.factValue('fileData');
            const { tree } = generateAst(fileData);
            
            if (!tree) {
                logger.debug('No AST available for complexity analysis');
                return { complexity: 0 };
            }

            const complexities: any[] = [];
            logger.debug('Starting function complexity analysis');

            // Visit each function declaration/expression
            const cursor = tree.rootNode.walk();
            let reachedEnd = false;

            while (!reachedEnd) {
                if (cursor.nodeType === 'function_declaration' || 
                    cursor.nodeType === 'function_expression' ||
                    cursor.nodeType === 'arrow_function') {

                    const name = getFunctionName(cursor.currentNode);
                    const complexity = analyzeFunctionComplexity(cursor.currentNode);
                    logger.debug({ 
                        functionName: name,
                        nodeType: cursor.nodeType,
                        complexity,
                        startLine: cursor.currentNode.startPosition.row + 1,
                        endLine: cursor.currentNode.endPosition.row + 1
                    }, 'Analyzed function complexity');

                    complexities.push({
                        name,
                        complexity,
                        location: {
                            start: cursor.currentNode.startPosition,
                            end: cursor.currentNode.endPosition
                        }
                    });
                }

                reachedEnd = !cursor.gotoNextSibling();
                if (reachedEnd && cursor.gotoParent()) {
                    reachedEnd = !cursor.gotoNextSibling();
                }
            }

            // Calculate max complexity from values
            const complexityValues = complexities.map(c => c.complexity);
            const maxComplexity = complexityValues.length > 0 ? Math.max(...complexityValues) : 0;
            
            logger.debug({ 
                functionCount: complexities.length,
                maxComplexity,
                complexityBreakdown: complexities.map(c => ({ 
                    name: c.name, 
                    complexity: c.complexity 
                }))
            }, 'Completed complexity analysis');
            
            const result = {
                complexities,
                maxComplexity
            };

            if (params?.resultFact) {
                logger.debug({ resultFact: params.resultFact }, 'Adding complexity results to almanac');
                almanac.addRuntimeFact(params.resultFact, result);
            }

            return result;
        } catch (error) {
            logger.error(`Error analyzing function complexity: ${error}`);
            return { complexities: [], maxComplexity: 0 };
        }
    }
};

function analyzeFunctionComplexity(node: any): number {
    let complexity = 1; // Base complexity

    // Walk the AST and count:
    // - Conditional statements (if, else, switch cases)
    // - Loops (for, while, do-while)
    // - Logical operators (&&, ||)
    // - Try/catch blocks
    const cursor = node.walk();
    let reachedEnd = false;

    while (!reachedEnd) {
        switch (cursor.nodeType) {
            case 'if_statement':
            case 'switch_case':
            case 'for_statement':
            case 'while_statement':
            case 'do_statement':
            case 'try_statement':
                complexity++;
                break;
            case '&&':
            case '||':
                complexity += 0.5;
                break;
        }

        reachedEnd = !cursor.gotoFirstChild();
        if (reachedEnd) {
            reachedEnd = !cursor.gotoNextSibling();
            if (reachedEnd && cursor.gotoParent()) {
                reachedEnd = !cursor.gotoNextSibling();
            }
        }
    }

    return complexity;
}

function getFunctionName(node: any): string {
    if (node.type === 'function_declaration') {
        const nameNode = node.descendantsOfType('identifier')[0];
        return nameNode ? nameNode.text : 'anonymous';
    }
    return 'anonymous';
}
