---
name: xfi-create-plugin
description: Guide for creating a new X-Fidelity plugin from the template. Use when creating plugins, adding new analysis capabilities, or extending the plugin system.
---

# Creating X-Fidelity Plugins

This skill guides you through creating a new plugin for X-Fidelity.

## Quick Start Checklist

```
Plugin Creation Progress:
- [ ] Step 1: Create plugin directory structure
- [ ] Step 2: Create plugin index.ts
- [ ] Step 3: Create fact(s)
- [ ] Step 4: Create operator(s)
- [ ] Step 5: Add tests for facts and operators
- [ ] Step 6: Create sample rule(s)
- [ ] Step 7: Register plugin in main index
- [ ] Step 8: Run tests to verify
```

## Plugin Structure

```
packages/x-fidelity-plugins/src/xfiPlugin{Name}/
├── index.ts                  # Plugin definition and exports
├── types.ts                  # Plugin-specific types (optional)
├── facts/
│   ├── {name}Fact.ts         # Fact implementation
│   └── {name}Fact.test.ts    # Fact tests
├── operators/
│   ├── {name}Operator.ts     # Operator implementation
│   └── {name}Operator.test.ts # Operator tests
└── sampleRules/
    └── {name}-rule.json      # Example rule using this plugin
```

## Step 1: Create Plugin Directory

```bash
mkdir -p packages/x-fidelity-plugins/src/xfiPluginMyPlugin/{facts,operators,sampleRules}
```

## Step 2: Create Plugin Index

**File**: `packages/x-fidelity-plugins/src/xfiPluginMyPlugin/index.ts`

```typescript
import { XFiPlugin, PluginError, PluginContext, ILogger } from '@x-fidelity/types';
import { myFact } from './facts/myFact';
import { myOperator } from './operators/myOperator';

let logger: ILogger;

export const xfiPluginMyPlugin: XFiPlugin = {
    name: 'xfiPluginMyPlugin',
    version: '1.0.0',
    description: 'Description of what this plugin analyzes',
    facts: [myFact],
    operators: [myOperator],
    
    initialize: async (context: PluginContext): Promise<void> => {
        logger = context.logger;
        logger.info('MyPlugin initialized', {
            version: '1.0.0',
            factsCount: 1,
            operatorsCount: 1
        });
    },
    
    onError: (error: Error): PluginError => {
        if (logger) {
            logger.error('Plugin error:', error);
        }
        return {
            message: error.message,
            level: 'error',
            severity: 'error',
            source: 'xfi-plugin-my-plugin',
            details: error.stack
        };
    },
    
    cleanup: async (): Promise<void> => {
        if (logger) {
            logger.info('MyPlugin cleanup completed');
        }
    }
};

export { logger as pluginLogger };
```

## Step 3: Create Fact

**File**: `packages/x-fidelity-plugins/src/xfiPluginMyPlugin/facts/myFact.ts`

```typescript
import { FactDefn } from '@x-fidelity/types';
import { pluginLogger } from '@x-fidelity/core';

interface MyFactParams {
    resultFact?: string;
    // Add your parameters here
}

interface MyFactAlmanac {
    addRuntimeFact?: (name: string, value: any) => void;
    factValue?: (name: string) => Promise<any>;
}

export const myFact: FactDefn = {
    name: 'myFact',
    description: 'Description of what data this fact collects',
    type: 'iterative-function',  // 'iterative-function' or 'global-function'
    priority: 1,
    fn: async (params: unknown, almanac?: unknown): Promise<any> => {
        const logger = pluginLogger.createOperationLogger('xfi-plugin-my-plugin', 'myFact');
        
        try {
            const factParams = params as MyFactParams;
            const factAlmanac = almanac as MyFactAlmanac;

            logger.debug('Executing myFact', {
                paramsKeys: Object.keys(factParams || {})
            });

            // Collect your data here
            const result = { /* your data */ };

            // Store result if requested
            if (factParams?.resultFact && factAlmanac?.addRuntimeFact) {
                factAlmanac.addRuntimeFact(factParams.resultFact, result);
            }

            logger.debug('myFact completed', { result });
            return result;
        } catch (error) {
            logger.error('Error in myFact:', error);
            return null;
        }
    }
};
```

### Fact Types

| Type | When It Runs | Use Case |
|------|--------------|----------|
| `iterative-function` | Per matching file | File-specific analysis |
| `global-function` | Once per repo | Repository-wide checks |

### Accessing File Data

For iterative facts, get file content from almanac:

```typescript
// Get current file data
const fileData = await factAlmanac?.factValue?.('fileData');
const { fileName, fileContent, filePath } = fileData || {};
```

## Step 4: Create Operator

**File**: `packages/x-fidelity-plugins/src/xfiPluginMyPlugin/operators/myOperator.ts`

