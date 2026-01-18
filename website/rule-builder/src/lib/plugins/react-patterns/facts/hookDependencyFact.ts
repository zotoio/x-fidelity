/**
 * Browser-compatible Hook Dependency Fact
 * 
 * Analyzes React hook dependencies using AST.
 */

import { BrowserFact, BrowserAlmanac, BrowserFileData, BrowserAstResult } from '../../types';
import { browserLogger } from '../../browserContext';

// Type for tree-sitter node (simplified for browser)
interface SyntaxNode {
  type: string;
  text: string;
  startPosition: { row: number; column: number };
  endPosition: { row: number; column: number };
  children: SyntaxNode[];
}

/**
 * Find external references in a node (variables used but not declared)
 */
function findExternalReferences(node: SyntaxNode): string[] {
  const refs = new Set<string>();
  const scope = new Set<string>();
  
  function visit(n: SyntaxNode, currentScope: Set<string>): void {
    if (n.type === 'identifier') {
      if (!currentScope.has(n.text)) {
        refs.add(n.text);
      }
    } else if (n.type === 'variable_declaration' || n.type === 'variable_declarator') {
      // Add declared variables to scope
      const identifiers = n.children.filter(child => child.type === 'identifier');
      identifiers.forEach(id => currentScope.add(id.text));
    }
    
    for (const child of n.children || []) {
      visit(child, currentScope);
    }
  }
  
  visit(node, scope);
  return Array.from(refs);
}

/**
 * Find hook calls in a node
 */
function findHookCalls(
  node: SyntaxNode, 
  _fileName: string, 
  _filePath: string
): Array<{
  hookName: string;
  dependencies: string[];
  usedVariables: string[];
  location: { row: number; column: number };
}> {
  const hooks: Array<{
    hookName: string;
    dependencies: string[];
    usedVariables: string[];
    location: { row: number; column: number };
  }> = [];
  
  function visit(n: SyntaxNode): void {
    // Look for call expressions like useEffect, useMemo, useCallback
    if (n.type === 'call_expression') {
      const callee = n.children.find(child => child.type === 'identifier');
      
      if (callee && (
        callee.text === 'useEffect' ||
        callee.text === 'useMemo' ||
        callee.text === 'useCallback' ||
        callee.text === 'useLayoutEffect'
      )) {
        const args = n.children.find(child => child.type === 'arguments');
        
        if (args) {
          // Get the callback function (first argument)
          const callback = args.children.find(child => 
            child.type === 'arrow_function' || child.type === 'function_expression'
          );
          
          // Get the dependency array (second argument)
          const depArray = args.children.find(child => child.type === 'array');
          
          // Extract used variables from callback
          const usedVariables = callback ? findExternalReferences(callback) : [];
          
          // Extract declared dependencies
          const dependencies: string[] = [];
          if (depArray) {
            depArray.children.forEach(child => {
              if (child.type === 'identifier') {
                dependencies.push(child.text);
              }
            });
          }
          
          hooks.push({
            hookName: callee.text,
            dependencies,
            usedVariables,
            location: n.startPosition,
          });
        }
      }
    }
    
    for (const child of n.children || []) {
      visit(child);
    }
  }
  
  visit(node);
  return hooks;
}

/**
 * Hook dependency fact
 */
export const hookDependencyFact: BrowserFact = {
  name: 'hookDependency',
  description: 'Analyzes React hook dependencies',
  type: 'iterative-function',
  priority: 2,
  
  async calculate(_params: unknown, almanac: BrowserAlmanac): Promise<{
    missingDependencies: string[];
    unnecessaryDependencies: string[];
    hooks: Array<{
      hookName: string;
      missing: string[];
      unnecessary: string[];
      location: { row: number; column: number };
    }>;
  }> {
    try {
      const fileData = await almanac.factValue<BrowserFileData>('fileData');
      
      if (!fileData) {
        browserLogger.debug('hookDependencyFact: No fileData available');
        return { missingDependencies: [], unnecessaryDependencies: [], hooks: [] };
      }
      
      // Check if this is a JSX/TSX file
      const ext = (fileData.filePath || fileData.fileName).split('.').pop()?.toLowerCase();
      if (!['jsx', 'tsx'].includes(ext || '')) {
        browserLogger.debug('hookDependencyFact: Not a JSX/TSX file');
        return { missingDependencies: [], unnecessaryDependencies: [], hooks: [] };
      }
      
      // Try to get AST
      let astResult: BrowserAstResult | null = null;
      try {
        astResult = await almanac.factValue<BrowserAstResult>('ast');
      } catch {
        browserLogger.debug('hookDependencyFact: AST not available');
      }
      
      if (!astResult || !astResult.tree) {
        browserLogger.debug('hookDependencyFact: No AST available');
        return { missingDependencies: [], unnecessaryDependencies: [], hooks: [] };
      }
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tree = astResult.tree as any;
      const rootNode = tree.rootNode || tree;
      
      // Find hook calls and analyze dependencies
      const hookCalls = findHookCalls(
        rootNode as SyntaxNode,
        fileData.fileName,
        fileData.filePath
      );
      
      const allMissing: string[] = [];
      const allUnnecessary: string[] = [];
      const analyzedHooks: Array<{
        hookName: string;
        missing: string[];
        unnecessary: string[];
        location: { row: number; column: number };
      }> = [];
      
      for (const hook of hookCalls) {
        // Find missing dependencies (used but not declared)
        const missing = hook.usedVariables.filter(v => !hook.dependencies.includes(v));
        
        // Find unnecessary dependencies (declared but not used)
        const unnecessary = hook.dependencies.filter(d => !hook.usedVariables.includes(d));
        
        // Filter out common globals and React hooks
        const filteredMissing = missing.filter(v => 
          !['console', 'window', 'document', 'setTimeout', 'setInterval', 
           'clearTimeout', 'clearInterval', 'fetch', 'JSON', 'Math', 
           'Date', 'Promise', 'Array', 'Object', 'String', 'Number',
           'Boolean', 'undefined', 'null', 'true', 'false',
           'useState', 'useEffect', 'useMemo', 'useCallback', 'useRef',
           'useContext', 'useReducer', 'useLayoutEffect'].includes(v)
        );
        
        allMissing.push(...filteredMissing);
        allUnnecessary.push(...unnecessary);
        
        analyzedHooks.push({
          hookName: hook.hookName,
          missing: filteredMissing,
          unnecessary,
          location: hook.location,
        });
      }
      
      browserLogger.debug(`hookDependencyFact: Analyzed ${hookCalls.length} hooks`);
      
      return {
        missingDependencies: [...new Set(allMissing)],
        unnecessaryDependencies: [...new Set(allUnnecessary)],
        hooks: analyzedHooks,
      };
    } catch (error) {
      browserLogger.error(`hookDependencyFact error: ${error}`);
      return { missingDependencies: [], unnecessaryDependencies: [], hooks: [] };
    }
  },
};
