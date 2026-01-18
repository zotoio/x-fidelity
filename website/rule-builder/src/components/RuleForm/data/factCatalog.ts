/**
 * Fact Catalog for X-Fidelity Rule Builder
 *
 * Provides metadata for all available facts from browser plugins.
 * This enables the form to show fact descriptions, parameter hints,
 * and compatible operators.
 */

import type { ConditionOperator } from '../../../types';

/**
 * Parameter definition for a fact
 */
export interface FactParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  description: string;
  default?: unknown;
  example?: unknown;
}

/**
 * Suggested path for a fact
 */
export interface SuggestedPath {
  path: string;
  description: string;
  valueType: 'string' | 'number' | 'boolean' | 'array' | 'object';
}

/**
 * Metadata for a fact
 */
export interface FactMetadata {
  name: string;
  plugin: string;
  description: string;
  parameters: FactParameter[];
  returns: string;
  example: {
    params: Record<string, unknown>;
    output: unknown;
  };
  compatibleOperators: ConditionOperator[];
  documentationUrl?: string;
  tags: string[];
  /** Suggested JSONPath expressions for this fact */
  suggestedPaths?: SuggestedPath[];
  /** Whether custom paths are allowed (default: true) */
  allowCustomPath?: boolean;
}

/**
 * Filesystem plugin facts
 */
