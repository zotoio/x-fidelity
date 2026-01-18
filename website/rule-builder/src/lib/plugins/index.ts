/**
 * Browser Plugin System for X-Fidelity Rule Builder
 * 
 * This module provides a browser-compatible plugin system that mirrors
 * the Node.js X-Fidelity plugins for use in the Rule Builder GUI.
 * 
 * @module browser-plugins
 */

// Export types
export type {
  BrowserPlugin,
  BrowserFact,
  BrowserOperator,
  BrowserAlmanac,
  BrowserPluginRegistry,
  BrowserFileData,
  BrowserAstResult,
  FixtureData,
  ComplexityThresholds,
  FunctionMetrics,
  VersionData,
  LocalDependencies,
  Position,
  Range,
  MatchDetails,
} from './types';

// Export browser context
export {
  createBrowserLogger,
  createSilentLogger,
  browserLogger,
} from './browserContext';
export type { BrowserLogger, LogLevel, LogEntry, BrowserLoggerConfig } from './browserContext';

// Export adapter utilities
export {
  createBrowserAlmanac,
  createBrowserPluginRegistry,
  executeFact,
  evaluateOperator,
  createFileDataFromFixture,
  filterFiles,
} from './browserPluginAdapter';

// Export individual plugins
export { 
  browserFilesystemPlugin, 
  createBrowserFilesystemPlugin,
  fileDataFact,
  repoFilesystemFact,
  repoFileAnalysisFact,
  fileContainsOperator,
  fileContainsWithPositionOperator,
  missingRequiredFilesOperator,
  nonStandardDirectoryStructureOperator,
} from './filesystem';

export { 
  browserDependencyPlugin, 
  createBrowserDependencyPlugin,
  repoDependencyVersionsFact,
  repoDependencyAnalysisFact,
  outdatedFrameworkOperator,
} from './dependency';

export { 
  browserAstPlugin, 
  createBrowserAstPlugin,
  astFact,
  functionComplexityFact,
  astComplexityOperator,
  functionCountOperator,
  initTreeSitter,
  isTreeSitterInitialized,
  resetTreeSitter,
  getLanguageFromExtension,
  parseCode,
  WASM_BASE_PATH,
  SUPPORTED_LANGUAGES,
} from './ast';
export type { SupportedLanguage } from './ast';

export { 
  browserReactPatternsPlugin, 
  createBrowserReactPatternsPlugin,
  hookDependencyFact,
  effectCleanupFact,
  hasIssuesOperator,
} from './react-patterns';

export { 
  browserPatternsPlugin, 
  createBrowserPatternsPlugin,
  matchesSatisfyOperator,
  globalPatternCountOperator,
  regexMatchOperator,
  globalPatternRatioOperator,
} from './patterns';

// Import plugins for registry
import { browserFilesystemPlugin } from './filesystem';
import { browserDependencyPlugin } from './dependency';
import { browserAstPlugin } from './ast';
import { browserReactPatternsPlugin } from './react-patterns';
import { browserPatternsPlugin } from './patterns';
import { createBrowserPluginRegistry } from './browserPluginAdapter';
import type { BrowserPluginRegistry, FixtureData } from './types';
import { browserLogger } from './browserContext';

/**
 * All available browser plugins
 */
export const browserPlugins = {
  filesystem: browserFilesystemPlugin,
  dependency: browserDependencyPlugin,
  ast: browserAstPlugin,
  reactPatterns: browserReactPatternsPlugin,
  patterns: browserPatternsPlugin,
} as const;

/**
 * Create a fully initialized browser plugin registry with all plugins
 */
export function createFullBrowserPluginRegistry(): BrowserPluginRegistry {
  const registry = createBrowserPluginRegistry(browserLogger);
  
  // Register all plugins
  registry.registerPlugin(browserFilesystemPlugin);
  registry.registerPlugin(browserDependencyPlugin);
  registry.registerPlugin(browserAstPlugin);
  registry.registerPlugin(browserReactPatternsPlugin);
  registry.registerPlugin(browserPatternsPlugin);
  
  return registry;
}

/**
 * Create and initialize a browser plugin registry with fixture data
 */
export async function createInitializedPluginRegistry(
  fixtureData: FixtureData
): Promise<BrowserPluginRegistry> {
  const registry = createFullBrowserPluginRegistry();
  await registry.initializeAll(fixtureData);
  return registry;
}

/**
 * Create empty fixture data structure
 */
export function createEmptyFixtureData(): FixtureData {
  return {
    files: new Map<string, string>(),
    packageJson: {},
    fileList: [],
  };
}

/**
 * Create fixture data from raw objects
 */
export function createFixtureData(
  files: Record<string, string>,
  packageJson: Record<string, unknown> = {}
): FixtureData {
  const fileMap = new Map<string, string>();
  
  for (const [path, content] of Object.entries(files)) {
    fileMap.set(path, content);
  }
  
  return {
    files: fileMap,
    packageJson,
    fileList: Array.from(fileMap.keys()),
  };
}

/**
 * Plugin name to plugin mapping for dynamic loading
 */
export const availableBrowserPlugins = {
  browserFilesystemPlugin: browserFilesystemPlugin,
  browserDependencyPlugin: browserDependencyPlugin,
  browserAstPlugin: browserAstPlugin,
  browserReactPatternsPlugin: browserReactPatternsPlugin,
  browserPatternsPlugin: browserPatternsPlugin,
  // Also support original Node.js plugin names for compatibility
  xfiPluginFilesystem: browserFilesystemPlugin,
  xfiPluginDependency: browserDependencyPlugin,
  xfiPluginAst: browserAstPlugin,
  xfiPluginReactPatterns: browserReactPatternsPlugin,
  xfiPluginPatterns: browserPatternsPlugin,
  xfiPluginExtractValues: browserPatternsPlugin,
} as const;

/**
 * Get list of available browser plugin names
 */
export function getAvailableBrowserPluginNames(): string[] {
  return Object.keys(availableBrowserPlugins);
}
