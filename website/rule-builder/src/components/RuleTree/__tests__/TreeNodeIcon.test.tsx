/**
 * TreeNodeIcon Component Tests
 *
 * Tests for the TreeNodeIcon component including:
 * - Rendering correct icons for each node type
 * - getGroupTypeFromLabel helper function
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TreeNodeIcon, getGroupTypeFromLabel } from '../TreeNodeIcon';

describe('TreeNodeIcon', () => {
  describe('Icon Rendering', () => {
    it('should render root icon for root type', () => {
      render(<TreeNodeIcon type="root" />);
      expect(screen.getByLabelText('Rule')).toBeInTheDocument();
    });

    it('should render rule icon for rule type', () => {
      render(<TreeNodeIcon type="rule" />);
      expect(screen.getByLabelText('Rule')).toBeInTheDocument();
    });

    it('should render conditions icon for conditions type', () => {
      render(<TreeNodeIcon type="conditions" />);
      expect(screen.getByLabelText('Conditions')).toBeInTheDocument();
    });

    it('should render AND symbol for all type', () => {
      render(<TreeNodeIcon type="all" />);
      expect(screen.getByText('∧')).toBeInTheDocument();
    });

    it('should render OR symbol for any type', () => {
      render(<TreeNodeIcon type="any" />);
      expect(screen.getByText('∨')).toBeInTheDocument();
    });

    it('should render NOT symbol for not type', () => {
      render(<TreeNodeIcon type="not" />);
      expect(screen.getByText('¬')).toBeInTheDocument();
    });

    it('should render condition icon for condition type', () => {
      render(<TreeNodeIcon type="condition" />);
      expect(screen.getByLabelText('Condition')).toBeInTheDocument();
    });

    it('should render event icon for event type', () => {
      render(<TreeNodeIcon type="event" />);
      expect(screen.getByLabelText('Event')).toBeInTheDocument();
    });

    it('should render default icon for condition-group type', () => {
      render(<TreeNodeIcon type="condition-group" />);
      // condition-group defaults to 'all' style (AND symbol)
      expect(screen.getByText('∧')).toBeInTheDocument();
    });
  });

  describe('Custom Classes', () => {
    it('should apply custom className', () => {
      const { container } = render(<TreeNodeIcon type="root" className="custom-class" />);
      const icon = container.querySelector('.custom-class');
      expect(icon).toBeInTheDocument();
    });
  });
});

describe('getGroupTypeFromLabel', () => {
  it('should return all for ALL label', () => {
    expect(getGroupTypeFromLabel('ALL')).toBe('all');
  });

  it('should return all for All label (case insensitive)', () => {
    expect(getGroupTypeFromLabel('All')).toBe('all');
  });

  it('should return any for ANY label', () => {
    expect(getGroupTypeFromLabel('ANY')).toBe('any');
  });

  it('should return any for Any label (case insensitive)', () => {
    expect(getGroupTypeFromLabel('Any')).toBe('any');
  });

  it('should return not for NOT label', () => {
    expect(getGroupTypeFromLabel('NOT')).toBe('not');
  });

  it('should return not for Not label (case insensitive)', () => {
    expect(getGroupTypeFromLabel('Not')).toBe('not');
  });

  it('should return all as default for unknown label', () => {
    expect(getGroupTypeFromLabel('Unknown')).toBe('all');
  });

  it('should handle labels with prefixes', () => {
    expect(getGroupTypeFromLabel('ALL (2 conditions)')).toBe('all');
    expect(getGroupTypeFromLabel('ANY (3 conditions)')).toBe('any');
    expect(getGroupTypeFromLabel('NOT condition')).toBe('not');
  });
});