const filesystemFacts: FactMetadata[] = [
  {
    name: 'fileData',
    plugin: 'filesystem',
    description: 'Returns data for the current file in iterative analysis',
    parameters: [],
    returns: 'Object with fileName, filePath, fileContent properties',
    example: {
      params: {},
      output: {
        fileName: 'index.ts',
        filePath: 'src/index.ts',
        fileContent: '// File content...',
      },
    },
    compatibleOperators: ['equal', 'notEqual', 'contains', 'doesNotContain', 'matchesPattern'],
    documentationUrl: '/docs/facts/file-data',
    tags: ['filesystem', 'iterative', 'file'],
    suggestedPaths: [
      { path: '$.extension', description: 'File extension (e.g., ts, js, tsx)', valueType: 'string' },
      { path: '$.fileName', description: 'Full file name with extension', valueType: 'string' },
      { path: '$.filePath', description: 'Relative path from repository root', valueType: 'string' },
      { path: '$.fileContent', description: 'Full file content as string', valueType: 'string' },
    ],
    allowCustomPath: true,
  },
  {
    name: 'repoFilesystemFacts',
    plugin: 'filesystem',
    description: 'Returns all files in the repository as an array',
    parameters: [],
    returns: 'Array of file data objects',
    example: {
      params: {},
      output: [
        { fileName: 'index.ts', filePath: 'src/index.ts', fileContent: '...' },
      ],
    },
    compatibleOperators: ['contains', 'doesNotContain', 'equal', 'notEqual'],
    documentationUrl: '/docs/facts/repo-filesystem',
    tags: ['filesystem', 'global', 'repository'],
    suggestedPaths: [
      // Most common - file counts and names
      { path: '$.length', description: 'Total number of files', valueType: 'number' },
      { path: '$[*].fileName', description: 'Array of all file names', valueType: 'array' },
      { path: '$[*].filePath', description: 'Array of all file paths', valueType: 'array' },
      { path: '$[*].extension', description: 'Array of all file extensions', valueType: 'array' },
      // First file access (common for single file checks)
      { path: '$[0].fileName', description: 'First file name', valueType: 'string' },
      { path: '$[0].filePath', description: 'First file path', valueType: 'string' },
      { path: '$[0].fileContent', description: 'First file content', valueType: 'string' },
      // Full result
      { path: '$', description: 'All files as array', valueType: 'array' },
    ],
    allowCustomPath: true,
  },
  {
    name: 'repoFileAnalysis',
    plugin: 'filesystem',
    description: 'Performs pattern analysis on file content',
    parameters: [
      {
        name: 'checkPattern',
        type: 'array',
        required: true,
        description: 'Regex pattern(s) to search for in file content. Can be a single pattern string or an array of patterns.',
        example: ['TODO|FIXME', 'HACK', 'XXX'],
      },
      {
        name: 'resultFact',
        type: 'string',
        required: false,
        description: 'Name to store the analysis results for reference in event details',
        example: 'fileResults',
      },
      {
        name: 'captureGroups',
        type: 'boolean',
        required: false,
        description: 'Whether to capture regex groups',
        default: false,
      },
      {
        name: 'contextLength',
        type: 'number',
        required: false,
        description: 'Number of characters of context to include',
        default: 50,
      },
    ],
    returns: 'Object with result array, matches array, and summary',
    example: {
      params: { checkPattern: 'TODO' },
      output: {
        result: [{ match: 'TODO', lineNumber: 5, line: '// TODO: fix this' }],
        matches: [],
        summary: { totalMatches: 1, patterns: ['TODO'], hasPositionData: true },
      },
    },
    compatibleOperators: ['fileContains', 'fileContainsWithPosition', 'equal', 'notEqual'],
    documentationUrl: '/docs/facts/repo-file-analysis',
    tags: ['filesystem', 'iterative', 'pattern', 'analysis'],
    suggestedPaths: [
      { path: '$.result', description: 'Array of pattern matches', valueType: 'array' },
      { path: '$.result.length', description: 'Number of matches found', valueType: 'number' },
      { path: '$.summary.totalMatches', description: 'Total count of matches', valueType: 'number' },
      { path: '$.matches', description: 'Array of captured groups', valueType: 'array' },
    ],
    allowCustomPath: true,
  },
  {
    name: 'missingRequiredFiles',
    plugin: 'filesystem',
    description: 'Checks for required files and reports which are missing',
    parameters: [
      {
        name: 'requiredFiles',
        type: 'array',
        required: true,
        description: 'Array of file paths that should exist',
        example: ['README.md', 'package.json', 'tsconfig.json'],
      },
      {
        name: 'resultFact',
        type: 'string',
        required: false,
        description: 'Name to store the missing files results for reference in event details',
        example: 'missingRequiredFilesResult',
      },
    ],
    returns: 'Object with missing files list and counts',
    example: {
      params: { requiredFiles: ['README.md', 'LICENSE'] },
      output: {
        missing: ['LICENSE'],
        total: 2,
        found: 1,
      },
    },
    compatibleOperators: ['missingRequiredFiles', 'equal', 'notEqual'],
    documentationUrl: '/docs/facts/missing-required-files',
    tags: ['filesystem', 'global', 'validation', 'structure'],
    suggestedPaths: [
      { path: '$.missing', description: 'Array of missing file paths', valueType: 'array' },
      { path: '$.missing.length', description: 'Number of missing files', valueType: 'number' },
      { path: '$.total', description: 'Total required files count', valueType: 'number' },
      { path: '$.found', description: 'Number of files found', valueType: 'number' },
      { path: '$', description: 'Full result object', valueType: 'object' },
    ],
    allowCustomPath: true,
  },
];

/**
 * AST plugin facts
 */
