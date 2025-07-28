import { defineConfig } from '@vscode/test-cli';
import * as path from 'path';
import * as fs from 'fs';

// Cache directory configuration
const CACHE_DIR = path.join(process.cwd(), '.vscode-test');
const USER_DATA_DIR = path.join(process.cwd(), '.vscode-test-user-data');

// Ensure cache directories exist
[CACHE_DIR, USER_DATA_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Environment-aware timeout configuration
const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
const isWindows = process.platform === 'win32';
const isWindowsCI = isCI && isWindows;

// More aggressive timeouts for Windows CI to prevent RangeError and timeouts
const integrationTimeout = isWindowsCI ? 20000 : isCI ? 30000 : 60000;  // Windows CI: 20s to prevent hanging
const coreTimeout = isWindowsCI ? 15000 : 20000;  // Windows CI: 15s for faster execution

export default defineConfig([
  {
    label: 'integration',
    files: 'out/test/test/integration/**/*.test.js',
    version: 'stable',
    workspaceFolder: '../x-fidelity-fixtures/node-fullstack',
    extensionDevelopmentPath: '.',
    mocha: {
      ui: 'bdd',
      timeout: integrationTimeout,
      color: true,
      reporter: process.env.VSCODE_TEST_VERBOSE === 'true' ? 'spec' : 'min',
      bail: isWindowsCI, // Exit on first failure for Windows CI to prevent cascading timeouts
      retries: isWindowsCI ? 0 : 1 // Disable retries on Windows CI to prevent extended hang times
    }
  },
  {
    label: 'core',
    files: 'out/test/test/integration/**/*.test.js',
    version: 'stable',
    workspaceFolder: '../x-fidelity-fixtures/node-fullstack',
    extensionDevelopmentPath: '.',
    mocha: {
      ui: 'bdd',
      timeout: coreTimeout,
      color: true,
      reporter: 'min',
      bail: isWindowsCI,
      retries: isWindowsCI ? 0 : 1
    }
  }
]);
