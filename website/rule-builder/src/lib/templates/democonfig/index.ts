/**
 * Democonfig Templates
 *
 * Templates imported from the X-Fidelity democonfig package.
 * These are production-ready rules with enhanced metadata.
 */

import type { RuleTemplate, PluginType, UseCaseType, ComplexityLevel } from '../types';
import type { RuleDefinition } from '../../../types';

/**
 * Democonfig rule definitions imported inline
 * These match the structure of packages/x-fidelity-democonfig/src/rules/
 */

const functionComplexityRule: RuleDefinition = {
  name: 'functionComplexity-iterative',
  conditions: {
    all: [
      {
        fact: 'fileData',
        path: '$.fileName',
        operator: 'notEqual',
        value: 'REPO_GLOBAL_CHECK',
      },
      {
        fact: 'functionComplexity',
        params: {
          resultFact: 'complexityResult',
          thresholds: {
            cyclomaticComplexity: 25,
            cognitiveComplexity: 40,
            nestingDepth: 10,
            parameterCount: 5,
            returnCount: 10,
          },
        },
        operator: 'astComplexity',
        value: true,
      },
    ],
  },
  event: {
    type: 'warning',
    params: {
      message: 'Functions detected with high complexity. Consider refactoring.',
      details: { fact: 'complexityResult' },
    },
  },
};

const functionCountRule: RuleDefinition = {
  name: 'functionCount-iterative',
  conditions: {
    all: [
      {
        fact: 'fileData',
        path: '$.filePath',
        operator: 'regexMatch',
        value: '^.*\\/facts\\/(?!.*\\.test).*\\.ts$',
      },
      {
        fact: 'functionCount',
        params: { resultFact: 'functionCountResult' },
        operator: 'functionCount',
        value: 20,
      },
    ],
  },
  event: {
    type: 'warning',
    params: {
      message: 'File contains too many functions (>20). Consider splitting into multiple files.',
      details: { fact: 'functionCountResult' },
    },
  },
};

const outdatedFrameworkRule: RuleDefinition = {
  name: 'outdatedFramework-global',
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
        params: { resultFact: 'repoDependencyResults' },
        operator: 'outdatedFramework',
        value: true,
      },
    ],
  },
  event: {
    type: 'fatality',
    params: {
      message: 'Core framework dependencies do not meet minimum version requirements! Please update your dependencies to the required versions.',
      details: { fact: 'repoDependencyResults' },
    },
  },
};

const missingRequiredFilesRule: RuleDefinition = {
  name: 'missingRequiredFiles-global',
  conditions: {
    all: [
      {
        fact: 'fileData',
        path: '$.fileName',
        operator: 'equal',
        value: 'REPO_GLOBAL_CHECK',
      },
      {
        fact: 'missingRequiredFiles',
        params: {
          requiredFiles: ['/README.md', '../../src/\\core//cli&.ts', 'missingRequiredFiles-testing.js'],
          resultFact: 'missingRequiredFilesResult',
        },
        operator: 'missingRequiredFiles',
        value: true,
      },
    ],
  },
  event: {
    type: 'fatality',
    params: {
      message: 'Required files are missing from the repository',
      details: { fact: 'missingRequiredFilesResult' },
    },
  },
};

const sensitiveLoggingRule: RuleDefinition = {
  name: 'sensitiveLogging-iterative',
  conditions: {
    all: [
      {
        fact: 'fileData',
        path: '$.fileName',
        operator: 'notEqual',
        value: 'REPO_GLOBAL_CHECK',
      },
      {
        fact: 'repoFileAnalysis',
        params: {
          checkPattern: [
            '(api[_-]?key|auth[_-]?token|access[_-]?token|secret[_-]?key)',
            '(aws[_-]?access[_-]?key[_-]?id|aws[_-]?secret[_-]?access[_-]?key)',
            '(private[_-]?key|ssh[_-]?key)',
            '(oauth[_-]?token|jwt[_-]?token)',
            'db[_-]?password',
          ],
          resultFact: 'fileResults',
        },
        operator: 'fileContains',
        value: true,
      },
    ],
  },
  event: {
    type: 'warning',
    params: {
      message: 'Potential sensitive data detected. This must not be logged or exposed.',
      details: { fact: 'fileResults' },
    },
  },
};

const reactHooksDependencyRule: RuleDefinition = {
  name: 'reactHooksDependency-iterative',
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
        params: { resultFact: 'hookDependencyResult' },
        operator: 'equal',
        value: true,
      },
    ],
  },
  event: {
    type: 'warning',
    params: {
      message: 'React hooks have missing or incorrect dependencies that could cause bugs.',
      details: { fact: 'hookDependencyResult' },
    },
  },
};

