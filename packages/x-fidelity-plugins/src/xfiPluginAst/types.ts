import { SyntaxNode } from 'tree-sitter';

// AST Plugin specific types

// Function metrics type
export interface FunctionMetrics {
    name: string;
    cyclomaticComplexity: number;
    cognitiveComplexity: number;
    nestingDepth: number;
    parameterCount: number;
    returnCount: number;
    lineCount?: number;
    location: {
        startLine: number;
        endLine: number;
        startColumn: number;
        endColumn: number;
    };
}

// Complexity thresholds type
export interface ComplexityThresholds {
    cyclomaticComplexity: number;
    cognitiveComplexity: number;
    nestingDepth: number;
    parameterCount: number;
    returnCount: number;
    lineCount?: number;
} 