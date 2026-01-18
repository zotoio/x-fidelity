/**
 * TreeNode Component Tests
 *
 * Tests for the TreeNode component including:
 * - Rendering different node types
 * - Selection state
 * - Expand/collapse behavior
 * - Error display
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { TreeNode } from '../TreeNode';
import type { TreeNode as TreeNodeData } from '../../../store/ruleStore';

// Mock node data
const mockConditionNode: TreeNodeData = {
  id: 'condition-1',
  path: ['conditions', 'all', '0'],
  type: 'condition',
  label: 'fileContent contains "test"',
  children: [],
  data: {
    fact: 'fileContent',
    operator: 'contains',
    value: 'test',
  },
};

const mockGroupNode: TreeNodeData = {
  id: 'group-1',
  path: ['conditions', 'all', '1'],
  type: 'condition-group',
  label: 'ANY',
  children: [
    {
      id: 'condition-2',
      path: ['conditions', 'all', '1', 'any', '0'],
      type: 'condition',
      label: 'dependency',
      children: [],
      data: {
        fact: 'dependency',
        operator: 'versionSatisfies',
        value: '^1.0.0',
      },
    },
  ],
  data: {
    any: [],
  },
};

describe('TreeNode', () => {
  const defaultProps = {
    selectedPath: [] as string[],
    expandedPaths: new Set<string>(),
    validationErrors: new Map<string, string[]>(),
    onSelect: vi.fn(),
    onToggle: vi.fn(),
    onContextAction: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render a condition node with fact name', () => {
      render(<TreeNode node={mockConditionNode} {...defaultProps} />);

      expect(screen.getByText('fileContent')).toBeInTheDocument();
    });

    it('should render condition preview text', () => {
      render(<TreeNode node={mockConditionNode} {...defaultProps} />);

      expect(screen.getByText(/contains "test"/)).toBeInTheDocument();
    });

    it('should render a condition group node with label', () => {
      const expandedPaths = new Set(['conditions.all.1']);
      render(
        <TreeNode
          node={mockGroupNode}
          {...defaultProps}
          expandedPaths={expandedPaths}
        />
      );

      expect(screen.getByText('ANY')).toBeInTheDocument();
    });

    it('should render children when expanded', () => {
      const expandedPaths = new Set(['conditions.all.1']);
      render(
        <TreeNode
          node={mockGroupNode}
          {...defaultProps}
          expandedPaths={expandedPaths}
        />
      );

      expect(screen.getByText('dependency')).toBeInTheDocument();
    });

    it('should not render children when collapsed', () => {
      render(<TreeNode node={mockGroupNode} {...defaultProps} />);

      // Child should not be visible
      expect(screen.queryByText('dependency')).not.toBeInTheDocument();
    });

    it('should render expand button for nodes with children', () => {
      render(<TreeNode node={mockGroupNode} {...defaultProps} />);

      const expandButton = screen.getByRole('button', { name: /expand/i });
      expect(expandButton).toBeInTheDocument();
    });

    it('should not render expand button for leaf nodes', () => {
      render(<TreeNode node={mockConditionNode} {...defaultProps} />);

      expect(screen.queryByRole('button', { name: /expand/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /collapse/i })).not.toBeInTheDocument();
    });
  });

  describe('Selection', () => {
    it('should call onSelect when clicked', async () => {
      const onSelect = vi.fn();
      const user = userEvent.setup();

      render(<TreeNode node={mockConditionNode} {...defaultProps} onSelect={onSelect} />);

      const nodeElement = screen.getByText('fileContent');
      await user.click(nodeElement);

      expect(onSelect).toHaveBeenCalledWith(['conditions', 'all', '0']);
    });

    it('should have selected class when path matches', () => {
      render(
        <TreeNode
          node={mockConditionNode}
          {...defaultProps}
          selectedPath={['conditions', 'all', '0']}
        />
      );

      const nodeElement = screen.getByTestId('tree-node-conditions.all.0');
      const treeItem = nodeElement.querySelector('[role="treeitem"]');
      // CSS modules hash class names, so check for pattern match
      expect(treeItem?.className).toMatch(/selected/);
    });

    it('should not have selected class when path does not match', () => {
      render(
        <TreeNode
          node={mockConditionNode}
          {...defaultProps}
          selectedPath={['conditions', 'all', '1']}
        />
      );

      const nodeElement = screen.getByTestId('tree-node-conditions.all.0');
      const treeItem = nodeElement.querySelector('[role="treeitem"]');
      // CSS modules hash class names, so check for pattern match
      expect(treeItem?.className).not.toMatch(/selected/);
    });
  });

  describe('Expand/Collapse', () => {
    it('should call onToggle when expand button is clicked', async () => {
      const onToggle = vi.fn();
      const user = userEvent.setup();

      render(<TreeNode node={mockGroupNode} {...defaultProps} onToggle={onToggle} />);

      const expandButton = screen.getByRole('button', { name: /expand/i });
      await user.click(expandButton);

      expect(onToggle).toHaveBeenCalledWith('conditions.all.1');
    });

    it('should show collapse button when expanded', () => {
      const expandedPaths = new Set(['conditions.all.1']);
      render(
        <TreeNode
          node={mockGroupNode}
          {...defaultProps}
          expandedPaths={expandedPaths}
        />
      );

      expect(screen.getByRole('button', { name: /collapse/i })).toBeInTheDocument();
    });
  });

  describe('Validation Errors', () => {
    it('should display validation errors when present', () => {
      const validationErrors = new Map([
        ['conditions.all.0', ['Missing value']],
      ]);

      render(
        <TreeNode
          node={mockConditionNode}
          {...defaultProps}
          validationErrors={validationErrors}
        />
      );

      expect(screen.getByText('Missing value')).toBeInTheDocument();
    });

    it('should have error class when node has errors', () => {
      const validationErrors = new Map([
        ['conditions.all.0', ['Missing value']],
      ]);

      render(
        <TreeNode
          node={mockConditionNode}
          {...defaultProps}
          validationErrors={validationErrors}
        />
      );

      const nodeElement = screen.getByTestId('tree-node-conditions.all.0');
      const treeItem = nodeElement.querySelector('[role="treeitem"]');
      // CSS modules hash class names, so check for pattern match
      expect(treeItem?.className).toMatch(/hasError/);
    });

    it('should display multiple errors', () => {
      const validationErrors = new Map([
        ['conditions.all.0', ['Missing value', 'Invalid operator']],
      ]);

      render(
        <TreeNode
          node={mockConditionNode}
          {...defaultProps}
          validationErrors={validationErrors}
        />
      );

      expect(screen.getByText('Missing value')).toBeInTheDocument();
      expect(screen.getByText('Invalid operator')).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should call onSelect on Enter key', async () => {
      const onSelect = vi.fn();
      const user = userEvent.setup();

      render(<TreeNode node={mockConditionNode} {...defaultProps} onSelect={onSelect} />);

      const treeItem = screen.getByRole('treeitem');
      treeItem.focus();
      await user.keyboard('{Enter}');

      expect(onSelect).toHaveBeenCalledWith(['conditions', 'all', '0']);
    });

    it('should call onSelect on Space key', async () => {
      const onSelect = vi.fn();
      const user = userEvent.setup();

      render(<TreeNode node={mockConditionNode} {...defaultProps} onSelect={onSelect} />);

      const treeItem = screen.getByRole('treeitem');
      treeItem.focus();
      await user.keyboard('{ }');

      expect(onSelect).toHaveBeenCalledWith(['conditions', 'all', '0']);
    });

    it('should call onToggle on ArrowRight when collapsed with children', async () => {
      const onToggle = vi.fn();
      const user = userEvent.setup();

      render(<TreeNode node={mockGroupNode} {...defaultProps} onToggle={onToggle} />);

      const treeItem = screen.getByRole('treeitem');
      treeItem.focus();
      await user.keyboard('{ArrowRight}');

      expect(onToggle).toHaveBeenCalledWith('conditions.all.1');
    });

    it('should call onToggle on ArrowLeft when expanded with children', async () => {
      const onToggle = vi.fn();
      const expandedPaths = new Set(['conditions.all.1']);
      const user = userEvent.setup();

      render(
        <TreeNode
          node={mockGroupNode}
          {...defaultProps}
          onToggle={onToggle}
          expandedPaths={expandedPaths}
        />
      );

      const treeItem = screen.getByText('ANY').closest('[role="treeitem"]') as HTMLElement;
      treeItem.focus();
      await user.keyboard('{ArrowLeft}');

      expect(onToggle).toHaveBeenCalledWith('conditions.all.1');
    });
  });

  describe('Accessibility', () => {
    it('should have treeitem role', () => {
      render(<TreeNode node={mockConditionNode} {...defaultProps} />);

      expect(screen.getByRole('treeitem')).toBeInTheDocument();
    });

    it('should have aria-selected attribute', () => {
      render(
        <TreeNode
          node={mockConditionNode}
          {...defaultProps}
          selectedPath={['conditions', 'all', '0']}
        />
      );

      const treeItem = screen.getByRole('treeitem');
      expect(treeItem).toHaveAttribute('aria-selected', 'true');
    });

    it('should have aria-expanded attribute for expandable nodes', () => {
      render(<TreeNode node={mockGroupNode} {...defaultProps} />);

      const treeItem = screen.getByRole('treeitem');
      expect(treeItem).toHaveAttribute('aria-expanded', 'false');
    });

    it('should have aria-level attribute', () => {
      render(<TreeNode node={mockConditionNode} {...defaultProps} level={2} />);

      const treeItem = screen.getByRole('treeitem');
      expect(treeItem).toHaveAttribute('aria-level', '3');
    });

    it('should be focusable', () => {
      render(<TreeNode node={mockConditionNode} {...defaultProps} />);

      const treeItem = screen.getByRole('treeitem');
      expect(treeItem).toHaveAttribute('tabIndex', '0');
    });
  });
});
