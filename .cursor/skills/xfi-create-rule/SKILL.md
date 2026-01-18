---
name: xfi-create-rule
description: End-to-end guide for creating a new X-Fidelity analysis rule. Use when creating rules, adding new checks, or when the user asks about rule development.
---

# Creating X-Fidelity Rules

This skill guides you through creating new analysis rules for X-Fidelity.

## Rule Types

| Type | Suffix | When It Runs | Example Use Case |
|------|--------|--------------|------------------|
| **Global** | `-global` | Once per repository | Missing required files, dependency checks |
| **Iterative** | `-iterative` | Once per matching file | Code complexity, pattern detection |

## Quick Start Checklist

Copy this checklist to track progress:

```
Rule Creation Progress:
- [ ] Step 1: Define rule purpose and type
- [ ] Step 2: Find or create required fact
- [ ] Step 3: Find or create required operator
- [ ] Step 4: Write rule JSON
- [ ] Step 5: Add to archetype
- [ ] Step 6: Test the rule
```

## Step 1: Define Rule Purpose

Determine:
1. **What the rule checks**: Specific condition to detect
2. **Rule type**: Global (repo-wide) or iterative (per-file)
3. **Event type**: `warning` (informational) or `fatality` (blocks CI)

## Step 2: Find or Create Required Fact

Facts collect data. Check existing facts in `packages/x-fidelity-plugins/src/`.

### Existing Facts by Plugin

| Plugin | Facts |
|--------|-------|
| `xfiPluginAst` | `functionComplexity`, `functionCount`, `astFact` |
| `xfiPluginDependency` | `repoDependencyFacts` |
| `xfiPluginFilesystem` | `repoFilesystemFacts` |
| `xfiPluginPatterns` | `globalFileAnalysis` |
| `xfiPluginReactPatterns` | `effectCleanup`, `hookDependency` |
| `xfiPluginRequiredFiles` | `missingRequiredFiles` |
| `xfiPluginExtractValues` | `extractValues` |
| `xfiPluginSimpleExample` | `customFact` |

### Creating a New Fact

If no existing fact works, create one in the appropriate plugin:

**File**: `packages/x-fidelity-plugins/src/xfiPlugin{Name}/facts/{factName}Fact.ts`

```typescript
import { FactDefn } from '@x-fidelity/types';
import { pluginLogger } from '@x-fidelity/core';

interface MyFactParams {
    resultFact?: string;
    threshold?: number;
}

export const myFact: FactDefn = {
    name: 'myFact',
    description: 'Description of what this fact collects',
    type: 'iterative-function',  // or 'global-function'
    priority: 1,
    fn: async (params: unknown, almanac?: unknown): Promise<any> => {
        const logger = pluginLogger.createOperationLogger('plugin-name', 'myFact');
        const factParams = params as MyFactParams;
        
        // Collect and return data
        const result = { /* collected data */ };
        
        // Optionally store result for later reference
        if (factParams?.resultFact && almanac?.addRuntimeFact) {
            almanac.addRuntimeFact(factParams.resultFact, result);
        }
        
        return result;
    }
};
```

**Add to plugin index**: Export the fact in `packages/x-fidelity-plugins/src/xfiPlugin{Name}/index.ts`

## Step 3: Find or Create Required Operator

Operators compare values. Check existing operators in the same plugin locations.

### Common Built-in Operators

From `json-rules-engine`:
- `equal`, `notEqual`
- `greaterThan`, `lessThan`, `greaterThanInclusive`, `lessThanInclusive`
- `in`, `notIn`, `contains`, `doesNotContain`

### Creating a New Operator

**File**: `packages/x-fidelity-plugins/src/xfiPlugin{Name}/operators/{operatorName}.ts`

