/**
 * Fixture metadata and descriptions for Rule Builder GUI
 * 
 * This module provides metadata about available fixtures, including
 * descriptions of what rules they trigger and key files to examine.
 */

import type { FixtureInfo } from './types';

/**
 * Metadata for the node-fullstack fixture
 */
export const nodeFullstackFixtureInfo: FixtureInfo = {
  id: 'node-fullstack',
  name: 'Node.js Full-Stack Fixture',
  description: 'A comprehensive test fixture designed to trigger all 15 rules in the node-fullstack archetype. Contains intentionally problematic code patterns including sensitive data logging, direct database calls, function complexity issues, and outdated dependencies.',
  archetype: 'node-fullstack',
  triggersRules: [
    'sensitiveLogging-iterative',
    'noDatabases-iterative',
    'functionComplexity-iterative',
    'functionCount-iterative',
    'codeRhythm-iterative',
    'factDoesNotAddResultToAlmanac-iterative',
    'invalidSystemIdConfigured-iterative',
    'lowMigrationToNewComponentLib-global',
    'newSdkFeatureNotAdoped-global',
    'outdatedFramework-global',
    'nonStandardDirectoryStructure-global',
    'missingRequiredFiles-global',
    'openaiAnalysisTop5-global',
    'openaiAnalysisA11y-global',
    'openaiAnalysisTestCriticality-global',
  ],
  keyFiles: [
    'src/components/UserAuth.tsx',
    'src/components/SensitiveDataLogger.tsx',
    'src/utils/database.js',
    'src/utils/directDatabaseCalls.ts',
    'src/components/ComplexComponent.tsx',
    'src/components/OverlyComplexProcessor.tsx',
    'src/facts/manyFunctionsFact.ts',
    'src/facts/massiveFunctionCollection.ts',
    'src/components/PoorRhythmComponent.tsx',
    'src/facts/problematicFact.ts',
    'src/xfiTestMatch.json',
    'src/components/LegacyComponentLib.tsx',
    'src/utils/sdkUsage.ts',
    'package.json',
  ],
};

/**
 * Map of rule IDs to human-readable descriptions
 */
export const ruleDescriptions: Record<string, { name: string; description: string; severity: 'warning' | 'error' | 'fatality' }> = {
  'sensitiveLogging-iterative': {
    name: 'Sensitive Logging',
    description: 'Detects logging of sensitive data like API keys, passwords, and tokens',
    severity: 'warning',
  },
  'noDatabases-iterative': {
    name: 'No Direct Database Calls',
    description: 'Flags direct database connections (Oracle, Postgres, MongoDB) that should use a service layer',
    severity: 'warning',
  },
  'functionComplexity-iterative': {
    name: 'Function Complexity',
    description: 'Identifies functions with high cyclomatic or cognitive complexity',
    severity: 'warning',
  },
  'functionCount-iterative': {
    name: 'Function Count',
    description: 'Flags files with too many functions, indicating need for refactoring',
    severity: 'warning',
  },
  'codeRhythm-iterative': {
    name: 'Code Rhythm',
    description: 'Detects inconsistent code formatting and spacing patterns',
    severity: 'warning',
  },
  'factDoesNotAddResultToAlmanac-iterative': {
    name: 'Fact Missing Almanac',
    description: 'X-Fidelity facts must add results to the almanac for rule evaluation',
    severity: 'warning',
  },
  'invalidSystemIdConfigured-iterative': {
    name: 'Invalid System ID',
    description: 'Detects invalid or unrecognized system ID configurations',
    severity: 'fatality',
  },
  'lowMigrationToNewComponentLib-global': {
    name: 'Component Library Migration',
    description: 'Checks migration progress from legacy component libraries',
    severity: 'fatality',
  },
  'newSdkFeatureNotAdoped-global': {
    name: 'SDK Feature Adoption',
    description: 'Ensures new SDK features are being adopted across the codebase',
    severity: 'warning',
  },
  'outdatedFramework-global': {
    name: 'Outdated Framework',
    description: 'Flags outdated framework and dependency versions',
    severity: 'fatality',
  },
  'nonStandardDirectoryStructure-global': {
    name: 'Directory Structure',
    description: 'Validates project follows expected directory structure',
    severity: 'warning',
  },
  'missingRequiredFiles-global': {
    name: 'Missing Required Files',
    description: 'Checks for presence of required configuration files',
    severity: 'fatality',
  },
  'openaiAnalysisTop5-global': {
    name: 'AI: Top Issues',
    description: 'AI-powered analysis of top code quality issues',
    severity: 'warning',
  },
  'openaiAnalysisA11y-global': {
    name: 'AI: Accessibility',
    description: 'AI-powered accessibility analysis',
    severity: 'warning',
  },
  'openaiAnalysisTestCriticality-global': {
    name: 'AI: Test Criticality',
    description: 'AI-powered test coverage criticality analysis',
    severity: 'warning',
  },
};

