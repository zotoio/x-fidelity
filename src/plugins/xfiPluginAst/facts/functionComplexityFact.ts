import { FactDefn, FileData } from '../../../types/typeDefs';
import { logger } from '../../../utils/logger';
import { generateAst } from '../../../utils/astUtils';

interface FunctionMetrics {
    cyclomaticComplexity: number;
    parameterCount: number;
    returnCount: number;
    nestingDepth: number;
    cognitiveComplexity: number;
}

interface FunctionComplexityItem {
    name: string;
    metrics: FunctionMetrics;
    location: {
        start: { row: number; column: number; };
        end: { row: number; column: number; };
    };
}

export const functionComplexityFact: FactDefn = {
    name: 'functionComplexity',
    fn: async (params: any, almanac: any) => {
        try {
            const fileData: FileData = await almanac.factValue('fileData');
            const { tree } = generateAst(fileData);
            
            if (!tree) {
                logger.debug('No AST available for complexity analysis');
                return { complexities: [] };
            }

            const complexities: FunctionComplexityItem[] = [];

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
            const minimumComplexityLogged = params?.minimumComplexityLogged || 10;
            
            // Analyze each function node
            for (const node of functionNodes) {
                const name = getFunctionName(node);
                const metrics = analyzeFunctionComplexity(node);
                
                // Only include functions that exceed the minimum complexity threshold for any metric
                if (metrics.cyclomaticComplexity >= minimumComplexityLogged ||
                    metrics.cognitiveComplexity >= minimumComplexityLogged ||
                    metrics.nestingDepth >= minimumComplexityLogged ||
                    metrics.parameterCount >= minimumComplexityLogged ||
                    metrics.returnCount >= minimumComplexityLogged) {
                    
                    logger.debug({ 
                        functionName: name,
                        nodeType: node.type,
                        metrics,
                        startLine: node.startPosition.row + 1,
                        endLine: node.endPosition.row + 1,
                    }, 'Function exceeds complexity threshold');

                    complexities.push({
                        name,
                        metrics,
                        location: {
                            start: node.startPosition,
                            end: node.endPosition
                        }
                    });
                } else {
                    logger.debug({
                        functionName: name,
                        metrics,
                        threshold: minimumComplexityLogged
                    }, 'Function below complexity threshold - skipping');
                }
            }

            // Calculate max complexity from values
            //const complexityValues = complexities.map(c => c.complexity);
            //const maxComplexity = complexityValues.length > 0 ? Math.max(...complexityValues) : 0;
            
            logger.debug({ 
                functionCount: complexities.length,
                complexityBreakdown: complexities.map(c => ({ 
                    name: c.name, 
                    metrics: c.metrics
                }))
            }, 'Completed complexity analysis');
            
            // Get thresholds from params or use defaults
            const thresholds: FunctionMetrics = {
                cyclomaticComplexity: params?.thresholds?.cyclomaticComplexity || 10,
                cognitiveComplexity: params?.thresholds?.cognitiveComplexity || 10,
                nestingDepth: params?.thresholds?.nestingDepth || 5,
                parameterCount: params?.thresholds?.parameterCount || 5,
                returnCount: params?.thresholds?.returnCount || 3
            };

            const result = {
                complexities: complexities.map(c => ({
                    name: c.name,
                    metrics: c.metrics,
                    location: c.location
                })),
                maxComplexity: Math.max(...complexities.map(c => c.metrics.cyclomaticComplexity)),
                maxNestingDepth: Math.max(...complexities.map(c => c.metrics.nestingDepth)),
                maxParameterCount: Math.max(...complexities.map(c => c.metrics.parameterCount)), 
                maxReturnCount: Math.max(...complexities.map(c => c.metrics.returnCount)),
                maxCognitiveComplexity: Math.max(...complexities.map(c => c.metrics.cognitiveComplexity))
            };

            if (params?.resultFact) {
                logger.debug({ resultFact: params.resultFact }, 'Adding complexity results to almanac');
                almanac.addRuntimeFact(params.resultFact, result);
            }

            return result;
        } catch (error) {
            logger.error(`Error in function complexity analysis: ${error}`);
            return { complexities: [] };
        }
    }
};


function analyzeFunctionComplexity(node: any): FunctionMetrics {
    let cyclomaticComplexity = 1;
    let parameterCount = 0;
    let returnCount = 0;
    let maxNestingDepth = 0;
    let cognitiveComplexity = 0;
    let currentNestingDepth = 0;

    // Count parameters
    const parameterList = node.descendantsOfType('formal_parameters')[0];
    if (parameterList) {
        parameterCount = parameterList.namedChildCount;
    }

    function visit(node: any, depth: number = 0) {
        currentNestingDepth = depth;
        maxNestingDepth = Math.max(maxNestingDepth, depth);

        switch (node.type) {
            case 'if_statement':
            case 'switch_case':
                cyclomaticComplexity++; // Add 1 for each branch
                cognitiveComplexity += depth + 1;
                break;
            case 'for_statement':
            case 'while_statement':
            case 'do_statement':
                cyclomaticComplexity += 2; // Loops are more complex
                cognitiveComplexity += depth + 2;
                break;
            case 'try_statement':
                cyclomaticComplexity++;
                cognitiveComplexity += 1;
                break;
            case '&&':
            case '||':
                cyclomaticComplexity += 0.5; // Logical operators add complexity
                cognitiveComplexity += 1;
                break;
            case 'return_statement':
                returnCount++;
                break;
            case 'catch_clause':
                cyclomaticComplexity++;
                cognitiveComplexity += depth + 1;
                break;
            case 'throw_statement':
                cyclomaticComplexity++;
                break;
        }

        // Visit children with increased depth for control structures
        const increaseDepthFor = [
            'if_statement', 'for_statement', 'while_statement',
            'do_statement', 'try_statement', 'switch_case'
        ];
        
        for (let child of node.children || []) {
            visit(child, increaseDepthFor.includes(node.type) ? depth + 1 : depth);
        }
    }

    visit(node);

    return {
        cyclomaticComplexity: Math.ceil(cyclomaticComplexity), // Round up fractional complexity
        parameterCount,
        returnCount,
        nestingDepth: maxNestingDepth,
        cognitiveComplexity
    };
}

function getFunctionName(node: any): string {
    if (node.type === 'function_declaration') {
        const nameNode = node.descendantsOfType('identifier')[0];
        return nameNode ? nameNode.text : 'anonymous';
    }
    return 'anonymous';
}
