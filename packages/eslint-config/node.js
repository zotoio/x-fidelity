const base = require('./base');

module.exports = {
  ...base,
  env: {
    ...base.env,
    node: true
  },
  rules: {
    ...base.rules,
    // Node.js-specific rules
    'no-process-exit': 'error',
    'no-process-env': 'off', // Allow process.env in Node.js
    'no-console': 'off' // Allow console in Node.js applications
  }
}; 