const astFacts: FactMetadata[] = [
  {
    name: 'ast',
    plugin: 'ast',
    description: 'Returns AST node information for the current file',
    parameters: [
      {
        name: 'nodeTypes',
        type: 'array',
        required: false,
        description: 'Array of node types to filter',
        example: ['function_declaration', 'arrow_function'],
      },
    ],
    returns: 'AST tree with filtered nodes',
    example: {
      params: { nodeTypes: ['function_declaration'] },
      output: { tree: {}, rootNode: {}, language: 'typescript' },
    },
    compatibleOperators: ['astNodeExists', 'astPatternMatch', 'equal', 'notEqual'],
    documentationUrl: '/docs/facts/ast-nodes',
    tags: ['ast', 'iterative', 'code-structure'],
    suggestedPaths: [
      // Most common - language detection
      { path: '$.language', description: 'Detected language (typescript, javascript, etc.)', valueType: 'string' },
      // Node existence checks (most common use case)
      { path: '$.rootNode.type', description: 'Root node type (program, module, etc.)', valueType: 'string' },
      { path: '$.rootNode.childCount', description: 'Number of top-level children', valueType: 'number' },
      { path: '$.rootNode.text', description: 'Full source text', valueType: 'string' },
      // Function-related queries
      { path: '$.nodes.function_declaration', description: 'Function declarations array', valueType: 'array' },
      { path: '$.nodes.arrow_function', description: 'Arrow functions array', valueType: 'array' },
      { path: '$.nodes.method_definition', description: 'Method definitions array', valueType: 'array' },
      // Class-related queries
      { path: '$.nodes.class_declaration', description: 'Class declarations array', valueType: 'array' },
      { path: '$.nodes.interface_declaration', description: 'Interface declarations (TS)', valueType: 'array' },
      { path: '$.nodes.type_alias_declaration', description: 'Type aliases (TS)', valueType: 'array' },
      // Import/Export
      { path: '$.nodes.import_statement', description: 'Import statements array', valueType: 'array' },
      { path: '$.nodes.export_statement', description: 'Export statements array', valueType: 'array' },
      // JSX elements
      { path: '$.nodes.jsx_element', description: 'JSX elements array', valueType: 'array' },
      { path: '$.nodes.jsx_self_closing_element', description: 'Self-closing JSX elements', valueType: 'array' },
      // Variables and expressions
      { path: '$.nodes.variable_declaration', description: 'Variable declarations', valueType: 'array' },
      { path: '$.nodes.call_expression', description: 'Function call expressions', valueType: 'array' },
      // Full structures
      { path: '$.rootNode', description: 'Root AST node object', valueType: 'object' },
      { path: '$.tree', description: 'Full AST tree structure', valueType: 'object' },
    ],
    allowCustomPath: true,
  },
  {
    name: 'functionComplexity',
    plugin: 'ast',
    description: 'Calculates complexity metrics for functions in the file',
    parameters: [
      {
        name: 'thresholds',
        type: 'object',
        required: false,
        description: 'Complexity thresholds to check against',
        example: { cyclomaticComplexity: 10, nestingDepth: 4, cognitiveComplexity: 40, parameterCount: 5, returnCount: 10 },
      },
      {
        name: 'resultFact',
        type: 'string',
        required: false,
        description: 'Name to store the complexity results for reference in event details',
        example: 'complexityResult',
      },
    ],
    returns: 'Array of function metrics with complexity scores',
    example: {
      params: { thresholds: { cyclomaticComplexity: 10 } },
      output: [
        {
          name: 'processData',
          cyclomaticComplexity: 15,
          cognitiveComplexity: 8,
          nestingDepth: 3,
          location: { startLine: 10, endLine: 50 },
        },
      ],
    },
    compatibleOperators: ['greaterThan', 'lessThan', 'equal', 'notEqual'],
    documentationUrl: '/docs/facts/function-complexity',
    tags: ['ast', 'iterative', 'complexity', 'metrics'],
    suggestedPaths: [
      // Most common - overall metrics
      { path: '$.length', description: 'Number of functions analyzed', valueType: 'number' },
      { path: '$[0].cyclomaticComplexity', description: 'First function cyclomatic complexity', valueType: 'number' },
      { path: '$[0].cognitiveComplexity', description: 'First function cognitive complexity', valueType: 'number' },
      { path: '$[0].nestingDepth', description: 'First function max nesting depth', valueType: 'number' },
      // Function info
      { path: '$[0].name', description: 'First function name', valueType: 'string' },
      { path: '$[0].location.startLine', description: 'First function start line', valueType: 'number' },
      { path: '$[0].location.endLine', description: 'First function end line', valueType: 'number' },
      // Arrays for all functions
      { path: '$[*].name', description: 'All function names', valueType: 'array' },
      { path: '$[*].cyclomaticComplexity', description: 'All cyclomatic complexity scores', valueType: 'array' },
      { path: '$[*].cognitiveComplexity', description: 'All cognitive complexity scores', valueType: 'array' },
      { path: '$[*].nestingDepth', description: 'All nesting depth values', valueType: 'array' },
      // Full result
      { path: '$', description: 'Array of all function metrics', valueType: 'array' },
    ],
    allowCustomPath: true,
  },
  {
    name: 'functionCount',
    plugin: 'ast',
    description: 'Counts the number of functions in the current file',
    parameters: [
      {
        name: 'resultFact',
        type: 'string',
        required: false,
        description: 'Name to store the count results for reference in event details',
        example: 'functionCountResult',
      },
    ],
    returns: 'Object with function count and optional details',
    example: {
      params: {},
      output: { count: 5, functions: ['main', 'helper', 'validate'] },
    },
    compatibleOperators: ['greaterThan', 'lessThan', 'equal', 'notEqual', 'functionCount'],
    documentationUrl: '/docs/facts/function-count',
    tags: ['ast', 'iterative', 'metrics', 'functions'],
    suggestedPaths: [
      { path: '$.count', description: 'Total number of functions', valueType: 'number' },
      { path: '$.functions', description: 'Array of function names', valueType: 'array' },
      { path: '$.functions.length', description: 'Number of named functions', valueType: 'number' },
      { path: '$', description: 'Full function count result', valueType: 'object' },
    ],
    allowCustomPath: true,
  },
];

