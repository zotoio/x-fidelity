/**
 * Browser-compatible Function Complexity Fact
 * 
 * Calculates complexity metrics for functions using AST analysis.
 */

import { BrowserFact, BrowserAlmanac, BrowserFileData, BrowserAstResult, FunctionMetrics, ComplexityThresholds } from '../../types';
import { browserLogger } from '../../browserContext';

// Type for tree-sitter node (simplified for browser)
interface SyntaxNode {
  type: string;
  text: string;
  startPosition: { row: number; column: number };
  endPosition: { row: number; column: number };
  children: SyntaxNode[];
  parent?: SyntaxNode;
}

/**
 * Check if a node represents a function
 */
export function isFunctionLike(node: SyntaxNode): boolean {
  return node.type === 'function_declaration' ||
         node.type === 'method_definition' ||
         node.type === 'arrow_function' ||
         node.type === 'function_expression' ||
         node.type === 'function';
}

/**
 * Get function name from node
 */
export function getFunctionName(node: SyntaxNode): string {
  const nameNode = node.children.find(child => 
    child.type === 'identifier' || child.type === 'property_identifier'
  );
  
  if (nameNode) {
    return nameNode.text;
  }
  
  return 'anonymous';
}

/**
 * Calculate cyclomatic complexity
 */
export function calculateCyclomaticComplexity(node: SyntaxNode): number {
  let complexity = 1;
  
  function visit(n: SyntaxNode): void {
    switch (n.type) {
      case 'if_statement':
      case 'while_statement':
      case 'do_statement':
      case 'for_statement':
      case 'for_in_statement':
      case 'for_of_statement':
      case 'ternary_expression':
      case 'switch_case':
      case 'catch_clause':
        complexity++;
        break;
      case 'binary_expression': {
        const operator = n.children.find(child => 
          child.type === '&&' || child.type === '||' || 
          child.text === '&&' || child.text === '||'
        );
        if (operator) {
          complexity++;
        }
        break;
      }
    }
    
    for (const child of n.children) {
      visit(child);
    }
  }
  
  visit(node);
  return complexity;
}

/**
 * Calculate cognitive complexity
 */
export function calculateCognitiveComplexity(node: SyntaxNode): number {
  let complexity = 0;
  let nestingLevel = 0;
  
  function visit(n: SyntaxNode): void {
    switch (n.type) {
      case 'if_statement':
      case 'while_statement':
      case 'do_statement':
      case 'for_statement':
      case 'for_in_statement':
      case 'for_of_statement':
        complexity += nestingLevel + 1;
        nestingLevel++;
        for (const child of n.children) {
          visit(child);
        }
        nestingLevel--;
        return;
      case 'catch_clause':
      case 'ternary_expression':
        complexity += nestingLevel + 1;
        break;
      case 'binary_expression': {
        const operator = n.children.find(child => 
          child.type === '&&' || child.type === '||' || 
          child.text === '&&' || child.text === '||'
        );
        if (operator) {
          complexity += nestingLevel + 1;
        }
        break;
      }
    }
    
    for (const child of n.children) {
      visit(child);
    }
  }
  
  visit(node);
  return complexity;
}

/**
 * Calculate nesting depth
 */
export function calculateNestingDepth(node: SyntaxNode): number {
  let maxDepth = 0;
  let currentDepth = 0;
  
  function visit(n: SyntaxNode): void {
    switch (n.type) {
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
        for (const child of n.children) {
          visit(child);
        }
        currentDepth--;
        return;
    }
    
    for (const child of n.children) {
      visit(child);
    }
  }
  
  visit(node);
  return maxDepth;
}

/**
 * Calculate parameter count
 */
