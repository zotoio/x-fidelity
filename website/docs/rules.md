---
sidebar_position: 5
---

# Rules

Rules are the core building blocks of x-fidelity's analysis system. They define what to check for and how to respond to findings.

## Rule Structure

A rule consists of:
- **Name**: Unique identifier with suffix indicating scope (`-global` or `-iterative`)
- **Conditions**: Logic to evaluate using facts and operators
- **Event**: Action to take when conditions are met
- **Error Behavior**: Optional handling of execution errors
- **Error Actions**: Optional custom actions to take on errors

Example rule:
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
            {
                "fact": "repoFileAnalysis",
                "params": {
                    "checkPattern": ["password", "apiKey"],
                    "resultFact": "fileResults"
                },
                "operator": "fileContains",
                "value": true
            }
        ]
    },
    "event": {
        "type": "warning",
        "params": {
            "message": "Potential sensitive data exposure",
            "details": {
                "fact": "fileResults"
            }
        }
    },
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

## Rule Types

### Global Rules
- Applied once per repository
- Use suffix `-global`
- Check repository-wide concerns
- Examples: dependency versions, directory structure

### Iterative Rules
- Applied to each matching file
- Use suffix `-iterative`
- Check file-specific concerns
- Examples: sensitive data, coding patterns

## Conditions

Conditions define when a rule should trigger. They can use:
- **Facts**: Data about the codebase
- **Operators**: Functions to evaluate conditions
- **Paths**: JSONPath expressions to access nested data
- **Values**: Expected results to compare against

### Condition Types

#### All Conditions
```json
"conditions": {
    "all": [
        { /* condition 1 */ },
        { /* condition 2 */ }
    ]
}
```
All conditions must be true for the rule to trigger.

#### Any Conditions
```json
"conditions": {
    "any": [
        { /* condition 1 */ },
        { /* condition 2 */ }
    ]
}
```
At least one condition must be true for the rule to trigger.

## Events

Events define what happens when conditions are met:

```json
"event": {
    "type": "warning",
    "params": {
        "message": "Description of the issue",
        "details": {
            "fact": "resultFactName"
        }
    }
}
```

### Event Types
- **warning**: Issue that should be addressed but won't fail the build
- **fatality**: Critical issue that will fail the build
- **exempt**: Rule is currently exempted for this repository

## Error Handling

### Error Behavior
```json
"errorBehavior": "fatal"  // or "swallow"
```
- **fatal**: Stop execution on error
- **swallow**: Continue execution after error

### Error Actions
```json
"onError": {
    "action": "sendNotification",
    "params": {
        "channel": "alerts",
        "priority": "high"
    }
}
```

Built-in error actions:
- **sendNotification**: Send alert to configured channel
- **logToFile**: Write error details to log file

## Best Practices

1. **Naming**:
   - Use descriptive names
   - Include correct scope suffix
   - Follow `kebab-case` convention

2. **Conditions**:
   - Keep conditions focused
   - Use appropriate operators
   - Consider performance impact

3. **Events**:
   - Write clear messages
   - Include relevant details
   - Use appropriate event type

4. **Error Handling**:
   - Define error behavior explicitly
   - Implement appropriate error actions
   - Log sufficient details

5. **Testing**:
   - Test rules with various inputs
   - Verify error handling
   - Check exemption behavior

## Next Steps

- **[Rule Builder GUI](https://zotoio.github.io/x-fidelity/rule-builder/)** - Create rules visually without writing JSON
- Learn about [Operators](operators)
- Explore [Facts](facts)
- Understand [Exemptions](exemptions)
- Try the [Rules Cookbook](rules/rules-cookbook) for practical examples
