// jest.setup.ts
import { EventEmitter } from 'events';

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

let exitSpy: jest.SpyInstance;

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
