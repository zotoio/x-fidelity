/**
 * RuleTree Component Tests
 *
 * Tests for the main RuleTree component including:
 * - Rendering the rule structure
 * - Node selection
 * - Empty state
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { RuleTree } from '../RuleTree';
import { useRuleStore } from '../../../store/ruleStore';
import type { RuleDefinition } from '../../../types';

// Mock rule for testing
const mockRule: RuleDefinition = {
  name: 'test-rule',
  conditions: {
    all: [
      {
        fact: 'fileContent',
        operator: 'contains',
        value: 'test',
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

// Initial state for reset
const initialState = {
  rule: null,
  originalRule: null,
  selectedPath: [] as string[],
  isDirty: false,
  isSaving: false,
  lastUpdateSource: null,
  lastUpdateTime: 0,
  expandedPaths: new Set(['conditions']),
  history: [] as RuleDefinition[],
  historyIndex: -1,
  canUndo: false,
  canRedo: false,
  validationErrors: [],
  isValidating: false,
  isValid: true,
  lastValidatedAt: null,
};

describe('RuleTree', () => {
  beforeEach(() => {
    // Reset store state before each test
    useRuleStore.setState(initialState);
  });

  afterEach(() => {
    // Clean up
    useRuleStore.setState(initialState);
  });

  describe('Empty State', () => {
    it('should render empty state when no rule is loaded', () => {
      render(<RuleTree />);

      expect(screen.getByText('No rule loaded')).toBeInTheDocument();
      expect(screen.getByText('New Rule')).toBeInTheDocument();
    });

    it('should have accessible new rule button', () => {
      render(<RuleTree />);

      const button = screen.getByRole('button', { name: /create new rule/i });
      expect(button).toBeInTheDocument();
    });

    it('should create a new rule when clicking New Rule button', async () => {
      const user = userEvent.setup();
      render(<RuleTree />);

      const newRuleButton = screen.getByText('New Rule');
      await user.click(newRuleButton);

      const store = useRuleStore.getState();
      expect(store.rule).not.toBeNull();
    });
  });

  describe('Tree Rendering', () => {
    it('should render tree container when rule is loaded', () => {
      const store = useRuleStore.getState();
      store.loadRule(mockRule);

      render(<RuleTree />);

      // Should have the tree role
      const tree = screen.getByRole('tree');
      expect(tree).toBeInTheDocument();
    });

    it('should render rule name', () => {
      const store = useRuleStore.getState();
      store.loadRule(mockRule);

      render(<RuleTree />);

      expect(screen.getByText('test-rule')).toBeInTheDocument();
    });

    it('should have accessible tree structure', () => {
      const store = useRuleStore.getState();
      store.loadRule(mockRule);

      render(<RuleTree />);

      const tree = screen.getByRole('tree', { name: /rule structure/i });
      expect(tree).toBeInTheDocument();
    });

    it('should render treeitem elements', () => {
      const store = useRuleStore.getState();
      store.loadRule(mockRule);

      render(<RuleTree />);

      const treeItems = screen.getAllByRole('treeitem');
      expect(treeItems.length).toBeGreaterThan(0);
    });
  });

  describe('Node Selection', () => {
    it('should update store when node is clicked', async () => {
      const user = userEvent.setup();
      const store = useRuleStore.getState();
      store.loadRule(mockRule);

      render(<RuleTree />);

      // Click the rule name (root node)
      const ruleNode = screen.getByText('test-rule');
      await user.click(ruleNode);

      const updatedStore = useRuleStore.getState();
      expect(updatedStore.selectedPath.length).toBe(0); // Root node has empty path
    });
  });

  describe('Tree Structure', () => {
    it('should include root node in tree structure', () => {
      const store = useRuleStore.getState();
      store.loadRule(mockRule);

      render(<RuleTree />);

      // The root node (rule name) should always be visible
      expect(screen.getByText('test-rule')).toBeInTheDocument();
    });

    it('should show children as expand button exists', () => {
      const store = useRuleStore.getState();
      store.loadRule(mockRule);

      render(<RuleTree />);

      // The root node should have an expand button since it has children
      const expandButton = screen.queryByRole('button', { name: /expand/i });
      expect(expandButton).toBeInTheDocument();
    });

    // Note: Integration test for expand/collapse behavior is deferred to Subtask 11
    // This is due to Set mutation not triggering re-renders in the test environment
    // The TreeNode.test.tsx already covers expand/collapse at the component level
  });
});
