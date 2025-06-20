// This file is used to setup the Jest testing environment
// It will be executed before each test file

import { jest } from '@jest/globals';

// Suppress all console output during tests
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
  info: console.info,
  debug: console.debug,
  trace: console.trace
};

// Mock all console methods to be silent during tests
console.log = jest.fn();
console.warn = jest.fn();
console.error = jest.fn();
console.info = jest.fn();
console.debug = jest.fn();
console.trace = jest.fn();

// Create a silent logger implementation for tests
class SilentLogger {
  trace() {}
  debug() {}
  info() {}
  warn() {}
  error() {}
  fatal() {}
  child() { return new SilentLogger(); }
  setLevel() {}
  getLevel() { return 'error'; }
  isLevelEnabled() { return false; }
}

// Mock the x-fidelity module with silent logger
jest.mock('@x-fidelity/core', () => ({
  analyzeCodebase: jest.fn(),
  logger: new SilentLogger(),
  setLogLevel: jest.fn(),
  setLogPrefix: jest.fn(),
  generateLogPrefix: jest.fn(),
  LoggerProvider: {
    setLogger: jest.fn(),
    getLogger: jest.fn(() => new SilentLogger()),
    clearInjectedLogger: jest.fn()
  }
}));

// Global cleanup after all tests
afterAll(() => {
  // Clear all timers
  jest.clearAllTimers();
  jest.useRealTimers();
  
  // Clear all mocks
  jest.clearAllMocks();
  jest.resetAllMocks();
  jest.restoreAllMocks();
  
  // Restore original console methods if needed for debugging
  // Uncomment these lines if you need to debug test output:
  // console.log = originalConsole.log;
  // console.warn = originalConsole.warn;
  // console.error = originalConsole.error;
  // console.info = originalConsole.info;
  // console.debug = originalConsole.debug;
  // console.trace = originalConsole.trace;
});
