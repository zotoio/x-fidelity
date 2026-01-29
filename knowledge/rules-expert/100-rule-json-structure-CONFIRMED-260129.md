# Topic: Rule JSON Structure

## Fact: Global vs Iterative Rule Types
### Modified: 2026-01-29
### Priority: H

X-Fidelity has two rule types distinguished by their naming suffix:

**Global Rules** (`-global` suffix):
- Execute once per analysis run against the entire repository
- Use `REPO_GLOBAL_CHECK` as the fileData.fileName sentinel value
- Examples: dependency version checks, directory structure validation, required files

```json
{
    "name": "outdatedFramework-global",
    "conditions": {
        "all": [
            {
                "fact": "fileData",
                "path": "$.fileName",
                "operator": "equal",
                "value": "REPO_GLOBAL_CHECK"
            },
            // additional conditions...
        ]
    }
}
```

**Iterative Rules** (`-iterative` suffix):
- Execute for each file matching archetype inclusion patterns
- Check `fileData.fileName != "REPO_GLOBAL_CHECK"` to ensure per-file execution
- Examples: sensitive logging detection, function complexity, pattern matching

```json
{
    "name": "sensitiveLogging-iterative",
    "conditions": {
        "all": [
            {
                "fact": "fileData",
                "path": "$.fileName",
                "operator": "notEqual",
                "value": "REPO_GLOBAL_CHECK"
            },
            // file-specific conditions...
        ]
    }
}
```

### References
1. [outdatedFramework-global-rule.json](../../packages/x-fidelity-democonfig/src/rules/outdatedFramework-global-rule.json)
2. [sensitiveLogging-iterative-rule.json](../../packages/x-fidelity-democonfig/src/rules/sensitiveLogging-iterative-rule.json)

---

## Fact: Rule Condition Structure with Facts and Operators
### Modified: 2026-01-29
### Priority: H

Rules use json-rules-engine conditions with facts, operators, and values:

**Condition Structure:**
```json
{
    "conditions": {
        "all": [  // or "any" for OR logic
            {
                "fact": "factName",           // Name of registered fact
                "path": "$.jsonPath",         // Optional: JSON path into fact result
                "params": {                   // Optional: Parameters passed to fact function
                    "resultFact": "almKey",   // Where to store results in almanac
                    "thresholds": { ... }     // Fact-specific configuration
                },
                "operator": "operatorName",   // Custom or built-in operator
                "value": true                 // Value to compare against
            }
        ]
    }
}
```

**Common Pattern Parameters:**
- `resultFact`: Almanac key where fact stores detailed results for event reporting
- `checkPattern`: Array of regex patterns for file content matching
- `thresholds`: Numeric thresholds for complexity checks

**Built-in Operators:** `equal`, `notEqual`, `greaterThan`, `lessThan`, `in`, `notIn`, `contains`

**Custom Operators** (from plugins): `outdatedFramework`, `fileContains`, `astComplexity`, `missingRequiredFiles`

### References
1. [functionComplexity-iterative-rule.json](../../packages/x-fidelity-democonfig/src/rules/functionComplexity-iterative-rule.json)
2. [engineSetup.ts - operator registration](../../packages/x-fidelity-core/src/core/engine/engineSetup.ts)

---

## Fact: Event Types and Severity Handling
### Modified: 2026-01-29
### Priority: H

When rule conditions evaluate to true, an event is triggered. Event configuration determines severity and messaging:

**Event Structure:**
```json
{
    "event": {
        "type": "warning|fatality|exempt",  // Severity level
        "params": {
            "message": "Human-readable description",
            "details": {
                "fact": "resultFactKey"  // Reference to almanac fact for details
            }
        }
    }
}
```

**Event Types:**
- `warning`: Informational issue, does not block CI pipeline
- `fatality`: Critical issue, blocks CI pipeline and fails the analysis
- `exempt`: Rule was matched but exempted (set automatically by engine for exempted rules)

**Optional Error Handling:**
```json
{
    "errorBehavior": "fatal",
    "onError": {
        "action": "sendNotification",
        "params": {
            "channel": "security-alerts",
            "priority": "high"
        }
    }
}
```

The engine emits telemetry for all event types including condition details, operator thresholds, and params for observability.

### References
1. [outdatedFramework-global-rule.json](../../packages/x-fidelity-democonfig/src/rules/outdatedFramework-global-rule.json)
2. [engineSetup.ts - event handling](../../packages/x-fidelity-core/src/core/engine/engineSetup.ts)

---

## Fact: Rule Naming Conventions and File Organization
### Modified: 2026-01-29
### Priority: M

Rules follow strict naming conventions for discovery and classification:

**Naming Pattern:** `{ruleName}-{type}-rule.json`
- `{ruleName}`: CamelCase descriptive name (e.g., `sensitiveLogging`, `functionComplexity`)
- `{type}`: Either `global` or `iterative`
- Suffix: Always `-rule.json`

**Examples:**
- `sensitiveLogging-iterative-rule.json` → Rule name: `sensitiveLogging-iterative`
- `outdatedFramework-global-rule.json` → Rule name: `outdatedFramework-global`
- `missingRequiredFiles-global-rule.json` → Rule name: `missingRequiredFiles-global`

**Rule Name in JSON:**
The `name` field inside the JSON must match the file prefix (without `-rule.json`):
```json
{
    "name": "sensitiveLogging-iterative",  // Must match filename prefix
    ...
}
```

**Archetype Reference:**
Archetypes reference rules by their name (not filename):
```json
{
    "rules": [
        "sensitiveLogging-iterative",
        "outdatedFramework-global"
    ]
}
```

### References
1. [rules directory](../../packages/x-fidelity-democonfig/src/rules/)
2. [node-fullstack.json - rule references](../../packages/x-fidelity-democonfig/src/node-fullstack.json)
