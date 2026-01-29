/**
 * Browser React Patterns Plugin
 * 
 * Provides React-specific pattern analysis for browser environment.
 * Leverages the AST plugin for parsing.
 */

import { BrowserPlugin, BrowserFact, BrowserOperator, FixtureData } from '../types';
import { browserLogger } from '../browserContext';
import { hookDependencyFact } from './facts/hookDependencyFact';
import { effectCleanupFact } from './facts/effectCleanupFact';
import { hasIssuesOperator } from './operators/hasIssues';

/**
 * Create the browser React patterns plugin
 */
export function createBrowserReactPatternsPlugin(): BrowserPlugin {
  const facts = new Map<string, BrowserFact>();
  const operators = new Map<string, BrowserOperator>();
  
  // Register facts
  facts.set(hookDependencyFact.name, hookDependencyFact);
  facts.set(effectCleanupFact.name, effectCleanupFact);
  
  // Register operators
  operators.set(hasIssuesOperator.name, hasIssuesOperator);
  
  const plugin: BrowserPlugin = {
    name: 'browserReactPatternsPlugin',
    version: '1.0.0',
    description: 'Browser-compatible React patterns plugin for X-Fidelity Rule Builder',
    facts,
    operators,
    
    async initialize(fixtures: FixtureData): Promise<void> {
      // Count React files
      let reactFileCount = 0;
      for (const filePath of fixtures.files.keys()) {
        const ext = filePath.split('.').pop()?.toLowerCase();
        if (['jsx', 'tsx'].includes(ext || '')) {
          reactFileCount++;
        }
      }
      
      browserLogger.info(`Initializing browserReactPatternsPlugin with ${reactFileCount} React files`);
    },
    
    async cleanup(): Promise<void> {
      browserLogger.debug('Cleaning up browserReactPatternsPlugin');
    },
  };
  
  return plugin;
}

// Export the plugin instance
export const browserReactPatternsPlugin = createBrowserReactPatternsPlugin();

// Re-export facts and operators for direct access
export { hookDependencyFact } from './facts/hookDependencyFact';
export { effectCleanupFact } from './facts/effectCleanupFact';
export { hasIssuesOperator } from './operators/hasIssues';