export function calculateParameterCount(node: SyntaxNode): number {
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

/**
 * Calculate return count
 */
export function calculateReturnCount(node: SyntaxNode): number {
  let returnCount = 0;
  
  function visit(n: SyntaxNode): void {
    if (n.type === 'return_statement') {
      returnCount++;
    }
    
    for (const child of n.children) {
      visit(child);
    }
  }
  
  visit(node);
  return returnCount;
}

/**
 * Calculate all metrics for a function
 */
export function calculateMetrics(node: SyntaxNode): FunctionMetrics {
  return {
    name: getFunctionName(node),
    cyclomaticComplexity: calculateCyclomaticComplexity(node),
    cognitiveComplexity: calculateCognitiveComplexity(node),
    nestingDepth: calculateNestingDepth(node),
    parameterCount: calculateParameterCount(node),
    returnCount: calculateReturnCount(node),
    lineCount: node.endPosition.row - node.startPosition.row + 1,
    location: {
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      startColumn: node.startPosition.column + 1,
      endColumn: node.endPosition.column + 1,
    },
  };
}

/**
 * Function complexity fact
 */
export const functionComplexityFact: BrowserFact = {
  name: 'functionComplexity',
  description: 'Calculates complexity metrics for functions in the codebase',
  type: 'iterative-function',
  priority: 2,
  
  async calculate(params: unknown, almanac: BrowserAlmanac): Promise<{
    complexities: Array<{ name: string; metrics: FunctionMetrics }>;
  }> {
    const typedParams = params as {
      resultFact?: string;
      thresholds?: ComplexityThresholds;
    };
    
    try {
      const fileData = await almanac.factValue<BrowserFileData>('fileData');
      
      if (!fileData) {
        browserLogger.debug('functionComplexityFact: No fileData available');
        return { complexities: [] };
      }
      
      if (!fileData.content && !fileData.fileContent) {
        browserLogger.debug('functionComplexityFact: No file content available');
        return { complexities: [] };
      }
      
      // Try to get existing AST
      let astResult: BrowserAstResult | null = null;
      try {
        astResult = await almanac.factValue<BrowserAstResult>('ast');
      } catch {
        browserLogger.debug('functionComplexityFact: AST fact not available');
      }
      
      if (!astResult || !astResult.tree) {
        browserLogger.debug('functionComplexityFact: No AST available');
        return { complexities: [] };
      }
      
      // Collect functions from AST
      const functions: FunctionMetrics[] = [];
      const visited = new Set<string>();
      
      function visit(node: SyntaxNode): void {
        const nodeId = `${node.startPosition.row}-${node.startPosition.column}-${node.type}`;
        if (visited.has(nodeId)) {
          return;
        }
        visited.add(nodeId);
        
        if (isFunctionLike(node)) {
          const metrics = calculateMetrics(node);
          functions.push(metrics);
        }
        
        for (const child of node.children || []) {
          visit(child);
        }
      }
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tree = astResult.tree as any;
      if (tree.rootNode) {
        visit(tree.rootNode);
      } else if (tree) {
        visit(tree);
      }
      
      // Map to expected format
      let allComplexities = functions.map(func => ({ name: func.name, metrics: func }));
      
      // Filter by thresholds if provided
      if (typedParams?.thresholds) {
        const thresholds = typedParams.thresholds;
        browserLogger.debug('Filtering functions against thresholds');
        
        allComplexities = allComplexities.filter(func => {
          const metrics = func.metrics;
          
          const exceedsThreshold = 
            (thresholds.cyclomaticComplexity !== undefined && 
              metrics.cyclomaticComplexity >= thresholds.cyclomaticComplexity) ||
            (thresholds.cognitiveComplexity !== undefined && 
              metrics.cognitiveComplexity >= thresholds.cognitiveComplexity) ||
            (thresholds.nestingDepth !== undefined && 
              metrics.nestingDepth >= thresholds.nestingDepth) ||
            (thresholds.parameterCount !== undefined && 
              metrics.parameterCount >= thresholds.parameterCount) ||
            (thresholds.returnCount !== undefined && 
              metrics.returnCount >= thresholds.returnCount);
          
          return exceedsThreshold;
        });
        
        browserLogger.debug(`Filtered to ${allComplexities.length} complex functions`);
      }
      
      const result = { complexities: allComplexities };
      
      // Add to almanac if requested
      if (typedParams?.resultFact) {
        almanac.addRuntimeFact(typedParams.resultFact, result);
      }
      
      return result;
    } catch (error) {
      browserLogger.error(`functionComplexityFact error: ${error}`);
      return { complexities: [] };
    }
  },
};
