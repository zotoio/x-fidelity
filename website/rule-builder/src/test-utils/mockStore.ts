/**
 * Mock Store Utilities for Testing
 *
 * Provides pre-configured mock store states and utilities
 * for testing Rule Builder components.
 */

import type { RuleDefinition } from '../types';

/**
 * Sample rule for testing - represents a simple condition
 */
export const sampleRule: RuleDefinition = {
  name: 'test-rule',
  conditions: {
    all: [
      {
        fact: 'fileData',
        operator: 'contains',
        value: 'TODO',
        path: '$.content',
      },
    ],
  },
  event: {
    type: 'warning',
    params: {
      message: 'Test warning message',
    },
  },
};

/**
 * Complex rule with nested conditions
 */
export const complexRule: RuleDefinition = {
  name: 'complex-rule',
  conditions: {
    all: [
      {
        fact: 'fileData',
        operator: 'notEqual',
        value: 'REPO_GLOBAL_CHECK',
        path: '$.fileName',
      },
      {
        any: [
          {
            fact: 'fileContent',
            operator: 'contains',
            value: 'console.log',
          },
          {
            fact: 'fileContent',
            operator: 'contains',
            value: 'console.warn',
          },
        ],
      },
    ],
  },
  event: {
    type: 'warning',
    params: {
      message: 'Console statements found',
      category: 'code-quality',
    },
  },
};

/**
 * Modified rule for testing dirty state
 */
export const modifiedRule: RuleDefinition = {
  ...sampleRule,
  name: 'modified-rule',
  event: {
    type: 'fatality',
    params: {
      message: 'Modified warning',
    },
  },
};

/**
 * Create initial store state for testing
 */
export function createMockStoreState(rule: RuleDefinition | null = null) {
  return {
    rule,
    originalRule: rule,
    selectedPath: [] as string[],
    isDirty: false,
    isSaving: false,
    lastUpdateSource: null,
    lastUpdateTime: 0,
    expandedPaths: new Set(['conditions']),
    history: rule ? [rule] : [],
    historyIndex: rule ? 0 : -1,
    canUndo: false,
    canRedo: false,
    validationErrors: [],
    isValidating: false,
    isValid: true,
    lastValidatedAt: null,
  };
}

/**
 * Create store state with a pre-loaded rule
 */
export function createLoadedStoreState(rule: RuleDefinition = sampleRule) {
  return createMockStoreState(rule);
}

/**
 * Create store state with dirty flag set
 */
export function createDirtyStoreState(rule: RuleDefinition = sampleRule) {
  return {
    ...createMockStoreState(rule),
    isDirty: true,
  };
}

/**
 * Create store state with history
 */
export function createStoreStateWithHistory(
  currentRule: RuleDefinition,
  previousRule: RuleDefinition
) {
  return {
    ...createMockStoreState(currentRule),
    history: [previousRule, currentRule],
    historyIndex: 1,
    canUndo: true,
    canRedo: false,
    isDirty: true,
  };
}
