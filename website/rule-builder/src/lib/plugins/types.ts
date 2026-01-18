/**
 * Browser Plugin Types for X-Fidelity Rule Builder
 * 
 * These types define the browser-compatible plugin interfaces that mirror
 * the Node.js plugin system but work entirely in the browser.
 */

/**
 * Fixture data structure representing a mock codebase
 */
export interface FixtureData {
  /** Map of file paths to file contents */
  files: Map<string, string>;
  /** Parsed package.json content */
  packageJson: Record<string, unknown>;
  /** List of all file paths in the fixture */
  fileList: string[];
  /** Optional metadata about the fixture */
  metadata?: {
    name?: string;
    description?: string;
  };
}

/**
 * File data structure for browser plugins
 */
export interface BrowserFileData {
  fileName: string;
  filePath: string;
  fileContent: string;
  content?: string;
  relativePath?: string;
  ast?: BrowserAstResult;
  astGenerationTime?: number;
  astGenerationReason?: string;
}

/**
 * AST result from web-tree-sitter
 */
export interface BrowserAstResult {
  tree: unknown | null;
  rootNode?: unknown;
  reason?: string;
  language?: string;
  hasErrors?: boolean;
  errorCount?: number;
  generationTime?: number;
  filePath?: string;
  fileName?: string;
}

/**
 * Browser-compatible almanac for accessing fact values
 */
export interface BrowserAlmanac {
  /** Get a fact value by name */
  factValue<T = unknown>(factName: string): Promise<T>;
  /** Add a runtime fact value */
  addRuntimeFact(factName: string, value: unknown): void;
  /** Internal storage for runtime facts */
  _runtimeFacts: Map<string, unknown>;
  /** Current file data context */
  _currentFileData?: BrowserFileData;
  /** Fixture data for plugin access */
  _fixtureData?: FixtureData;
}

/**
 * Browser-compatible fact definition
 */
export interface BrowserFact {
  name: string;
  description?: string;
  type?: 'global' | 'global-function' | 'iterative-function';
  priority?: number;
  calculate(params: unknown, almanac: BrowserAlmanac): Promise<unknown>;
}

/**
 * Browser-compatible operator definition
 */
export interface BrowserOperator {
  name: string;
  description?: string;
  evaluate(factValue: unknown, compareValue: unknown): boolean;
}

/**
 * Browser plugin interface
 */
export interface BrowserPlugin {
  name: string;
  version: string;
  description?: string;
  facts: Map<string, BrowserFact>;
  operators: Map<string, BrowserOperator>;
  
  /**
   * Initialize the plugin with fixture data
   * @param fixtures The fixture data to use for analysis
   */
  initialize(fixtures: FixtureData): Promise<void>;
  
  /**
   * Clean up plugin resources
   */
  cleanup?(): Promise<void>;
}

/**
 * Plugin registry interface for browser environment
 */
export interface BrowserPluginRegistry {
  /** All registered plugins */
  plugins: Map<string, BrowserPlugin>;
  /** All available facts across plugins */
  facts: Map<string, BrowserFact>;
  /** All available operators across plugins */
  operators: Map<string, BrowserOperator>;
  
  /** Register a plugin */
  registerPlugin(plugin: BrowserPlugin): void;
  /** Get a plugin by name */
  getPlugin(name: string): BrowserPlugin | undefined;
  /** Get a fact by name */
  getFact(name: string): BrowserFact | undefined;
  /** Get an operator by name */
  getOperator(name: string): BrowserOperator | undefined;
  /** Initialize all plugins with fixture data */
  initializeAll(fixtures: FixtureData): Promise<void>;
}

/**
 * Complexity thresholds for AST analysis
 */
export interface ComplexityThresholds {
  cyclomaticComplexity?: number;
  cognitiveComplexity?: number;
  nestingDepth?: number;
  parameterCount?: number;
  returnCount?: number;
}

/**
 * Function metrics from AST analysis
 */
export interface FunctionMetrics {
  name: string;
  cyclomaticComplexity: number;
  cognitiveComplexity: number;
  nestingDepth: number;
  parameterCount: number;
  returnCount: number;
  lineCount: number;
  location: {
    startLine: number;
    endLine: number;
    startColumn: number;
    endColumn: number;
  };
}

/**
 * Dependency version data
 */
export interface VersionData {
  dep: string;
  ver: string;
  min: string;
}

/**
 * Local dependency from package.json
 */
export interface LocalDependencies {
  name: string;
  version: string;
  dependencies?: LocalDependencies[];
}

/**
 * Position in source code
 */
export interface Position {
  line: number;
  column: number;
}

/**
 * Range in source code
 */
export interface Range {
  start: Position;
  end: Position;
}

/**
 * Match details from pattern search
 */
export interface MatchDetails {
  pattern: string;
  match: string;
  range: Range;
  context?: string;
  groups?: string[];
}
