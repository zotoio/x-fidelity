/**
 * Mock Simulation Engine for Testing
 *
 * Provides mock implementations of the simulation engine
 * for testing simulation-related components.
 */

import { vi } from 'vitest';
import type { SimulationResult, ConditionResult } from '../lib/simulation/types';
import type { RuleDefinition } from '../types';

/**
 * Create a mock condition result
 */
export function createMockConditionResult(overrides: Partial<ConditionResult> = {}): ConditionResult {
  return {
    path: ['conditions', 'all', '0'],
    factName: 'fileData',
    factValue: { fileName: 'App.tsx', content: 'export function App() {}' },
    operator: 'notEqual',
    compareValue: 'REPO_GLOBAL_CHECK',
    result: true,
    duration: 1.5,
    jsonPath: '$.fileName',
    ...overrides,
  };
}

/**
 * Create a mock successful simulation result
 */
export function createMockSimulationResult(overrides: Partial<SimulationResult> = {}): SimulationResult {
  return {
    success: true,
    fileName: 'src/App.tsx',
    timestamp: new Date(),
    duration: 42,
    conditionResults: [createMockConditionResult()],
    finalResult: 'triggered',
    event: {
      type: 'warning',
      message: 'Test warning message',
    },
    ...overrides,
  };
}

/**
 * Create a mock failed simulation result
 */
export function createMockErrorResult(error: string, fileName = 'src/App.tsx'): SimulationResult {
  return {
    success: false,
    fileName,
    timestamp: new Date(),
    duration: 0,
    conditionResults: [],
    finalResult: 'error',
    error,
  };
}

/**
 * Create a mock simulation engine instance
 */
export function createMockSimulationEngine() {
  const mockEngine = {
    initialized: false,
    initialize: vi.fn().mockImplementation(async (_fixtureName?: string, onProgress?: (step: string, progress: number) => void) => {
      mockEngine.initialized = true;
      onProgress?.('Loading fixture data...', 10);
      onProgress?.('Initializing AST parser...', 40);
      onProgress?.('Initializing plugins...', 70);
      onProgress?.('Ready', 100);
    }),
    isInitialized: vi.fn(() => mockEngine.initialized),
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
    simulate: vi.fn().mockImplementation(async (rule: RuleDefinition, fileName: string) => 
      createMockSimulationResult({ fileName, event: { type: rule.event.type, message: rule.event.params.message } })
    ),
    reset: vi.fn(() => {
      mockEngine.initialized = false;
    }),
  };

  return mockEngine;
}

/**
 * Available fixture files for testing
 */
export const mockFixtureFiles = [
  'src/App.tsx',
  'src/index.ts',
  'src/components/Header.tsx',
  'src/utils/helpers.ts',
  'package.json',
  'tsconfig.json',
  'README.md',
];
