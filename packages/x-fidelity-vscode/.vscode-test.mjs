import { defineConfig } from '@vscode/test-cli';

export default defineConfig([
  {
    label: 'unitTests',
    files: 'dist-test/test/unit/**/*.test.js',
    version: 'insiders',
    workspaceFolder: '../x-fidelity-fixtures/node-fullstack',
    mocha: {
      ui: 'bdd',
      timeout: 20000,
      color: true
    },
    env: {
      NODE_ENV: 'test',
      DISPLAY: ':99'
    },
    launchArgs: [
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage'
    ]
  },
  {
    label: 'integrationTests', 
    files: 'dist-test/test/integration/**/*.test.js',
    version: 'insiders',
    workspaceFolder: '../x-fidelity-fixtures/node-fullstack',
    mocha: {
      ui: 'bdd',
      timeout: 30000,
      color: true
    },
    env: {
      NODE_ENV: 'test',
      DISPLAY: ':99'
    },
    launchArgs: [
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage'
    ]
  },
  {
    label: 'e2eTests',
    files: 'dist-test/test/e2e/**/*.test.js', 
    version: 'insiders',
    workspaceFolder: '../x-fidelity-fixtures/node-fullstack',
    mocha: {
      ui: 'bdd',
      timeout: 60000,
      color: true
    },
    env: {
      NODE_ENV: 'test',
      DISPLAY: ':99'
    },
    launchArgs: [
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage'
    ]
  },
  {
    label: 'consistencyTests',
    files: 'dist-test/test/consistency/**/*.test.js',
    version: 'insiders', 
    workspaceFolder: '../x-fidelity-fixtures/node-fullstack',
    mocha: {
      ui: 'bdd',
      timeout: 120000,
      color: true
    },
    env: {
      NODE_ENV: 'test',
      DISPLAY: ':99'
    },
    launchArgs: [
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage'
    ]
  }
]);
