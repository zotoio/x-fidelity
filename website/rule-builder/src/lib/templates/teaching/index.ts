/**
 * Teaching Templates
 *
 * Beginner-friendly templates designed to teach X-Fidelity rule concepts.
 * Each template includes learning points and clear explanations.
 */

import type { RuleTemplate } from '../types';

/**
 * Hello World - The simplest possible X-Fidelity rule
 * Teaches basic rule structure
 */
export const helloWorld: RuleTemplate = {
  id: 'hello-world',
  name: 'hello-world-iterative',
  displayName: 'Hello World',
  description: 'The simplest possible X-Fidelity rule - a great starting point',
  longDescription: `This template demonstrates the fundamental structure of an X-Fidelity rule. 
It checks if a file has a specific extension and fires a warning event.
Perfect for understanding the basic components: conditions, facts, operators, and events.`,
  plugin: 'filesystem',
  useCase: 'best-practices',
  complexity: 'beginner',
  tags: ['starter', 'learning', 'basic', 'tutorial'],
  source: 'teaching',
  author: 'X-Fidelity Team',
  learningPoints: [
    'Basic rule structure with name, conditions, and event',
    'Using the fileData fact to access file properties',
    'The difference between warning and fatality event types',
    'Using the equal operator for exact matching',
  ],
  relatedTemplates: ['file-pattern-basic', 'dependency-check-basic'],
  rule: {
    name: 'hello-world-iterative',
    conditions: {
      all: [
        {
          fact: 'fileData',
          path: '$.extension',
          operator: 'equal',
          value: 'ts',
        },
      ],
    },
    event: {
      type: 'warning',
      params: {
        message: 'Hello! This is a TypeScript file.',
      },
    },
  },
};

/**
 * Simple File Pattern - Detect files matching a pattern
 * Teaches regex matching and file path analysis
 */
export const filePatternBasic: RuleTemplate = {
  id: 'file-pattern-basic',
  name: 'file-pattern-basic-iterative',
  displayName: 'Simple File Pattern',
  description: 'Detect files that match a regular expression pattern',
  longDescription: `This template shows how to use regular expressions to match file paths.
It demonstrates the regexMatch operator which is essential for flexible file detection.
Use this pattern to find specific file naming conventions or directory structures.`,
  plugin: 'patterns',
  useCase: 'quality',
  complexity: 'beginner',
  tags: ['regex', 'pattern', 'file-matching', 'basic'],
  source: 'teaching',
  author: 'X-Fidelity Team',
  learningPoints: [
    'Using regexMatch operator for flexible pattern matching',
    'Accessing file path via $.filePath JSONPath',
    'Writing regex patterns for file detection',
    'Combining multiple conditions with "all" (AND logic)',
  ],
  relatedTemplates: ['hello-world', 'sensitive-logging-basic'],
  rule: {
    name: 'file-pattern-basic-iterative',
    conditions: {
      all: [
        {
          fact: 'fileData',
          path: '$.fileName',
          operator: 'notEqual',
          value: 'REPO_GLOBAL_CHECK',
        },
        {
          fact: 'fileData',
          path: '$.filePath',
          operator: 'regexMatch',
          value: '.*\\.test\\.(ts|tsx|js|jsx)$',
        },
      ],
    },
    event: {
      type: 'info',
      params: {
        message: 'This is a test file. Test files should follow naming conventions.',
      },
    },
  },
};

/**
 * Dependency Version Check - Check package versions
 * Teaches dependency analysis
 */
export const dependencyCheckBasic: RuleTemplate = {
  id: 'dependency-check-basic',
  name: 'dependency-check-basic-global',
  displayName: 'Dependency Version Check',
  description: 'Verify that package dependencies meet minimum version requirements',
  longDescription: `This template demonstrates how to check package.json dependencies.
It uses the repoDependencyAnalysis fact and outdatedFramework operator to verify versions.
Essential for ensuring your project uses secure and compatible dependency versions.`,
  plugin: 'dependency',
  useCase: 'security',
  complexity: 'intermediate',
  tags: ['dependencies', 'versions', 'npm', 'package.json', 'security'],
  source: 'teaching',
  author: 'X-Fidelity Team',
  learningPoints: [
    'Global vs iterative rules (suffix -global vs -iterative)',
    'Using REPO_GLOBAL_CHECK for repository-wide analysis',
    'The repoDependencyAnalysis fact for dependency inspection',
    'Configuring minimum version requirements',
    'Using resultFact to capture detailed analysis results',
  ],
  relatedTemplates: ['outdated-framework', 'hello-world'],
  rule: {
    name: 'dependency-check-basic-global',
    conditions: {
      all: [
        {
          fact: 'fileData',
          path: '$.fileName',
          operator: 'equal',
          value: 'REPO_GLOBAL_CHECK',
        },
        {
          fact: 'repoDependencyAnalysis',
          params: {
            resultFact: 'dependencyCheckResult',
          },
          operator: 'outdatedFramework',
          value: true,
        },
      ],
    },
    event: {
      type: 'warning',
      params: {
        message: 'Some dependencies do not meet minimum version requirements.',
        details: {
          fact: 'dependencyCheckResult',
        },
      },
    },
  },
};

