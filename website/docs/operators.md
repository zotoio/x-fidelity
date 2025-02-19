---
sidebar_position: 6
---

# Operators

x-fidelity includes several built-in operators that can be used in your rules to evaluate conditions. Here's a comprehensive guide to each operator.

## Overview

Operators are functions that:
- Evaluate conditions in rules
- Return boolean values (true indicates a rule failure)
- Can be customized and extended
- Support both simple and complex validations

## Built-in Operators

### `fileContains`

Checks if files contain specific patterns or strings.

```json
{
    "fact": "repoFileAnalysis",
    "params": {
        "checkPattern": ["password", "apiKey"],
        "resultFact": "fileResults"
    },
    "operator": "fileContains",
    "value": true
}
```

Features:
- Supports multiple patterns
- Line number tracking
- Sensitive data masking
- Multi-line content analysis

### `outdatedFramework`

Verifies dependency versions against minimum requirements.

```json
{
    "fact": "repoDependencyAnalysis",
    "params": {
        "resultFact": "dependencyResults"
    },
    "operator": "outdatedFramework",
    "value": true
}
```

Features:
- Semver range support
- Nested dependency checking
- Pre-release version handling
- Package manager compatibility (npm/yarn)

### `nonStandardDirectoryStructure`

Validates project directory structure against defined standards.

```json
{
    "fact": "fileData",
    "path": "$.filePath",
    "operator": "nonStandardDirectoryStructure",
    "value": {
        "fact": "standardStructure"
    }
}
```

Features:
- Recursive directory validation
- Blacklist/whitelist support
- Symlink handling
- Path traversal protection

### `openaiAnalysisHighSeverity`

Evaluates AI-generated analysis results for high-severity issues.

```json
{
    "fact": "openaiAnalysis",
    "params": {
        "prompt": "Identify security issues",
        "resultFact": "securityAnalysis"
    },
    "operator": "openaiAnalysisHighSeverity",
    "value": 8
}
```

Features:
- Configurable severity threshold
- Detailed issue reporting
- AI-powered analysis
- Custom prompt support

### `invalidRemoteValidation`

Validates extracted strings against remote endpoints.

```json
{
    "fact": "remoteSubstringValidation",
    "params": {
        "pattern": "\"systemId\":[\\s]*\"([a-z]*)\"",
        "validationParams": {
            "url": "http://validator.example.com/check",
            "method": "POST",
            "headers": {
                "Content-Type": "application/json"
            },
            "body": {
                "value": "#MATCH#"
            },
            "checkJsonPath": "$.valid"
        },
        "resultFact": "validationResult"
    },
    "operator": "invalidRemoteValidation",
    "value": true
}
```

Features:
- Remote API integration
- Pattern extraction
- JSONPath validation
- Flexible HTTP methods

## Creating Custom Operators

You can create custom operators by:

1. Implementing the `OperatorDefn` interface:
```typescript
interface OperatorDefn {
    name: string;
    fn: (factValue: any, params: any) => boolean;
}
```

2. Creating the operator function:
```javascript
const customOperator = {
    name: 'customOperator',
    fn: (factValue, params) => {
        // Your logic here
        return true; // or false
    }
};
```

3. Adding it to your plugin:
```javascript
module.exports = {
    name: 'my-plugin',
    version: '1.0.0',
    operators: [customOperator]
};
```

## Best Practices

1. **Error Handling**:
   - Always include try/catch blocks
   - Log errors appropriately
   - Return false for non-fatal errors

2. **Performance**:
   - Keep operations lightweight
   - Cache results when possible
   - Use async/await for I/O operations

3. **Security**:
   - Validate all inputs
   - Protect against path traversal
   - Handle sensitive data carefully

4. **Testing**:
   - Write comprehensive unit tests
   - Test edge cases
   - Mock external dependencies

## Next Steps

- Learn about [Facts](facts)
- Explore [Rules](rules)
- Create [Custom Plugins](plugins/overview)
