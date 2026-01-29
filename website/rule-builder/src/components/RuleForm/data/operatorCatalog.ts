/**
 * Operator Catalog for X-Fidelity Rule Builder
 *
 * Provides metadata for all available operators from browser plugins
 * and json-rules-engine built-in operators.
 */

import type { ConditionOperator } from '../../../types';

/**
 * Value type expected by an operator
 */
export type OperatorValueType = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'any';

/**
 * Metadata for an operator
 */
export interface OperatorMetadata {
  name: ConditionOperator;
  plugin: string;
  description: string;
  valueType: OperatorValueType;
  example: {
    factValue: unknown;
    compareValue: unknown;
    result: boolean;
  };
  documentationUrl?: string;
  category: 'comparison' | 'membership' | 'pattern' | 'filesystem' | 'ast' | 'version';
}

/**
 * Built-in json-rules-engine operators
 */
const builtInOperators: OperatorMetadata[] = [
  {
    name: 'equal',
    plugin: 'built-in',
    description: 'Checks if fact value equals the compare value (strict equality)',
    valueType: 'any',
    example: {
      factValue: 'hello',
      compareValue: 'hello',
      result: true,
    },
    documentationUrl: '/docs/operators/equal',
    category: 'comparison',
  },
  {
    name: 'notEqual',
    plugin: 'built-in',
    description: 'Checks if fact value does not equal the compare value',
    valueType: 'any',
    example: {
      factValue: 'hello',
      compareValue: 'world',
      result: true,
    },
    documentationUrl: '/docs/operators/not-equal',
    category: 'comparison',
  },
  {
    name: 'lessThan',
    plugin: 'built-in',
    description: 'Checks if fact value is less than the compare value',
    valueType: 'number',
    example: {
      factValue: 5,
      compareValue: 10,
      result: true,
    },
    documentationUrl: '/docs/operators/less-than',
    category: 'comparison',
  },
  {
    name: 'lessThanInclusive',
    plugin: 'built-in',
    description: 'Checks if fact value is less than or equal to the compare value',
    valueType: 'number',
    example: {
      factValue: 10,
      compareValue: 10,
      result: true,
    },
    documentationUrl: '/docs/operators/less-than-inclusive',
    category: 'comparison',
  },
  {
    name: 'greaterThan',
    plugin: 'built-in',
    description: 'Checks if fact value is greater than the compare value',
    valueType: 'number',
    example: {
      factValue: 15,
      compareValue: 10,
      result: true,
    },
    documentationUrl: '/docs/operators/greater-than',
    category: 'comparison',
  },
  {
    name: 'greaterThanInclusive',
    plugin: 'built-in',
    description: 'Checks if fact value is greater than or equal to the compare value',
    valueType: 'number',
    example: {
      factValue: 10,
      compareValue: 10,
      result: true,
    },
    documentationUrl: '/docs/operators/greater-than-inclusive',
    category: 'comparison',
  },
  {
    name: 'in',
    plugin: 'built-in',
    description: 'Checks if fact value is in the compare value array',
    valueType: 'array',
    example: {
      factValue: 'admin',
      compareValue: ['admin', 'user', 'guest'],
      result: true,
    },
    documentationUrl: '/docs/operators/in',
    category: 'membership',
  },
  {
    name: 'notIn',
    plugin: 'built-in',
    description: 'Checks if fact value is not in the compare value array',
    valueType: 'array',
    example: {
      factValue: 'superuser',
      compareValue: ['admin', 'user', 'guest'],
      result: true,
    },
    documentationUrl: '/docs/operators/not-in',
    category: 'membership',
  },
  {
    name: 'contains',
    plugin: 'built-in',
    description: 'Checks if fact value (string or array) contains the compare value',
    valueType: 'any',
    example: {
      factValue: 'hello world',
      compareValue: 'world',
      result: true,
    },
    documentationUrl: '/docs/operators/contains',
    category: 'membership',
  },
  {
    name: 'doesNotContain',
    plugin: 'built-in',
    description: 'Checks if fact value does not contain the compare value',
    valueType: 'any',
    example: {
      factValue: 'hello world',
      compareValue: 'foo',
      result: true,
    },
    documentationUrl: '/docs/operators/does-not-contain',
    category: 'membership',
  },
];

/**
 * X-Fidelity custom operators
 */
