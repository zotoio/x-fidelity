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

// Mock glob package globally to avoid native dependency issues
jest.mock('glob', () => ({
  glob: jest.fn().mockResolvedValue([])
}));

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

// Set up silent logging for the LoggerProvider
beforeEach(() => {
  // Mock the logger from core package
  jest.doMock('@x-fidelity/core', () => ({
    logger: new SilentLogger(),
    LoggerProvider: {
      setLogger: jest.fn(),
      getLogger: jest.fn(() => new SilentLogger()),
      clearInjectedLogger: jest.fn()
    }
  }));
});

// Global cleanup
afterAll(() => {
  // Restore original console methods if needed for debugging
  // Uncomment these lines if you need to debug test output:
  // console.log = originalConsole.log;
  // console.warn = originalConsole.warn;
  // console.error = originalConsole.error;
  // console.info = originalConsole.info;
  // console.debug = originalConsole.debug;
  // console.trace = originalConsole.trace;
}); 