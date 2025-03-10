import { FactDefn, FileData } from '../../../types/typeDefs';
import { logger } from '../../../utils/logger';
import { SyntaxNode } from 'tree-sitter';

export const functionComplexityFact: FactDefn = {
    name: 'functionComplexity',
    fn: async (params: any, almanac: any) => {
        try {
            const { tree } = await almanac.factValue('ast');
            if (!tree) {
                logger.debug('No AST available for complexity analysis');
                return { complexity: 0 };
            }

            const complexities: any[] = [];
            logger.debug('Starting function complexity analysis');

            // Visit each function declaration/expression
            tree.rootNode.walk({
                visit: (node: SyntaxNode) => {
                    if (node.type === 'function_declaration' || 
                        node.type === 'function_expression' ||
                        node.type === 'arrow_function') {

                        const name = getFunctionName(node);
                        const complexity = analyzeFunctionComplexity(node);
                        logger.debug({ 
                            functionName: name,
                            nodeType: node.type,
                            complexity,
                            startLine: node.startPosition.row + 1,
                            endLine: node.endPosition.row + 1
                        }, 'Analyzed function complexity');

                        complexities.push({
                            name,
                            complexity,
                            location: {
                                start: node.startPosition,
                                end: node.endPosition
                            }
                        });
                    }
                }
            });

            const maxComplexity = Math.max(...complexities.map(c => c.complexity));
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
    node.walk({
        visit: (child: SyntaxNode) => {
            switch (child.type) {
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
        }
    });

    return complexity;
}

function getFunctionName(node: any): string {
    if (node.type === 'function_declaration') {
        const nameNode = node.descendantsOfType('identifier')[0];
        return nameNode ? nameNode.text : 'anonymous';
    }
    return 'anonymous';
}
