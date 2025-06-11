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
}

// AST result type
export interface AstResult {
    tree: any;
    rootNode?: any;
    program?: any;
    sourceFile?: any;
    functions?: FunctionMetrics[];
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