const xfidelityOperators: OperatorMetadata[] = [
  // Filesystem operators
  {
    name: 'fileExists',
    plugin: 'filesystem',
    description: 'Checks if a file exists at the specified path',
    valueType: 'boolean',
    example: {
      factValue: true,
      compareValue: true,
      result: true,
    },
    documentationUrl: '/docs/operators/file-exists',
    category: 'filesystem',
  },
  {
    name: 'fileDoesNotExist',
    plugin: 'filesystem',
    description: 'Checks if a file does not exist at the specified path',
    valueType: 'boolean',
    example: {
      factValue: false,
      compareValue: true,
      result: true,
    },
    documentationUrl: '/docs/operators/file-does-not-exist',
    category: 'filesystem',
  },
  {
    name: 'fileContains',
    plugin: 'filesystem',
    description: 'Checks if file content contains pattern matches',
    valueType: 'boolean',
    example: {
      factValue: { result: [{ match: 'TODO' }] },
      compareValue: true,
      result: true,
    },
    documentationUrl: '/docs/operators/file-contains',
    category: 'filesystem',
  },
  {
    name: 'fileContainsWithPosition',
    plugin: 'filesystem',
    description: 'Checks if file contains matches with position data',
    valueType: 'object',
    example: {
      factValue: { matches: [{ range: { start: 0, end: 10 } }] },
      compareValue: { expectMatch: true },
      result: true,
    },
    documentationUrl: '/docs/operators/file-contains-with-position',
    category: 'filesystem',
  },
  {
    name: 'missingRequiredFiles',
    plugin: 'filesystem',
    description: 'Checks if number of missing required files exceeds threshold',
    valueType: 'number',
    example: {
      factValue: { missing: ['README.md'], total: 3, found: 2 },
      compareValue: 0,
      result: true,
    },
    documentationUrl: '/docs/operators/missing-required-files',
    category: 'filesystem',
  },
  // Pattern operators
  {
    name: 'matchesPattern',
    plugin: 'patterns',
    description: 'Checks if fact value matches a regex pattern',
    valueType: 'string',
    example: {
      factValue: 'TODO: fix this',
      compareValue: '^TODO:',
      result: true,
    },
    documentationUrl: '/docs/operators/matches-pattern',
    category: 'pattern',
  },
  {
    name: 'matchesSatisfy',
    plugin: 'patterns',
    description: 'Evaluates extractValues result using parameter-driven conditions',
    valueType: 'object',
    example: {
      factValue: { matches: [{ value: 'test' }] },
      compareValue: { count: { op: '>=', value: 1 } },
      result: true,
    },
    documentationUrl: '/docs/operators/matches-satisfy',
    category: 'pattern',
  },
  {
    name: 'globalPatternCount',
    plugin: 'patterns',
    description: 'Checks if global pattern count meets a threshold',
    valueType: 'object',
    example: {
      factValue: [{ match: 'TODO' }, { match: 'FIXME' }],
      compareValue: { threshold: 2 },
      result: true,
    },
    documentationUrl: '/docs/operators/global-pattern-count',
    category: 'pattern',
  },
  // Version/Dependency operators
  {
    name: 'versionSatisfies',
    plugin: 'dependency',
    description: 'Checks if version satisfies a semver range',
    valueType: 'string',
    example: {
      factValue: '18.2.0',
      compareValue: '>=18.0.0',
      result: true,
    },
    documentationUrl: '/docs/operators/version-satisfies',
    category: 'version',
  },
  {
    name: 'outdatedFramework',
    plugin: 'dependency',
    description: 'Checks if project uses outdated framework versions',
    valueType: 'boolean',
    example: {
      factValue: [{ dependency: 'react', currentVersion: '17.0.0', requiredVersion: '18.0.0' }],
      compareValue: true,
      result: true,
    },
    documentationUrl: '/docs/operators/outdated-framework',
    category: 'version',
  },
  // AST operators
  {
    name: 'astNodeExists',
    plugin: 'ast',
    description: 'Checks if an AST node of the specified type exists',
    valueType: 'string',
    example: {
      factValue: { hasNode: true, nodeType: 'function_declaration' },
      compareValue: 'function_declaration',
      result: true,
    },
    documentationUrl: '/docs/operators/ast-node-exists',
    category: 'ast',
  },
  {
    name: 'astPatternMatch',
    plugin: 'ast',
    description: 'Checks if AST matches a pattern specification',
    valueType: 'object',
    example: {
      factValue: { matchedNodes: [{ type: 'arrow_function' }] },
      compareValue: { type: 'arrow_function', minOccurrences: 1 },
      result: true,
    },
    documentationUrl: '/docs/operators/ast-pattern-match',
    category: 'ast',
  },
  {
    name: 'astComplexity',
    plugin: 'ast',
    description: 'Checks if AST complexity metrics exceed thresholds',
    valueType: 'any',
    example: {
      factValue: { complexities: [{ name: 'fn', metrics: { cyclomaticComplexity: 15 } }] },
      compareValue: true,
      result: true,
    },
    documentationUrl: '/docs/operators/ast-complexity',
    category: 'ast',
  },
  {
    name: 'functionCount',
    plugin: 'ast',
    description: 'Checks if function count meets criteria',
    valueType: 'any',
    example: {
      factValue: { count: 10 },
      compareValue: { threshold: 5, comparison: 'gte' },
      result: true,
    },
    documentationUrl: '/docs/operators/function-count',
    category: 'ast',
  },
  // Additional pattern operators
  {
    name: 'regexMatch',
    plugin: 'patterns',
    description: 'Checks if fact value matches a regular expression pattern',
    valueType: 'string',
    example: {
      factValue: 'src/components/Button.tsx',
      compareValue: '\\.(tsx|ts)$',
      result: true,
    },
    documentationUrl: '/docs/operators/regex-match',
    category: 'pattern',
  },
  {
    name: 'globalPatternRatio',
    plugin: 'patterns',
    description: 'Checks if the ratio of pattern matches to total files meets a threshold',
    valueType: 'object',
    example: {
      factValue: { ratio: 0.75, matchCount: 15, totalCount: 20 },
      compareValue: { threshold: 0.5 },
      result: true,
    },
    documentationUrl: '/docs/operators/global-pattern-ratio',
    category: 'pattern',
  },
  // Filesystem structure operators
  {
    name: 'nonStandardDirectoryStructure',
    plugin: 'filesystem',
    description: 'Checks if the directory structure deviates from expected standards',
    valueType: 'boolean',
    example: {
      factValue: { nonStandard: true, issues: ['missing src/', 'extra dist/'] },
      compareValue: true,
      result: true,
    },
    documentationUrl: '/docs/operators/non-standard-directory-structure',
    category: 'filesystem',
  },
  // React patterns operators
  {
    name: 'hasIssues',
    plugin: 'react-patterns',
    description: 'Checks if React pattern analysis found issues',
    valueType: 'boolean',
    example: {
      factValue: { hasIssues: true, issues: ['Missing cleanup in useEffect'] },
      compareValue: true,
      result: true,
    },
    documentationUrl: '/docs/operators/has-issues',
    category: 'pattern',
  },
  // Remote validation operators
  {
    name: 'invalidRemoteValidation',
    plugin: 'remote-validator',
    description: 'Checks if remote validation returned invalid result',
    valueType: 'boolean',
    example: {
      factValue: { valid: false, message: 'ID not found' },
      compareValue: true,
      result: true,
    },
    documentationUrl: '/docs/operators/invalid-remote-validation',
    category: 'pattern',
  },
  // Custom/example operators
  {
    name: 'customOperator',
    plugin: 'custom',
    description: 'Custom operator for plugin examples and extensions',
    valueType: 'any',
    example: {
      factValue: 'custom-value',
      compareValue: 'expected',
      result: true,
    },
    documentationUrl: '/docs/operators/custom-operator',
    category: 'pattern',
  },
  // OpenAI analysis operators
  {
    name: 'openaiAnalysisHighSeverity',
    plugin: 'openai',
    description: 'Checks if OpenAI analysis found high severity issues',
    valueType: 'boolean',
    example: {
      factValue: { severity: 'high', issues: ['Security vulnerability detected'] },
      compareValue: true,
      result: true,
    },
    documentationUrl: '/docs/operators/openai-analysis-high-severity',
    category: 'pattern',
  },
];