const reactHooksMigrationRule: RuleDefinition = {
  name: 'reactHooksMigration-global',
  conditions: {
    all: [
      {
        fact: 'fileData',
        path: '$.fileName',
        operator: 'equal',
        value: 'REPO_GLOBAL_CHECK',
      },
      {
        fact: 'globalFileAnalysis',
        params: {
          newPatterns: [
            'useState\\(',
            'useEffect\\(',
            'useContext\\(',
            'useReducer\\(',
            'useCallback\\(',
            'useMemo\\(',
            'useRef\\(',
            'const\\s+\\w+\\s*=\\s*\\(\\)\\s*=>\\s*{',
          ],
          legacyPatterns: [
            'extends\\s+React\\.Component',
            'componentDidMount\\(',
            'componentDidUpdate\\(',
            'componentWillUnmount\\(',
            'this\\.setState\\(',
          ],
          fileFilter: '\\.(jsx|tsx)$',
          resultFact: 'reactHooksMigrationAnalysis',
        },
        operator: 'globalPatternRatio',
        value: 0.7,
      },
    ],
  },
  event: {
    type: 'warning',
    params: {
      message: 'React Hooks migration is in progress. At least 70% of components should use hooks.',
      details: { fact: 'reactHooksMigrationAnalysis' },
    },
  },
};

const lowMigrationRule: RuleDefinition = {
  name: 'lowMigrationToNewComponentLib-global',
  conditions: {
    all: [
      {
        fact: 'fileData',
        path: '$.fileName',
        operator: 'equal',
        value: 'REPO_GLOBAL_CHECK',
      },
      {
        fact: 'globalFileAnalysis',
        params: {
          newPatterns: ["import.*from\\s+['\"](@mui/material.*)['\"]"],
          legacyPatterns: ["import.*from\\s+['\"](antd)['\"]"],
          fileFilter: '\\.(js|jsx|ts|tsx)$',
          outputGrouping: 'file',
          resultFact: 'lowMigrationToNewComponentLib',
        },
        operator: 'globalPatternRatio',
        value: { threshold: 0.7, comparison: 'lte' },
      },
    ],
  },
  event: {
    type: 'fatality',
    params: {
      message: 'MUI migration from AntDesign is low.',
      details: {
        fact: 'lowMigrationToNewComponentLib',
        recommendation: 'Migrate to MUI.',
      },
    },
  },
};

const nonStandardDirectoryRule: RuleDefinition = {
  name: 'nonStandardDirectoryStructure-global',
  conditions: {
    all: [
      {
        fact: 'fileData',
        path: '$.fileName',
        operator: 'equal',
        value: 'REPO_GLOBAL_CHECK',
      },
      {
        fact: 'fileData',
        path: '$.filePath',
        operator: 'nonStandardDirectoryStructure',
        value: { fact: 'standardStructure' },
      },
    ],
  },
  event: {
    type: 'warning',
    params: {
      message: 'Directory structure does not match the standard.',
      details: { fact: 'standardStructure' },
    },
  },
};

const noDatabasesRule: RuleDefinition = {
  name: 'noDatabases-iterative',
  conditions: {
    all: [
      {
        fact: 'fileData',
        path: '$.fileName',
        operator: 'notEqual',
        value: 'REPO_GLOBAL_CHECK',
      },
      {
        fact: 'repoFileAnalysis',
        params: {
          checkPattern: [
            "[\\s\\'\\\"\\.]( oracle)[\\s\\'\\\"\\.] ",
            "[\\s\\'\\\"\\.]( postgres)[\\s\\'\\\"\\.]",
            "[\\s\\'\\\"\\.]( mongodb)[\\s\\'\\\"\\.] ",
          ],
          resultFact: 'fileResultsDB',
        },
        operator: 'fileContains',
        value: true,
      },
    ],
  },
  event: {
    type: 'warning',
    params: {
      message: 'Code must not directly call databases.',
      details: { fact: 'fileResultsDB' },
    },
  },
};

const extractEnvApiKeyRule: RuleDefinition = {
  name: 'extractEnvApiKey-iterative',
  conditions: {
    all: [
      {
        fact: 'extractValues',
        params: {
          resultFact: 'envApiKeyResult',
          defaultStrategy: { type: 'regex', pattern: '^API_KEY=(.*)$', flags: 'im' },
          include: ['.*\\.env$'],
        },
        operator: 'matchesSatisfy',
        value: { requireMatches: true, count: { op: '>=', value: 1 } },
      },
    ],
  },
  event: {
    type: 'warning',
    params: {
      message: 'API key detected in .env file',
      details: { fact: 'envApiKeyResult' },
    },
  },
};

/**
 * Template metadata for democonfig rules
 */
interface DemoconfigTemplateData {
  rule: RuleDefinition;
  displayName: string;
  description: string;
  longDescription?: string;
  plugin: PluginType;
  useCase: UseCaseType;
  complexity: ComplexityLevel;
  tags: string[];
  learningPoints?: string[];
}

