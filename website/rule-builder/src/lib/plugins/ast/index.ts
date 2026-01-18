/**
 * Browser AST Plugin
 * 
 * Provides AST analysis facts and operators for browser environment.
 * Uses web-tree-sitter WASM for parsing.
 */

import { BrowserPlugin, BrowserFact, BrowserOperator, FixtureData } from '../types';
import { browserLogger } from '../browserContext';
import { initTreeSitter, resetTreeSitter } from './wasmLoader';
import { astFact } from './facts/astNodesFact';
import { functionComplexityFact } from './facts/functionComplexityFact';
import { astComplexityOperator, functionCountOperator } from './operators/astComplexity';

/**
 * Create the browser AST plugin
 */
export function createBrowserAstPlugin(): BrowserPlugin {
  const facts = new Map<string, BrowserFact>();
  const operators = new Map<string, BrowserOperator>();
  
  // Register facts
  facts.set(astFact.name, astFact);
  facts.set(functionComplexityFact.name, functionComplexityFact);
  
  // Register operators
  operators.set(astComplexityOperator.name, astComplexityOperator);
  operators.set(functionCountOperator.name, functionCountOperator);
  
  const plugin: BrowserPlugin = {
    name: 'browserAstPlugin',
    version: '1.0.0',
    description: 'Browser-compatible AST plugin for X-Fidelity Rule Builder',
    facts,
    operators,
    
    async initialize(fixtures: FixtureData): Promise<void> {
      browserLogger.info(`Initializing browserAstPlugin with ${fixtures.files.size} files`);
      
      // Try to initialize tree-sitter
      try {
        await initTreeSitter();
        browserLogger.info('web-tree-sitter initialized for AST parsing');
      } catch (error) {
        browserLogger.warn(`Failed to initialize web-tree-sitter: ${error}`);
        browserLogger.warn('AST-based facts will be limited');
      }
    },
    
    async cleanup(): Promise<void> {
      browserLogger.debug('Cleaning up browserAstPlugin');
      resetTreeSitter();
    },
  };
  
  return plugin;
}

// Export the plugin instance
export const browserAstPlugin = createBrowserAstPlugin();

// Re-export for direct access
export { astFact } from './facts/astNodesFact';
export { functionComplexityFact } from './facts/functionComplexityFact';
export { astComplexityOperator, functionCountOperator } from './operators/astComplexity';
export { 
  initTreeSitter, 
  isTreeSitterInitialized, 
  resetTreeSitter,
  getLanguageFromExtension,
  parseCode,
  WASM_BASE_PATH,
  SUPPORTED_LANGUAGES,
} from './wasmLoader';
export type { SupportedLanguage } from './wasmLoader';
