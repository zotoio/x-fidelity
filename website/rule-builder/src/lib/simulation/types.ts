/**
 * Simulation Types for X-Fidelity Rule Builder
 * 
 * Type definitions for rule simulation results and execution state.
 */

import type { RuleDefinition } from '../../types';

/**
 * Result of a single condition evaluation
 */
export interface ConditionResult {
  /** Path in rule JSON to this condition */
  path: string[];
  /** Name of the fact used */
  factName: string;
  /** Value returned by the fact */
  factValue: unknown;
  /** Operator used for comparison */
  operator: string;
  /** Value to compare against */
  compareValue: unknown;
  /** Whether the condition passed */
  result: boolean;
  /** Error message if evaluation failed */
  error?: string;
  /** Duration of fact execution in ms */
  duration?: number;
  /** JSON path if applicable */
  jsonPath?: string;
  /** Params passed to the fact */
  params?: Record<string, unknown>;
}

/**
 * Result of event evaluation
 */
export interface EventResult {
  /** Event type */
  type: 'warning' | 'fatality' | 'info';
  /** Event message */
  message: string;
  /** Additional event details */
  details?: Record<string, unknown>;
}

/**
 * Complete simulation result
 */
export interface SimulationResult {
  /** Whether simulation completed successfully */
  success: boolean;
  /** Name of the file tested against */
  fileName: string;
  /** When simulation was run */
  timestamp: Date;
  /** Duration of simulation in ms */
  duration: number;
  /** Results for each condition */
  conditionResults: ConditionResult[];
  /** Overall result of the rule */
  finalResult: 'triggered' | 'not-triggered' | 'error';
  /** Event that would fire if triggered */
  event?: EventResult;
  /** Error message if simulation failed */
  error?: string;
}

/**
 * Simulation state for the panel
 */
export interface SimulationState {
  /** Whether simulation is currently running */
  isRunning: boolean;
  /** Whether plugins are initialized */
  isInitialized: boolean;
  /** Error during initialization or execution */
  error: string | null;
  /** Selected file to test against */
  selectedFile: string | null;
  /** Available files from fixture */
  availableFiles: string[];
  /** Result of last simulation */
  result: SimulationResult | null;
  /** Plugin initialization progress */
  initProgress: number;
  /** Current initialization step */
  initStep: string | null;
}

/**
 * Simulation engine options
 */
export interface SimulationOptions {
  /** Whether to enable verbose logging */
  verbose?: boolean;
  /** Timeout for fact execution in ms */
  timeout?: number;
  /** Whether to skip AST analysis (faster but limited) */
  skipAst?: boolean;
}

/**
 * Condition group result (for all/any/not)
 */
export interface ConditionGroupResult {
  /** Type of group */
  type: 'all' | 'any' | 'not';
  /** Path to this group */
  path: string[];
  /** Whether the group passed */
  result: boolean;
  /** Child results */
  children: (ConditionResult | ConditionGroupResult)[];
}

/**
 * Facts summary for display
 */
export interface FactSummary {
  /** Fact name */
  name: string;
  /** Value returned */
  value: unknown;
  /** Duration of execution */
  duration?: number;
  /** Whether fact execution succeeded */
  success: boolean;
  /** Error if failed */
  error?: string;
}

/**
 * Type guard for ConditionResult
 */
export function isConditionResult(result: ConditionResult | ConditionGroupResult): result is ConditionResult {
  return 'factName' in result;
}

/**
 * Type guard for ConditionGroupResult
 */
export function isConditionGroupResult(result: ConditionResult | ConditionGroupResult): result is ConditionGroupResult {
  return 'type' in result && 'children' in result;
}

/**
 * Extract rule from definition
 */
export function formatEventFromRule(rule: RuleDefinition): EventResult | undefined {
  if (!rule.event) return undefined;
  
  return {
    type: rule.event.type,
    message: rule.event.params?.message || 'No message specified',
    details: rule.event.params,
  };
}
