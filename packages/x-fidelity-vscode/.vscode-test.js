const { defineConfig } = require('@vscode/test-cli');

module.exports = defineConfig([
  {
    label: 'unitTests',
    files: 'out/test/**/*.test.js',
    version: 'stable',
    workspaceFolder: '../../',
    extensionDevelopmentPath: '.',
    mocha: {
      ui: 'bdd',
      timeout: 20000
    }
  },
  {
    label: 'integrationTests',
    files: 'out/test/integration/**/*.test.js',
    version: 'stable',
    workspaceFolder: '../../',
    extensionDevelopmentPath: '.',
    mocha: {
      ui: 'bdd',
      timeout: 30000
    }
  },
  {
    label: 'e2eTests',
    files: 'out/test/e2e/**/*.test.js',
    version: 'stable',
    workspaceFolder: '../../',
    extensionDevelopmentPath: '.',
    mocha: {
      ui: 'bdd',
      timeout: 60000
    }
  }
]); 