/**
 * Dependency plugin facts
 */
const dependencyFacts: FactMetadata[] = [
  {
    name: 'repoDependencyVersions',
    plugin: 'dependency',
    description: 'Returns all dependencies and their versions from package.json',
    parameters: [],
    returns: 'Object mapping dependency names to version strings',
    example: {
      params: {},
      output: {
        react: '^18.2.0',
        typescript: '^5.0.0',
        lodash: '^4.17.21',
      },
    },
    compatibleOperators: ['versionSatisfies', 'equal', 'notEqual', 'contains'],
    documentationUrl: '/docs/facts/repo-dependency-versions',
    tags: ['dependency', 'global', 'package'],
    suggestedPaths: [
      // Common framework versions
      { path: '$.react', description: 'React version', valueType: 'string' },
      { path: '$.typescript', description: 'TypeScript version', valueType: 'string' },
      { path: '$.next', description: 'Next.js version', valueType: 'string' },
      { path: '$.vue', description: 'Vue.js version', valueType: 'string' },
      { path: '$.angular', description: 'Angular version', valueType: 'string' },
      { path: '$.express', description: 'Express version', valueType: 'string' },
      // Testing
      { path: '$.jest', description: 'Jest version', valueType: 'string' },
      { path: '$.vitest', description: 'Vitest version', valueType: 'string' },
      { path: '$.mocha', description: 'Mocha version', valueType: 'string' },
      // Build tools
      { path: '$.webpack', description: 'Webpack version', valueType: 'string' },
      { path: '$.vite', description: 'Vite version', valueType: 'string' },
      { path: '$.esbuild', description: 'esbuild version', valueType: 'string' },
      // Full object
      { path: '$', description: 'All dependencies as object', valueType: 'object' },
    ],
    allowCustomPath: true,
  },
  {
    name: 'repoDependencyAnalysis',
    plugin: 'dependency',
    description: 'Analyzes dependencies for outdated or vulnerable packages',
    parameters: [
      {
        name: 'checkDev',
        type: 'boolean',
        required: false,
        description: 'Whether to include devDependencies',
        default: true,
      },
      {
        name: 'resultFact',
        type: 'string',
        required: false,
        description: 'Name to store the analysis results for reference in event details',
        example: 'repoDependencyResults',
      },
    ],
    returns: 'Object with dependency analysis results',
    example: {
      params: { checkDev: true },
      output: {
        dependencies: { react: '^18.2.0' },
        devDependencies: { jest: '^29.0.0' },
        analysis: { outdated: [], vulnerable: [] },
      },
    },
    compatibleOperators: ['outdatedFramework', 'equal', 'notEqual', 'contains'],
    documentationUrl: '/docs/facts/repo-dependency-analysis',
    tags: ['dependency', 'global', 'analysis', 'security'],
    suggestedPaths: [
      // Security checks (most important)
      { path: '$.analysis.vulnerable', description: 'List of vulnerable packages', valueType: 'array' },
      { path: '$.analysis.vulnerable.length', description: 'Number of vulnerable packages', valueType: 'number' },
      { path: '$.analysis.outdated', description: 'List of outdated packages', valueType: 'array' },
      { path: '$.analysis.outdated.length', description: 'Number of outdated packages', valueType: 'number' },
      // Dependency types
      { path: '$.dependencies', description: 'Production dependencies object', valueType: 'object' },
      { path: '$.devDependencies', description: 'Development dependencies object', valueType: 'object' },
      { path: '$.peerDependencies', description: 'Peer dependencies object', valueType: 'object' },
      { path: '$.optionalDependencies', description: 'Optional dependencies object', valueType: 'object' },
      // Specific dependency access
      { path: '$.dependencies.react', description: 'React prod dependency version', valueType: 'string' },
      { path: '$.devDependencies.jest', description: 'Jest dev dependency version', valueType: 'string' },
    ],
    allowCustomPath: true,
  },
];

