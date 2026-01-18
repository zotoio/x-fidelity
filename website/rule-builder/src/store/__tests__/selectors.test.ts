/**
 * Unit tests for store selectors
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useRuleStore } from '../ruleStore';
import {
  selectRule,
  selectSelectedPath,
  selectSelectedNode,
  selectTreeStructure,
  selectRuleJson,
  selectRuleName,
  selectCanUndo,
  selectCanRedo,
  selectIsDirty,
  selectIsValid,
} from '../selectors';
import type { RuleDefinition } from '../../types';

const sampleRule: RuleDefinition = {
  name: 'test-rule',
  conditions: {
    all: [
      {
        fact: 'fileContent',
        operator: 'contains',
        value: 'TODO',
      },
      {
        any: [
          {
            fact: 'fileName',
            operator: 'contains',
            value: '.ts',
          },
        ],
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

describe('selectors', () => {
  beforeEach(() => {
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

  describe('selectRule', () => {
    it('should return null when no rule is loaded', () => {
      const state = useRuleStore.getState();
      expect(selectRule(state)).toBeNull();
    });

    it('should return the loaded rule', () => {
      useRuleStore.getState().loadRule(sampleRule);
      const state = useRuleStore.getState();
      expect(selectRule(state)).toEqual(sampleRule);
    });
  });

  describe('selectSelectedPath', () => {
    it('should return empty array when nothing selected', () => {
      const state = useRuleStore.getState();
      expect(selectSelectedPath(state)).toEqual([]);
    });

    it('should return the selected path', () => {
      useRuleStore.getState().loadRule(sampleRule);
      useRuleStore.getState().selectNode(['conditions', 'all', '0'], 'tree');
      const state = useRuleStore.getState();
      expect(selectSelectedPath(state)).toEqual(['conditions', 'all', '0']);
    });
  });

  describe('selectSelectedNode', () => {
    it('should return the rule when no path selected', () => {
      useRuleStore.getState().loadRule(sampleRule);
      const state = useRuleStore.getState();
      expect(selectSelectedNode(state)).toEqual(sampleRule);
    });

    it('should return the node at the selected path', () => {
      useRuleStore.getState().loadRule(sampleRule);
      useRuleStore.getState().selectNode(['conditions', 'all', '0'], 'tree');
      const state = useRuleStore.getState();
      const node = selectSelectedNode(state);
      expect(node).toEqual(sampleRule.conditions.all?.[0]);
    });
  });

  describe('selectTreeStructure', () => {
    it('should return empty array when no rule loaded', () => {
      const state = useRuleStore.getState();
      expect(selectTreeStructure(state)).toEqual([]);
    });

    it('should build tree structure from rule', () => {
      useRuleStore.getState().loadRule(sampleRule);
      const state = useRuleStore.getState();
      const tree = selectTreeStructure(state);
      
      expect(tree.length).toBe(1);
      expect(tree[0]?.type).toBe('rule');
      expect(tree[0]?.label).toBe('test-rule');
      expect(tree[0]?.children.length).toBe(2); // conditions and event
    });

    it('should include condition children', () => {
      useRuleStore.getState().loadRule(sampleRule);
      const state = useRuleStore.getState();
      const tree = selectTreeStructure(state);
      
      const conditionsNode = tree[0]?.children[0];
      expect(conditionsNode?.type).toBe('conditions');
      expect(conditionsNode?.children.length).toBe(1); // Single root ALL group
      
      // The ALL group should have the two conditions
      const rootAllGroup = conditionsNode?.children[0];
      expect(rootAllGroup?.type).toBe('condition-group');
      expect(rootAllGroup?.label).toBe('ALL');
      expect(rootAllGroup?.children.length).toBe(2); // Two conditions inside ALL
    });
  });

  describe('selectRuleJson', () => {
    it('should return empty string when no rule loaded', () => {
      const state = useRuleStore.getState();
      expect(selectRuleJson(state)).toBe('');
    });

    it('should return formatted JSON', () => {
      useRuleStore.getState().loadRule(sampleRule);
      const state = useRuleStore.getState();
      const json = selectRuleJson(state);
      
      expect(json).toBe(JSON.stringify(sampleRule, null, 2));
    });
  });

  describe('selectRuleName', () => {
    it('should return empty string when no rule loaded', () => {
      const state = useRuleStore.getState();
      expect(selectRuleName(state)).toBe('');
    });

    it('should return the rule name', () => {
      useRuleStore.getState().loadRule(sampleRule);
      const state = useRuleStore.getState();
      expect(selectRuleName(state)).toBe('test-rule');
    });
  });

  describe('selectCanUndo/selectCanRedo', () => {
    it('should return false initially', () => {
      const state = useRuleStore.getState();
      expect(selectCanUndo(state)).toBe(false);
      expect(selectCanRedo(state)).toBe(false);
    });

    it('should update after changes', () => {
      useRuleStore.getState().loadRule(sampleRule);
      useRuleStore.getState().updateNode(['name'], 'modified', 'form');
      
      const state = useRuleStore.getState();
      expect(selectCanUndo(state)).toBe(true);
      expect(selectCanRedo(state)).toBe(false);
    });
  });

  describe('selectIsDirty', () => {
    it('should return false initially', () => {
      const state = useRuleStore.getState();
      expect(selectIsDirty(state)).toBe(false);
    });

    it('should return true after changes', () => {
      useRuleStore.getState().loadRule(sampleRule);
      useRuleStore.getState().updateNode(['name'], 'modified', 'form');
      
      const state = useRuleStore.getState();
      expect(selectIsDirty(state)).toBe(true);
    });
  });

  describe('selectIsValid', () => {
    it('should return true initially', () => {
      const state = useRuleStore.getState();
      expect(selectIsValid(state)).toBe(true);
    });
  });
});