```typescript
import { OperatorDefn } from '@x-fidelity/types';
import { pluginLogger } from '@x-fidelity/core';

export const myOperator: OperatorDefn = {
    name: 'myOperator',
    description: 'Description of comparison logic',
    fn: (factValue: any, operatorValue: any): boolean => {
        const logger = pluginLogger.createOperationLogger('plugin-name', 'myOperator');
        
        // Compare factValue against operatorValue
        // Return true if condition is met (rule triggers)
        return factValue > operatorValue;
    }
};
```

**Add to plugin index**: Export the operator alongside facts.

## Step 4: Write Rule JSON

Create rule file in `packages/x-fidelity-democonfig/src/rules/`

### Iterative Rule Template

**File**: `{ruleName}-iterative-rule.json`

```json
{
    "name": "myRule-iterative",
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
                    "resultFact": "myRuleResult",
                    "threshold": 10
                },
                "operator": "myOperator",
                "value": true
            }
        ]
    },
    "event": {
        "type": "warning",
        "params": {
            "message": "Description of what was detected",
            "details": {
                "fact": "myRuleResult"
            }
        }
    }
}
```

### Global Rule Template

**File**: `{ruleName}-global-rule.json`

```json
{
    "name": "myRule-global",
    "conditions": {
        "all": [
            {
                "fact": "fileData",
                "path": "$.fileName",
                "operator": "equal",
                "value": "REPO_GLOBAL_CHECK"
            },
            {
                "fact": "myFact",
                "params": {
                    "resultFact": "myRuleResult"
                },
                "operator": "myOperator",
                "value": true
            }
        ]
    },
    "event": {
        "type": "fatality",
        "params": {
            "message": "Critical issue detected",
            "details": {
                "fact": "myRuleResult"
            }
        }
    }
}
```

### Key Rule Elements

| Element | Purpose |
|---------|---------|
| `name` | Rule identifier with `-iterative` or `-global` suffix |
| `conditions.all` | All conditions must be true |
| `conditions.any` | At least one condition must be true |
| `fact` | Name of the fact to evaluate |
| `params` | Parameters passed to the fact |
| `params.resultFact` | Store result for use in event message |
| `operator` | Comparison operator to use |
| `value` | Value to compare against |
| `event.type` | `warning` or `fatality` |
| `event.params.details.fact` | Reference stored result in message |

## Step 5: Add to Archetype

Edit the archetype configuration to include your rule.

**File**: `packages/x-fidelity-democonfig/src/{archetype-name}.json`

```json
{
    "name": "node-fullstack",
    "rules": [
        "existingRule-iterative",
        "myRule-iterative"
    ]
}
```

**Note**: Rule name in archetype omits the `-rule.json` suffix but includes `-iterative` or `-global`.

## Step 6: Test the Rule

### Run tests

```bash
# Test the plugin
yarn workspace @x-fidelity/plugins test

# Run full test suite
yarn test
```

### Test with CLI

```bash
# Run analysis against test fixtures
cd packages/x-fidelity-fixtures/node-fullstack
yarn xfi --configServer local --archetype node-fullstack --debug
```

### Verify rule behavior

1. Check that the rule triggers when expected
2. Verify event message contains correct details
3. Confirm rule doesn't trigger on false positives

## Troubleshooting

### Rule Not Triggering

1. Verify fact is returning expected data
2. Check operator comparison logic
3. Confirm rule is added to archetype
4. Check file matches inclusion patterns

### Rule Triggering Incorrectly

1. Review fact data collection
2. Verify operator comparison threshold
3. Check condition logic (all vs any)

## Files Reference

| Purpose | Location |
|---------|----------|
| Facts | `packages/x-fidelity-plugins/src/xfiPlugin*/facts/` |
| Operators | `packages/x-fidelity-plugins/src/xfiPlugin*/operators/` |
| Rules | `packages/x-fidelity-democonfig/src/rules/` |
| Archetypes | `packages/x-fidelity-democonfig/src/*.json` |
| Plugin registry | `packages/x-fidelity-plugins/src/index.ts` |
