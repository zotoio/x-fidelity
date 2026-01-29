/**
 * Simulation Engine for X-Fidelity Rule Builder
 * 
 * Core simulation logic that evaluates rules against fixture data
 * using browser-compatible plugins.
 */

import type { RuleDefinition } from '../../types';
import type { BrowserPluginRegistry, FixtureData } from '../plugins/types';
import type { SimulationResult, SimulationOptions, EventResult } from './types';
import { formatEventFromRule } from './types';
import { evaluateConditions, areConditionsMet } from './conditionEvaluator';
import { createFactAlmanac } from './factEvaluator';
import { 
  createFullBrowserPluginRegistry, 
  isTreeSitterInitialized, 
  initTreeSitter,
  browserLogger,
} from '../plugins';
import { FixtureLoader } from '../fixtures';

/**
 * Simulation Engine class
 * 
 * Orchestrates rule simulation against fixture data using browser plugins.
 */
export class SimulationEngine {
  private registry: BrowserPluginRegistry;
  private fixtureLoader: FixtureLoader;
  private initialized = false;
  private initPromise: Promise<void> | null = null;
  
  constructor() {
    this.registry = createFullBrowserPluginRegistry();
    this.fixtureLoader = new FixtureLoader();
  }
  
  /**
   * Initialize the simulation engine
   * Loads fixture data and initializes plugins (including WASM for tree-sitter)
   */
  async initialize(
    fixtureName: string = 'node-fullstack',
    onProgress?: (step: string, progress: number) => void
  ): Promise<void> {
    // Prevent multiple concurrent initializations
    if (this.initPromise) {
      return this.initPromise;
    }
    
    this.initPromise = this._doInitialize(fixtureName, onProgress);
    
    try {
      await this.initPromise;
    } finally {
      this.initPromise = null;
    }
  }
  
  private async _doInitialize(
    fixtureName: string,
    onProgress?: (step: string, progress: number) => void
  ): Promise<void> {
    try {
      // Step 1: Load fixture data
      onProgress?.('Loading fixture data...', 10);
      await this.fixtureLoader.load(fixtureName);
      
      // Step 2: Initialize tree-sitter WASM (if not already done)
      onProgress?.('Initializing AST parser...', 40);
      if (!isTreeSitterInitialized()) {
        try {
          await initTreeSitter();
        } catch (error) {
          // Log but don't fail - AST features will be limited
          browserLogger.warn('Tree-sitter initialization failed, AST features will be limited', { error });
        }
      }
      
      // Step 3: Initialize plugins with fixture data
      onProgress?.('Initializing plugins...', 70);
      const fixtureData = this.getFixtureData();
      if (fixtureData) {
        await this.registry.initializeAll(fixtureData);
      }
      
      onProgress?.('Ready', 100);
      this.initialized = true;
    } catch (error) {
      this.initialized = false;
      throw error;
    }
  }
  
  /**
   * Check if the engine is initialized
   */
  isInitialized(): boolean {
    return this.initialized && this.fixtureLoader.isLoaded();
  }
  
  /**
   * Get the list of available files from the fixture
   * Excludes files that are not useful for rule simulation
   */
  getAvailableFiles(): string[] {
    if (!this.fixtureLoader.isLoaded()) {
      return [];
    }
    return this.fixtureLoader.listFiles({
      excludePatterns: ['.gitignore'],
    });
  }
  
  /**
   * Get fixture data in the format needed by plugins
   */
  getFixtureData(): FixtureData | null {
    const bundle = this.fixtureLoader.getBundle();
    if (!bundle) {
      return null;
    }
    
    const files = new Map<string, string>();
    for (const [path, entry] of Object.entries(bundle.files)) {
      files.set(path, entry.content);
    }
    
    return {
      files,
      packageJson: bundle.packageJson,
      fileList: Object.keys(bundle.files),
    };
  }
  
  /**
   * Get the fixture loader for direct access
   */
  getFixtureLoader(): FixtureLoader {
    return this.fixtureLoader;
  }
  
