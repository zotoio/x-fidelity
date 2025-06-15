// This file is used to setup the Jest testing environment
// It will be executed before each test file

import { jest } from '@jest/globals';

// Set up any global mocks or configurations here
// VSCode module is now mocked via moduleNameMapper in jest.config.js

// Mock the x-fidelity module
jest.mock('@x-fidelity/core', () => ({
  analyzeCodebase: jest.fn(),
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn()
  },
  setLogLevel: jest.fn(),
  setLogPrefix: jest.fn(),
  generateLogPrefix: jest.fn()
}));
