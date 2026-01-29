/**
 * FactSelector Component Tests
 *
 * Tests for the FactSelector component including:
 * - Rendering with selected value
 * - Accessibility attributes
 * - Error display
 * - Tooltip integration
 * 
 * Note: Radix Select interactions are complex in jsdom.
 * Integration tests for full dropdown behavior should be done in a browser environment.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FactSelector } from '../fields/FactSelector';

describe('FactSelector', () => {
  const defaultProps = {
    value: '',
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render with default label', () => {
      render(<FactSelector {...defaultProps} />);

      expect(screen.getByText('Fact')).toBeInTheDocument();
    });

    it('should render with custom label', () => {
      render(<FactSelector {...defaultProps} label="Custom Fact" />);

      expect(screen.getByText('Custom Fact')).toBeInTheDocument();
    });

    it('should render placeholder when no value selected', () => {
      render(<FactSelector {...defaultProps} />);

      expect(screen.getByText('Select a fact...')).toBeInTheDocument();
    });

    it('should render selected fact name', () => {
      render(<FactSelector {...defaultProps} value="fileData" />);

      expect(screen.getByText('fileData')).toBeInTheDocument();
    });

    it('should render fact description when selected', () => {
      render(<FactSelector {...defaultProps} value="fileData" />);

      // The description appears below the dropdown
      expect(screen.getByText(/Returns data for the current file/i)).toBeInTheDocument();
    });

    it('should render error message when provided', () => {
      render(<FactSelector {...defaultProps} error="Fact is required" />);

      expect(screen.getByText('Fact is required')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should render with error border style', () => {
      render(<FactSelector {...defaultProps} error="Fact is required" />);

      const trigger = screen.getByRole('combobox');
      expect(trigger.className).toContain('border-error');
    });

    it('should render tooltip trigger when fact is selected', () => {
      render(<FactSelector {...defaultProps} value="fileData" />);

      // Info icon button should be present
      const tooltipTrigger = screen.getByLabelText(/Show information about fileData/i);
      expect(tooltipTrigger).toBeInTheDocument();
    });
  });

  describe('State', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<FactSelector {...defaultProps} disabled />);

      const trigger = screen.getByRole('combobox');
      expect(trigger).toBeDisabled();
    });

    it('should have custom id when provided', () => {
      render(<FactSelector {...defaultProps} id="custom-fact-id" />);

      expect(screen.getByRole('combobox')).toHaveAttribute('id', 'custom-fact-id');
    });
  });

  describe('Accessibility', () => {
    it('should have aria-label on trigger', () => {
      render(<FactSelector {...defaultProps} label="Select Fact" />);

      const trigger = screen.getByRole('combobox');
      expect(trigger).toHaveAttribute('aria-label', 'Select Fact');
    });

    it('should associate label with trigger via id', () => {
      render(<FactSelector {...defaultProps} id="fact-select" />);

      const label = screen.getByText('Fact');
      expect(label).toHaveAttribute('for', 'fact-select');
    });
  });

  describe('Different fact types', () => {
    it('should render AST fact correctly', () => {
      render(<FactSelector {...defaultProps} value="ast" />);

      expect(screen.getByText('ast')).toBeInTheDocument();
      expect(screen.getByText(/Returns AST node information/i)).toBeInTheDocument();
    });

    it('should render dependency fact correctly', () => {
      render(<FactSelector {...defaultProps} value="repoDependencyVersions" />);

      expect(screen.getByText('repoDependencyVersions')).toBeInTheDocument();
      expect(screen.getByText(/Returns all dependencies/i)).toBeInTheDocument();
    });

    it('should render react patterns fact correctly', () => {
      render(<FactSelector {...defaultProps} value="hookDependency" />);

      expect(screen.getByText('hookDependency')).toBeInTheDocument();
      expect(screen.getByText(/Analyzes React hook dependency/i)).toBeInTheDocument();
    });
  });
});
