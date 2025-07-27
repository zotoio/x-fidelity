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

export default defineConfig([
  {
    label: 'integration',
    files: 'out/test/test/integration/**/*.test.js',
    version: 'stable',
    workspaceFolder: '../x-fidelity-fixtures/node-fullstack',
    extensionDevelopmentPath: '.',
    mocha: {
      ui: 'bdd',
      timeout: 60000, // Reduced from 120000
      color: true,
      reporter: process.env.VSCODE_TEST_VERBOSE === 'true' ? 'spec' : 'min'
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
      timeout: 30000, // Faster for core tests
      color: true,
      reporter: 'min'
    }
  }
]);
