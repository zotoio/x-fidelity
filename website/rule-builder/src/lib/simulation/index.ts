/**
 * Simulation module for X-Fidelity Rule Builder
 * 
 * Provides rule simulation capabilities using browser-compatible plugins.
 */

// Export types
export type {
  SimulationResult,
  SimulationState,
  SimulationOptions,
  ConditionResult,
  ConditionGroupResult,
  EventResult,
  FactSummary,
} from './types';

export {
  isConditionResult,
  isConditionGroupResult,
  formatEventFromRule,
} from './types';

// Export condition evaluator
export {
  evaluateCondition,
  evaluateConditions,
  areConditionsMet,
} from './conditionEvaluator';

// Export fact evaluator
export {
  evaluateFact,
  createFactAlmanac,
  getValueAtPath,
  collectFactsUsed,
  buildFactSummary,
} from './factEvaluator';
export type { FactEvaluationResult } from './factEvaluator';

// Export simulation engine
export {
  SimulationEngine,
  simulationEngine,
  runSimulation,
} from './simulationEngine';
