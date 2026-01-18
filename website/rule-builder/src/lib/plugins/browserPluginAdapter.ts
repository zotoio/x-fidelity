/**
 * Browser Plugin Adapter for X-Fidelity Rule Builder
 * 
 * Provides the adapter layer for running X-Fidelity plugins in the browser.
 * This module handles plugin registration, fact execution, and operator evaluation.
 */

import { 
  BrowserPlugin, 
  BrowserFact, 
  BrowserOperator, 
  BrowserAlmanac, 
  BrowserPluginRegistry,
  FixtureData,
  BrowserFileData,
} from './types';
import { browserLogger, BrowserLogger } from './browserContext';

/**
 * Create a browser-compatible almanac
 */
export function createBrowserAlmanac(
  fixtureData: FixtureData,
  fileData?: BrowserFileData,
  logger: BrowserLogger = browserLogger
): BrowserAlmanac {
  const runtimeFacts = new Map<string, unknown>();
  
  const almanac: BrowserAlmanac = {
    _runtimeFacts: runtimeFacts,
    _currentFileData: fileData,
    _fixtureData: fixtureData,
    
    async factValue<T = unknown>(factName: string): Promise<T> {
      // Check runtime facts first
      if (runtimeFacts.has(factName)) {
        logger.debug(`Almanac: Retrieved runtime fact '${factName}'`);
        return runtimeFacts.get(factName) as T;
      }
      
      // Handle built-in facts
      if (factName === 'fileData' && fileData) {
        return fileData as unknown as T;
      }
      
      // Handle repoFilesystemFacts - return all files as FileData array
      if (factName === 'repoFilesystemFacts') {
        const allFiles: BrowserFileData[] = [];
        for (const [filePath, content] of fixtureData.files.entries()) {
          const fileName = filePath.split('/').pop() || filePath;
          allFiles.push({
            fileName,
            filePath,
            fileContent: content,
            content,
            relativePath: filePath,
          });
        }
        return allFiles as unknown as T;
      }
      
      logger.debug(`Almanac: Fact '${factName}' not found, returning undefined`);
      return undefined as T;
    },
    
    addRuntimeFact(factName: string, value: unknown): void {
      logger.debug(`Almanac: Adding runtime fact '${factName}'`);
      runtimeFacts.set(factName, value);
    },
  };
  
  return almanac;
}

/**
 * Create a browser plugin registry
 */
export function createBrowserPluginRegistry(
  logger: BrowserLogger = browserLogger
): BrowserPluginRegistry {
  const plugins = new Map<string, BrowserPlugin>();
  const facts = new Map<string, BrowserFact>();
  const operators = new Map<string, BrowserOperator>();
  
  const registry: BrowserPluginRegistry = {
    plugins,
    facts,
    operators,
    
    registerPlugin(plugin: BrowserPlugin): void {
      logger.info(`Registering browser plugin: ${plugin.name}`);
      
      // Store the plugin
      plugins.set(plugin.name, plugin);
      
      // Register all facts from the plugin
      for (const [factName, fact] of plugin.facts.entries()) {
        facts.set(factName, fact);
        logger.debug(`  Registered fact: ${factName}`);
      }
      
      // Register all operators from the plugin
      for (const [operatorName, operator] of plugin.operators.entries()) {
        operators.set(operatorName, operator);
        logger.debug(`  Registered operator: ${operatorName}`);
      }
    },
    
    getPlugin(name: string): BrowserPlugin | undefined {
      return plugins.get(name);
    },
    
    getFact(name: string): BrowserFact | undefined {
      return facts.get(name);
    },
    
    getOperator(name: string): BrowserOperator | undefined {
      return operators.get(name);
    },
    
    async initializeAll(fixtureData: FixtureData): Promise<void> {
      logger.info(`Initializing ${plugins.size} browser plugins with fixture data`);
      
      for (const [name, plugin] of plugins.entries()) {
        try {
          await plugin.initialize(fixtureData);
          logger.debug(`  Initialized plugin: ${name}`);
        } catch (error) {
          logger.error(`  Failed to initialize plugin ${name}: ${error}`);
          throw error;
        }
      }
    },
  };
  
  return registry;
}

/**
 * Execute a fact and return its value
 */
export async function executeFact(
  factName: string,
  params: unknown,
  almanac: BrowserAlmanac,
  registry: BrowserPluginRegistry,
  logger: BrowserLogger = browserLogger
): Promise<unknown> {
  const fact = registry.getFact(factName);
  
  if (!fact) {
    logger.warn(`Fact '${factName}' not found in registry`);
    return undefined;
  }
  
  logger.debug(`Executing fact: ${factName}`);
  const startTime = performance.now();
  
  try {
    const result = await fact.calculate(params, almanac);
    const duration = performance.now() - startTime;
    logger.debug(`Fact '${factName}' completed in ${duration.toFixed(2)}ms`);
    return result;
  } catch (error) {
    logger.error(`Error executing fact '${factName}': ${error}`);
    throw error;
  }
}

/**
 * Evaluate an operator with the given values
 */
export function evaluateOperator(
  operatorName: string,
  factValue: unknown,
  compareValue: unknown,
  registry: BrowserPluginRegistry,
  logger: BrowserLogger = browserLogger
): boolean {
  const operator = registry.getOperator(operatorName);
  
  if (!operator) {
    logger.warn(`Operator '${operatorName}' not found in registry`);
    return false;
  }
  
  logger.debug(`Evaluating operator: ${operatorName}`);
  
  try {
    const result = operator.evaluate(factValue, compareValue);
    logger.debug(`Operator '${operatorName}' returned: ${result}`);
    return result;
  } catch (error) {
    logger.error(`Error evaluating operator '${operatorName}': ${error}`);
    return false;
  }
}

/**
 * Create file data objects from fixture data
 */
export function createFileDataFromFixture(
  fixtureData: FixtureData
): BrowserFileData[] {
  const files: BrowserFileData[] = [];
  
  for (const [filePath, content] of fixtureData.files.entries()) {
    const fileName = filePath.split('/').pop() || filePath;
    files.push({
      fileName,
      filePath,
      fileContent: content,
      content,
      relativePath: filePath,
    });
  }
  
  return files;
}

/**
 * Filter files based on patterns (whitelist/blacklist)
 */
export function filterFiles(
  files: BrowserFileData[],
  whitelistPatterns: string[] = [],
  blacklistPatterns: string[] = []
): BrowserFileData[] {
  return files.filter((file) => {
    const path = file.relativePath || file.filePath;
    
    // Check blacklist first
    for (const pattern of blacklistPatterns) {
      if (new RegExp(pattern).test(path)) {
        return false;
      }
    }
    
    // Check whitelist (if no patterns, include all)
    if (whitelistPatterns.length === 0) {
      return true;
    }
    
    for (const pattern of whitelistPatterns) {
      if (new RegExp(pattern).test(path)) {
        return true;
      }
    }
    
    return false;
  });
}
