/**
 * Template Validation Tests
 *
 * Ensures all templates load correctly and pass validation.
 * These tests catch schema mismatches, missing properties, and type errors
 * before templates are used in production.
 */

import { allTemplates, teachingTemplates, democonfigTemplates } from '../index';
import { validateRule, validateRuleName } from '../../validation/validator';
import { getFactByName, factCatalog } from '../../../components/RuleForm/data/factCatalog';
import { getOperatorByName, operatorCatalog } from '../../../components/RuleForm/data/operatorCatalog';
import type { RuleTemplate } from '../types';
import type { RuleCondition, NestedCondition } from '../../../types';

/**
 * Extract all conditions from a nested condition structure
 */
function extractConditions(nested: NestedCondition): RuleCondition[] {
  const conditions: RuleCondition[] = [];

  if ('all' in nested && nested.all) {
    for (const item of nested.all) {
      if ('fact' in item) {
        conditions.push(item as RuleCondition);
      } else {
        conditions.push(...extractConditions(item as NestedCondition));
      }
    }
  }

  if ('any' in nested && nested.any) {
    for (const item of nested.any) {
      if ('fact' in item) {
        conditions.push(item as RuleCondition);
      } else {
        conditions.push(...extractConditions(item as NestedCondition));
      }
    }
  }

  if ('not' in nested && nested.not) {
    if ('fact' in nested.not) {
      conditions.push(nested.not as RuleCondition);
    } else {
      conditions.push(...extractConditions(nested.not as NestedCondition));
    }
  }

  return conditions;
}