/**
 * React patterns plugin facts
 */
const reactPatternsFacts: FactMetadata[] = [
  {
    name: 'hookDependency',
    plugin: 'react-patterns',
    description: 'Analyzes React hook dependency arrays for issues',
    parameters: [
      {
        name: 'hooks',
        type: 'array',
        required: false,
        description: 'Specific hooks to analyze',
        example: ['useEffect', 'useMemo', 'useCallback'],
      },
      {
        name: 'resultFact',
        type: 'string',
        required: false,
        description: 'Name to store the hook analysis results for reference in event details',
        example: 'hookDependencyResult',
      },
    ],
    returns: 'Array of hook usage with dependency analysis',
    example: {
      params: { hooks: ['useEffect'] },
      output: [
        {
          hook: 'useEffect',
          dependencies: ['data', 'callback'],
          missingDependencies: ['callback'],
          location: { line: 15 },
        },
      ],
    },
    compatibleOperators: ['contains', 'doesNotContain', 'equal', 'notEqual'],
    documentationUrl: '/docs/facts/hook-dependencies',
    tags: ['react', 'iterative', 'hooks', 'best-practices'],
    suggestedPaths: [
      // Most common - issue detection
      { path: '$.length', description: 'Number of hooks analyzed', valueType: 'number' },
      { path: '$[0].hook', description: 'First hook name', valueType: 'string' },
      { path: '$[0].missingDependencies', description: 'First hook missing deps', valueType: 'array' },
      { path: '$[0].missingDependencies.length', description: 'Count of missing deps', valueType: 'number' },
      { path: '$[0].dependencies', description: 'First hook declared deps', valueType: 'array' },
      { path: '$[0].location.line', description: 'First hook line number', valueType: 'number' },
      // All hooks
      { path: '$[*].hook', description: 'All hook names', valueType: 'array' },
      { path: '$[*].missingDependencies', description: 'Missing deps per hook', valueType: 'array' },
      { path: '$[*].dependencies', description: 'Declared deps per hook', valueType: 'array' },
      // Full result
      { path: '$', description: 'Array of all hook usages', valueType: 'array' },
    ],
    allowCustomPath: true,
  },
  {
    name: 'effectCleanup',
    plugin: 'react-patterns',
    description: 'Checks for missing cleanup in useEffect hooks',
    parameters: [],
    returns: 'Array of effects with cleanup status',
    example: {
      params: {},
      output: [
        {
          location: { line: 20 },
          hasCleanup: false,
          sideEffects: ['addEventListener', 'setInterval'],
        },
      ],
    },
    compatibleOperators: ['equal', 'notEqual', 'contains'],
    documentationUrl: '/docs/facts/effect-cleanup',
    tags: ['react', 'iterative', 'hooks', 'memory-leaks'],
    suggestedPaths: [
      // Most common - cleanup detection
      { path: '$.length', description: 'Number of effects found', valueType: 'number' },
      { path: '$[0].hasCleanup', description: 'First effect has cleanup', valueType: 'boolean' },
      { path: '$[0].sideEffects', description: 'First effect side effects', valueType: 'array' },
      { path: '$[0].sideEffects.length', description: 'Number of side effects', valueType: 'number' },
      { path: '$[0].location.line', description: 'First effect line number', valueType: 'number' },
      // All effects
      { path: '$[*].hasCleanup', description: 'Cleanup status per effect', valueType: 'array' },
      { path: '$[*].sideEffects', description: 'Side effects per effect', valueType: 'array' },
      { path: '$[*].location.line', description: 'Line numbers of all effects', valueType: 'array' },
      // Full result
      { path: '$', description: 'Array of all effects', valueType: 'array' },
    ],
    allowCustomPath: true,
  },
];

