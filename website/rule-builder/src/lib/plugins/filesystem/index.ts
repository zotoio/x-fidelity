/**
 * Browser Filesystem Plugin
 * 
 * Provides filesystem-related facts and operators for browser environment.
 * Uses fixture data instead of Node.js fs module.
 */

import { BrowserPlugin, BrowserFact, BrowserOperator, FixtureData } from '../types';
import { browserLogger } from '../browserContext';
import { fileDataFact, repoFilesystemFact, repoFileAnalysisFact } from './facts/fileDataFact';
import { fileContainsOperator, fileContainsWithPositionOperator } from './operators/fileContains';
import { missingRequiredFilesOperator } from './operators/missingRequiredFiles';
import { nonStandardDirectoryStructureOperator } from './operators/nonStandardDirectoryStructure';

/**
 * Create the browser filesystem plugin
 */
export function createBrowserFilesystemPlugin(): BrowserPlugin {
  const facts = new Map<string, BrowserFact>();
  const operators = new Map<string, BrowserOperator>();
  
  // Register facts
  facts.set(fileDataFact.name, fileDataFact);
  facts.set(repoFilesystemFact.name, repoFilesystemFact);
  facts.set(repoFileAnalysisFact.name, repoFileAnalysisFact);
  
  // Register operators
  operators.set(fileContainsOperator.name, fileContainsOperator);
  operators.set(fileContainsWithPositionOperator.name, fileContainsWithPositionOperator);
  operators.set(missingRequiredFilesOperator.name, missingRequiredFilesOperator);
  operators.set(nonStandardDirectoryStructureOperator.name, nonStandardDirectoryStructureOperator);
  
  const plugin: BrowserPlugin = {
    name: 'browserFilesystemPlugin',
    version: '1.0.0',
    description: 'Browser-compatible filesystem plugin for X-Fidelity Rule Builder',
    facts,
    operators,
    
    async initialize(fixtures: FixtureData): Promise<void> {
      browserLogger.info(`Initializing browserFilesystemPlugin with ${fixtures.files.size} files`);
    },
    
    async cleanup(): Promise<void> {
      browserLogger.debug('Cleaning up browserFilesystemPlugin');
    },
  };
  
  return plugin;
}

// Export the plugin instance
export const browserFilesystemPlugin = createBrowserFilesystemPlugin();

// Re-export facts and operators for direct access
export { fileDataFact, repoFilesystemFact, repoFileAnalysisFact };
export { fileContainsOperator, fileContainsWithPositionOperator };
export { missingRequiredFilesOperator };
export { nonStandardDirectoryStructureOperator };
