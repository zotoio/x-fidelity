---
sidebar_position: 2
---

# Creating Plugins

This guide walks you through creating custom plugins for x-fidelity.

## Plugin Structure

A basic plugin must implement the `XFiPlugin` interface:

```typescript
interface XFiPlugin {
    name: string;
    version: string;
    facts?: FactDefn[];
    operators?: OperatorDefn[];
    onError?: (error: Error) => PluginError;
}
```

## Basic Example

```javascript
// my-plugin.js
module.exports = {
    name: 'my-plugin',
    version: '1.0.0',
    facts: [{
        name: 'myCustomFact',
        fn: async () => ({ result: 'custom data' })
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

## Project Structure

```
my-plugin/
├── src/
│   ├── facts/
│   │   ├── customFact.ts
│   │   └── customFact.test.ts
│   ├── operators/
│   │   ├── customOperator.ts
│   │   └── customOperator.test.ts
│   ├── rules/
│   │   └── sampleRules.json
│   └── index.ts
├── package.json
├── tsconfig.json
├── jest.config.js
└── README.md
```

## Creating Facts

Facts collect and provide data:

```typescript
interface FactDefn {
    name: string;
    fn: (params: any, almanac: any) => Promise<any>;
    priority?: number;
}
```

Example fact:
```javascript
const myFact = {
    name: 'myCustomFact',
    fn: async (params, almanac) => {
        try {
            const data = await collectData(params);
            return { result: data };
        } catch (error) {
            logger.error(`Error in myCustomFact: ${error}`);
            throw error;
        }
    },
    priority: 1
};
```

## Creating Operators

Operators evaluate conditions:

```typescript
interface OperatorDefn {
    name: string;
    fn: (factValue: any, params: any) => boolean;
}
```

Example operator:
```javascript
const myOperator = {
    name: 'myCustomOperator',
    fn: (factValue, expectedValue) => {
        try {
            return evaluateCondition(factValue, expectedValue);
        } catch (error) {
            logger.error(`Error in myCustomOperator: ${error}`);
            return false;
        }
    }
};
```

## Error Handling

Implement custom error handling:

```typescript
interface PluginError {
    message: string;
    level: 'warning' | 'error' | 'fatality' | 'exempt';
    details?: any;
}
```

Example error handler:
```javascript
const onError = (error) => ({
    message: `Plugin error: ${error.message}`,
    level: determineErrorLevel(error),
    details: {
        stack: error.stack,
        code: (error as any).code,
        context: (error as any).context
    }
});
```

## Sample Rules

Include sample rules with your plugin:

```json
{
    "name": "custom-plugin-rule",
    "conditions": {
        "all": [
            {
                "fact": "myCustomFact",
                "operator": "myCustomOperator",
                "value": "expected value"
            }
        ]
    },
    "event": {
        "type": "warning",
        "params": {
            "message": "Custom rule triggered"
        }
    }
}
```

## Testing

Create comprehensive tests:

```javascript
describe('myPlugin', () => {
    it('should validate custom fact', async () => {
        const result = await myFact.fn();
        expect(result).toEqual({ result: 'custom data' });
    });

    it('should validate custom operator', () => {
        const result = myOperator.fn('test', 'test');
        expect(result).toBe(true);
    });
});
```

## Publishing

1. Create a package.json:
```json
{
    "name": "xfi-my-plugin",
    "version": "1.0.0",
    "main": "index.js",
    "peerDependencies": {
        "x-fidelity": "^3.0.0"
    }
}
```

2. Publish to npm:
```bash
npm publish
```

## Next Steps

- See [Plugin Examples](plugin-examples)
- Learn [Best Practices](best-practices)