/**
 * Patterns plugin facts
 */
const patternsFacts: FactMetadata[] = [
  {
    name: 'extractValues',
    plugin: 'patterns',
    description: 'Extracts values from files using multiple strategies (JSON, YAML, XML, regex, AST)',
    parameters: [
      {
        name: 'defaultStrategy',
        type: 'object',
        required: false,
        description: 'Default extraction strategy configuration with type, pattern, and flags',
        example: { type: 'regex', pattern: '^API_KEY=(.*)$', flags: 'im' },
      },
      {
        name: 'include',
        type: 'array',
        required: false,
        description: 'Array of file patterns to include in analysis',
        example: ['.*\\.env$', '.*\\.config$'],
      },
      {
        name: 'strategy',
        type: 'string',
        required: false,
        description: 'Extraction strategy: json, yaml, xml, regex, ast',
        example: 'json',
      },
      {
        name: 'path',
        type: 'string',
        required: false,
        description: 'JSONPath or XPath expression for extraction',
        example: '$.version',
      },
      {
        name: 'pattern',
        type: 'string',
        required: false,
        description: 'Regex pattern for regex strategy',
        example: 'API_KEY=([A-Za-z0-9]+)',
      },
      {
        name: 'resultFact',
        type: 'string',
        required: false,
        description: 'Name to store the extraction results for reference in event details',
        example: 'extractedValuesResult',
      },
    ],
    returns: 'Object with matches array and extraction metadata',
    example: {
      params: { strategy: 'json', path: '$.version' },
      output: {
        matches: [{ value: '1.0.0', location: { line: 3 } }],
        strategyUsed: 'json',
        errors: [],
      },
    },
    compatibleOperators: ['matchesSatisfy', 'equal', 'notEqual', 'contains'],
    documentationUrl: '/docs/facts/extract-values',
    tags: ['patterns', 'iterative', 'extraction', 'json', 'yaml', 'xml'],
    suggestedPaths: [
      { path: '$.matches', description: 'Array of extracted values', valueType: 'array' },
      { path: '$.matches.length', description: 'Number of matches found', valueType: 'number' },
      { path: '$.matches[0].value', description: 'First extracted value', valueType: 'string' },
      { path: '$.matches[*].value', description: 'All extracted values', valueType: 'array' },
      { path: '$.strategyUsed', description: 'Extraction strategy that was used', valueType: 'string' },
      { path: '$.errors', description: 'Array of extraction errors', valueType: 'array' },
      { path: '$', description: 'Full extraction result', valueType: 'object' },
    ],
    allowCustomPath: true,
  },
  {
    name: 'globalFileAnalysis',
    plugin: 'patterns',
    description: 'Analyzes patterns across all files in the repository',
    parameters: [
      {
        name: 'newPatterns',
        type: 'array',
        required: false,
        description: 'Array of regex patterns representing new/modern patterns to detect',
        example: ['useState\\(', 'useEffect\\(', 'useCallback\\('],
      },
      {
        name: 'legacyPatterns',
        type: 'array',
        required: false,
        description: 'Array of regex patterns representing legacy patterns to detect',
        example: ['extends\\s+React\\.Component', 'componentDidMount\\('],
      },
      {
        name: 'checkPattern',
        type: 'array',
        required: false,
        description: 'Regex pattern(s) to search across all files. Can be a string or array of patterns.',
        example: ['TODO', 'FIXME', 'HACK'],
      },
      {
        name: 'fileFilter',
        type: 'string',
        required: false,
        description: 'Regex pattern to filter files by extension or path',
        example: '\\.(tsx|jsx)$',
      },
      {
        name: 'outputGrouping',
        type: 'string',
        required: false,
        description: 'How to group output results: "file" or "pattern"',
        example: 'file',
      },
      {
        name: 'resultFact',
        type: 'string',
        required: false,
        description: 'Name to store the analysis results for reference in event details',
        example: 'globalAnalysisResult',
      },
    ],
    returns: 'Object with global analysis results and statistics',
    example: {
      params: { checkPattern: 'TODO', filePattern: '**/*.ts' },
      output: {
        totalFiles: 50,
        matchingFiles: 12,
        totalMatches: 25,
        ratio: 0.24,
        files: [{ path: 'src/index.ts', matches: 3 }],
      },
    },
    compatibleOperators: ['globalPatternCount', 'globalPatternRatio', 'equal', 'notEqual'],
    documentationUrl: '/docs/facts/global-file-analysis',
    tags: ['patterns', 'global', 'analysis', 'repository'],
    suggestedPaths: [
      { path: '$.totalFiles', description: 'Total files analyzed', valueType: 'number' },
      { path: '$.matchingFiles', description: 'Files with matches', valueType: 'number' },
      { path: '$.totalMatches', description: 'Total pattern matches', valueType: 'number' },
      { path: '$.ratio', description: 'Ratio of matching files', valueType: 'number' },
      { path: '$.files', description: 'Array of files with match details', valueType: 'array' },
      { path: '$.files.length', description: 'Number of files with matches', valueType: 'number' },
      { path: '$', description: 'Full analysis result', valueType: 'object' },
    ],
    allowCustomPath: true,
  },
];

