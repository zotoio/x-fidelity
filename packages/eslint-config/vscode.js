const base = require('./base');

module.exports = {
  ...base,
  env: {
    ...base.env,
    browser: true
  },
  globals: {
    acquireVsCodeApi: 'readonly'
  },
  rules: {
    ...base.rules,
    // VSCode-specific rules
    'no-restricted-imports': ['error', {
      'patterns': [{
        'group': ['vscode'],
        'message': 'Import vscode types from @types/vscode instead'
      }]
    }]
  }
}; 