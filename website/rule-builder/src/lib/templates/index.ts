/**
 * Template Library Catalog
 *
 * Central export point for all rule templates including:
 * - Teaching templates: Beginner-friendly learning resources
 * - Democonfig templates: Production-ready example rules
 */

import { teachingTemplates } from './teaching';
import { democonfigTemplates } from './democonfig';
import type { RuleTemplate } from './types';

export * from './types';
export { teachingTemplates } from './teaching';
export { democonfigTemplates } from './democonfig';

/**
 * All templates combined and sorted by complexity then name
 */
export const allTemplates: RuleTemplate[] = [
  ...teachingTemplates,
  ...democonfigTemplates,
].sort((a, b) => {
  // Sort by complexity first (beginner, intermediate, advanced)
  const complexityOrder = { beginner: 0, intermediate: 1, advanced: 2 };
  const complexityDiff = complexityOrder[a.complexity] - complexityOrder[b.complexity];
  if (complexityDiff !== 0) return complexityDiff;

  // Then by source (teaching first)
  if (a.source !== b.source) {
    return a.source === 'teaching' ? -1 : 1;
  }

  // Finally alphabetically by display name
  return a.displayName.localeCompare(b.displayName);
});

/**
 * Get a template by ID
 */
export function getTemplateById(id: string): RuleTemplate | undefined {
  return allTemplates.find((t) => t.id === id);
}

/**
 * Get templates by plugin type
 */
export function getTemplatesByPlugin(plugin: RuleTemplate['plugin']): RuleTemplate[] {
  return allTemplates.filter((t) => t.plugin === plugin);
}

/**
 * Get templates by use case
 */
export function getTemplatesByUseCase(useCase: RuleTemplate['useCase']): RuleTemplate[] {
  return allTemplates.filter((t) => t.useCase === useCase);
}

/**
 * Get templates by complexity
 */
export function getTemplatesByComplexity(complexity: RuleTemplate['complexity']): RuleTemplate[] {
  return allTemplates.filter((t) => t.complexity === complexity);
}

/**
 * Get related templates for a given template
 */
export function getRelatedTemplates(template: RuleTemplate): RuleTemplate[] {
  const related: RuleTemplate[] = [];

  // Add explicitly related templates
  if (template.relatedTemplates) {
    for (const id of template.relatedTemplates) {
      const t = getTemplateById(id);
      if (t) related.push(t);
    }
  }

  // Add templates with same plugin (up to 3 more)
  const samePlugin = allTemplates.filter(
    (t) => t.plugin === template.plugin && t.id !== template.id && !related.find((r) => r.id === t.id)
  );
  related.push(...samePlugin.slice(0, 3));

  return related.slice(0, 5);
}

/**
 * Template statistics for display
 */
export const templateStats = {
  total: allTemplates.length,
  teaching: teachingTemplates.length,
  democonfig: democonfigTemplates.length,
  byPlugin: {
    filesystem: allTemplates.filter((t) => t.plugin === 'filesystem').length,
    ast: allTemplates.filter((t) => t.plugin === 'ast').length,
    dependency: allTemplates.filter((t) => t.plugin === 'dependency').length,
    'react-patterns': allTemplates.filter((t) => t.plugin === 'react-patterns').length,
    patterns: allTemplates.filter((t) => t.plugin === 'patterns').length,
  },
  byComplexity: {
    beginner: allTemplates.filter((t) => t.complexity === 'beginner').length,
    intermediate: allTemplates.filter((t) => t.complexity === 'intermediate').length,
    advanced: allTemplates.filter((t) => t.complexity === 'advanced').length,
  },
};