/**
 * All available facts organized by plugin
 */
export const factCatalog: FactMetadata[] = [
  ...filesystemFacts,
  ...astFacts,
  ...dependencyFacts,
  ...reactPatternsFacts,
  ...patternsFacts,
];

/**
 * Get facts by plugin name
 */
export function getFactsByPlugin(pluginName: string): FactMetadata[] {
  return factCatalog.filter((fact) => fact.plugin === pluginName);
}

/**
 * Get a specific fact by name
 */
export function getFactByName(name: string): FactMetadata | undefined {
  return factCatalog.find((fact) => fact.name === name);
}

/**
 * Search facts by query string
 */
export function searchFacts(query: string): FactMetadata[] {
  const lowerQuery = query.toLowerCase();
  return factCatalog.filter(
    (fact) =>
      fact.name.toLowerCase().includes(lowerQuery) ||
      fact.description.toLowerCase().includes(lowerQuery) ||
      fact.plugin.toLowerCase().includes(lowerQuery) ||
      fact.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Get all unique plugin names
 */
export function getPluginNames(): string[] {
  return [...new Set(factCatalog.map((fact) => fact.plugin))];
}

/**
 * Get all unique tags
 */
export function getAllTags(): string[] {
  const tags = new Set<string>();
  for (const fact of factCatalog) {
    for (const tag of fact.tags) {
      tags.add(tag);
    }
  }
  return [...tags].sort();
}

/**
 * Get suggested paths for a fact
 */
export function getSuggestedPaths(factName: string): SuggestedPath[] {
  const fact = getFactByName(factName);
  return fact?.suggestedPaths ?? [];
}

/**
 * Check if a fact allows custom paths
 */
export function allowsCustomPath(factName: string): boolean {
  const fact = getFactByName(factName);
  return fact?.allowCustomPath !== false;
}
