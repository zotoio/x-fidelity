/**
 * Fact Evaluator for Rule Simulation
 * 
 * Handles fact execution with the browser plugin system.
 */

import type { BrowserAlmanac, BrowserPluginRegistry, FixtureData, BrowserFileData } from '../plugins/types';
import type { FactSummary } from './types';
import { createBrowserAlmanac, executeFact } from '../plugins';
import { browserLogger } from '../plugins/browserContext';

/**
 * Result of fact evaluation
 */
export interface FactEvaluationResult {
  /** Value returned by the fact */
  value: unknown;
  /** Whether evaluation succeeded */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Duration of execution in ms */
  duration: number;
}

/**
 * Evaluate a fact using the browser plugin system
 * 
 * @param factName - Name of the fact to evaluate
 * @param params - Parameters to pass to the fact
 * @param almanac - Browser almanac with current context
 * @param registry - Plugin registry with facts
 * @returns Result of fact evaluation
 */
export async function evaluateFact(
  factName: string,
  params: Record<string, unknown> | undefined,
  almanac: BrowserAlmanac,
  registry: BrowserPluginRegistry
): Promise<FactEvaluationResult> {
  const startTime = performance.now();
  
  try {
    // Check if almanac already has this fact cached
    const cachedValue = almanac._runtimeFacts.get(factName);
    if (cachedValue !== undefined) {
      return {
        value: cachedValue,
        success: true,
        duration: performance.now() - startTime,
      };
    }
    
    // Check for built-in facts
    if (factName === 'fileData') {
      const fileData = almanac._currentFileData;
      return {
        value: fileData,
        success: true,
        duration: performance.now() - startTime,
      };
    }
    
    // Execute the fact through the registry
    const fact = registry.getFact(factName);
    if (!fact) {
      return {
        value: undefined,
        success: false,
        error: `Unknown fact: ${factName}. This fact is not available in the browser plugin system.`,
        duration: performance.now() - startTime,
      };
    }
    
    const value = await executeFact(factName, params, almanac, registry, browserLogger);
    
    // Cache the value for subsequent uses
    almanac.addRuntimeFact(factName, value);
    
    return {
      value,
      success: true,
      duration: performance.now() - startTime,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      value: undefined,
      success: false,
      error: errorMessage,
      duration: performance.now() - startTime,
    };
  }
}

/**
 * Create a fact almanac for a specific file
 */
export function createFactAlmanac(
  fixtureData: FixtureData,
  fileName: string
): BrowserAlmanac {
  const content = fixtureData.files.get(fileName) ?? '';
  
  const fileData: BrowserFileData = {
    fileName: fileName.split('/').pop() || fileName,
    filePath: fileName,
    fileContent: content,
    content,
    relativePath: fileName,
  };
  
  return createBrowserAlmanac(fixtureData, fileData, browserLogger);
}

/**
 * Get a value from a nested object using a JSON path
 * 
 * @param obj - Object to extract value from
 * @param path - JSON path (e.g., "$.data.items[0].name")
 * @returns Value at the path or undefined
 */
export function getValueAtPath(obj: unknown, path?: string): unknown {
  if (!path) return obj;
  
  // Handle JSON path format ($.path.to.value)
  const cleanPath = path.replace(/^\$\.?/, '');
  if (!cleanPath) return obj;
  
  const segments = cleanPath.split(/[.\[\]]/).filter(Boolean);
  
  let current: unknown = obj;
  for (const segment of segments) {
    if (current === null || current === undefined) {
      return undefined;
    }
    
    if (typeof current !== 'object') {
      return undefined;
    }
    
    current = (current as Record<string, unknown>)[segment];
  }
  
  return current;
}

/**
 * Collect all unique facts used in a rule
 */
export function collectFactsUsed(conditions: unknown, facts: Set<string> = new Set()): Set<string> {
  if (!conditions || typeof conditions !== 'object') {
    return facts;
  }
  
  const cond = conditions as Record<string, unknown>;
  
  // Check if this is a condition with a fact
  if ('fact' in cond && typeof cond.fact === 'string') {
    facts.add(cond.fact);
  }
  
  // Recurse into all/any/not
  if ('all' in cond && Array.isArray(cond.all)) {
    for (const child of cond.all) {
      collectFactsUsed(child, facts);
    }
  }
  
  if ('any' in cond && Array.isArray(cond.any)) {
    for (const child of cond.any) {
      collectFactsUsed(child, facts);
    }
  }
  
  if ('not' in cond) {
    collectFactsUsed(cond.not, facts);
  }
  
  return facts;
}

/**
 * Build a summary of all facts evaluated
 */
export function buildFactSummary(
  factResults: Map<string, FactEvaluationResult>
): FactSummary[] {
  const summaries: FactSummary[] = [];
  
  for (const [name, result] of factResults.entries()) {
    summaries.push({
      name,
      value: result.value,
      duration: result.duration,
      success: result.success,
      error: result.error,
    });
  }
  
  return summaries.sort((a, b) => a.name.localeCompare(b.name));
}