/**
 * All available operators
 */
export const operatorCatalog: OperatorMetadata[] = [
  ...builtInOperators,
  ...xfidelityOperators,
];

/**
 * Get operator by name
 */
export function getOperatorByName(name: ConditionOperator): OperatorMetadata | undefined {
  return operatorCatalog.find((op) => op.name === name);
}

/**
 * Get operators by plugin
 */
export function getOperatorsByPlugin(pluginName: string): OperatorMetadata[] {
  return operatorCatalog.filter((op) => op.plugin === pluginName);
}

/**
 * Get operators by category
 */
export function getOperatorsByCategory(
  category: OperatorMetadata['category']
): OperatorMetadata[] {
  return operatorCatalog.filter((op) => op.category === category);
}

/**
 * Get operators compatible with a fact
 */
export function getOperatorsForFact(_factName: string, compatibleOperators: ConditionOperator[]): OperatorMetadata[] {
  return operatorCatalog.filter((op) => compatibleOperators.includes(op.name));
}

/**
 * Search operators by query string
 */
export function searchOperators(query: string): OperatorMetadata[] {
  const lowerQuery = query.toLowerCase();
  return operatorCatalog.filter(
    (op) =>
      op.name.toLowerCase().includes(lowerQuery) ||
      op.description.toLowerCase().includes(lowerQuery) ||
      op.category.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Get all unique categories
 */
export function getCategories(): OperatorMetadata['category'][] {
  return [...new Set(operatorCatalog.map((op) => op.category))];
}

/**
 * Get value type description for display
 */
export function getValueTypeDescription(valueType: OperatorValueType): string {
  switch (valueType) {
    case 'string':
      return 'Text value';
    case 'number':
      return 'Numeric value';
    case 'boolean':
      return 'True or false';
    case 'array':
      return 'List of values';
    case 'object':
      return 'Object with properties';
    case 'any':
      return 'Any value type';
    default:
      return 'Unknown type';
  }
}
