/**
 * Browser Dependency Plugin
 * 
 * Provides dependency analysis facts and operators for browser environment.
 * Uses bundled package.json data instead of Node.js package managers.
 */

import { BrowserPlugin, BrowserFact, BrowserOperator, FixtureData } from '../types';
import { browserLogger } from '../browserContext';
import { repoDependencyVersionsFact, repoDependencyAnalysisFact } from './facts/repoDependenciesFact';
import { outdatedFrameworkOperator } from './operators/outdatedFramework';

/**
 * Create the browser dependency plugin
 */
export function createBrowserDependencyPlugin(): BrowserPlugin {
  const facts = new Map<string, BrowserFact>();
  const operators = new Map<string, BrowserOperator>();
  
  // Register facts
  facts.set(repoDependencyVersionsFact.name, repoDependencyVersionsFact);
  facts.set(repoDependencyAnalysisFact.name, repoDependencyAnalysisFact);
  
  // Register operators
  operators.set(outdatedFrameworkOperator.name, outdatedFrameworkOperator);
  
  const plugin: BrowserPlugin = {
    name: 'browserDependencyPlugin',
    version: '1.0.0',
    description: 'Browser-compatible dependency plugin for X-Fidelity Rule Builder',
    facts,
    operators,
    
    async initialize(fixtures: FixtureData): Promise<void> {
      const depCount = Object.keys(fixtures.packageJson.dependencies || {}).length;
      const devDepCount = Object.keys(fixtures.packageJson.devDependencies || {}).length;
      browserLogger.info(`Initializing browserDependencyPlugin with ${depCount} deps, ${devDepCount} devDeps`);
    },
    
    async cleanup(): Promise<void> {
      browserLogger.debug('Cleaning up browserDependencyPlugin');
    },
  };
  
  return plugin;
}

// Export the plugin instance
export const browserDependencyPlugin = createBrowserDependencyPlugin();

// Re-export facts and operators for direct access
export { repoDependencyVersionsFact, repoDependencyAnalysisFact };
export { outdatedFrameworkOperator };
