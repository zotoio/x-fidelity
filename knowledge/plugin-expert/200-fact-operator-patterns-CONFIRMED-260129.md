# Topic: Fact and Operator Development Patterns

## Fact: FactDefn Type and Function Signature
### Modified: 2026-01-29
### Priority: H

Facts are data collectors that gather information from the codebase. The `FactDefn` type defines the structure:

```typescript
type FactDefn = {
    name: string;                    // Unique fact identifier
    fn: (params: any, almanac: any) => Promise<any>;  // Async fact function
    priority?: number;               // Execution order (lower = earlier)
    description?: string;            // Human-readable description
    type?: 'global' | 'global-function' | 'iterative-function';
}
```

**Fact Types**:
- `'global'`: Precomputed once and cached as static data
- `'global-function'`: Runs once per repo (e.g., OpenAI with different prompts per rule)
- `'iterative-function'`: Runs once per file (default behavior)

**Standard Fact Pattern**:
```typescript
export const myFact: FactDefn = {
    name: 'myFact',
    description: 'Description of what data this fact collects',
    type: 'iterative-function',
    priority: 1,
    fn: async (params: unknown, almanac?: unknown): Promise<any> => {
        const logger = pluginLogger.createOperationLogger('plugin-name', 'myFact');
        try {
            const fileData: FileData = await almanac.factValue('fileData');
            // Collect and return data
            return { data: collectedData };
        } catch (error) {
            logger.error('Error in myFact:', error);
            return null;  // Return safe default on error
        }
    }
};
```

### References
1. [core.ts - FactDefn](../../packages/x-fidelity-types/src/core.ts)
2. [customFact.ts](../../packages/x-fidelity-plugins/src/xfiPluginSimpleExample/facts/customFact.ts)
3. [astFact.ts](../../packages/x-fidelity-plugins/src/xfiPluginAst/facts/astFact.ts)

---

## Fact: OperatorDefn Type and Function Signature
### Modified: 2026-01-29
### Priority: H

Operators are comparison functions used in rule conditions to evaluate fact values. The `OperatorDefn` type:

```typescript
type OperatorDefn = {
    name: string;                           // Unique operator identifier
    fn: OperatorEvaluator<any, any>;        // Sync comparison function
    description?: string;                   // Human-readable description
}
```

**Standard Operator Pattern**:
```typescript
export const myOperator: OperatorDefn = {
    name: 'myOperator',
    description: 'Description of comparison logic',
    fn: (factValue: any, operatorValue: any): boolean => {
        const logger = pluginLogger.createOperationLogger('plugin-name', 'myOperator');
        try {
            logger.debug('Executing operator', { factValue, operatorValue });
            // Perform comparison
            const result = factValue === operatorValue;
            logger.debug('Operator completed', { result });
            return result;
        } catch (error) {
            logger.error('Error in myOperator:', error);
            return false;  // Return false on error (safe default)
        }
    }
};
```

**Key Differences from Facts**:
- Operators are **synchronous** (no async/await)
- Operators return **boolean** (rule passes/fails)
- Operators receive two parameters: `factValue` (from fact) and `operatorValue` (from rule JSON)

### References
1. [core.ts - OperatorDefn](../../packages/x-fidelity-types/src/core.ts)
2. [customOperator.ts](../../packages/x-fidelity-plugins/src/xfiPluginSimpleExample/operators/customOperator.ts)
3. [astComplexity.ts](../../packages/x-fidelity-plugins/src/xfiPluginAst/operators/astComplexity.ts)

---

## Fact: Almanac Usage for Runtime Fact Storage
### Modified: 2026-01-29
### Priority: H

The almanac is json-rules-engine's runtime context for storing and retrieving fact values during rule evaluation.

**Reading Facts from Almanac**:
```typescript
// Get precomputed facts
const fileData: FileData = await almanac.factValue('fileData');
const dependencies = await almanac.factValue('installedDependencyVersions');
```

**Writing Runtime Facts to Almanac**:
```typescript
// Add computed results for other facts/operators to use
if (params?.resultFact && almanac?.addRuntimeFact) {
    almanac.addRuntimeFact(params.resultFact, computedResult);
}
```

**Common Almanac Facts Available**:
- `fileData`: Current file being analyzed (FileData type)
- `installedDependencyVersions`: Package dependencies from manifests
- `minimumDependencyVersions`: Required versions from archetype config
- `standardStructure`: Expected directory structure
- `repoPath`: Root path of analyzed repository

**Pattern for Result Chaining**:
```typescript
// Fact A computes AST and stores in almanac
almanac.addRuntimeFact('fileAst', astResult);

// Fact B retrieves and uses AST
const ast = await almanac.factValue('fileAst');
```

### References
1. [customFact.ts - addRuntimeFact usage](../../packages/x-fidelity-plugins/src/xfiPluginSimpleExample/facts/customFact.ts)
2. [astFact.ts - almanac patterns](../../packages/x-fidelity-plugins/src/xfiPluginAst/facts/astFact.ts)

---

## Fact: Error Handling Patterns in Facts and Operators
### Modified: 2026-01-29
### Priority: H

Facts and operators must handle errors gracefully to prevent analysis failures:

**Fact Error Handling**:
```typescript
fn: async (params: unknown, almanac?: unknown): Promise<any> => {
    try {
        // Main logic
        return result;
    } catch (error) {
        logger.error('Error in factName:', error);
        return { tree: null };  // Return safe default, NOT throw
    }
}
```

**Operator Error Handling**:
```typescript
fn: (factValue: any, operatorValue: any): boolean => {
    try {
        // Comparison logic
        return result;
    } catch (error) {
        logger.error('Error in operatorName:', error);
        return false;  // Return false on error, NOT throw
    }
}
```

**Plugin-Level Error Handler**:
```typescript
onError: (error: Error): PluginError => ({
    message: error.message,
    level: 'error',
    severity: 'error',
    source: 'plugin-name',
    details: error.stack
})
```

**PluginError Levels**:
- `'error'`: Non-fatal issue, analysis continues
- `'warning'`: Minor issue, logged but continues
- `'fatality'`: Critical failure, stops analysis
- `'exempt'`: Rule is exempted, skipped

**Key Principle**: Facts and operators should never throw uncaught exceptions. Always return a safe default value and log the error.

### References
1. [customFact.ts - try/catch pattern](../../packages/x-fidelity-plugins/src/xfiPluginSimpleExample/facts/customFact.ts)
2. [astComplexity.ts - operator error handling](../../packages/x-fidelity-plugins/src/xfiPluginAst/operators/astComplexity.ts)
3. [plugins.ts - PluginError type](../../packages/x-fidelity-types/src/plugins.ts)

---
