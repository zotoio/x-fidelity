jest.setTimeout(10000);

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

// Set up silent logging for the LoggerProvider
beforeEach(() => {
  // Import and configure the LoggerProvider to use silent logger
  const { LoggerProvider } = require('./src/utils/loggerProvider');
  LoggerProvider.setLogger(new SilentLogger());
});

afterEach(() => {
  // Clear any injected logger after each test
  const { LoggerProvider } = require('./src/utils/loggerProvider');
  LoggerProvider.clearInjectedLogger();
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
