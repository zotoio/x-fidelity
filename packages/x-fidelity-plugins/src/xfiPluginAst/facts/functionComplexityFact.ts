import { SyntaxNode } from 'tree-sitter';
import { FactDefn } from '@x-fidelity/types';
import { FunctionMetrics } from '../types';
import { logger } from '@x-fidelity/core';
import { generateAst } from '../../sharedPluginUtils/astUtils';

export const functionComplexityFact: FactDefn = {
    name: 'functionComplexity',
    description: 'Calculates complexity metrics for functions in the codebase using Tree-sitter',
    fn: async (params: any, almanac: any) => {
        try {
            // Get fileData from almanac
            const fileData = await (almanac as any)?.factValue('fileData');
            
            if (!fileData) {
                logger.debug('No fileData available for functionComplexity fact');
                return { complexities: [] };
            }

            if (!fileData.content && !fileData.fileContent) {
                logger.debug('No file content available for functionComplexity fact');
                return { complexities: [] };
            }

            // Try to get existing AST first to avoid regenerating it
            let astResult;
            try {
                astResult = await (almanac as any)?.factValue('ast');
            } catch (error) {
                logger.debug('AST fact not available, generating new AST');
            }

            // If no AST available, generate it
            if (!astResult || !astResult.tree) {
                const content = fileData.content || fileData.fileContent;
                if (!content || typeof content !== 'string') {
                    logger.debug('File content is not a valid string for functionComplexity fact');
                    return { complexities: [] };
                }

                const astData = {
                    ...fileData,
                    fileContent: content,
                    fileName: fileData.fileName || 'unknown.ts'
                };

                astResult = await generateAst(astData);
                if (!astResult.tree) {
                    logger.debug('No AST tree generated for functionComplexity fact');
                    return { complexities: [] };
                }
            }

            const { tree } = astResult;
            const functions: FunctionMetrics[] = [];
            const visited = new Set<string>();

            function visit(node: SyntaxNode) {
                const nodeId = `${node.startPosition.row}-${node.startPosition.column}-${node.type}`;
                if (visited.has(nodeId)) {
                    return;
                }
                visited.add(nodeId);

                if (isFunctionLike(node)) {
                    const metrics = calculateMetrics(node, fileData.fileContent || fileData.content);
                    functions.push(metrics);
                }

                for (const child of node.children) {
                    visit(child);
                }
            }

            if (tree) {
                visit(tree);
            }
            
            // Map functions to expected format
            const allComplexities = functions.map(func => ({ name: func.name, metrics: func }));
            
            // Filter results to only include offending functions if thresholds are provided
            let complexitiesToReturn = allComplexities;
            
            if (params?.thresholds) {
                const thresholds = params.thresholds;
                logger.debug(`Filtering functions against thresholds:`, thresholds);
                
                complexitiesToReturn = allComplexities.filter((func: any) => {
                    const metrics = func.metrics;
                    if (!metrics) return false;

                    const exceedsThresholds = {
                        cyclomaticComplexity: thresholds.cyclomaticComplexity && metrics.cyclomaticComplexity >= thresholds.cyclomaticComplexity,
                        cognitiveComplexity: thresholds.cognitiveComplexity && metrics.cognitiveComplexity >= thresholds.cognitiveComplexity,
                        nestingDepth: thresholds.nestingDepth && metrics.nestingDepth >= thresholds.nestingDepth,
                        parameterCount: thresholds.parameterCount && metrics.parameterCount >= thresholds.parameterCount,
                        returnCount: thresholds.returnCount && metrics.returnCount >= thresholds.returnCount
                    };

                    const isOverThreshold = Object.values(exceedsThresholds).some(Boolean);
                    
                    if (isOverThreshold) {
                        logger.debug(`Function ${func.name} exceeds thresholds:`, { metrics, exceedsThresholds });
                    }
                    
                    return isOverThreshold;
                });
                
                logger.debug(`Filtered from ${allComplexities.length} to ${complexitiesToReturn.length} functions`);
            }
            
            const result = { complexities: complexitiesToReturn };
            
            // Add result to almanac if resultFact is requested (with filtering applied)
            if (params?.resultFact) {
                logger.debug(`Adding ${complexitiesToReturn.length} functions to almanac:`, params.resultFact);
                almanac.addRuntimeFact(params.resultFact, result);
            }
            
            return result;
        } catch (error) {
            logger.error(`Error in functionComplexityFact: ${error}`);
            return { complexities: [] };
        }
    }
};

function isFunctionLike(node: SyntaxNode): boolean {
    return node.type === 'function_declaration' ||
           node.type === 'method_definition' ||
           node.type === 'arrow_function' ||
           node.type === 'function_expression' ||
           node.type === 'function';
}

