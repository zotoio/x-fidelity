/**
 * Test Utilities Index
 *
 * Central export for all test utilities used across the Rule Builder tests.
 */

// Mock store utilities
export {
  sampleRule,
  complexRule,
  modifiedRule,
  createMockStoreState,
  createLoadedStoreState,
  createDirtyStoreState,
  createStoreStateWithHistory,
} from './mockStore';

// Mock simulation utilities
export {
  createMockConditionResult,
  createMockSimulationResult,
  createMockErrorResult,
  createMockSimulationEngine,
  mockFixtureFiles,
} from './mockSimulation';

// Mock template utilities
export {
  helloWorldRule,
  mockHelloWorldTemplate,
  mockConsoleDetectorTemplate,
  mockComplexityTemplate,
  mockTemplates,
  getMockTemplateById,
} from './mockTemplates';

// Re-export testing library utilities for convenience
export { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
export { userEvent } from '@testing-library/user-event';
