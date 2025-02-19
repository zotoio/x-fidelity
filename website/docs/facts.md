---
sidebar_position: 7
---

# Facts

Facts are data providers in x-fidelity that collect and provide information about your codebase for rule evaluation.

## Overview

Facts are functions that:
- Gather data about your codebase
- Feed information into rule conditions
- Can be synchronous or asynchronous
- Support custom implementations via plugins

## Built-in Facts

### `repoFilesystemFacts`

Provides information about files in the repository.

Features:
- Recursive directory traversal
- File content reading
- Path filtering
- Symlink handling
- Security checks

Example usage in a rule:
```json
{
    "fact": "fileData",
    "path": "$.fileContent",
    "operator": "fileContains",
    "value": "TODO"
}
```

### `repoDependencyFacts`

Analyzes project dependencies.

Features:
- Support for npm and Yarn
- Version comparison
- Nested dependency analysis
- Pre-release version handling

Example usage in a rule:
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

### `openaiAnalysisFacts`

Provides AI-powered code analysis (requires OpenAI integration).

Features:
- Custom prompts
- Severity scoring
- Code suggestions
- Security analysis

Example usage in a rule:
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

### `remoteSubstringValidation`

Validates extracted strings against remote endpoints.

Features:
- Pattern extraction
- Remote API validation
- Flexible HTTP methods
- Response parsing

Example usage in a rule:
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

## Creating Custom Facts

You can create custom facts by implementing the `FactDefn` interface:

```typescript
interface FactDefn {
    name: string;
    fn: (params: any, almanac: any) => Promise<any>;
    priority?: number;
}
```

Example implementation:
```javascript
const customFact = {
    name: 'myCustomFact',
    fn: async (params, almanac) => {
        // Your fact logic here
        return { result: 'custom data' };
    },
    priority: 1
};
```

## Best Practices

1. **Performance**:
   - Cache expensive operations
   - Use async/await for I/O
   - Implement proper error handling

2. **Security**:
   - Validate all inputs
   - Sanitize file paths
   - Handle sensitive data carefully

3. **Maintainability**:
   - Document your facts
   - Include unit tests
   - Follow naming conventions

4. **Integration**:
   - Use consistent return formats
   - Handle dependencies properly
   - Consider fact priorities

## Next Steps

- Learn about [Operators](operators)
- Explore [Rules](rules)
- Create [Custom Plugins](plugins/overview)
