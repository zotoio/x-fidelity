# Plugin Guidance

This document provides detailed guidance on how to use, install, and create external plugin extensions for x‑fidelity. External plugins allow you to extend x‑fidelity’s core functionality without modifying the main codebase.

## Introduction

x‑fidelity supports plugins that conform to the `XFiPlugin` interface. Plugins can add custom facts, operators, and error handlers. They can be installed either globally or locally—and x‑fidelity will load them at runtime as specified with the `-e` or `--extensions` option.

## Installation Options

### Global Installation

- To install an external plugin globally, run:
  ```bash
  yarn add <plugin-module-name>
  ```
- Global plugins are available system‑wide; ensure that your global node_modules directory is in your module resolution path.

### Local Installation

- To install an external plugin locally in your project, run:
  ```bash
  yarn add <plugin-module-name>
  ```
- Local plugins are stored in your project’s `node_modules` directory. x‑fidelity will check local installations first.

## Using Plugins with x‑fidelity

When running x‑fidelity you can specify one or more plugin names using the `-e` or `--extensions` option:
```bash
xfidelity /path/to/project -e xfi-basic-plugin xfi-another-plugin
```
Separate multiple plugin module names with spaces.

## Creating Custom Plugins

To create your own plugin, implement the `XFiPlugin` interface. At a minimum, export an object with the following properties:

- **name**: A unique string identifier for your plugin.
- **version**: The plugin version.
- **facts**: (optional) An array of fact definitions.
- **operators**: (optional) An array of operator definitions.
- **onError**: (optional) A function to handle errors encountered in plugin processing.

Example:
```javascript
// my-plugin.js
module.exports = {
  name: 'my-plugin',
  version: '1.0.0',
  facts: [{
    name: 'myCustomFact',
    fn: async () => ({ result: 'custom fact data' })
  }],
  operators: [{
    name: 'myCustomOperator',
    fn: (factValue, expectedValue) => factValue === expectedValue
  }],
  onError: (error) => ({
    message: `Plugin error: ${error.message}`,
    level: 'warning',
    details: error.stack
  })
};
```
After creating your plugin, install it (locally or globally) and reference it using the `-e` option when running x‑fidelity.

## Troubleshooting and Tips

- **Environment Variables**: Ensure your Node.js module resolution settings include global modules if using global installations.
- **Debugging**: Enable verbose logging in x‑fidelity to troubleshoot plugin loading.
- **Name Conflicts**: If multiple plugins expose facts or operators under the same name, loading order may affect which one is used.

For any further questions, consult the x‑fidelity documentation or reach out to the maintainers.

## Local Development and Testing

### Testing Locally with Yarn Link

To test your plugin locally without publishing it to an npm repo, you can use `yarn link`. In your plugin’s development directory, run:
```bash
yarn link
```
Then, in your x‑fidelity project directory, run:
```bash
yarn link <plugin-module-name>
```
Replace `<plugin-module-name>` with your plugin's package name. This will create a symlink so that any changes you make to your plugin are immediately available to x‑fidelity.

### Important Imports for Plugin Integration

For seamless integration with x‑fidelity, ensure your plugin imports the key types and utilities. For example:
```javascript
import { XFiPlugin } from 'x-fidelity/types/typeDefs';
import { logger } from 'x-fidelity/utils/logger';
import { safeClone, safeStringify } from 'x-fidelity/utils/utils';
```
These imports ensure that your plugin can interoperate correctly with x‑fidelity’s API, logging, and utility functions.

## Sample Plugin Rules and Unit Tests

In addition to creating your plugin, you can create sample rules that exercise your plugin's functionality. These sample rules serve both as documentation and as a basis for unit tests to ensure your plugin operates as expected.

### Creating Sample Rules

For example, if your plugin defines a fact named `customFact` and an operator named `customOperator`, you can create a sample rule JSON file:
```json
{
  "name": "custom-plugin-rule",
  "conditions": {
    "all": [
      {
        "fact": "customFact",
        "operator": "customOperator",
        "value": "custom fact data"
      }
    ]
  },
  "event": {
    "type": "warning",
    "params": {
      "message": "Plugin fact and operator validated successfully"
    }
  }
}
```
Place this sample rule file in your local configuration rules directory (e.g., `rules/`), so that x‑fidelity can pick it up during analysis.

### Writing Unit Tests

Complement your sample rule with unit tests to validate your plugin behavior. For example, using Jest you might create a test file such as `custom-plugin-rule.test.ts` with the following content:
```typescript
import { customFact } from 'xfiPluginSimpleExample/facts/customFact';
import { customOperator } from 'xfiPluginSimpleExample/operators/customOperator';

describe('Custom Plugin Rule', () => {
  it('should trigger when the custom fact produces expected data', async () => {
    const factResult = await customFact.fn();
    expect(factResult).toEqual({ result: 'custom fact data' });
    
    const operatorResult = customOperator.fn(factResult.result, 'custom fact data');
    expect(operatorResult).toBe(true);
  });
});
```
Include these tests in your plugin’s test suite and run them via:
```bash
yarn test
```

### Final Notes

These sample rules and unit tests not only serve as documentation for plugin usage but also help ensure that any future changes do not break your plugin's functionality.