/**
 * Mapping of file patterns to the rules they typically trigger
 */
export const filePatternRuleTriggers: Record<string, string[]> = {
  // Files with sensitive logging patterns
  'UserAuth.tsx': ['sensitiveLogging-iterative', 'noDatabases-iterative'],
  'SensitiveDataLogger.tsx': ['sensitiveLogging-iterative', 'noDatabases-iterative'],
  'database.js': ['sensitiveLogging-iterative', 'noDatabases-iterative'],
  'directDatabaseCalls.ts': ['noDatabases-iterative'],
  
  // Files with complexity issues
  'ComplexComponent.tsx': ['functionComplexity-iterative'],
  'OverlyComplexProcessor.tsx': ['functionComplexity-iterative'],
  'ComplexFunction.tsx': ['functionComplexity-iterative'],
  
  // Files with too many functions
  'manyFunctionsFact.ts': ['functionCount-iterative'],
  'massiveFunctionCollection.ts': ['functionCount-iterative'],
  
  // Files with formatting issues
  'PoorRhythmComponent.tsx': ['codeRhythm-iterative'],
  'InconsistentStyleComponent.tsx': ['codeRhythm-iterative'],
  
  // X-Fidelity specific issues
  'problematicFact.ts': ['factDoesNotAddResultToAlmanac-iterative'],
  'anotherProblematicFact.ts': ['factDoesNotAddResultToAlmanac-iterative'],
  'xfiTestMatch.json': ['invalidSystemIdConfigured-iterative'],
  'anotherTestMatch.json': ['invalidSystemIdConfigured-iterative'],
  
  // Legacy component patterns
  'LegacyComponentLib.tsx': ['lowMigrationToNewComponentLib-global'],
  'LegacyUIComponent.tsx': ['lowMigrationToNewComponentLib-global'],
  'AnotherLegacyComponent.tsx': ['lowMigrationToNewComponentLib-global'],
  
  // SDK adoption
  'sdkUsage.ts': ['newSdkFeatureNotAdoped-global'],
  'minimalSdkUsage.ts': ['newSdkFeatureNotAdoped-global'],
  
  // Accessibility issues
  'AccessibilityIssues.tsx': ['openaiAnalysisA11y-global', 'openaiAnalysisTop5-global'],
};

/**
 * Get all available fixtures
 */
export function getAvailableFixtures(): FixtureInfo[] {
  return [nodeFullstackFixtureInfo];
}

/**
 * Get fixture info by ID
 */
export function getFixtureInfo(fixtureId: string): FixtureInfo | undefined {
  const fixtures = getAvailableFixtures();
  return fixtures.find(f => f.id === fixtureId);
}

/**
 * Get rules that a specific file might trigger
 */
export function getRulesForFile(filename: string): string[] {
  const basename = filename.split('/').pop() ?? filename;
  return filePatternRuleTriggers[basename] ?? [];
}

/**
 * Get rule description by ID
 */
export function getRuleDescription(ruleId: string): { name: string; description: string; severity: string } | undefined {
  return ruleDescriptions[ruleId];
}