/**
 * Function Count Check - Count functions using AST
 * Teaches AST analysis basics
 */
export const functionCountBasic: RuleTemplate = {
  id: 'function-count-basic',
  name: 'function-count-basic-iterative',
  displayName: 'AST Function Count',
  description: 'Count functions in a file using Abstract Syntax Tree analysis',
  longDescription: `This template introduces AST (Abstract Syntax Tree) analysis.
It counts the number of functions in a file and warns if there are too many.
AST analysis provides deep code understanding beyond simple text matching.`,
  plugin: 'ast',
  useCase: 'quality',
  complexity: 'intermediate',
  tags: ['ast', 'functions', 'code-quality', 'maintainability'],
  source: 'teaching',
  author: 'X-Fidelity Team',
  learningPoints: [
    'Introduction to AST (Abstract Syntax Tree) analysis',
    'Using the functionCount fact to analyze code structure',
    'Filtering files by extension with regexMatch',
    'Setting thresholds for code metrics',
    'Capturing results with resultFact parameter',
  ],
  relatedTemplates: ['function-complexity', 'file-pattern-basic'],
  rule: {
    name: 'function-count-basic-iterative',
    conditions: {
      all: [
        {
          fact: 'fileData',
          path: '$.filePath',
          operator: 'regexMatch',
          value: '.*\\.(ts|js)$',
        },
        {
          fact: 'functionCount',
          params: {
            resultFact: 'functionCountResult',
          },
          operator: 'functionCount',
          value: 15,
        },
      ],
    },
    event: {
      type: 'warning',
      params: {
        message: 'File contains many functions (>15). Consider splitting into smaller modules.',
        details: {
          fact: 'functionCountResult',
        },
      },
    },
  },
};

/**
 * React Hook Usage Check - Analyze React hook dependencies
 * Teaches React-specific pattern detection
 */
export const reactHooksBasic: RuleTemplate = {
  id: 'react-hooks-basic',
  name: 'react-hooks-basic-iterative',
  displayName: 'React Hook Dependencies',
  description: 'Check for missing or incorrect React hook dependencies',
  longDescription: `This template shows how to analyze React hook usage patterns.
It detects missing dependencies in useEffect, useCallback, and useMemo hooks.
Missing dependencies can cause stale closures and subtle bugs in React applications.`,
  plugin: 'react-patterns',
  useCase: 'quality',
  complexity: 'advanced',
  tags: ['react', 'hooks', 'useEffect', 'dependencies', 'best-practices'],
  source: 'teaching',
  author: 'X-Fidelity Team',
  learningPoints: [
    'React-specific analysis with react-patterns plugin',
    'Using hookDependency fact for hook analysis',
    'Filtering by file extension for React files (.tsx, .jsx)',
    'Combining multiple file conditions',
    'Understanding React hook dependency rules',
  ],
  relatedTemplates: ['function-complexity', 'file-pattern-basic'],
  rule: {
    name: 'react-hooks-basic-iterative',
    conditions: {
      all: [
        {
          fact: 'fileData',
          path: '$.fileName',
          operator: 'notEqual',
          value: 'REPO_GLOBAL_CHECK',
        },
        {
          fact: 'fileData',
          path: '$.filePath',
          operator: 'regexMatch',
          value: '.*\\.(tsx|jsx)$',
        },
        {
          fact: 'hookDependency',
          params: {
            resultFact: 'hookDependencyResult',
          },
          operator: 'equal',
          value: true,
        },
      ],
    },
    event: {
      type: 'warning',
      params: {
        message: 'React hooks may have missing or incorrect dependencies.',
        details: {
          fact: 'hookDependencyResult',
        },
      },
    },
  },
};

/**
 * All teaching templates
 */
export const teachingTemplates: RuleTemplate[] = [
  helloWorld,
  filePatternBasic,
  dependencyCheckBasic,
  functionCountBasic,
  reactHooksBasic,
];

export default teachingTemplates;