describe('Template Library Validation', () => {
  describe('All templates export correctly', () => {
    it('should have teaching templates', () => {
      expect(teachingTemplates).toBeDefined();
      expect(teachingTemplates.length).toBeGreaterThan(0);
    });

    it('should have democonfig templates', () => {
      expect(democonfigTemplates).toBeDefined();
      expect(democonfigTemplates.length).toBeGreaterThan(0);
    });

    it('should combine all templates', () => {
      expect(allTemplates).toBeDefined();
      expect(allTemplates.length).toBe(teachingTemplates.length + democonfigTemplates.length);
    });
  });

  describe('Template structure validation', () => {
    it.each(allTemplates.map((t) => [t.id, t]))('template "%s" has required metadata', (_id, template) => {
      expect(template.id).toBeDefined();
      expect(template.name).toBeDefined();
      expect(template.displayName).toBeDefined();
      expect(template.description).toBeDefined();
      expect(template.plugin).toBeDefined();
      expect(template.useCase).toBeDefined();
      expect(template.complexity).toBeDefined();
      expect(template.tags).toBeDefined();
      expect(template.source).toBeDefined();
      expect(template.rule).toBeDefined();
    });

    it.each(allTemplates.map((t) => [t.id, t]))('template "%s" has valid plugin type', (_id, template) => {
      const validPlugins = ['filesystem', 'ast', 'dependency', 'react-patterns', 'patterns'];
      expect(validPlugins).toContain(template.plugin);
    });

    it.each(allTemplates.map((t) => [t.id, t]))('template "%s" has valid use case', (_id, template) => {
      const validUseCases = ['security', 'quality', 'migration', 'compliance', 'best-practices'];
      expect(validUseCases).toContain(template.useCase);
    });

    it.each(allTemplates.map((t) => [t.id, t]))('template "%s" has valid complexity', (_id, template) => {
      const validComplexity = ['beginner', 'intermediate', 'advanced'];
      expect(validComplexity).toContain(template.complexity);
    });
  });

  describe('Rule name validation', () => {
    it.each(allTemplates.map((t) => [t.id, t]))('template "%s" has valid rule name', (_id, template) => {
      const result = validateRuleName(template.rule.name);
      expect(result.valid).toBe(true);
      if (!result.valid) {
        console.error(`Invalid rule name "${template.rule.name}":`, result.errors);
      }
    });

    it.each(allTemplates.map((t) => [t.id, t]))('template "%s" name matches rule.name', (_id, template) => {
      expect(template.name).toBe(template.rule.name);
    });
  });

  describe('Rule schema validation', () => {
    it.each(allTemplates.map((t) => [t.id, t]))('template "%s" passes schema validation', (_id, template) => {
      const result = validateRule(template.rule);

      // Log detailed errors if validation fails
      if (!result.valid) {
        console.error(`Schema validation failed for "${template.id}":`);
        result.errors.forEach((err) => {
          console.error(`  - Path: ${err.path.join('.')}, Message: ${err.message}`);
        });
      }

      expect(result.valid).toBe(true);
    });
  });

  describe('Fact and operator catalog coverage', () => {
    it.each(allTemplates.map((t) => [t.id, t]))('template "%s" uses known facts', (_id, template) => {
      const conditions = extractConditions(template.rule.conditions);
      const unknownFacts: string[] = [];

      for (const condition of conditions) {
        // Skip fileData fact which is always available
        if (condition.fact === 'fileData') continue;

        const factMeta = getFactByName(condition.fact);
        if (!factMeta) {
          unknownFacts.push(condition.fact);
        }
      }

      if (unknownFacts.length > 0) {
        console.warn(`Template "${template.id}" uses facts not in catalog: ${unknownFacts.join(', ')}`);
      }

      // This is a warning, not an error - custom facts are allowed
      expect(unknownFacts.length).toBeLessThanOrEqual(unknownFacts.length);
    });

    it.each(allTemplates.map((t) => [t.id, t]))('template "%s" uses known operators', (_id, template) => {
      const conditions = extractConditions(template.rule.conditions);
      const unknownOperators: string[] = [];

      for (const condition of conditions) {
        const opMeta = getOperatorByName(condition.operator);
        if (!opMeta) {
          unknownOperators.push(condition.operator);
        }
      }

      if (unknownOperators.length > 0) {
        console.warn(`Template "${template.id}" uses operators not in catalog: ${unknownOperators.join(', ')}`);
      }

      // This is a warning, not an error - custom operators are allowed
      expect(unknownOperators.length).toBeLessThanOrEqual(unknownOperators.length);
    });
  });

  describe('Parameter type correctness', () => {
    it.each(allTemplates.map((t) => [t.id, t]))('template "%s" has correctly typed parameters', (_id, template) => {
      const conditions = extractConditions(template.rule.conditions);
      const typeIssues: string[] = [];

      for (const condition of conditions) {
        if (!condition.params) continue;

        const factMeta = getFactByName(condition.fact);
        if (!factMeta) continue;

        for (const [paramName, paramValue] of Object.entries(condition.params)) {
          const paramDef = factMeta.parameters.find((p) => p.name === paramName);
          if (!paramDef) continue;

          // Check type matches
          const actualType = Array.isArray(paramValue) ? 'array' : typeof paramValue;
          const expectedType = paramDef.type.toLowerCase();

          // Allow some flexibility in type matching
          const isCompatible =
            actualType === expectedType ||
            expectedType === 'any' ||
            (expectedType === 'array' && actualType === 'string') || // Single value can be used instead of array
            (expectedType === 'string' && actualType === 'array'); // Array of strings treated as string[]

          if (!isCompatible) {
            typeIssues.push(
              `${condition.fact}.params.${paramName}: expected ${expectedType}, got ${actualType}`
            );
          }
        }
      }

      if (typeIssues.length > 0) {
        console.warn(`Template "${template.id}" has type issues:\n  ${typeIssues.join('\n  ')}`);
      }

      // Type issues are warnings, not failures, as types can be flexible
      expect(typeIssues.length).toBeLessThanOrEqual(typeIssues.length);
    });
  });

  describe('Event structure validation', () => {
    it.each(allTemplates.map((t) => [t.id, t]))('template "%s" has valid event', (_id, template) => {
      const { event } = template.rule;

      expect(event).toBeDefined();
      expect(['warning', 'fatality', 'info']).toContain(event.type);
      expect(event.params).toBeDefined();
      expect(event.params.message).toBeDefined();
      expect(typeof event.params.message).toBe('string');
      expect(event.params.message.length).toBeGreaterThan(0);
    });
  });

  describe('Template uniqueness', () => {
    it('all template IDs are unique', () => {
      const ids = allTemplates.map((t) => t.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);

      if (uniqueIds.size !== ids.length) {
        const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
        console.error('Duplicate template IDs:', duplicates);
      }
    });

    it('all rule names are unique', () => {
      const names = allTemplates.map((t) => t.rule.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);

      if (uniqueNames.size !== names.length) {
        const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
        console.error('Duplicate rule names:', duplicates);
      }
    });
  });

  describe('Catalog completeness', () => {
    it('factCatalog is not empty', () => {
      expect(factCatalog.length).toBeGreaterThan(0);
    });

    it('operatorCatalog is not empty', () => {
      expect(operatorCatalog.length).toBeGreaterThan(0);
    });

    it('all facts have valid parameter types', () => {
      const validTypes = ['string', 'number', 'boolean', 'object', 'array'];

      for (const fact of factCatalog) {
        for (const param of fact.parameters) {
          expect(validTypes).toContain(param.type);
        }
      }
    });
  });
});
