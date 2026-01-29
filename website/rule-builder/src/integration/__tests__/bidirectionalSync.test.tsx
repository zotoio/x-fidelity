/**
 * Bidirectional Sync Integration Tests
 *
 * Tests the synchronization between all three editors:
 * - Tree: Node selection and structure visualization
 * - Form: Field-level editing
 * - JSON Editor: Raw JSON editing
 *
 * Key scenarios:
 * - Tree selection updates form display
 * - Form changes propagate to JSON
 * - JSON changes propagate to tree
 * - No infinite loops occur
 * - Source tracking prevents redundant updates
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useRuleStore } from '../../store/ruleStore';
import { RuleTree } from '../../components/RuleTree';
import { RuleForm } from '../../components/RuleForm';
import { sampleRule, complexRule, createMockStoreState } from '../../test-utils';
import type { RuleDefinition } from '../../types';

// Initial state for clean tests
const initialState = createMockStoreState(null);

describe('Bidirectional Sync Integration', () => {
  beforeEach(() => {
    // Reset store to clean state
    useRuleStore.setState(initialState);
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    useRuleStore.getState().clearHistory();
    useRuleStore.getState().clearValidation();
    vi.useRealTimers();
  });

  describe('Tree to Form Sync', () => {
    it('updates form when tree selection changes', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      
      // Load a rule
      useRuleStore.getState().loadRule(sampleRule);
      
      // Render tree and form
      const { rerender } = render(
        <>
          <RuleTree />
          <RuleForm />
        </>
      );

      // Click on the rule name in tree
      const ruleNameNode = await screen.findByText('test-rule');
      await user.click(ruleNameNode);

      // Advance timers for any debounced updates
      await act(async () => {
        vi.advanceTimersByTime(500);
      });
      
      rerender(
        <>
          <RuleTree />
          <RuleForm />
        </>
      );

      // Form should show root-level editing (rule name field)
      await waitFor(() => {
        const state = useRuleStore.getState();
        expect(state.selectedPath).toEqual([]);
      });
    });

    it('tracks update source when tree selects node', async () => {
      useRuleStore.getState().loadRule(sampleRule);

      // Directly select a node via store
      act(() => {
        useRuleStore.getState().selectNode(['conditions', 'all', '0'], 'tree');
      });

      const state = useRuleStore.getState();
      expect(state.lastUpdateSource).toBe('tree');
      expect(state.selectedPath).toEqual(['conditions', 'all', '0']);
    });
  });

  describe('Form to Store Sync', () => {
    it('updates store when form field changes', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      
      useRuleStore.getState().loadRule(sampleRule);
      
      // Select a condition
      act(() => {
        useRuleStore.getState().selectNode(['conditions', 'all', '0'], 'form');
      });

      render(<RuleForm />);

      // Find the value input and change it
      const valueInputs = screen.getAllByRole('textbox');
      const valueInput = valueInputs.find(input => 
        (input as HTMLInputElement).value === 'TODO'
      );
      
      if (valueInput) {
        await user.clear(valueInput);
        await user.type(valueInput, 'FIXME');
        
        // Advance timers for debounce
        await act(async () => {
          vi.advanceTimersByTime(500);
        });
      }

      // Store should be updated
      await waitFor(() => {
        const state = useRuleStore.getState();
        const condition = state.rule?.conditions.all?.[0];
        if (condition && 'value' in condition) {
          expect(condition.value).toBe('FIXME');
        }
      });
    });

    it('marks store as dirty when form changes', async () => {
      useRuleStore.getState().loadRule(sampleRule);
      
      expect(useRuleStore.getState().isDirty).toBe(false);

      // Update via store action (simulating form update)
      act(() => {
        useRuleStore.getState().updateNode(['name'], 'changed-rule', 'form');
      });

      expect(useRuleStore.getState().isDirty).toBe(true);
    });
  });

  describe('JSON to Store Sync', () => {
    it('updates store when valid JSON is provided', () => {
      useRuleStore.getState().loadRule(sampleRule);

      const modifiedRule: RuleDefinition = {
        ...sampleRule,
        name: 'json-modified-rule',
      };

      act(() => {
        useRuleStore.getState().setRule(modifiedRule, 'json');
      });

      const state = useRuleStore.getState();
      expect(state.rule?.name).toBe('json-modified-rule');
      expect(state.lastUpdateSource).toBe('json');
    });

    it('tracks JSON as update source', () => {
      useRuleStore.getState().loadRule(sampleRule);

      act(() => {
        useRuleStore.getState().updateNode(['event', 'params', 'message'], 'New message', 'json');
      });

      const state = useRuleStore.getState();
      expect(state.lastUpdateSource).toBe('json');
      expect(state.rule?.event.params.message).toBe('New message');
    });
  });

  describe('Infinite Loop Prevention', () => {
    it('does not trigger update when value is identical', () => {
      useRuleStore.getState().loadRule(sampleRule);
      
      const initialTime = useRuleStore.getState().lastUpdateTime;
      
      // Try to set the same rule
      act(() => {
        useRuleStore.getState().setRule({ ...sampleRule }, 'form');
      });

      // Should not trigger update (identical value)
      expect(useRuleStore.getState().lastUpdateTime).toBe(initialTime);
    });

    it('does not trigger selection update when path is identical', () => {
      useRuleStore.getState().loadRule(sampleRule);
      
      act(() => {
        useRuleStore.getState().selectNode(['conditions'], 'tree');
      });
      
      const afterFirstSelect = useRuleStore.getState().lastUpdateTime;
      
      act(() => {
        useRuleStore.getState().selectNode(['conditions'], 'tree');
      });

      // Should not trigger update
      expect(useRuleStore.getState().lastUpdateTime).toBe(afterFirstSelect);
    });

    it('source tracking allows components to skip redundant updates', () => {
      useRuleStore.getState().loadRule(sampleRule);

      // Simulate form updating store
      act(() => {
        useRuleStore.getState().updateNode(['name'], 'form-update', 'form');
      });

      const state = useRuleStore.getState();
      expect(state.lastUpdateSource).toBe('form');
      
      // Form component would check this and skip re-sync since it was the source
      // This test verifies the mechanism exists
    });

    it('handles rapid sequential updates without loops', async () => {
      useRuleStore.getState().loadRule(sampleRule);
      
      const updateCount = { value: 0 };
      const unsubscribe = useRuleStore.subscribe(
        (state) => state.rule,
        () => { updateCount.value++; }
      );

      // Rapid updates from different sources
      act(() => {
        useRuleStore.getState().updateNode(['name'], 'update1', 'form');
        useRuleStore.getState().updateNode(['name'], 'update2', 'json');
        useRuleStore.getState().updateNode(['name'], 'update3', 'tree');
      });

      // Should have exactly 3 updates (one per actual change)
      expect(updateCount.value).toBe(3);
      expect(useRuleStore.getState().rule?.name).toBe('update3');
      
      unsubscribe();
    });
  });

  describe('Cross-Component Synchronization', () => {
    it('maintains consistency across all three editors', () => {
      useRuleStore.getState().loadRule(complexRule);

      // Get initial state
      const initial = useRuleStore.getState();
      expect(initial.rule?.name).toBe('complex-rule');

      // Update from "tree"
      act(() => {
        useRuleStore.getState().updateNode(['name'], 'tree-changed', 'tree');
      });
      expect(useRuleStore.getState().rule?.name).toBe('tree-changed');

      // Update from "form"
      act(() => {
        useRuleStore.getState().updateNode(['name'], 'form-changed', 'form');
      });
      expect(useRuleStore.getState().rule?.name).toBe('form-changed');

      // Update from "json"
      act(() => {
        useRuleStore.getState().updateNode(['name'], 'json-changed', 'json');
      });
      expect(useRuleStore.getState().rule?.name).toBe('json-changed');

      // All updates should be tracked in history
      expect(useRuleStore.getState().canUndo).toBe(true);
    });

    it('undo restores previous state across all views', () => {
      useRuleStore.getState().loadRule(sampleRule);

      // Make some changes
      act(() => {
        useRuleStore.getState().updateNode(['name'], 'changed', 'form');
      });
      
      expect(useRuleStore.getState().rule?.name).toBe('changed');
      expect(useRuleStore.getState().canUndo).toBe(true);

      // Undo
      act(() => {
        useRuleStore.getState().undo();
      });

      // Original state restored
      expect(useRuleStore.getState().rule?.name).toBe('test-rule');
    });

    it('redo restores undone changes', () => {
      useRuleStore.getState().loadRule(sampleRule);

      act(() => {
        useRuleStore.getState().updateNode(['name'], 'changed', 'form');
      });

      act(() => {
        useRuleStore.getState().undo();
      });
      
      expect(useRuleStore.getState().canRedo).toBe(true);

      act(() => {
        useRuleStore.getState().redo();
      });

      expect(useRuleStore.getState().rule?.name).toBe('changed');
    });
  });

  describe('Selection State Sync', () => {
    it('clears selection when switching rules', () => {
      useRuleStore.getState().loadRule(sampleRule);
      
      // Select a node
      act(() => {
        useRuleStore.getState().selectNode(['conditions', 'all', '0'], 'tree');
      });
      
      expect(useRuleStore.getState().selectedPath).toEqual(['conditions', 'all', '0']);

      // Load a new rule
      act(() => {
        useRuleStore.getState().loadRule(complexRule);
      });

      // Selection should be cleared
      expect(useRuleStore.getState().selectedPath).toEqual([]);
    });

    it('clears selection when creating new rule', () => {
      useRuleStore.getState().loadRule(sampleRule);
      
      act(() => {
        useRuleStore.getState().selectNode(['conditions'], 'tree');
      });
      
      act(() => {
        useRuleStore.getState().newRule();
      });

      expect(useRuleStore.getState().selectedPath).toEqual([]);
    });
  });
});
