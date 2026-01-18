/**
 * Mock Templates for Testing
 *
 * Provides mock template data for testing template library components.
 */

import type { RuleTemplate } from '../lib/templates/types';
import type { RuleDefinition } from '../types';

/**
 * Simple hello world template rule
 */
export const helloWorldRule: RuleDefinition = {
  name: 'hello-world-iterative',
  conditions: {
    all: [
      {
        fact: 'fileData',
        operator: 'notEqual',
        value: 'REPO_GLOBAL_CHECK',
        path: '$.fileName',
      },
    ],
  },
  event: {
    type: 'info',
    params: {
      message: 'Hello from rule builder!',
    },
  },
};

/**
 * Mock hello world template
 */
export const mockHelloWorldTemplate: RuleTemplate = {
  id: 'hello-world',
  name: 'hello-world-iterative',
  displayName: 'Hello World',
  description: 'A simple starter rule that fires for every file',
  source: 'teaching',
  plugin: 'filesystem',
  useCase: 'best-practices',
  complexity: 'beginner',
  tags: ['beginner', 'starter', 'tutorial'],
  rule: helloWorldRule,
};

/**
 * Mock console statement detector template
 */
export const mockConsoleDetectorTemplate: RuleTemplate = {
  id: 'console-detector',
  name: 'no-console-statements-iterative',
  displayName: 'Console Statement Detector',
  description: 'Detects console.log, console.warn, and console.error statements',
  source: 'democonfig',
  plugin: 'filesystem',
  useCase: 'quality',
  complexity: 'intermediate',
  tags: ['console', 'logging', 'code-quality'],
  rule: {
    name: 'no-console-statements-iterative',
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
            { fact: 'fileContent', operator: 'contains', value: 'console.log' },
            { fact: 'fileContent', operator: 'contains', value: 'console.warn' },
            { fact: 'fileContent', operator: 'contains', value: 'console.error' },
          ],
        },
      ],
    },
    event: {
      type: 'warning',
      params: {
        message: 'Console statements should be removed before production',
        category: 'code-quality',
      },
    },
  },
};

/**
 * Mock AST complexity template
 */
export const mockComplexityTemplate: RuleTemplate = {
  id: 'function-complexity',
  name: 'high-complexity-functions-iterative',
  displayName: 'Function Complexity Check',
  description: 'Flags functions with high cyclomatic complexity',
  source: 'democonfig',
  plugin: 'ast',
  useCase: 'quality',
  complexity: 'advanced',
  tags: ['ast', 'complexity', 'code-quality'],
  rule: {
    name: 'high-complexity-functions-iterative',
    conditions: {
      all: [
        {
          fact: 'functionComplexity',
          operator: 'greaterThan',
          value: 10,
        },
      ],
    },
    event: {
      type: 'warning',
      params: {
        message: 'Function has high cyclomatic complexity',
        category: 'maintainability',
      },
    },
  },
};

/**
 * All mock templates
 */
export const mockTemplates: RuleTemplate[] = [
  mockHelloWorldTemplate,
  mockConsoleDetectorTemplate,
  mockComplexityTemplate,
];

/**
 * Get mock template by ID
 */
export function getMockTemplateById(id: string): RuleTemplate | undefined {
  return mockTemplates.find((t) => t.id === id);
}