```typescript
import { OperatorDefn } from '@x-fidelity/types';
import { pluginLogger } from '@x-fidelity/core';

export const myOperator: OperatorDefn = {
    name: 'myOperator',
    description: 'Description of the comparison this operator performs',
    fn: (factValue: any, operatorValue: any): boolean => {
        const logger = pluginLogger.createOperationLogger('xfi-plugin-my-plugin', 'myOperator');
        
        try {
            logger.debug('Executing myOperator', {
                factValueType: typeof factValue,
                operatorValueType: typeof operatorValue
            });

            // Your comparison logic here
            const result = factValue === operatorValue;

            logger.debug('myOperator completed', { result });
            return result;
        } catch (error) {
            logger.error('Error in myOperator:', error);
            return false;
        }
    }
};
```

### Common Operator Patterns

```typescript
// Threshold comparison
const result = factValue > operatorValue;

// Contains check
const result = Array.isArray(factValue) && factValue.includes(operatorValue);

// Pattern matching
const regex = new RegExp(operatorValue);
const result = regex.test(factValue);

// Version comparison (use semver)
import { satisfies } from 'semver';
const result = satisfies(factValue, operatorValue);
```

## Step 5: Add Tests

### Fact Test

**File**: `packages/x-fidelity-plugins/src/xfiPluginMyPlugin/facts/myFact.test.ts`

```typescript
import { myFact } from './myFact';

describe('myFact', () => {
    const mockAlmanac = {
        factValue: jest.fn(),
        addRuntimeFact: jest.fn()
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return expected data', async () => {
        const result = await myFact.fn({}, mockAlmanac);
        expect(result).toBeDefined();
    });

    it('should store result when resultFact is provided', async () => {
        await myFact.fn({ resultFact: 'storedResult' }, mockAlmanac);
        expect(mockAlmanac.addRuntimeFact).toHaveBeenCalledWith(
            'storedResult',
            expect.anything()
        );
    });

    it('should handle errors gracefully', async () => {
        const badAlmanac = { factValue: jest.fn().mockRejectedValue(new Error('test')) };
        const result = await myFact.fn({}, badAlmanac);
        expect(result).toBeNull();
    });
});
```

### Operator Test

**File**: `packages/x-fidelity-plugins/src/xfiPluginMyPlugin/operators/myOperator.test.ts`

```typescript
import { myOperator } from './myOperator';

describe('myOperator', () => {
    it('should return true when values match', () => {
        expect(myOperator.fn('test', 'test')).toBe(true);
    });

    it('should return false when values differ', () => {
        expect(myOperator.fn('test', 'different')).toBe(false);
    });

    it('should handle null/undefined gracefully', () => {
        expect(myOperator.fn(null, 'test')).toBe(false);
        expect(myOperator.fn(undefined, 'test')).toBe(false);
    });

    it('should handle edge cases', () => {
        expect(myOperator.fn('', '')).toBe(true);
        expect(myOperator.fn(0, 0)).toBe(true);
    });
});
```

## Step 6: Create Sample Rule

**File**: `packages/x-fidelity-plugins/src/xfiPluginMyPlugin/sampleRules/myPlugin-iterative-rule.json`

```json
{
    "name": "myPlugin-iterative",
    "conditions": {
        "all": [
            {
                "fact": "fileData",
                "path": "$.fileName",
                "operator": "notEqual",
                "value": "REPO_GLOBAL_CHECK"
            },
            {
                "fact": "myFact",
                "params": {
                    "resultFact": "myFactResult"
                },
                "operator": "myOperator",
                "value": true
            }
        ]
    },
    "event": {
        "type": "warning",
        "params": {
            "message": "Issue detected by myPlugin",
            "details": {
                "fact": "myFactResult"
            }
        }
    }
}
```

## Step 7: Register Plugin

Edit `packages/x-fidelity-plugins/src/index.ts`:

```typescript
// Add export
export { xfiPluginMyPlugin } from './xfiPluginMyPlugin';

// Add to availablePlugins registry
export const availablePlugins = {
    // ... existing plugins
    xfiPluginMyPlugin: () => import('./xfiPluginMyPlugin').then(m => m.xfiPluginMyPlugin),
};
```

## Step 8: Run Tests

```bash
# Build the plugins package
yarn workspace @x-fidelity/plugins build

# Run plugin tests
yarn workspace @x-fidelity/plugins test

# Run all tests
yarn test
```

## Using Shared Utilities

The `sharedPluginUtils` module provides common functionality:

```typescript
import { 
    TreeSitterManager,
    getLanguageFromFilePath,
    getAstForContent
} from '../sharedPluginUtils';

// For AST analysis
const ast = await getAstForContent(fileContent, filePath);
```

## Plugin Best Practices

1. **100% test coverage** - All facts and operators must have comprehensive tests
2. **Graceful error handling** - Always catch errors and return safe defaults
3. **Logging** - Use `pluginLogger` for debugging information
4. **Type safety** - Define interfaces for params and return types
5. **Sample rules** - Include working examples demonstrating usage
6. **Performance** - Minimize file I/O; prefer data from almanac

## Files Reference

| Purpose | Location |
|---------|----------|
| Template plugin | `packages/x-fidelity-plugins/src/xfiPluginSimpleExample/` |
| Plugin types | `packages/x-fidelity-types/src/plugins.ts` |
| Shared utils | `packages/x-fidelity-plugins/src/sharedPluginUtils/` |
| Plugin registry | `packages/x-fidelity-plugins/src/index.ts` |
