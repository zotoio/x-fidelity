/**
 * X-Fidelity Rule Builder Type Definitions
 *
 * These types support the visual rule builder interface and are designed
 * to align with the json-rules-engine rule format used by X-Fidelity.
 */

/**
 * Supported condition operators in json-rules-engine
 */
export type ConditionOperator =
  // Standard json-rules-engine operators
  | 'equal'
  | 'notEqual'
  | 'lessThan'
  | 'lessThanInclusive'
  | 'greaterThan'
  | 'greaterThanInclusive'
  | 'in'
  | 'notIn'
  | 'contains'
  | 'doesNotContain'
  // X-Fidelity custom operators - filesystem
  | 'fileExists'
  | 'fileDoesNotExist'
  | 'fileContains'
  | 'fileContainsWithPosition'
  | 'missingRequiredFiles'
  | 'nonStandardDirectoryStructure'
  // X-Fidelity custom operators - patterns
  | 'matchesPattern'
  | 'regexMatch'
  | 'matchesSatisfy'
  | 'globalPatternRatio'
  // X-Fidelity custom operators - versions/dependencies
  | 'versionSatisfies'
  | 'outdatedFramework'
  // X-Fidelity custom operators - AST
  | 'astNodeExists'
  | 'astPatternMatch'
  | 'astComplexity'
  | 'functionCount'
  // Catch-all for additional custom operators
  | string;

/**
 * A single condition in a rule
 */
export interface RuleCondition {
  fact: string;
  operator: ConditionOperator;
  value: unknown;
  path?: string;
  params?: Record<string, unknown>;
  priority?: number; // Condition-level priority
}

/**
 * Nested condition structure (all/any/not)
 */
export interface NestedCondition {
  all?: Array<RuleCondition | NestedCondition>;
  any?: Array<RuleCondition | NestedCondition>;
  not?: RuleCondition | NestedCondition;
}

/**
 * Rule event - what happens when a rule fires
 */
export interface RuleEvent {
  type: 'warning' | 'fatality' | 'info';
  params: {
    message: string;
    category?: string;
    ruleId?: string;
    [key: string]: unknown;
  };
}

/**
 * Error handling configuration for when a rule fails to evaluate
 */
export interface RuleOnError {
  action: string; // Name of function to execute
  params?: Record<string, unknown>; // Parameters for the action
}

/**
 * Complete rule definition matching json-rules-engine format
 * Aligned with RuleConfig from @x-fidelity/types
 */
export interface RuleDefinition {
  name: string;
  conditions: NestedCondition;
  event: RuleEvent;
  priority?: number;
  // Additional optional properties from RuleConfig
  errorBehavior?: 'swallow' | 'fatal';
  onError?: RuleOnError;
  description?: string; // Description of what the rule checks for
  recommendations?: string[]; // Recommendations on how to fix the issue
}

/**
 * Rule template for the template library (basic version)
 * See lib/templates/types.ts for the enhanced version with full categorization
 */
export interface RuleTemplate {
  id: string;
  name: string;
  description: string;
  category: 'ast' | 'filesystem' | 'dependency' | 'pattern' | 'custom';
  tags: string[];
  rule: RuleDefinition;
}

// Re-export enhanced template types from lib/templates
export type {
  RuleTemplate as EnhancedRuleTemplate,
  PluginType,
  UseCaseType,
  ComplexityLevel,
  TemplateSource,
  TemplateFilters,
} from '../lib/templates/types';

/**
 * Panel visibility state
 */
export interface PanelState {
  left: boolean;
  center: boolean;
  right: boolean;
  bottom: boolean;
}

/**
 * Available facts for rule building
 */
export interface FactDefinition {
  name: string;
  description: string;
  category: string;
  parameters?: Array<{
    name: string;
    type: 'string' | 'number' | 'boolean' | 'object';
    required: boolean;
    description: string;
  }>;
  returnType: string;
}

/**
 * Simulation result for rule testing
 */
export interface SimulationResult {
  ruleName: string;
  passed: boolean;
  events: RuleEvent[];
  facts: Record<string, unknown>;
  executionTime: number;
}
