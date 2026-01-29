/**
 * Template Library Type Definitions
 *
 * Types for the rule template system that supports browsing,
 * categorizing, and loading pre-built rule templates.
 */

import type { RuleDefinition } from '../../types';

/**
 * Plugin types that templates can be categorized by
 */
export type PluginType = 'filesystem' | 'ast' | 'dependency' | 'react-patterns' | 'patterns';

/**
 * Use case categories for templates
 */
export type UseCaseType = 'security' | 'quality' | 'migration' | 'compliance' | 'best-practices';

/**
 * Complexity levels for templates
 */
export type ComplexityLevel = 'beginner' | 'intermediate' | 'advanced';

/**
 * Source of the template
 */
export type TemplateSource = 'democonfig' | 'teaching';

/**
 * Enhanced rule template with full categorization and metadata
 */
export interface RuleTemplate {
  /** Unique identifier for the template */
  id: string;

  /** Internal rule name (matches rule.name) */
  name: string;

  /** Human-readable display name */
  displayName: string;

  /** Short description of what the rule does */
  description: string;

  /** Longer description with usage details */
  longDescription?: string;

  /** Primary plugin this template uses */
  plugin: PluginType;

  /** Primary use case category */
  useCase: UseCaseType;

  /** Difficulty/complexity level */
  complexity: ComplexityLevel;

  /** Searchable tags */
  tags: string[];

  /** Source of the template */
  source: TemplateSource;

  /** The actual rule definition */
  rule: RuleDefinition;

  /** Key concepts this template teaches (for teaching templates) */
  learningPoints?: string[];

  /** IDs of related templates for further exploration */
  relatedTemplates?: string[];

  /** Author or source attribution */
  author?: string;
}

/**
 * Filter state for the template library
 */
export interface TemplateFilters {
  search: string;
  plugin: PluginType | 'all';
  useCase: UseCaseType | 'all';
  complexity: ComplexityLevel | 'all';
  source: TemplateSource | 'all';
}

/**
 * Default filter state
 */
export const defaultFilters: TemplateFilters = {
  search: '',
  plugin: 'all',
  useCase: 'all',
  complexity: 'all',
  source: 'all',
};

/**
 * Plugin display information
 */
export const pluginInfo: Record<PluginType, { label: string; icon: string; description: string }> = {
  filesystem: {
    label: 'Filesystem',
    icon: '📁',
    description: 'File and directory structure checks',
  },
  ast: {
    label: 'AST Analysis',
    icon: '🌳',
    description: 'Abstract syntax tree analysis',
  },
  dependency: {
    label: 'Dependencies',
    icon: '📦',
    description: 'Package dependency version checks',
  },
  'react-patterns': {
    label: 'React Patterns',
    icon: '⚛️',
    description: 'React-specific pattern detection',
  },
  patterns: {
    label: 'Pattern Matching',
    icon: '🔍',
    description: 'Regular expression and text patterns',
  },
};

/**
 * Use case display information
 */
export const useCaseInfo: Record<UseCaseType, { label: string; icon: string; description: string }> = {
  security: {
    label: 'Security',
    icon: '🔒',
    description: 'Security vulnerability detection',
  },
  quality: {
    label: 'Code Quality',
    icon: '✨',
    description: 'Code quality and maintainability',
  },
  migration: {
    label: 'Migration',
    icon: '🔄',
    description: 'Framework and library migration',
  },
  compliance: {
    label: 'Compliance',
    icon: '📋',
    description: 'Standards and policy compliance',
  },
  'best-practices': {
    label: 'Best Practices',
    icon: '⭐',
    description: 'Industry best practices',
  },
};

/**
 * Complexity display information
 */
export const complexityInfo: Record<ComplexityLevel, { label: string; stars: number; description: string }> = {
  beginner: {
    label: 'Beginner',
    stars: 1,
    description: 'Simple rules with basic concepts',
  },
  intermediate: {
    label: 'Intermediate',
    stars: 2,
    description: 'More complex conditions and facts',
  },
  advanced: {
    label: 'Advanced',
    stars: 3,
    description: 'Complex rules with multiple plugins',
  },
};
