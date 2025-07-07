// Jest setup for VSCode extension unit tests
// This file runs before each test file
import { jest, expect, beforeEach, afterEach } from '@jest/globals';

// Mock console to reduce noise in tests
global.console = {
  ...console,
  // Suppress logs in tests unless explicitly needed
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Mock process.env for consistent test environment
process.env.NODE_ENV = 'test';

// Extend Jest matchers if needed
expect.extend({
  // Add custom matchers here if needed
});

// Global test utilities
global.testUtils = {
  // Add global test utilities here
};

// Mock timers for tests that need them
jest.useFakeTimers();

beforeEach(() => {
  // Reset all mocks before each test
  jest.clearAllMocks();
  jest.clearAllTimers();
});

afterEach(() => {
  // Clean up after each test
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
  jest.useFakeTimers();
});
