/**
 * SimulationPanel Component Tests
 *
 * Tests for the SimulationPanel component including:
 * - Rendering in collapsed/expanded states
 * - Initialization progress display
 * - Error state handling
 * - Run simulation button state
 * - Results display
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { SimulationPanel } from '../SimulationPanel';
import { useRuleStore } from '../../../store/ruleStore';
import type { RuleDefinition } from '../../../types';
import * as simulationModule from '../../../lib/simulation';

// Helper type for the mock engine
type MockEngine = typeof simulationModule.simulationEngine & { setInitialized?: (value: boolean) => void };

// Sample rule for testing
const sampleRule: RuleDefinition = {
  name: 'test-rule',
  conditions: {
    all: [
      {
        fact: 'fileData',
        operator: 'notEqual',
        value: 'REPO_GLOBAL_CHECK',
        path: '$.fileName',
      },
    ],
  },
  event: {
    type: 'warning',
    params: {
      message: 'Test warning message',
    },
  },
};

// Mock the simulation engine
vi.mock('../../../lib/simulation', async (importOriginal) => {
  const original = await importOriginal<typeof simulationModule>();
  
  // Track initialization state separately
  let _initialized = false;
  
  // Create a mock engine instance
  const mockEngine = {
    initialize: vi.fn().mockImplementation(async (_fixtureName, onProgress) => {
      _initialized = true;
      onProgress?.('Loading fixture data...', 10);
      onProgress?.('Initializing AST parser...', 40);
      onProgress?.('Initializing plugins...', 70);
      onProgress?.('Ready', 100);
    }),
    isInitialized: vi.fn(() => _initialized),
    setInitialized: (value: boolean) => { _initialized = value; },
    getAvailableFiles: vi.fn(() => ['src/App.tsx', 'src/index.ts', 'package.json']),
    getFixtureData: vi.fn(() => ({
      files: new Map([
        ['src/App.tsx', 'export function App() { return <div>Hello</div>; }'],
        ['src/index.ts', 'import { App } from "./App"; export default App;'],
        ['package.json', '{"name": "test", "version": "1.0.0"}'],
      ]),
      packageJson: { name: 'test', version: '1.0.0' },
      fileList: ['src/App.tsx', 'src/index.ts', 'package.json'],
    })),
    simulate: vi.fn().mockImplementation(async (_rule, fileName) => ({
      success: true,
      fileName,
      timestamp: new Date(),
      duration: 42,
      conditionResults: [
        {
          path: ['conditions', 'all', '0'],
          factName: 'fileData',
          factValue: { fileName: 'App.tsx' },
          operator: 'notEqual',
          compareValue: 'REPO_GLOBAL_CHECK',
          result: true,
          duration: 1.5,
          jsonPath: '$.fileName',
        },
      ],
      finalResult: 'triggered' as const,
      event: {
        type: 'warning' as const,
        message: 'Test warning message',
      },
    })),
    reset: vi.fn(() => {
      _initialized = false;
    }),
  };

  return {
    ...original,
    simulationEngine: mockEngine,
    SimulationEngine: vi.fn(() => mockEngine),
  };
});

describe('SimulationPanel', () => {
  beforeEach(() => {
    // Reset store with sample rule
    useRuleStore.setState({
      rule: sampleRule,
      originalRule: sampleRule,
      selectedPath: [],
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

    // Reset mock engine state
    (simulationModule.simulationEngine as MockEngine).setInitialized?.(false);
    vi.mocked(simulationModule.simulationEngine).isInitialized.mockReturnValue(false);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render header with toggle button', () => {
      render(<SimulationPanel />);

      expect(screen.getByText('Rule Simulation')).toBeInTheDocument();
    });

    it('should show initialization status when not initialized', async () => {
      render(<SimulationPanel />);

      // Should show initializing status in header
      await waitFor(() => {
        expect(screen.getByText(/Initializing/)).toBeInTheDocument();
      });
    });

    it('should call initialize on mount', async () => {
      render(<SimulationPanel />);

      // Wait for initialization to complete
      await waitFor(() => {
        expect(simulationModule.simulationEngine.initialize).toHaveBeenCalled();
      });
    });
  });

  describe('Expansion', () => {
    it('should toggle panel when clicking header', async () => {
      const user = userEvent.setup();
      render(<SimulationPanel />);

      // Initially expanded - should see content
      expect(screen.getByText('Rule Simulation')).toBeInTheDocument();

      // Find and click the header to collapse
      const header = screen.getByRole('button', { name: /Rule Simulation/i });
      await user.click(header);

      // Content should be hidden (no "Test File" label visible)
      await waitFor(() => {
        expect(screen.queryByText('Test File')).not.toBeInTheDocument();
      });

      // Click again to expand
      await user.click(header);

      // Content should be visible again
      await waitFor(() => {
        expect(screen.getByText('Test File')).toBeInTheDocument();
      });
    });
  });

  describe('Initialized State', () => {
    beforeEach(() => {
      // Set engine to initialized state
      (simulationModule.simulationEngine as MockEngine).setInitialized?.(true);
      vi.mocked(simulationModule.simulationEngine).isInitialized.mockReturnValue(true);
    });

    it('should show Ready status when initialized', async () => {
      render(<SimulationPanel />);

      await waitFor(() => {
        expect(screen.getByText('Ready')).toBeInTheDocument();
      });
    });

    it('should show file selector when initialized', async () => {
      render(<SimulationPanel />);

      await waitFor(() => {
        expect(screen.getByText('Test File')).toBeInTheDocument();
      });
    });

    it('should show Run Simulation button when initialized', async () => {
      render(<SimulationPanel />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Run Simulation/i })).toBeInTheDocument();
      });
    });

    it('should enable Run button when file is selected and rule exists', async () => {
      render(<SimulationPanel />);

      await waitFor(() => {
        const runButton = screen.getByRole('button', { name: /Run Simulation/i });
        expect(runButton).not.toBeDisabled();
      });
    });
  });

  describe('No Rule State', () => {
    beforeEach(() => {
      useRuleStore.setState({ rule: null });
      (simulationModule.simulationEngine as MockEngine).setInitialized?.(true);
      vi.mocked(simulationModule.simulationEngine).isInitialized.mockReturnValue(true);
    });

    it('should show warning when no rule is loaded', async () => {
      render(<SimulationPanel />);

      await waitFor(() => {
        expect(
          screen.getByText(/Create or load a rule to run simulations/)
        ).toBeInTheDocument();
      });
    });

    it('should disable Run button when no rule', async () => {
      render(<SimulationPanel />);

      await waitFor(() => {
        const runButton = screen.getByRole('button', { name: /Run Simulation/i });
        expect(runButton).toBeDisabled();
      });
    });
  });

  describe('Simulation Execution', () => {
    beforeEach(() => {
      (simulationModule.simulationEngine as MockEngine).setInitialized?.(true);
      vi.mocked(simulationModule.simulationEngine).isInitialized.mockReturnValue(true);
    });

    it('should run simulation when Run button is clicked', async () => {
      const user = userEvent.setup();
      render(<SimulationPanel />);

      // Wait for initialization
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Run Simulation/i })).toBeInTheDocument();
      });

      // Click run button
      const runButton = screen.getByRole('button', { name: /Run Simulation/i });
      await user.click(runButton);

      // Wait for simulation to complete
      await waitFor(() => {
        expect(simulationModule.simulationEngine.simulate).toHaveBeenCalled();
      });
    });

    it('should show results after simulation', async () => {
      const user = userEvent.setup();
      render(<SimulationPanel />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Run Simulation/i })).toBeInTheDocument();
      });

      const runButton = screen.getByRole('button', { name: /Run Simulation/i });
      await user.click(runButton);

      // Wait for results to appear
      await waitFor(() => {
        expect(screen.getByText(/Rule Triggered/)).toBeInTheDocument();
      });
    });

    it('should show condition results after simulation', async () => {
      const user = userEvent.setup();
      render(<SimulationPanel />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Run Simulation/i })).toBeInTheDocument();
      });

      const runButton = screen.getByRole('button', { name: /Run Simulation/i });
      await user.click(runButton);

      // Wait for condition results to appear
      await waitFor(() => {
        expect(screen.getByText('Condition Results')).toBeInTheDocument();
      });
    });

    it('should show Reset button after simulation', async () => {
      const user = userEvent.setup();
      render(<SimulationPanel />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Run Simulation/i })).toBeInTheDocument();
      });

      const runButton = screen.getByRole('button', { name: /Run Simulation/i });
      await user.click(runButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Reset simulation/i })).toBeInTheDocument();
      });
    });
  });

  describe('Help Text', () => {
    beforeEach(() => {
      (simulationModule.simulationEngine as MockEngine).setInitialized?.(true);
      vi.mocked(simulationModule.simulationEngine).isInitialized.mockReturnValue(true);
    });

    it('should show help text when no results', async () => {
      render(<SimulationPanel />);

      await waitFor(() => {
        expect(screen.getByText(/How to use:/)).toBeInTheDocument();
      });
    });

    it('should show numbered steps in help text', async () => {
      render(<SimulationPanel />);

      await waitFor(() => {
        expect(screen.getByText(/Select a file from the fixture/)).toBeInTheDocument();
        expect(screen.getByText(/Click "Run Simulation"/)).toBeInTheDocument();
        expect(screen.getByText(/Review condition-by-condition results/)).toBeInTheDocument();
      });
    });
  });
});
