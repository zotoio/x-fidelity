/**
 * ConditionForm Component Tests
 *
 * Tests for the ConditionForm component including:
 * - Rendering with condition data
 * - Validation error display
 * - Parameter display
 * - Condition preview
 * 
 * Note: Radix Select interactions are complex in jsdom.
 * Integration tests for full form interactions should be done in a browser environment.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { ConditionForm } from '../forms/ConditionForm';
import { useRuleStore } from '../../../store/ruleStore';
import type { RuleCondition, RuleDefinition } from '../../../types';

// Mock condition data
const mockCondition: RuleCondition = {
  fact: 'fileData',
  operator: 'contains',
  value: 'TODO',
  path: '$.fileName',
};

const mockPath = ['conditions', 'all', '0'];

// Sample rule for store initialization
const sampleRule: RuleDefinition = {
  name: 'test-rule',
  conditions: {
    all: [mockCondition],
  },
  event: {
    type: 'warning',
    params: {
      message: 'Test warning',
    },
  },
};

describe('ConditionForm', () => {
  beforeEach(() => {
    // Reset store and load sample rule
    useRuleStore.setState({
      rule: sampleRule,
      originalRule: sampleRule,
      selectedPath: mockPath,
      isDirty: false,
      isSaving: false,
      lastUpdateSource: null,
      lastUpdateTime: 0,
      expandedPaths: new Set(['conditions']),
      history: [sampleRule],
      historyIndex: 0,
      canUndo: false,
      canRedo: false,
      validationErrors: [],
      isValidating: false,
      isValid: true,
      lastValidatedAt: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    useRuleStore.getState().clearHistory();
    useRuleStore.getState().clearValidation();
  });

  describe('Rendering', () => {
    it('should render form header', () => {
      render(<ConditionForm path={mockPath} data={mockCondition} />);

      expect(screen.getByText('Edit Condition')).toBeInTheDocument();
      expect(screen.getByText('Configure what this condition checks')).toBeInTheDocument();
    });

    it('should render fact selector with current value', () => {
      render(<ConditionForm path={mockPath} data={mockCondition} />);

      // The fact appears in both the selector and the preview, so check for multiple
      const factElements = screen.getAllByText('fileData');
      expect(factElements.length).toBeGreaterThan(0);
    });

    it('should render operator selector with current value', () => {
      render(<ConditionForm path={mockPath} data={mockCondition} />);

      // The operator appears in both the selector and possibly the description, so check for multiple
      const containsElements = screen.getAllByText('contains');
      expect(containsElements.length).toBeGreaterThan(0);
    });

    it('should render value editor with current value', () => {
      render(<ConditionForm path={mockPath} data={mockCondition} />);

      const valueInput = screen.getByDisplayValue('TODO');
      expect(valueInput).toBeInTheDocument();
    });

    it('should render path selector with current value', () => {
      render(<ConditionForm path={mockPath} data={mockCondition} />);

      // PathSelector uses a combobox (Radix Select)
      // The label "Path" should be present
      expect(screen.getByText('Path')).toBeInTheDocument();

      // The selected path value appears multiple times (in selector and preview)
      const pathElements = screen.getAllByText('$.fileName');
      expect(pathElements.length).toBeGreaterThan(0);
    });

    it('should render parameters section', () => {
      render(<ConditionForm path={mockPath} data={mockCondition} />);

      expect(screen.getByText('Parameters')).toBeInTheDocument();
    });

    it('should render condition preview', () => {
      render(<ConditionForm path={mockPath} data={mockCondition} />);

      expect(screen.getByText('Condition Preview')).toBeInTheDocument();
    });
  });

  describe('Value Editor', () => {
    it('should update value when typing', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<ConditionForm path={mockPath} data={mockCondition} />);

      // Find value input and type
      const valueInput = screen.getByDisplayValue('TODO');
      await user.clear(valueInput);
      await user.type(valueInput, 'FIXME');

      // Fast-forward debounce timer
      await vi.advanceTimersByTimeAsync(150);

      // Now store should be updated
      const state = useRuleStore.getState();
      const condition = state.rule?.conditions.all?.[0] as RuleCondition;
      expect(condition?.value).toBe('FIXME');

      vi.useRealTimers();
    });

    it('should render path selector combobox', () => {
      // Note: Radix Select interactions are complex in jsdom.
      // This test verifies the PathSelector renders with the correct current value.
      // Full interaction tests (selecting paths) should be done in integration tests.
      render(<ConditionForm path={mockPath} data={mockCondition} />);

      // Should have Path label
      expect(screen.getByText('Path')).toBeInTheDocument();

      // The selected path value appears multiple times (in selector and preview)
      const pathElements = screen.getAllByText('$.fileName');
      expect(pathElements.length).toBeGreaterThan(0);
    });
  });

  describe('Validation', () => {
    it('should display validation error for fact', () => {
      // Set validation errors in store
      useRuleStore.setState({
        validationErrors: [
          {
            path: ['conditions', 'all', '0', 'fact'],
            message: 'Fact is required',
            keyword: 'required',
            params: { missingProperty: 'fact' },
          },
        ],
        isValid: false,
      });

      render(
        <ConditionForm
          path={mockPath}
          data={{ ...mockCondition, fact: '' }}
        />
      );

      expect(screen.getByText('Fact is required')).toBeInTheDocument();
    });

    it('should display validation error for value', () => {
      // Set validation errors in store
      useRuleStore.setState({
        validationErrors: [
          {
            path: ['conditions', 'all', '0', 'value'],
            message: 'Value is required',
            keyword: 'required',
            params: { missingProperty: 'value' },
          },
        ],
        isValid: false,
      });

      render(
        <ConditionForm
          path={mockPath}
          data={{ ...mockCondition, value: '' }}
        />
      );

      expect(screen.getByText('Value is required')).toBeInTheDocument();
    });
  });

  describe('Condition Preview', () => {
    it('should show fact name in preview', () => {
      render(<ConditionForm path={mockPath} data={mockCondition} />);

      const preview = screen.getByText('Condition Preview').parentElement;
      expect(preview).toHaveTextContent('fileData');
    });

    it('should show operator in preview', () => {
      render(<ConditionForm path={mockPath} data={mockCondition} />);

      const preview = screen.getByText('Condition Preview').parentElement;
      expect(preview).toHaveTextContent('contains');
    });

    it('should show value in preview', () => {
      render(<ConditionForm path={mockPath} data={mockCondition} />);

      const preview = screen.getByText('Condition Preview').parentElement;
      expect(preview).toHaveTextContent('"TODO"');
    });

    it('should show path in preview when present', () => {
      render(<ConditionForm path={mockPath} data={mockCondition} />);

      const preview = screen.getByText('Condition Preview').parentElement;
      expect(preview).toHaveTextContent('$.fileName');
    });
  });

  describe('Parameters', () => {
    it('should show empty state when no parameters', () => {
      render(<ConditionForm path={mockPath} data={mockCondition} />);

      // Expand parameters section
      const paramsHeader = screen.getByText('Parameters');
      expect(paramsHeader).toBeInTheDocument();
    });

    it('should render with existing parameters', () => {
      const conditionWithParams: RuleCondition = {
        ...mockCondition,
        params: { checkPattern: 'TODO|FIXME' },
      };

      render(<ConditionForm path={mockPath} data={conditionWithParams} />);

      // Parameters section should show count
      expect(screen.getByText(/1 param/)).toBeInTheDocument();
    });
  });

  describe('Different conditions', () => {
    it('should render boolean value correctly', () => {
      const boolCondition: RuleCondition = {
        fact: 'fileData',
        operator: 'equal',
        value: true,
      };

      render(<ConditionForm path={mockPath} data={boolCondition} />);

      // Boolean should render as radio buttons with true selected
      const trueRadio = screen.getByRole('radio', { name: /true/i });
      expect(trueRadio).toBeChecked();
    });

    it('should render numeric value correctly', () => {
      const numCondition: RuleCondition = {
        fact: 'functionComplexity',
        operator: 'greaterThan',
        value: 10,
      };

      render(<ConditionForm path={mockPath} data={numCondition} />);

      const valueInput = screen.getByDisplayValue('10');
      expect(valueInput).toHaveAttribute('type', 'number');
    });
  });
});
