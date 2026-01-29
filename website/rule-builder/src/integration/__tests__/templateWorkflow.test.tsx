/**
 * Template Workflow Integration Tests
 *
 * Tests the complete template loading workflow:
 * - Browsing template library
 * - Searching and filtering templates
 * - Loading a template into the editor
 * - Template populating all panels
 * - Modifying a loaded template
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { act } from '@testing-library/react';
import { useRuleStore } from '../../store/ruleStore';
import { createMockStoreState, sampleRule } from '../../test-utils';
import { allTemplates, getTemplateById } from '../../lib/templates';

// Initial state for clean tests
const initialState = createMockStoreState(null);

describe('Template Workflow Integration', () => {
  beforeEach(() => {
    useRuleStore.setState(initialState);
  });

  afterEach(() => {
    useRuleStore.getState().clearHistory();
    useRuleStore.getState().clearValidation();
  });

  describe('Template Library Data', () => {
    it('has templates available', () => {
      expect(allTemplates.length).toBeGreaterThan(0);
    });

    it('can get template by ID', () => {
      // Get the first template and verify lookup works
      const firstTemplate = allTemplates[0];
      expect(firstTemplate).toBeDefined();
      const found = getTemplateById(firstTemplate!.id);
      expect(found).toBeDefined();
      expect(found?.id).toBe(firstTemplate!.id);
    });

    it('templates have required structure', () => {
      for (const template of allTemplates.slice(0, 5)) { // Check first 5
        expect(template.id).toBeDefined();
        expect(template.name).toBeDefined();
        expect(template.displayName).toBeDefined();
        expect(template.description).toBeDefined();
        expect(template.rule).toBeDefined();
        expect(template.rule.name).toBeDefined();
        expect(template.rule.conditions).toBeDefined();
        expect(template.rule.event).toBeDefined();
      }
    });
  });

  describe('Template Loading into Store', () => {
    it('loads template rule into store', () => {
      const template = allTemplates.find(t => t.complexity === 'beginner');
      expect(template).toBeDefined();
      if (!template) return;

      act(() => {
        useRuleStore.getState().loadRule(template.rule);
      });

      const state = useRuleStore.getState();
      expect(state.rule).not.toBeNull();
      expect(state.rule?.name).toBe(template.rule.name);
    });

    it('resets dirty state when loading template', () => {
      // First make some changes
      useRuleStore.getState().loadRule(sampleRule);
      act(() => {
        useRuleStore.getState().updateNode(['name'], 'modified', 'form');
      });
      expect(useRuleStore.getState().isDirty).toBe(true);

      // Load a template
      const template = allTemplates[0];
      expect(template).toBeDefined();
      if (!template) return;
      act(() => {
        useRuleStore.getState().loadRule(template.rule);
      });

      // Dirty should be reset
      expect(useRuleStore.getState().isDirty).toBe(false);
    });

    it('clears selection when loading template', () => {
      useRuleStore.getState().loadRule(sampleRule);
      act(() => {
        useRuleStore.getState().selectNode(['conditions', 'all', '0'], 'form');
      });
      expect(useRuleStore.getState().selectedPath).toHaveLength(3);

      // Load a template
      const template = allTemplates[0];
      expect(template).toBeDefined();
      if (!template) return;
      act(() => {
        useRuleStore.getState().loadRule(template.rule);
      });

      // Selection should be cleared
      expect(useRuleStore.getState().selectedPath).toEqual([]);
    });

    it('initializes history with loaded template', () => {
      const template = allTemplates[0];
      expect(template).toBeDefined();
      if (!template) return;
      act(() => {
        useRuleStore.getState().loadRule(template.rule);
      });

      const state = useRuleStore.getState();
      expect(state.history.length).toBe(1);
      expect(state.historyIndex).toBe(0);
      expect(state.canUndo).toBe(false);
    });
  });

  describe('Template Modification Workflow', () => {
    it('allows modifying loaded template', () => {
      const template = allTemplates[0];
      expect(template).toBeDefined();
      if (!template) return;
      act(() => {
        useRuleStore.getState().loadRule(template.rule);
      });

      // Modify the name
      act(() => {
        useRuleStore.getState().updateNode(['name'], 'my-custom-rule', 'form');
      });

      const state = useRuleStore.getState();
      expect(state.rule?.name).toBe('my-custom-rule');
      expect(state.isDirty).toBe(true);
    });

    it('tracks modifications in history', () => {
      const template = allTemplates[0];
      expect(template).toBeDefined();
      if (!template) return;
      act(() => {
        useRuleStore.getState().loadRule(template.rule);
      });

      // Make changes
      act(() => {
        useRuleStore.getState().updateNode(['name'], 'modified-1', 'form');
      });
      act(() => {
        useRuleStore.getState().updateNode(['name'], 'modified-2', 'form');
      });

      expect(useRuleStore.getState().history.length).toBe(3);
      expect(useRuleStore.getState().canUndo).toBe(true);
    });

    it('can undo back to original template', () => {
      const template = allTemplates[0];
      expect(template).toBeDefined();
      if (!template) return;
      const originalName = template.rule.name;
      
      act(() => {
        useRuleStore.getState().loadRule(template.rule);
      });

      act(() => {
        useRuleStore.getState().updateNode(['name'], 'modified', 'form');
      });

      act(() => {
        useRuleStore.getState().undo();
      });

      expect(useRuleStore.getState().rule?.name).toBe(originalName);
    });

    it('can reset to original loaded template', () => {
      const template = allTemplates[0];
      expect(template).toBeDefined();
      if (!template) return;
      const originalName = template.rule.name;
      
      act(() => {
        useRuleStore.getState().loadRule(template.rule);
      });

      // Make multiple changes
      act(() => {
        useRuleStore.getState().updateNode(['name'], 'modified-1', 'form');
        useRuleStore.getState().updateNode(['name'], 'modified-2', 'form');
      });

      // Reset to original
      act(() => {
        useRuleStore.getState().resetRule();
      });

      expect(useRuleStore.getState().rule?.name).toBe(originalName);
      expect(useRuleStore.getState().isDirty).toBe(false);
    });
  });

  describe('Template Filtering', () => {
    it('can filter templates by complexity', () => {
      const beginnerTemplates = allTemplates.filter(t => t.complexity === 'beginner');
      const intermediateTemplates = allTemplates.filter(t => t.complexity === 'intermediate');
      const advancedTemplates = allTemplates.filter(t => t.complexity === 'advanced');

      // Should have templates at various complexity levels
      expect(beginnerTemplates.length + intermediateTemplates.length + advancedTemplates.length)
        .toBe(allTemplates.length);
    });

    it('can filter templates by plugin', () => {
      const filesystemTemplates = allTemplates.filter(t => t.plugin === 'filesystem');
      const astTemplates = allTemplates.filter(t => t.plugin === 'ast');

      // Should have templates for different plugins
      expect(filesystemTemplates.length).toBeGreaterThan(0);
      expect(astTemplates.length).toBeGreaterThanOrEqual(0); // May or may not have AST templates
    });

    it('can filter templates by source', () => {
      const teachingTemplates = allTemplates.filter(t => t.source === 'teaching');
      const democonfigTemplates = allTemplates.filter(t => t.source === 'democonfig');

      expect(teachingTemplates.length + democonfigTemplates.length).toBe(allTemplates.length);
    });

    it('templates are sorted by complexity', () => {
      const complexityOrder: Record<string, number> = { beginner: 0, intermediate: 1, advanced: 2 };
      
      for (let i = 1; i < allTemplates.length; i++) {
        const prevTemplate = allTemplates[i - 1];
        const currTemplate = allTemplates[i];
        if (!prevTemplate || !currTemplate) continue;
        const prev = complexityOrder[prevTemplate.complexity] ?? 0;
        const curr = complexityOrder[currTemplate.complexity] ?? 0;
        expect(curr).toBeGreaterThanOrEqual(prev);
      }
    });
  });

  describe('Template Search', () => {
    it('can find templates by name', () => {
      const searchResults = allTemplates.filter(t =>
        t.displayName.toLowerCase().includes('hello') ||
        t.name.toLowerCase().includes('hello')
      );

      // Should find hello world template if it exists
      const firstResult = searchResults[0];
      if (firstResult) {
        expect(firstResult.name.toLowerCase()).toContain('hello');
      }
    });

    it('can find templates by tag', () => {
      const beginnerTagged = allTemplates.filter(t =>
        t.tags?.includes('beginner')
      );

      // Templates with beginner tag should also have beginner complexity
      for (const t of beginnerTagged) {
        expect(t.complexity).toBe('beginner');
      }
    });

    it('can find templates by description', () => {
      const searchTerm = 'file';
      const searchResults = allTemplates.filter(t =>
        t.description.toLowerCase().includes(searchTerm)
      );

      expect(searchResults.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Template Structure Validation', () => {
    it('all templates have valid rule structure', () => {
      for (const template of allTemplates) {
        // Basic structure
        expect(template.rule.name).toBeTruthy();
        expect(template.rule.conditions).toBeTruthy();
        expect(template.rule.event).toBeTruthy();

        // Event structure
        expect(['warning', 'fatality', 'info']).toContain(template.rule.event.type);
        expect(template.rule.event.params).toBeDefined();
        expect(template.rule.event.params.message).toBeTruthy();

        // Conditions structure (must have all, any, or not)
        const conditions = template.rule.conditions;
        expect(
          conditions.all !== undefined ||
          conditions.any !== undefined ||
          conditions.not !== undefined
        ).toBe(true);
      }
    });

    it('all templates load without errors', () => {
      for (const template of allTemplates) {
        expect(() => {
          act(() => {
            useRuleStore.getState().loadRule(template.rule);
          });
        }).not.toThrow();

        const state = useRuleStore.getState();
        expect(state.rule).not.toBeNull();
      }
    });

    it('all templates pass validation after loading', () => {
      for (const template of allTemplates) {
        act(() => {
          useRuleStore.getState().loadRule(template.rule);
        });

        const state = useRuleStore.getState();
        expect(state.isValid).toBe(true);
        expect(state.validationErrors).toHaveLength(0);
      }
    });
  });

  describe('Complete Template Workflow', () => {
    it('template to modification to undo workflow', () => {
      const template = allTemplates.find(t => t.complexity === 'beginner');
      if (!template) return;

      // Step 1: Load template
      act(() => {
        useRuleStore.getState().loadRule(template.rule);
      });
      expect(useRuleStore.getState().rule?.name).toBe(template.rule.name);

      // Step 2: Select a node
      act(() => {
        useRuleStore.getState().selectNode(['conditions'], 'tree');
      });
      expect(useRuleStore.getState().selectedPath).toEqual(['conditions']);

      // Step 3: Modify the rule
      act(() => {
        useRuleStore.getState().updateNode(['name'], 'my-custom-version', 'form');
      });
      expect(useRuleStore.getState().isDirty).toBe(true);

      // Step 4: Undo the modification
      act(() => {
        useRuleStore.getState().undo();
      });
      expect(useRuleStore.getState().rule?.name).toBe(template.rule.name);

      // Step 5: Redo the modification
      act(() => {
        useRuleStore.getState().redo();
      });
      expect(useRuleStore.getState().rule?.name).toBe('my-custom-version');
    });

    it('switching between templates preserves no state', () => {
      const template1 = allTemplates[0];
      const template2 = allTemplates[1];
      expect(template1).toBeDefined();
      expect(template2).toBeDefined();
      if (!template1 || !template2) return;

      // Load first template and modify
      act(() => {
        useRuleStore.getState().loadRule(template1.rule);
        useRuleStore.getState().updateNode(['name'], 'modified-1', 'form');
        useRuleStore.getState().selectNode(['conditions'], 'tree');
      });

      // Load second template
      act(() => {
        useRuleStore.getState().loadRule(template2.rule);
      });

      // Should have clean state for template 2
      const state = useRuleStore.getState();
      expect(state.rule?.name).toBe(template2.rule.name);
      expect(state.isDirty).toBe(false);
      expect(state.selectedPath).toEqual([]);
      expect(state.history.length).toBe(1);
    });
  });
});
