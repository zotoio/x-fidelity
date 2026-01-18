/**
 * Browser-compatible AST Nodes Fact
 * 
 * Provides AST parsing using web-tree-sitter in the browser.
 */

import { BrowserFact, BrowserAlmanac, BrowserFileData, BrowserAstResult } from '../../types';
import { browserLogger } from '../../browserContext';
import { getLanguageFromExtension, parseCode, isTreeSitterInitialized } from '../wasmLoader';

/**
 * AST fact - parses source code into an AST
 */
export const astFact: BrowserFact = {
  name: 'ast',
  description: 'Parses source code into an AST using web-tree-sitter',
  type: 'iterative-function',
  priority: 1,
  
  async calculate(params: unknown, almanac: BrowserAlmanac): Promise<BrowserAstResult> {
    const startTime = performance.now();
    const typedParams = params as { resultFact?: string };
    
    try {
      const fileData = await almanac.factValue<BrowserFileData>('fileData');
      
      if (!fileData) {
        browserLogger.debug('AST Fact: No fileData available');
        return { tree: null, reason: 'No file data available' };
      }
      
      // Check for precomputed AST
      if (fileData.ast) {
        browserLogger.debug(`AST Fact: Using precomputed AST for ${fileData.fileName}`);
        
        if (typedParams?.resultFact) {
          almanac.addRuntimeFact(typedParams.resultFact, fileData.ast);
        }
        
        return fileData.ast;
      }
      
      // Get file content
      const content = fileData.content || fileData.fileContent;
      if (!content || typeof content !== 'string') {
        browserLogger.debug(`AST Fact: No valid content for ${fileData.fileName}`);
        return { tree: null, reason: 'No valid file content' };
      }
      
      // Determine language
      const language = getLanguageFromExtension(fileData.filePath || fileData.fileName);
      if (!language) {
        browserLogger.debug(`AST Fact: Unsupported file type for ${fileData.fileName}`);
        return { 
          tree: null, 
          reason: 'Unsupported file type for AST parsing',
          fileName: fileData.fileName,
          filePath: fileData.filePath,
        };
      }
      
      // Check if tree-sitter is available
      if (!isTreeSitterInitialized()) {
        browserLogger.warn('AST Fact: Tree-sitter not initialized, cannot parse');
        return {
          tree: null,
          reason: 'Tree-sitter not initialized',
          language,
          fileName: fileData.fileName,
          filePath: fileData.filePath,
        };
      }
      
      // Parse the code
      const parseResult = await parseCode(content, language);
      const generationTime = performance.now() - startTime;
      
      if (!parseResult || !parseResult.tree) {
        browserLogger.warn(`AST Fact: Failed to parse ${fileData.fileName}`);
        return {
          tree: null,
          reason: 'AST parsing failed',
          language,
          generationTime,
          fileName: fileData.fileName,
          filePath: fileData.filePath,
        };
      }
      
      const result: BrowserAstResult = {
        tree: parseResult.tree,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rootNode: (parseResult.tree as any).rootNode,
        language,
        hasErrors: parseResult.hasErrors,
        generationTime,
        fileName: fileData.fileName,
        filePath: fileData.filePath,
      };
      
      browserLogger.debug(`AST Fact: Parsed ${fileData.fileName} in ${generationTime.toFixed(2)}ms`);
      
      // Add to almanac if requested
      if (typedParams?.resultFact) {
        almanac.addRuntimeFact(typedParams.resultFact, result);
      }
      
      return result;
    } catch (error) {
      const generationTime = performance.now() - startTime;
      browserLogger.error(`AST Fact: Exception after ${generationTime.toFixed(2)}ms - ${error}`);
      return { tree: null, reason: `Exception: ${error}` };
    }
  },
};