  /**
   * Simulate a rule against a specific file
   */
  async simulate(
    rule: RuleDefinition,
    fileName: string,
    options: SimulationOptions = {}
  ): Promise<SimulationResult> {
    const startTime = performance.now();
    
    try {
      // Validate initialization
      if (!this.initialized) {
        return {
          success: false,
          fileName,
          timestamp: new Date(),
          duration: performance.now() - startTime,
          conditionResults: [],
          finalResult: 'error',
          error: 'Simulation engine not initialized. Please wait for initialization to complete.',
        };
      }
      
      // Validate rule
      if (!rule || !rule.conditions) {
        return {
          success: false,
          fileName,
          timestamp: new Date(),
          duration: performance.now() - startTime,
          conditionResults: [],
          finalResult: 'error',
          error: 'Invalid rule: missing conditions',
        };
      }
      
      // Get fixture data
      const fixtureData = this.getFixtureData();
      if (!fixtureData) {
        return {
          success: false,
          fileName,
          timestamp: new Date(),
          duration: performance.now() - startTime,
          conditionResults: [],
          finalResult: 'error',
          error: 'No fixture data loaded',
        };
      }
      
      // Create almanac for the specific file
      const almanac = createFactAlmanac(fixtureData, fileName);
      
      // Evaluate all conditions
      const conditionResults = await evaluateConditions(
        rule.conditions,
        ['conditions'],
        almanac,
        this.registry
      );
      
      // Check if any conditions had errors
      const hasErrors = conditionResults.some(r => r.error && !r.result);
      
      if (hasErrors && !options.verbose) {
        // Check if all errors are "unknown fact" type - these might be expected
        const onlyUnknownFactErrors = conditionResults
          .filter(r => r.error)
          .every(r => r.error?.includes('Unknown fact') || r.error?.includes('Unknown operator'));
        
        if (!onlyUnknownFactErrors) {
          return {
            success: false,
            fileName,
            timestamp: new Date(),
            duration: performance.now() - startTime,
            conditionResults,
            finalResult: 'error',
            error: 'One or more conditions failed to evaluate. Check condition results for details.',
          };
        }
      }
      
      // Determine if conditions are met
      const triggered = areConditionsMet(rule.conditions, conditionResults);
      
      // Format event if triggered
      const event: EventResult | undefined = triggered 
        ? formatEventFromRule(rule)
        : undefined;
      
      return {
        success: true,
        fileName,
        timestamp: new Date(),
        duration: performance.now() - startTime,
        conditionResults,
        finalResult: triggered ? 'triggered' : 'not-triggered',
        event,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        fileName,
        timestamp: new Date(),
        duration: performance.now() - startTime,
        conditionResults: [],
        finalResult: 'error',
        error: `Simulation failed: ${errorMessage}`,
      };
    }
  }
  
  /**
   * Simulate a rule with custom file content (manual mode)
   * This allows users to provide their own file content for testing
   */
  async simulateWithContent(
    rule: RuleDefinition,
    fileName: string,
    fileContent: string,
    options: SimulationOptions = {}
  ): Promise<SimulationResult> {
    const startTime = performance.now();
    
    try {
      // Validate initialization (for plugins, but we don't need fixture data)
      if (!this.initialized) {
        return {
          success: false,
          fileName,
          timestamp: new Date(),
          duration: performance.now() - startTime,
          conditionResults: [],
          finalResult: 'error',
          error: 'Simulation engine not initialized. Please wait for initialization to complete.',
        };
      }
      
      // Validate rule
      if (!rule || !rule.conditions) {
        return {
          success: false,
          fileName,
          timestamp: new Date(),
          duration: performance.now() - startTime,
          conditionResults: [],
          finalResult: 'error',
          error: 'Invalid rule: missing conditions',
        };
      }
      
      // Create a minimal fixture data structure with the custom content
      const customFixtureData: FixtureData = {
        files: new Map([[fileName, fileContent]]),
        fileList: [fileName],
        packageJson: {},
      };
      
      // Create almanac for the custom file
      const almanac = createFactAlmanac(customFixtureData, fileName);
      
      // Evaluate all conditions
      const conditionResults = await evaluateConditions(
        rule.conditions,
        ['conditions'],
        almanac,
        this.registry
      );
      
      // Check if any conditions had errors
      const hasErrors = conditionResults.some(r => r.error && !r.result);
      
      if (hasErrors && !options.verbose) {
        const onlyUnknownFactErrors = conditionResults
          .filter(r => r.error)
          .every(r => r.error?.includes('Unknown fact') || r.error?.includes('Unknown operator'));
        
        if (!onlyUnknownFactErrors) {
          return {
            success: false,
            fileName,
            timestamp: new Date(),
            duration: performance.now() - startTime,
            conditionResults,
            finalResult: 'error',
            error: 'One or more conditions failed to evaluate. Check condition results for details.',
          };
        }
      }
      
      // Determine if conditions are met
      const triggered = areConditionsMet(rule.conditions, conditionResults);
      
      // Format event if triggered
      const event: EventResult | undefined = triggered 
        ? formatEventFromRule(rule)
        : undefined;
      
      return {
        success: true,
        fileName,
        timestamp: new Date(),
        duration: performance.now() - startTime,
        conditionResults,
        finalResult: triggered ? 'triggered' : 'not-triggered',
        event,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        fileName,
        timestamp: new Date(),
        duration: performance.now() - startTime,
        conditionResults: [],
        finalResult: 'error',
        error: `Simulation failed: ${errorMessage}`,
      };
    }
  }

