/**
 * JSON Schema for X-Fidelity Rule Definition
 * 
 * This schema validates the json-rules-engine format used by X-Fidelity.
 * Rules consist of:
 * - name: kebab-case identifier
 * - conditions: nested all/any/not structure
 * - event: what happens when rule fires
 * - priority: optional execution order
 */

import type { RuleDefinition } from '../../types';

/**
 * All known operators from X-Fidelity
 * This list includes built-in json-rules-engine operators and all X-Fidelity custom operators
 */
const knownOperators = [
  // Built-in json-rules-engine operators
  'equal',
  'notEqual',
  'lessThan',
  'lessThanInclusive',
  'greaterThan',
  'greaterThanInclusive',
  'in',
  'notIn',
  'contains',
  'doesNotContain',
  // Filesystem operators
  'fileExists',
  'fileDoesNotExist',
  'fileContains',
  'fileContainsWithPosition',
  'missingRequiredFiles',
  'nonStandardDirectoryStructure',
  // Pattern operators
  'matchesPattern',
  'matchesSatisfy',
  'globalPatternCount',
  'globalPatternRatio',
  'regexMatch',
  // Version/Dependency operators
  'versionSatisfies',
  'outdatedFramework',
  // AST operators
  'astNodeExists',
  'astPatternMatch',
  'astComplexity',
  'functionCount',
  // React patterns operators
  'hasIssues',
  // Remote validation operators
  'invalidRemoteValidation',
  // OpenAI analysis operators
  'openaiAnalysisHighSeverity',
  // Custom/extensibility operators
  'customOperator',
] as const;

/**
 * Schema for a single condition (plain object, not JSONSchemaType due to complex typing)
 * 
 * Note: The operator is validated as a string to allow custom operators.
 * The operatorCatalog provides metadata for known operators but doesn't restrict usage.
 */
const conditionSchema = {
  type: 'object',
  required: ['fact', 'operator', 'value'],
  properties: {
    fact: { type: 'string', minLength: 1 },
    operator: {
      type: 'string',
      minLength: 1,
      // We don't use enum here to allow custom operators
      // Validation against known operators is done separately with warnings
    },
    value: {}, // any type
    path: { type: 'string' },
    params: { type: 'object', additionalProperties: true },
  },
  additionalProperties: false,
} as const;

/**
 * Export known operators for use in validation warnings
 */
export { knownOperators };

/**
 * Schema for nested conditions (recursive)
 * Note: Due to recursion limitations in JSONSchemaType, we use a plain object schema
 */
export const nestedConditionSchema = {
  type: 'object',
  properties: {
    all: {
      type: 'array',
      items: { $ref: '#/$defs/conditionOrNested' },
    },
    any: {
      type: 'array',
      items: { $ref: '#/$defs/conditionOrNested' },
    },
    not: { $ref: '#/$defs/conditionOrNested' },
  },
  additionalProperties: false,
} as const;

/**
 * Schema for rule event (plain object)
 */
const eventSchema = {
  type: 'object',
  required: ['type', 'params'],
  properties: {
    type: { type: 'string', enum: ['warning', 'fatality', 'info'] },
    params: {
      type: 'object',
      required: ['message'],
      properties: {
        message: { type: 'string', minLength: 1 },
        category: { type: 'string' },
        ruleId: { type: 'string' },
      },
      additionalProperties: true,
    },
  },
  additionalProperties: false,
} as const;

/**
 * Complete rule definition schema
 */
export const ruleSchema = {
  $id: 'https://x-fidelity.dev/schemas/rule.json',
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'X-Fidelity Rule Definition',
  description: 'Schema for validating X-Fidelity rule definitions',
  type: 'object',
  required: ['name', 'conditions', 'event'],
  properties: {
    name: {
      type: 'string',
      pattern: '^[a-zA-Z][a-zA-Z0-9]*(-[a-z0-9]+)*$',
      minLength: 3,
      description: 'Rule name (camelCase first part, then kebab-case segments)',
    },
    conditions: { $ref: '#/$defs/nestedCondition' },
    event: eventSchema,
    priority: {
      type: 'integer',
      minimum: 1,
      maximum: 100,
      default: 1,
      description: 'Execution priority (higher runs first)',
    },
  },
  additionalProperties: false,
  $defs: {
    condition: conditionSchema,
    nestedCondition: {
      type: 'object',
      properties: {
        all: {
          type: 'array',
          items: { $ref: '#/$defs/conditionOrNested' },
        },
        any: {
          type: 'array',
          items: { $ref: '#/$defs/conditionOrNested' },
        },
        not: { $ref: '#/$defs/conditionOrNested' },
      },
      additionalProperties: false,
    },
    conditionOrNested: {
      oneOf: [
        { $ref: '#/$defs/condition' },
        { $ref: '#/$defs/nestedCondition' },
      ],
    },
  },
};

/**
 * Default empty rule for new rules
 */
export const defaultRule: RuleDefinition = {
  name: 'mySampleRule-iterative',
  conditions: {
    all: [],
  },
  event: {
    type: 'warning',
    params: {
      message: 'Rule triggered',
    },
  },
};

/**
 * Example valid rule for testing
 */
export const exampleRule: RuleDefinition = {
  name: 'no-todo-comments',
  conditions: {
    all: [
      {
        fact: 'fileContent',
        operator: 'contains',
        value: 'TODO',
      },
    ],
  },
  event: {
    type: 'warning',
    params: {
      message: 'Found TODO comment that should be resolved',
      category: 'code-quality',
    },
  },
  priority: 1,
};