function calculateMetrics(node: SyntaxNode, sourceCode: string): FunctionMetrics {
    const name = getFunctionName(node);
    const cyclomaticComplexity = calculateCyclomaticComplexity(node);
    const cognitiveComplexity = calculateCognitiveComplexity(node);
    const nestingDepth = calculateNestingDepth(node);
    const parameterCount = calculateParameterCount(node);
    const returnCount = calculateReturnCount(node);
    const lineCount = calculateLineCount(node);

    // Convert 0-based tree-sitter positions to 1-based editor line numbers
    const location = {
        startLine: node.startPosition.row + 1,
        endLine: node.endPosition.row + 1,
        startColumn: node.startPosition.column + 1,
        endColumn: node.endPosition.column + 1
    };

    return {
        name,
        cyclomaticComplexity,
        cognitiveComplexity,
        nestingDepth,
        parameterCount,
        returnCount,
        lineCount,
        location
    };
}

function calculateLineCount(node: SyntaxNode): number {
    return node.endPosition.row - node.startPosition.row + 1;
}

function calculateCyclomaticComplexity(node: SyntaxNode): number {
    let complexity = 1;
    
    function visit(node: SyntaxNode) {
        switch (node.type) {
            case 'if_statement':
            case 'while_statement':
            case 'do_statement':
            case 'for_statement':
            case 'for_in_statement':
            case 'for_of_statement':
            case 'ternary_expression':
            case 'switch_case':
            case 'catch_clause':
            case 'binary_expression':
                if (node.type === 'binary_expression') {
                    const operator = node.children.find(child => 
                        child.type === '&&' || child.type === '||' || 
                        child.text === '&&' || child.text === '||'
                    );
                    if (operator) {
                        complexity++;
                    }
                } else {
                    complexity++;
                }
                break;
        }
        
        for (const child of node.children) {
            visit(child);
        }
    }
    
    visit(node);
    return complexity;
}

function calculateCognitiveComplexity(node: SyntaxNode): number {
    let complexity = 0;
    let nestingLevel = 0;

    function visit(node: SyntaxNode) {
        switch (node.type) {
            case 'if_statement':
            case 'while_statement':
            case 'do_statement':
            case 'for_statement':
            case 'for_in_statement':
            case 'for_of_statement':
                complexity += nestingLevel + 1;
                nestingLevel++;
                for (const child of node.children) {
                    visit(child);
                }
                nestingLevel--;
                break;
            case 'catch_clause':
            case 'ternary_expression':
            case 'binary_expression':
                if (node.type === 'binary_expression') {
                    const operator = node.children.find(child => 
                        child.type === '&&' || child.type === '||' || 
                        child.text === '&&' || child.text === '||'
                    );
                    if (operator) {
                        complexity += nestingLevel + 1;
                    }
                } else {
                    complexity += nestingLevel + 1;
                }
                for (const child of node.children) {
                    visit(child);
                }
                break;
            default:
                for (const child of node.children) {
                    visit(child);
                }
                break;
        }
    }
    
    visit(node);
    return complexity;
}

function calculateNestingDepth(node: SyntaxNode): number {
    let maxDepth = 0;
    let currentDepth = 0;

    function visit(node: SyntaxNode) {
        switch (node.type) {
            case 'if_statement':
            case 'while_statement':
            case 'do_statement':
            case 'for_statement':
            case 'for_in_statement':
            case 'for_of_statement':
            case 'switch_case':
            case 'catch_clause':
                currentDepth++;
                maxDepth = Math.max(maxDepth, currentDepth);
                for (const child of node.children) {
                    visit(child);
                }
                currentDepth--;
                break;
            default:
                for (const child of node.children) {
                    visit(child);
                }
                break;
        }
    }
    
    visit(node);
    return maxDepth;
}

function calculateParameterCount(node: SyntaxNode): number {
    const parameterList = node.children.find(child => 
        child.type === 'formal_parameters' || child.type === 'parameters'
    );
    
    if (!parameterList) return 0;
    
    return parameterList.children.filter(child => 
        child.type === 'identifier' || 
        child.type === 'parameter' ||
        child.type === 'required_parameter' ||
        child.type === 'optional_parameter'
    ).length;
}

function calculateReturnCount(node: SyntaxNode): number {
    let returnCount = 0;
    
    function visit(node: SyntaxNode) {
        if (node.type === 'return_statement') {
            returnCount++;
        }
        
        for (const child of node.children) {
            visit(child);
        }
    }
    
    visit(node);
    return returnCount;
}

function getFunctionName(node: SyntaxNode): string {
    // Try to find function name in various ways
    const nameNode = node.children.find(child => 
        child.type === 'identifier' || child.type === 'property_identifier'
    );
    
    if (nameNode) {
        return nameNode.text;
    }
    
    // For arrow functions or anonymous functions
    return 'anonymous';
}
