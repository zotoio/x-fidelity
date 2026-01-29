/**
 * Browser Patterns Plugin
 * 
 * Provides pattern matching facts and operators for browser environment.
 */

import { BrowserPlugin, BrowserFact, BrowserOperator, FixtureData } from '../types';
import { browserLogger } from '../browserContext';
import { matchesSatisfyOperator } from './operators/matchesSatisfy';
import { globalPatternCountOperator } from './operators/globalPatternCount';
import { regexMatchOperator } from './operators/regexMatch';
import { globalPatternRatioOperator } from './operators/globalPatternRatio';

/**
 * Create the browser patterns plugin
 */
export function createBrowserPatternsPlugin(): BrowserPlugin {
  const facts = new Map<string, BrowserFact>();
  const operators = new Map<string, BrowserOperator>();
  
  // Register operators
  operators.set(matchesSatisfyOperator.name, matchesSatisfyOperator);
  operators.set(globalPatternCountOperator.name, globalPatternCountOperator);
  operators.set(regexMatchOperator.name, regexMatchOperator);
  operators.set(globalPatternRatioOperator.name, globalPatternRatioOperator);
  
  const plugin: BrowserPlugin = {
    name: 'browserPatternsPlugin',
    version: '1.0.0',
    description: 'Browser-compatible patterns plugin for X-Fidelity Rule Builder',
    facts,
    operators,
    
    async initialize(fixtures: FixtureData): Promise<void> {
      browserLogger.info(`Initializing browserPatternsPlugin with ${fixtures.files.size} files`);
    },
    
    async cleanup(): Promise<void> {
      browserLogger.debug('Cleaning up browserPatternsPlugin');
    },
  };
  
  return plugin;
}

// Export the plugin instance
export const browserPatternsPlugin = createBrowserPatternsPlugin();

// Re-export operators for direct access
export { matchesSatisfyOperator } from './operators/matchesSatisfy';
export { globalPatternCountOperator } from './operators/globalPatternCount';
export { regexMatchOperator } from './operators/regexMatch';
export { globalPatternRatioOperator } from './operators/globalPatternRatio';
