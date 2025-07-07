// Mocha setup for VSCode extension integration tests
// This file sets up global test environment for all Mocha tests

// Store original console methods
const originalConsole = {
  log: console.log,
  info: console.info,
  debug: console.debug,
  warn: console.warn,
  error: console.error
};

// Check if console suppression is enabled (matches the test runner setting)
const suppressConsole = process.env.VSCODE_TEST_VERBOSE !== 'true';

if (suppressConsole) {
  // Suppress console output from test code, but keep errors
  console.log = () => {};
  console.info = () => {};
  console.debug = () => {};
  console.warn = () => {};
  // Keep console.error for critical test failures
}

// Global test utilities available to all tests
declare global {
  namespace NodeJS {
    interface Global {
      testConsole: typeof originalConsole;
      isVerboseMode: boolean;
    }
  }
}

// Make original console available to tests if they really need it
(global as any).testConsole = originalConsole;
(global as any).isVerboseMode = !suppressConsole;

// Cleanup after tests complete
process.on('exit', () => {
  if (suppressConsole) {
    console.log = originalConsole.log;
    console.info = originalConsole.info;
    console.debug = originalConsole.debug;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
  }
});

// Export to make this a module for proper TypeScript compilation
export {};