  /**
   * Simulate a rule against all available files
   */
  async simulateAll(
    rule: RuleDefinition,
    options: SimulationOptions = {}
  ): Promise<Map<string, SimulationResult>> {
    const results = new Map<string, SimulationResult>();
    const files = this.getAvailableFiles();
    
    for (const fileName of files) {
      const result = await this.simulate(rule, fileName, options);
      results.set(fileName, result);
    }
    
    return results;
  }
  
  /**
   * Simulate a global rule against the entire repository
   * This is for REPO_GLOBAL_CHECK rules that analyze repository-wide facts
   * 
   * @param rule - The rule to evaluate
   * @param additionalFiles - Optional additional files to include (manual content)
   * @param options - Simulation options
   */
  async simulateGlobal(
    rule: RuleDefinition,
    additionalFiles?: Map<string, string>,
    options: SimulationOptions = {}
  ): Promise<SimulationResult> {
    const startTime = performance.now();
    
    try {
      // Validate initialization
      if (!this.initialized) {
        return {
          success: false,
          fileName: 'GLOBAL',
          timestamp: new Date(),
          duration: performance.now() - startTime,
          conditionResults: [],
          finalResult: 'error',
          error: 'Simulation engine not initialized. Please wait for initialization to complete.',
        };
      }
      
      // Validate rule
      if (!rule || !rule.conditions) {
        return {
          success: false,
          fileName: 'GLOBAL',
          timestamp: new Date(),
          duration: performance.now() - startTime,
          conditionResults: [],
          finalResult: 'error',
          error: 'Invalid rule: missing conditions',
        };
      }
      
      // Get fixture data
      let fixtureData = this.getFixtureData();
      if (!fixtureData) {
        return {
          success: false,
          fileName: 'GLOBAL',
          timestamp: new Date(),
          duration: performance.now() - startTime,
          conditionResults: [],
          finalResult: 'error',
          error: 'No fixture data loaded',
        };
      }
      
      // Merge additional files if provided
      if (additionalFiles && additionalFiles.size > 0) {
        const mergedFiles = new Map(fixtureData.files);
        const mergedFileList = [...fixtureData.fileList];
        
        for (const [path, content] of additionalFiles) {
          mergedFiles.set(path, content);
          if (!mergedFileList.includes(path)) {
            mergedFileList.push(path);
          }
        }
        
        fixtureData = {
          ...fixtureData,
          files: mergedFiles,
          fileList: mergedFileList,
        };
      }
      
      // Create almanac for global evaluation (no specific file, uses repo-wide facts)
      // For global rules, we pass a special "GLOBAL" marker
      const almanac = createFactAlmanac(fixtureData, 'GLOBAL');
      
      // Evaluate all conditions
      const conditionResults = await evaluateConditions(
        rule.conditions,
        ['conditions'],
        almanac,
        this.registry
      );
      
      // Check if any conditions had errors
      const hasErrors = conditionResults.some(r => r.error && !r.result);
      
      if (hasErrors && !options.verbose) {
        const onlyUnknownFactErrors = conditionResults
          .filter(r => r.error)
          .every(r => r.error?.includes('Unknown fact') || r.error?.includes('Unknown operator'));
        
        if (!onlyUnknownFactErrors) {
          return {
            success: false,
            fileName: 'GLOBAL',
            timestamp: new Date(),
            duration: performance.now() - startTime,
            conditionResults,
            finalResult: 'error',
            error: 'One or more conditions failed to evaluate. Check condition results for details.',
          };
        }
      }
      
      // Determine if conditions are met
      const triggered = areConditionsMet(rule.conditions, conditionResults);
      
      // Format event if triggered
      const event: EventResult | undefined = triggered 
        ? formatEventFromRule(rule)
        : undefined;
      
      return {
        success: true,
        fileName: 'GLOBAL',
        timestamp: new Date(),
        duration: performance.now() - startTime,
        conditionResults,
        finalResult: triggered ? 'triggered' : 'not-triggered',
        event,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        fileName: 'GLOBAL',
        timestamp: new Date(),
        duration: performance.now() - startTime,
        conditionResults: [],
        finalResult: 'error',
        error: `Global simulation failed: ${errorMessage}`,
      };
    }
  }
  
  /**
   * Reset the engine state
   */
  reset(): void {
    this.initialized = false;
    this.fixtureLoader.clear();
    this.registry = createFullBrowserPluginRegistry();
  }
}

/**
 * Singleton instance for the simulation engine
 */
export const simulationEngine = new SimulationEngine();

/**
 * Convenience function to run a simulation
 */
export async function runSimulation(
  rule: RuleDefinition,
  fileName: string,
  options?: SimulationOptions
): Promise<SimulationResult> {
  if (!simulationEngine.isInitialized()) {
    await simulationEngine.initialize();
  }
  return simulationEngine.simulate(rule, fileName, options);
}