const templateData: DemoconfigTemplateData[] = [
  {
    rule: functionComplexityRule,
    displayName: 'Function Complexity',
    description: 'Analyze function complexity using cyclomatic and cognitive metrics',
    longDescription: 'This rule uses AST analysis to measure multiple complexity metrics including cyclomatic complexity, cognitive complexity, nesting depth, parameter count, and return count. Functions exceeding any threshold are flagged for refactoring.',
    plugin: 'ast',
    useCase: 'quality',
    complexity: 'advanced',
    tags: ['complexity', 'ast', 'refactoring', 'maintainability', 'metrics'],
    learningPoints: [
      'Multiple complexity thresholds in a single rule',
      'Using the astComplexity operator',
      'Configuring thresholds via params',
    ],
  },
  {
    rule: functionCountRule,
    displayName: 'Function Count',
    description: 'Limit the number of functions per file for better maintainability',
    plugin: 'ast',
    useCase: 'quality',
    complexity: 'intermediate',
    tags: ['functions', 'count', 'maintainability', 'file-size'],
  },
  {
    rule: outdatedFrameworkRule,
    displayName: 'Outdated Framework',
    description: 'Ensure core dependencies meet minimum version requirements',
    longDescription: 'This global rule checks all dependencies in package.json against configured minimum versions. It fires a fatality event if any core framework dependency is outdated, blocking deployment until updated.',
    plugin: 'dependency',
    useCase: 'security',
    complexity: 'intermediate',
    tags: ['dependencies', 'versions', 'security', 'npm', 'updates'],
    learningPoints: [
      'Global rules vs iterative rules',
      'Using fatality for blocking issues',
      'Dependency analysis with repoDependencyAnalysis',
    ],
  },
  {
    rule: missingRequiredFilesRule,
    displayName: 'Missing Required Files',
    description: 'Ensure required files like README.md exist in the repository',
    plugin: 'filesystem',
    useCase: 'compliance',
    complexity: 'beginner',
    tags: ['files', 'required', 'structure', 'documentation'],
  },
  {
    rule: sensitiveLoggingRule,
    displayName: 'Sensitive Data Detection',
    description: 'Detect potential sensitive data like API keys and passwords',
    longDescription: 'Scans files for patterns that might indicate sensitive data such as API keys, auth tokens, private keys, and database passwords. Essential for security compliance and preventing accidental data exposure.',
    plugin: 'patterns',
    useCase: 'security',
    complexity: 'intermediate',
    tags: ['security', 'secrets', 'api-keys', 'passwords', 'scanning'],
    learningPoints: [
      'Using fileContains operator',
      'Multiple regex patterns in checkPattern',
      'Security-focused rule design',
    ],
  },
  {
    rule: reactHooksDependencyRule,
    displayName: 'React Hooks Dependencies',
    description: 'Check for missing or incorrect React hook dependencies',
    plugin: 'react-patterns',
    useCase: 'quality',
    complexity: 'advanced',
    tags: ['react', 'hooks', 'dependencies', 'useEffect', 'bugs'],
  },
  {
    rule: reactHooksMigrationRule,
    displayName: 'React Hooks Migration',
    description: 'Track migration progress from class components to hooks',
    longDescription: 'Measures the ratio of hook-based components to class-based components. Helps teams track their migration progress to modern React patterns and ensures new code follows hook conventions.',
    plugin: 'react-patterns',
    useCase: 'migration',
    complexity: 'advanced',
    tags: ['react', 'hooks', 'migration', 'class-components', 'modernization'],
    learningPoints: [
      'Pattern ratio analysis',
      'New vs legacy pattern tracking',
      'Migration progress measurement',
    ],
  },
  {
    rule: lowMigrationRule,
    displayName: 'Component Library Migration',
    description: 'Track UI library migration progress (e.g., Ant Design to MUI)',
    plugin: 'patterns',
    useCase: 'migration',
    complexity: 'advanced',
    tags: ['migration', 'ui-library', 'mui', 'antd', 'components'],
  },
  {
    rule: nonStandardDirectoryRule,
    displayName: 'Directory Structure',
    description: 'Verify the project follows standard directory conventions',
    plugin: 'filesystem',
    useCase: 'compliance',
    complexity: 'intermediate',
    tags: ['structure', 'directories', 'organization', 'standards'],
  },
  {
    rule: noDatabasesRule,
    displayName: 'No Direct Database Calls',
    description: 'Prevent direct database connections (Oracle, Postgres, MongoDB)',
    plugin: 'patterns',
    useCase: 'compliance',
    complexity: 'intermediate',
    tags: ['database', 'architecture', 'patterns', 'abstraction'],
  },
  {
    rule: extractEnvApiKeyRule,
    displayName: 'Environment API Keys',
    description: 'Detect API keys defined in .env files',
    plugin: 'patterns',
    useCase: 'security',
    complexity: 'intermediate',
    tags: ['env', 'api-keys', 'secrets', 'configuration'],
  },
];

/**
 * Convert template data to full RuleTemplate objects
 */
function createTemplateFromData(data: DemoconfigTemplateData): RuleTemplate {
  return {
    id: data.rule.name,
    name: data.rule.name,
    displayName: data.displayName,
    description: data.description,
    longDescription: data.longDescription,
    plugin: data.plugin,
    useCase: data.useCase,
    complexity: data.complexity,
    tags: data.tags,
    source: 'democonfig',
    author: 'X-Fidelity Demo',
    rule: data.rule,
    learningPoints: data.learningPoints,
  };
}

/**
 * All democonfig templates
 */
export const democonfigTemplates: RuleTemplate[] = templateData.map(createTemplateFromData);

export default democonfigTemplates;
