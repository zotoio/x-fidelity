/**
 * Browser-compatible Effect Cleanup Fact
 * 
 * Analyzes useEffect hooks for proper cleanup patterns.
 */

import { BrowserFact, BrowserAlmanac, BrowserFileData, BrowserAstResult } from '../../types';
import { browserLogger } from '../../browserContext';

/**
 * Parse useEffect calls using regex (fallback for when AST isn't available)
 */
function parseUseEffectWithRegex(
  content: string,
  fileName: string,
  filePath: string
): Array<{
  fileName: string;
  filePath: string;
  hasCleanup: boolean;
  location: { start: { row: number; column: number }; end: { row: number; column: number } };
}> {
  const effects: Array<{
    fileName: string;
    filePath: string;
    hasCleanup: boolean;
    location: { start: { row: number; column: number }; end: { row: number; column: number } };
  }> = [];
  
  // Match useEffect calls
  const useEffectRegex = /useEffect\s*\(\s*\(\s*\)\s*=>\s*\{([\s\S]*?)\}\s*,\s*\[[^\]]*\]\s*\)/g;
  let match: RegExpExecArray | null;
  
  while ((match = useEffectRegex.exec(content)) !== null) {
    const effectBody = match[1] || '';
    
    // Check if there's a return statement with function/arrow function
    const hasCleanup = /return\s*\(\s*\)\s*=>\s*\{/.test(effectBody) || 
                       /return\s*function/.test(effectBody) || 
                       /return\s*\(\s*\)\s*=>\s*[^{]/.test(effectBody);
    
    // Calculate line number
    const beforeMatch = content.substring(0, match.index);
    const row = beforeMatch.split('\n').length - 1;
    const lastNewline = beforeMatch.lastIndexOf('\n');
    const column = match.index - lastNewline - 1;
    
    effects.push({
      fileName,
      filePath,
      hasCleanup,
      location: {
        start: { row, column },
        end: { row, column: column + match[0].length },
      },
    });
  }
  
  return effects;
}

// Type for tree-sitter node
interface SyntaxNode {
  type: string;
  text: string;
  startPosition: { row: number; column: number };
  endPosition: { row: number; column: number };
  children: SyntaxNode[];
}

/**
 * Parse useEffect calls from AST
 */
function parseWithAst(
  tree: unknown,
  fileName: string,
  filePath: string
): Array<{
  fileName: string;
  filePath: string;
  hasCleanup: boolean;
  needsCleanup: boolean;
  location: { start: { row: number; column: number }; end: { row: number; column: number } };
}> {
  const effects: Array<{
    fileName: string;
    filePath: string;
    hasCleanup: boolean;
    needsCleanup: boolean;
    location: { start: { row: number; column: number }; end: { row: number; column: number } };
  }> = [];
  
  // Patterns that typically need cleanup
  const cleanupPatterns = [
    'addEventListener',
    'setTimeout',
    'setInterval',
    'subscribe',
    'observe',
  ];
  
  function hasReturnFunction(node: SyntaxNode): boolean {
    if (node.type === 'return_statement') {
      const returnValue = node.children.find(child => 
        child.type === 'arrow_function' || child.type === 'function_expression'
      );
      return !!returnValue;
    }
    
    for (const child of node.children || []) {
      if (hasReturnFunction(child)) return true;
    }
    
    return false;
  }
  
  function checkNeedsCleanup(node: SyntaxNode): boolean {
    if (node.type === 'call_expression') {
      const callee = node.children.find(child => child.type === 'identifier');
      if (callee && cleanupPatterns.some(p => callee.text.includes(p))) {
        return true;
      }
      
      // Check for member expressions like element.addEventListener
      const memberExpr = node.children.find(child => child.type === 'member_expression');
      if (memberExpr) {
        const prop = memberExpr.children.find(child => child.type === 'property_identifier');
        if (prop && cleanupPatterns.some(p => prop.text.includes(p))) {
          return true;
        }
      }
    }
    
    for (const child of node.children || []) {
      if (checkNeedsCleanup(child)) return true;
    }
    
    return false;
  }
  
  function visit(node: SyntaxNode): void {
    if (node.type === 'call_expression') {
      const callee = node.children.find(child => child.type === 'identifier');
      
      if (callee && callee.text === 'useEffect') {
        const args = node.children.find(child => child.type === 'arguments');
        
        if (args) {
          const callback = args.children.find(child => 
            child.type === 'arrow_function' || child.type === 'function_expression'
          );
          
          if (callback) {
            const hasCleanup = hasReturnFunction(callback);
            const needsCleanup = checkNeedsCleanup(callback);
            
            effects.push({
              fileName,
              filePath,
              hasCleanup,
              needsCleanup,
              location: {
                start: node.startPosition,
                end: node.endPosition,
              },
            });
          }
        }
      }
    }
    
    for (const child of node.children || []) {
      visit(child);
    }
  }
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typedTree = tree as any;
  const rootNode = typedTree.rootNode || typedTree;
  visit(rootNode);
  
  return effects;
}

/**
 * Effect cleanup fact
 */
export const effectCleanupFact: BrowserFact = {
  name: 'effectCleanup',
  description: 'Checks if useEffect hooks have cleanup functions',
  type: 'iterative-function',
  priority: 2,
  
  async calculate(_params: unknown, almanac: BrowserAlmanac): Promise<{
    effects: Array<{
      fileName: string;
      filePath: string;
      hasCleanup: boolean;
      needsCleanup?: boolean;
      location: { start: { row: number; column: number }; end: { row: number; column: number } };
    }>;
    effectsWithoutCleanup: Array<unknown>;
    effectsWithCleanup: Array<unknown>;
  }> {
    try {
      const fileData = await almanac.factValue<BrowserFileData>('fileData');
      
      if (!fileData) {
        browserLogger.debug('effectCleanupFact: No fileData available');
        return { effects: [], effectsWithoutCleanup: [], effectsWithCleanup: [] };
      }
      
      // Check if this is a JSX/TSX file
      const ext = (fileData.filePath || fileData.fileName).split('.').pop()?.toLowerCase();
      if (!['jsx', 'tsx', 'js', 'ts'].includes(ext || '')) {
        browserLogger.debug('effectCleanupFact: Not a JS/TS file');
        return { effects: [], effectsWithoutCleanup: [], effectsWithCleanup: [] };
      }
      
      const content = fileData.content || fileData.fileContent;
      if (!content) {
        browserLogger.debug('effectCleanupFact: No file content');
        return { effects: [], effectsWithoutCleanup: [], effectsWithCleanup: [] };
      }
      
      let effects: Array<{
        fileName: string;
        filePath: string;
        hasCleanup: boolean;
        needsCleanup?: boolean;
        location: { start: { row: number; column: number }; end: { row: number; column: number } };
      }> = [];
      
      // Try to get AST
      let astResult: BrowserAstResult | null = null;
      try {
        astResult = await almanac.factValue<BrowserAstResult>('ast');
      } catch {
        browserLogger.debug('effectCleanupFact: AST not available');
      }
      
      if (astResult && astResult.tree) {
        effects = parseWithAst(astResult.tree, fileData.fileName, fileData.filePath);
      } else {
        // Fallback to regex
        effects = parseUseEffectWithRegex(content, fileData.fileName, fileData.filePath);
      }
      
      const effectsWithCleanup = effects.filter(e => e.hasCleanup);
      const effectsWithoutCleanup = effects.filter(e => !e.hasCleanup);
      
      browserLogger.debug(`effectCleanupFact: Found ${effects.length} useEffect calls (${effectsWithCleanup.length} with cleanup)`);
      
      return {
        effects,
        effectsWithoutCleanup,
        effectsWithCleanup,
      };
    } catch (error) {
      browserLogger.error(`effectCleanupFact error: ${error}`);
      return { effects: [], effectsWithoutCleanup: [], effectsWithCleanup: [] };
    }
  },
};
