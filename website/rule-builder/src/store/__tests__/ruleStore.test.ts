/**
 * Unit tests for the Rule Store
 * 
 * Tests core functionality including:
 * - Rule loading and setting
 * - Node updates
 * - History (undo/redo)
 * - Validation
 * - Source tracking to prevent infinite loops
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useRuleStore } from '../ruleStore';
import type { RuleDefinition } from '../../types';

// Sample rule for testing
const sampleRule: RuleDefinition = {
  name: 'test-rule',
  conditions: {
    all: [
      {
        fact: 'fileContent',
        operator: 'contains',
        value: 'TODO',
      },
    ],
  },
  event: {
    type: 'warning',
    params: {
      message: 'Test warning',
    },
  },
};

describe('ruleStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useRuleStore.setState({
      rule: null,
      originalRule: null,
      selectedPath: [],
      isDirty: false,
      isSaving: false,
      lastUpdateSource: null,
      lastUpdateTime: 0,
      expandedPaths: new Set(['conditions']),
      history: [],
      historyIndex: -1,
      canUndo: false,
      canRedo: false,
      validationErrors: [],
      isValidating: false,
      isValid: true,
      lastValidatedAt: null,
    });
  });

  afterEach(() => {
    // Clean up
    useRuleStore.getState().clearHistory();
    useRuleStore.getState().clearValidation();
  });

  describe('loadRule', () => {
    it('should load a rule and reset dirty state', () => {
      const store = useRuleStore.getState();
      store.loadRule(sampleRule);
      
      const state = useRuleStore.getState();
      expect(state.rule).toEqual(sampleRule);
      expect(state.originalRule).toEqual(sampleRule);
      expect(state.isDirty).toBe(false);
      expect(state.selectedPath).toEqual([]);
    });

    it('should initialize history with the loaded rule', () => {
      const store = useRuleStore.getState();
      store.loadRule(sampleRule);
      
      const state = useRuleStore.getState();
      expect(state.history.length).toBe(1);
      expect(state.historyIndex).toBe(0);
      expect(state.canUndo).toBe(false);
      expect(state.canRedo).toBe(false);
    });
  });

  describe('newRule', () => {
    it('should create a new default rule', () => {
      const store = useRuleStore.getState();
      store.newRule();
      
      const state = useRuleStore.getState();
      expect(state.rule).not.toBeNull();
      expect(state.rule?.name).toBe('mySampleRule-iterative');
      expect(state.isDirty).toBe(false);
    });
  });

  describe('setRule', () => {
    it('should set a rule and mark as dirty', () => {
      const store = useRuleStore.getState();
      store.loadRule(sampleRule);
      
      const modifiedRule = { ...sampleRule, name: 'modified-rule' };
      store.setRule(modifiedRule, 'form');
      
      const state = useRuleStore.getState();
      expect(state.rule?.name).toBe('modified-rule');
      expect(state.isDirty).toBe(true);
    });

    it('should track update source', () => {
      const store = useRuleStore.getState();
      store.loadRule(sampleRule);
      
      const modifiedRule = { ...sampleRule, name: 'modified-rule' };
      store.setRule(modifiedRule, 'json');
      
      const state = useRuleStore.getState();
      expect(state.lastUpdateSource).toBe('json');
    });

    it('should not update if rule is identical', () => {
      const store = useRuleStore.getState();
      store.loadRule(sampleRule);
      
      const timeBefore = useRuleStore.getState().lastUpdateTime;
      store.setRule({ ...sampleRule }, 'form');
      
      // Same rule should not trigger an update
      const state = useRuleStore.getState();
      expect(state.lastUpdateTime).toBe(timeBefore);
    });
  });

  describe('updateNode', () => {
    it('should update a node at a specific path', () => {
      const store = useRuleStore.getState();
      store.loadRule(sampleRule);
      
      store.updateNode(['name'], 'updated-rule', 'form');
      
      const state = useRuleStore.getState();
      expect(state.rule?.name).toBe('updated-rule');
      expect(state.isDirty).toBe(true);
    });

    it('should update nested nodes', () => {
      const store = useRuleStore.getState();
      store.loadRule(sampleRule);
      
      store.updateNode(['conditions', 'all', '0', 'value'], 'FIXME', 'form');
      
      const state = useRuleStore.getState();
      const condition = state.rule?.conditions.all?.[0];
      expect(condition).toBeDefined();
      if (condition && 'value' in condition) {
        expect(condition.value).toBe('FIXME');
      }
    });

    it('should not update if value is identical', () => {
      const store = useRuleStore.getState();
      store.loadRule(sampleRule);
      
      const historyBefore = useRuleStore.getState().history.length;
      store.updateNode(['name'], 'test-rule', 'form'); // Same value
      
      const state = useRuleStore.getState();
      expect(state.history.length).toBe(historyBefore);
    });
  });

  describe('selectNode', () => {
    it('should select a node by path', () => {
      const store = useRuleStore.getState();
      store.loadRule(sampleRule);
      
      store.selectNode(['conditions', 'all', '0'], 'tree');
      
      const state = useRuleStore.getState();
      expect(state.selectedPath).toEqual(['conditions', 'all', '0']);
      expect(state.lastUpdateSource).toBe('tree');
    });

    it('should not update if path is identical', () => {
      const store = useRuleStore.getState();
      store.loadRule(sampleRule);
      
      store.selectNode(['conditions'], 'tree');
      const timeBefore = useRuleStore.getState().lastUpdateTime;
      
      store.selectNode(['conditions'], 'tree'); // Same path
      
      const state = useRuleStore.getState();
      expect(state.lastUpdateTime).toBe(timeBefore);
    });

    it('should clear selection', () => {
      const store = useRuleStore.getState();
      store.loadRule(sampleRule);
      store.selectNode(['conditions'], 'tree');
      
      store.clearSelection();
      
      const state = useRuleStore.getState();
      expect(state.selectedPath).toEqual([]);
    });
  });

  describe('undo/redo', () => {
    it('should undo a change', () => {
      const store = useRuleStore.getState();
      store.loadRule(sampleRule);
      
      store.updateNode(['name'], 'modified-rule', 'form');
      expect(useRuleStore.getState().rule?.name).toBe('modified-rule');
      expect(useRuleStore.getState().canUndo).toBe(true);
      
      store.undo();
      
      const state = useRuleStore.getState();
      expect(state.rule?.name).toBe('test-rule');
      expect(state.canRedo).toBe(true);
    });

    it('should redo an undone change', () => {
      const store = useRuleStore.getState();
      store.loadRule(sampleRule);
      
      store.updateNode(['name'], 'modified-rule', 'form');
      store.undo();
      expect(useRuleStore.getState().rule?.name).toBe('test-rule');
      
      store.redo();
      
      const state = useRuleStore.getState();
      expect(state.rule?.name).toBe('modified-rule');
    });

    it('should clear redo history on new change', () => {
      const store = useRuleStore.getState();
      store.loadRule(sampleRule);
      
      store.updateNode(['name'], 'first-change', 'form');
      store.undo();
      
      // Make a new change instead of redo
      store.updateNode(['name'], 'second-change', 'form');
      
      const state = useRuleStore.getState();
      expect(state.canRedo).toBe(false);
    });
  });

  describe('tree expansion', () => {
    it('should toggle expanded state', () => {
      const store = useRuleStore.getState();
      
      expect(useRuleStore.getState().expandedPaths.has('conditions')).toBe(true);
      
      store.toggleExpanded('conditions');
      expect(useRuleStore.getState().expandedPaths.has('conditions')).toBe(false);
      
      store.toggleExpanded('conditions');
      expect(useRuleStore.getState().expandedPaths.has('conditions')).toBe(true);
    });

    it('should expand all paths', () => {
      const store = useRuleStore.getState();
      store.loadRule(sampleRule);
      
      store.expandAll();
      
      const state = useRuleStore.getState();
      expect(state.expandedPaths.size).toBeGreaterThan(1);
    });

    it('should collapse all paths', () => {
      const store = useRuleStore.getState();
      store.loadRule(sampleRule);
      store.expandAll();
      
      store.collapseAll();
      
      const state = useRuleStore.getState();
      expect(state.expandedPaths.has('conditions')).toBe(true);
      expect(state.expandedPaths.size).toBe(1);
    });
  });

  describe('save state', () => {
    it('should mark as saved', () => {
      const store = useRuleStore.getState();
      store.loadRule(sampleRule);
      store.updateNode(['name'], 'modified', 'form');
      
      expect(useRuleStore.getState().isDirty).toBe(true);
      
      store.markSaved();
      
      const state = useRuleStore.getState();
      expect(state.isDirty).toBe(false);
      expect(state.originalRule?.name).toBe('modified');
    });

    it('should track saving state', () => {
      const store = useRuleStore.getState();
      
      store.setSaving(true);
      expect(useRuleStore.getState().isSaving).toBe(true);
      
      store.setSaving(false);
      expect(useRuleStore.getState().isSaving).toBe(false);
    });
  });
});
