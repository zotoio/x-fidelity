/**
 * Simulation Flow Integration Tests
 *
 * Tests the complete simulation workflow:
 * - Loading a rule
 * - Selecting a file
 * - Running simulation
 * - Viewing results
 * - Condition-by-condition analysis
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useRuleStore } from '../../store/ruleStore';
import { SimulationPanel } from '../../components/SimulationPanel';
import { 
  sampleRule, 
  complexRule, 
  createMockStoreState,
} from '../../test-utils';
import * as simulationModule from '../../lib/simulation';

// Helper type for the mock engine
type MockEngine = typeof simulationModule.simulationEngine & { setInitialized?: (value: boolean) => void };

// Mock the simulation engine
vi.mock('../../lib/simulation', async (importOriginal) => {
  const original = await importOriginal<typeof simulationModule>();
  
  // Track initialization state separately
  let _initialized = false;
  
  const mockEngine = {
    initialize: vi.fn().mockImplementation(async (_fixtureName?: string, onProgress?: (step: string, progress: number) => void) => {
      _initialized = true;
      onProgress?.('Loading fixture data...', 10);
      onProgress?.('Initializing AST parser...', 40);
      onProgress?.('Initializing plugins...', 70);
      onProgress?.('Ready', 100);
    }),
    isInitialized: vi.fn(() => _initialized),
    setInitialized: (value: boolean) => { _initialized = value; },
    getAvailableFiles: vi.fn(() => ['src/App.tsx', 'src/index.ts', 'package.json', 'README.md']),
    getFixtureData: vi.fn(() => ({
      files: new Map([
        ['src/App.tsx', 'export function App() { return <div>TODO: implement</div>; }'],
        ['src/index.ts', 'import { App } from "./App"; export default App;'],
        ['package.json', '{"name": "test", "version": "1.0.0"}'],
        ['README.md', '# Test Project\n\nThis is a test.'],
      ]),
      packageJson: { name: 'test', version: '1.0.0' },
      fileList: ['src/App.tsx', 'src/index.ts', 'package.json', 'README.md'],
    })),
    simulate: vi.fn().mockImplementation(async (rule, fileName) => ({
      success: true,
      fileName,
      timestamp: new Date(),
      duration: 42,
      conditionResults: [
        {
          path: ['conditions', 'all', '0'],
          factName: 'fileData',
          factValue: { fileName: fileName.split('/').pop() },
          operator: 'notEqual',
          compareValue: 'REPO_GLOBAL_CHECK',
          result: true,
          duration: 1.5,
          jsonPath: '$.fileName',
        },
      ],
      finalResult: 'triggered' as const,
      event: {
        type: rule.event.type as 'warning' | 'fatality' | 'info',
        message: rule.event.params.message,
      },
    })),
    reset: vi.fn(() => {
      _initialized = false;
    }),
    simulateAll: vi.fn(),
    getFixtureLoader: vi.fn(() => ({
      isLoaded: () => true,
      listFiles: () => ['src/App.tsx', 'src/index.ts'],
      getBundle: () => ({}),
    })),
  };

  return {
    ...original,
    simulationEngine: mockEngine,
    SimulationEngine: vi.fn(() => mockEngine),
  };
});

// Initial state for clean tests
const initialState = createMockStoreState(null);

describe('Simulation Flow Integration', () => {
  beforeEach(() => {
    useRuleStore.setState(initialState);
    (simulationModule.simulationEngine as MockEngine).setInitialized?.(false);
    vi.mocked(simulationModule.simulationEngine).isInitialized.mockReturnValue(false);
    vi.clearAllMocks();
  });

  afterEach(() => {
    useRuleStore.getState().clearHistory();
    useRuleStore.getState().clearValidation();
  });

  describe('Initialization', () => {
    it('shows initializing state on mount', async () => {
      useRuleStore.getState().loadRule(sampleRule);
      render(<SimulationPanel />);

      await waitFor(() => {
        expect(screen.getByText(/Initializing/)).toBeInTheDocument();
      });
    });

    it('calls initialize on mount', async () => {
      useRuleStore.getState().loadRule(sampleRule);
      render(<SimulationPanel />);

      await waitFor(() => {
        expect(simulationModule.simulationEngine.initialize).toHaveBeenCalled();
      });
    });

    it('shows Ready status when initialized', async () => {
      (simulationModule.simulationEngine as MockEngine).setInitialized?.(true);
      vi.mocked(simulationModule.simulationEngine).isInitialized.mockReturnValue(true);
      
      useRuleStore.getState().loadRule(sampleRule);
      render(<SimulationPanel />);

      await waitFor(() => {
        expect(screen.getByText('Ready')).toBeInTheDocument();
      });
    });
  });

  describe('Rule Loading Requirement', () => {
    it('shows warning when no rule is loaded', async () => {
      (simulationModule.simulationEngine as MockEngine).setInitialized?.(true);
      vi.mocked(simulationModule.simulationEngine).isInitialized.mockReturnValue(true);
      
      render(<SimulationPanel />);

      await waitFor(() => {
        expect(screen.getByText(/Create or load a rule to run simulations/)).toBeInTheDocument();
      });
    });

    it('disables Run button when no rule', async () => {
      (simulationModule.simulationEngine as MockEngine).setInitialized?.(true);
      vi.mocked(simulationModule.simulationEngine).isInitialized.mockReturnValue(true);
      
      render(<SimulationPanel />);

      await waitFor(() => {
        const runButton = screen.getByRole('button', { name: /Run Simulation/i });
        expect(runButton).toBeDisabled();
      });
    });

    it('enables Run button when rule is loaded', async () => {
      (simulationModule.simulationEngine as MockEngine).setInitialized?.(true);
      vi.mocked(simulationModule.simulationEngine).isInitialized.mockReturnValue(true);
      
      useRuleStore.getState().loadRule(sampleRule);
      render(<SimulationPanel />);

      await waitFor(() => {
        const runButton = screen.getByRole('button', { name: /Run Simulation/i });
        expect(runButton).not.toBeDisabled();
      });
    });
  });

  describe('File Selection', () => {
    beforeEach(() => {
      (simulationModule.simulationEngine as MockEngine).setInitialized?.(true);
      vi.mocked(simulationModule.simulationEngine).isInitialized.mockReturnValue(true);
      useRuleStore.getState().loadRule(sampleRule);
    });

    it('shows file selector when initialized', async () => {
      render(<SimulationPanel />);

      await waitFor(() => {
        expect(screen.getByText('Test File')).toBeInTheDocument();
      });
    });
  });

  describe('Running Simulation', () => {
    beforeEach(() => {
      (simulationModule.simulationEngine as MockEngine).setInitialized?.(true);
      vi.mocked(simulationModule.simulationEngine).isInitialized.mockReturnValue(true);
      useRuleStore.getState().loadRule(sampleRule);
    });

    it('calls simulate when Run button is clicked', async () => {
      const user = userEvent.setup();
      render(<SimulationPanel />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Run Simulation/i })).toBeInTheDocument();
      });

      const runButton = screen.getByRole('button', { name: /Run Simulation/i });
      await user.click(runButton);

      await waitFor(() => {
        expect(simulationModule.simulationEngine.simulate).toHaveBeenCalled();
      });
    });

    it('shows results after simulation', async () => {
      const user = userEvent.setup();
      render(<SimulationPanel />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Run Simulation/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /Run Simulation/i }));

      await waitFor(() => {
        expect(screen.getByText(/Rule Triggered/)).toBeInTheDocument();
      });
    });

    it('shows condition results after simulation', async () => {
      const user = userEvent.setup();
      render(<SimulationPanel />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Run Simulation/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /Run Simulation/i }));

      await waitFor(() => {
        expect(screen.getByText('Condition Results')).toBeInTheDocument();
      });
    });

    it('passes current rule to simulate', async () => {
      const user = userEvent.setup();
      render(<SimulationPanel />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Run Simulation/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /Run Simulation/i }));

      await waitFor(() => {
        expect(simulationModule.simulationEngine.simulate).toHaveBeenCalled();
      });

      // Check the first call arguments
      const calls = vi.mocked(simulationModule.simulationEngine.simulate).mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      expect(calls[0]?.[0].name).toBe('test-rule');
    });
  });

  describe('Result Display', () => {
    beforeEach(() => {
      (simulationModule.simulationEngine as MockEngine).setInitialized?.(true);
      vi.mocked(simulationModule.simulationEngine).isInitialized.mockReturnValue(true);
      useRuleStore.getState().loadRule(sampleRule);
    });

    it('shows triggered state for matching rules', async () => {
      const user = userEvent.setup();
      render(<SimulationPanel />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Run Simulation/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /Run Simulation/i }));

      await waitFor(() => {
        expect(screen.getByText(/Rule Triggered/)).toBeInTheDocument();
      });
    });

    it('shows reset button after simulation', async () => {
      const user = userEvent.setup();
      render(<SimulationPanel />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Run Simulation/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /Run Simulation/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Reset simulation/i })).toBeInTheDocument();
      });
    });

    it('shows execution duration', async () => {
      const user = userEvent.setup();
      render(<SimulationPanel />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Run Simulation/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /Run Simulation/i }));

      await waitFor(() => {
        // Duration should be displayed (42ms from mock)
        expect(screen.getByText(/42/)).toBeInTheDocument();
      });
    });
  });

  describe('Not Triggered Results', () => {
    beforeEach(() => {
      (simulationModule.simulationEngine as MockEngine).setInitialized?.(true);
      vi.mocked(simulationModule.simulationEngine).isInitialized.mockReturnValue(true);
      
      // Mock simulate to return not-triggered
      vi.mocked(simulationModule.simulationEngine.simulate).mockResolvedValue({
        success: true,
        fileName: 'src/App.tsx',
        timestamp: new Date(),
        duration: 15,
        conditionResults: [
          {
            path: ['conditions', 'all', '0'],
            factName: 'fileData',
            factValue: { fileName: 'App.tsx' },
            operator: 'contains',
            compareValue: 'NEVER_MATCH',
            result: false,
            duration: 1.2,
          },
        ],
        finalResult: 'not-triggered',
      });
      
      useRuleStore.getState().loadRule(sampleRule);
    });

    it('shows not-triggered state for non-matching rules', async () => {
      const user = userEvent.setup();
      render(<SimulationPanel />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Run Simulation/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /Run Simulation/i }));

      await waitFor(() => {
        // Use getAllByText since there may be multiple elements
        const elements = screen.getAllByText(/Not Triggered/i);
        expect(elements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      (simulationModule.simulationEngine as MockEngine).setInitialized?.(true);
      vi.mocked(simulationModule.simulationEngine).isInitialized.mockReturnValue(true);
      useRuleStore.getState().loadRule(sampleRule);
    });

    it('handles simulation errors gracefully', async () => {
      vi.mocked(simulationModule.simulationEngine.simulate).mockResolvedValue({
        success: false,
        fileName: 'src/App.tsx',
        timestamp: new Date(),
        duration: 0,
        conditionResults: [],
        finalResult: 'error',
        error: 'Test error message',
      });

      const user = userEvent.setup();
      render(<SimulationPanel />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Run Simulation/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /Run Simulation/i }));

      await waitFor(() => {
        // Look for the error message specifically
        expect(screen.getByText(/Test error message/)).toBeInTheDocument();
      });
    });
  });

  describe('Complete Simulation Workflow', () => {
    beforeEach(() => {
      (simulationModule.simulationEngine as MockEngine).setInitialized?.(true);
      vi.mocked(simulationModule.simulationEngine).isInitialized.mockReturnValue(true);
    });

    it('complete workflow: load rule -> run simulation -> view results', async () => {
      const user = userEvent.setup();
      
      // Reset the mock to return successful result
      vi.mocked(simulationModule.simulationEngine.simulate).mockResolvedValue({
        success: true,
        fileName: 'src/App.tsx',
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
          message: 'Console statements found',
        },
      });
      
      // Step 1: Load a rule
      act(() => {
        useRuleStore.getState().loadRule(complexRule);
      });
      expect(useRuleStore.getState().rule?.name).toBe('complex-rule');

      render(<SimulationPanel />);

      // Step 2: Wait for initialization
      await waitFor(() => {
        expect(screen.getByText('Ready')).toBeInTheDocument();
      });

      // Step 3: Run simulation
      const runButton = screen.getByRole('button', { name: /Run Simulation/i });
      await user.click(runButton);

      // Step 4: View results - check for condition results section
      await waitFor(() => {
        expect(screen.getByText('Condition Results')).toBeInTheDocument();
      });
    });

    it('re-runs simulation with modified rule', async () => {
      const user = userEvent.setup();
      
      useRuleStore.getState().loadRule(sampleRule);
      render(<SimulationPanel />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Run Simulation/i })).toBeInTheDocument();
      });

      // First simulation
      await user.click(screen.getByRole('button', { name: /Run Simulation/i }));

      await waitFor(() => {
        expect(simulationModule.simulationEngine.simulate).toHaveBeenCalledTimes(1);
      });

      // Modify the rule
      act(() => {
        useRuleStore.getState().updateNode(['name'], 'modified-rule', 'form');
      });

      // Run again
      await user.click(screen.getByRole('button', { name: /Run Simulation/i }));

      await waitFor(() => {
        expect(simulationModule.simulationEngine.simulate).toHaveBeenCalledTimes(2);
      });

      // Should pass modified rule
      const lastCall = vi.mocked(simulationModule.simulationEngine.simulate).mock.calls[1];
      expect(lastCall?.[0].name).toBe('modified-rule');
    });
  });
});
