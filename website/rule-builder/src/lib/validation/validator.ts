/**
 * Rule Validator using Ajv
 * 
 * Provides validation for X-Fidelity rule definitions against the JSON Schema.
 * Includes detailed error formatting for display in the UI.
 */

import Ajv, { ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import { ruleSchema } from './ruleSchema';
import { operatorCatalog } from '../../components/RuleForm/data/operatorCatalog';

/**
 * Validation error with path and message
 */
export interface ValidationError {
  path: string[];
  message: string;
  keyword: string;
  params: Record<string, unknown>;
}

/**
 * Result of validation
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Create and configure Ajv instance
 */
function createValidator(): Ajv {
  const ajv = new Ajv({
    allErrors: true,
    verbose: true,
    strict: false,
    strictTypes: false,
    strictTuples: false,
    allowUnionTypes: true,
  });
  
  // Add format validators (email, uri, date, etc.)
  addFormats(ajv);
  
  return ajv;
}

// Singleton validator instance
let validatorInstance: Ajv | null = null;
let validateFn: ReturnType<Ajv['compile']> | null = null;

/**
 * Get or create the validator instance
 */
function getValidator(): ReturnType<Ajv['compile']> {
  if (!validatorInstance) {
    validatorInstance = createValidator();
    validateFn = validatorInstance.compile(ruleSchema);
  }
  return validateFn!;
}

/**
 * Convert Ajv error path to array of path segments
 */
function parseErrorPath(instancePath: string): string[] {
  if (!instancePath) return [];
  
  // instancePath is like "/conditions/all/0/fact"
  return instancePath
    .split('/')
    .filter(Boolean);
}

/**
 * Format Ajv error into user-friendly message
 */
function formatErrorMessage(error: ErrorObject): string {
  const { keyword, params, message } = error;
  
  switch (keyword) {
    case 'required':
      return `Missing required property: ${params.missingProperty}`;
    case 'type':
      return `Expected ${params.type}, got ${typeof error.data}`;
    case 'enum':
      return `Must be one of: ${(params.allowedValues as string[]).join(', ')}`;
    case 'pattern':
      return `Must match pattern: ${params.pattern}`;
    case 'minLength':
      return `Must be at least ${params.limit} characters`;
    case 'minimum':
      return `Must be at least ${params.limit}`;
    case 'maximum':
      return `Must be at most ${params.limit}`;
    case 'additionalProperties':
      return `Unknown property: ${params.additionalProperty}`;
    case 'oneOf':
      return 'Must match exactly one schema';
    default:
      return message || `Validation error: ${keyword}`;
  }
}

/**
 * Validate a rule definition
 */
export function validateRule(rule: unknown): ValidationResult {
  const validate = getValidator();
  const valid = validate(rule);
  
  if (valid) {
    return { valid: true, errors: [] };
  }
  
  const errors: ValidationError[] = (validate.errors || []).map((error) => ({
    path: parseErrorPath(error.instancePath),
    message: formatErrorMessage(error),
    keyword: error.keyword,
    params: error.params as Record<string, unknown>,
  }));
  
  return { valid: false, errors };
}

/**
 * Validate rule name format
 * 
 * Allows:
 * - camelCase or PascalCase for the first segment (e.g., myRuleName, MyRuleName)
 * - kebab-case for subsequent segments (e.g., -iterative, -global)
 * - Pure kebab-case also allowed (e.g., my-rule-name)
 * 
 * Examples: myRule-iterative, MyRuleName-global, hello-world-iterative
 */
export function validateRuleName(name: string): ValidationResult {
  // First segment: letters and numbers (camelCase/PascalCase allowed)
  // Subsequent segments (after hyphen): lowercase letters and numbers only
  const pattern = /^[a-zA-Z][a-zA-Z0-9]*(-[a-z0-9]+)*$/;
  
  if (!name) {
    return {
      valid: false,
      errors: [{
        path: ['name'],
        message: 'Rule name is required',
        keyword: 'required',
        params: { missingProperty: 'name' },
      }],
    };
  }
  
  if (name.length < 3) {
    return {
      valid: false,
      errors: [{
        path: ['name'],
        message: 'Rule name must be at least 3 characters',
        keyword: 'minLength',
        params: { limit: 3 },
      }],
    };
  }
  
  if (!pattern.test(name)) {
    return {
      valid: false,
      errors: [{
        path: ['name'],
        message: 'Rule name must start with letters (camelCase allowed), followed by optional kebab-case segments',
        keyword: 'pattern',
        params: { pattern: pattern.toString() },
      }],
    };
  }
  
  return { valid: true, errors: [] };
}

/**
 * Validate JSON string can be parsed
 */
export function validateJsonSyntax(json: string): ValidationResult {
  try {
    JSON.parse(json);
    return { valid: true, errors: [] };
  } catch (e) {
    const error = e as SyntaxError;
    return {
      valid: false,
      errors: [{
        path: [],
        message: error.message,
        keyword: 'syntax',
        params: { error: error.message },
      }],
    };
  }
}

/**
 * Full validation pipeline: JSON syntax + schema validation
 */
export function validateRuleJson(json: string): ValidationResult {
  // First check JSON syntax
  const syntaxResult = validateJsonSyntax(json);
  if (!syntaxResult.valid) {
    return syntaxResult;
  }
  
  // Then validate against schema
  const rule = JSON.parse(json);
  return validateRule(rule);
}

/**
 * Get errors at a specific path
 */
export function getErrorsAtPath(errors: ValidationError[], path: string[]): ValidationError[] {
  return errors.filter((error) => {
    if (error.path.length !== path.length) return false;
    return error.path.every((segment, i) => segment === path[i]);
  });
}

/**
 * Check if a path has errors (including child paths)
 */
export function hasErrorsAtPath(errors: ValidationError[], path: string[]): boolean {
  return errors.some((error) => {
    if (error.path.length < path.length) return false;
    return path.every((segment, i) => segment === error.path[i]);
  });
}

/**
 * Get all known operator names from the operator catalog
 */
export function getKnownOperators(): string[] {
  return operatorCatalog.map((op) => op.name);
}

/**
 * Check if an operator is valid
 */
export function isValidOperator(operator: string): boolean {
  const knownOperators = getKnownOperators();
  return knownOperators.includes(operator);
}

/**
 * Validate an operator name
 */
export function validateOperator(operator: string): ValidationResult {
  if (!operator) {
    return {
      valid: false,
      errors: [{
        path: ['operator'],
        message: 'Operator is required',
        keyword: 'required',
        params: { missingProperty: 'operator' },
      }],
    };
  }
  
  if (!isValidOperator(operator)) {
    const knownOperators = getKnownOperators();
    return {
      valid: false,
      errors: [{
        path: ['operator'],
        message: `Unknown operator: "${operator}". Available operators: ${knownOperators.slice(0, 10).join(', ')}...`,
        keyword: 'enum',
        params: { allowedValues: knownOperators },
      }],
    };
  }
  
  return { valid: true, errors: [] };
}
