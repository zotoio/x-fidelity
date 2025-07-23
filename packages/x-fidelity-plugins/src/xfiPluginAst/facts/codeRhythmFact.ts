import { FactDefn, FileData, AstResult } from '@x-fidelity/types';
import { logger } from '@x-fidelity/core';

export interface CodeMetrics {
    cyclomaticComplexity: number;
    cognitiveComplexity: number;
    nestingDepth: number;
    parameterCount: number;
    returnCount: number;
    lineCount?: number;
}

function analyzeCodeMetrics(node: any): CodeMetrics {
    return {
        cyclomaticComplexity: 1,
        cognitiveComplexity: 1,
        nestingDepth: 1,
        parameterCount: 0,
        returnCount: 0,
        lineCount: 0
    };
}

export const codeRhythmFact: FactDefn = {
    name: 'codeRhythm',
    description: 'Analyzes code rhythm metrics using precomputed AST',
    type: 'iterative-function',  // ✅ Iterative function - runs once per file (default behavior)
    priority: 2,                 // ✅ Lower priority than AST fact (depends on AST)
    fn: async (params: unknown, almanac?: unknown) => {
        try {
            const fileData = params as FileData;
            const ast = await (almanac as any)?.factValue('ast');

            if (!ast || !ast.program) {
                return {
                    cyclomaticComplexity: 0,
                    cognitiveComplexity: 0,
                    nestingDepth: 0,
                    parameterCount: 0,
                    returnCount: 0,
                    lineCount: 0
                };
            }

            const baseMetrics = analyzeCodeMetrics(ast.program);
            return baseMetrics;
        } catch (error) {
            logger.error('Error in codeRhythm fact:', error);
            return {
                cyclomaticComplexity: 0,
                cognitiveComplexity: 0,
                nestingDepth: 0,
                parameterCount: 0,
                returnCount: 0,
                lineCount: 0
            };
        }
    }
};
