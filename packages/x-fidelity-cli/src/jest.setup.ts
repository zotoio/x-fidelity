// jest.setup.ts
import { EventEmitter } from 'events';
import { jest } from '@jest/globals';

// Increase the default max listeners
EventEmitter.defaultMaxListeners = 20;

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

let exitSpy: any;

beforeAll(() => {
  // Set max listeners for process
  process.setMaxListeners(20);
  
  exitSpy = jest.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined): never => {
    // Use silent mock instead of console.log
    return undefined as never;
  });
});

afterAll(() => {
  // Use mockRestore on the spy directly
  exitSpy.mockRestore();
  // Reset max listeners to default
  process.setMaxListeners(10);
  EventEmitter.defaultMaxListeners = 10;
  
  // Restore original console methods if needed for debugging
  // Uncomment these lines if you need to debug test output:
  // console.log = originalConsole.log;
  // console.warn = originalConsole.warn;
  // console.error = originalConsole.error;
  // console.info = originalConsole.info;
  // console.debug = originalConsole.debug;
  // console.trace = originalConsole.trace;
});

// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.OPENAI_API_KEY = '';

// Extend Jest timeout for integration tests
jest.setTimeout(15000);

// Mock console methods to reduce noise in tests
global.console = {
  ...global.console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  info: jest.fn()
};

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});
