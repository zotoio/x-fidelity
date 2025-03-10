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
            // Traverse the AST to find all function nodes
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

            // Get minimum complexity threshold from params
            const minimumComplexityLogged = params?.minimumComplexityLogged || 0;
            
            // Analyze each function node
            for (const node of functionNodes) {
                const name = getFunctionName(node);
                const complexity = analyzeFunctionComplexity(node);
                
                // Only include functions that exceed the minimum complexity threshold
                if (complexity >= minimumComplexityLogged) {
                    logger.debug({ 
                        functionName: name,
                        nodeType: node.type,
                        complexity,
                        startLine: node.startPosition.row + 1,
                        endLine: node.endPosition.row + 1,
                        threshold: minimumComplexityLogged
                    }, 'Function exceeds complexity threshold');

                    complexities.push({
                        name,
                        complexity,
                        location: {
                            start: node.startPosition,
                            end: node.endPosition
                        }
                    });
                } else {
                    logger.debug({
                        functionName: name,
                        complexity,
                        threshold: minimumComplexityLogged
                    }, 'Function below complexity threshold - skipping');
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
    function visit(node: any) {
        switch (node.type) {
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

        for (let child of node.children || []) {
            visit(child);
        }
    }

    visit(node);

    return complexity;
}

function getFunctionName(node: any): string {
    if (node.type === 'function_declaration') {
        const nameNode = node.descendantsOfType('identifier')[0];
        return nameNode ? nameNode.text : 'anonymous';
    }
    return 'anonymous';
}
