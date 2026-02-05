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
- Path traversal protection

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
- Support for npm, Yarn, and pnpm
- Version comparison
- Nested dependency analysis
- Pre-release version handling
- Circular dependency detection
- Namespaced package support

Example usage in a rule:
```json
{
    "fact": "repoDependencyAnalysis",
    "params": {
        "resultFact": "dependencyResults",
        "minimumDependencyVersions": {
            "react": ">=17.0.0",
            "typescript": "^4.0.0"
        }
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
- Response format validation
- JSON schema validation

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

### `globalFileAnalysisFacts`

Analyzes patterns across multiple files to track API migrations and library upgrades.

Features:
- Separate tracking of new and legacy patterns
- File filtering by extension or path
- Detailed match information
- Statistical analysis of adoption rates
- Multiple output grouping options (file or pattern-centric)
- Line number and context tracking

Example usage in a rule:
```json
{
    "fact": "globalFileAnalysis",
    "params": {
        "newPatterns": ["newApiMethod\\(", "modernApiCall\\("],
        "legacyPatterns": ["legacyApiMethod\\(", "deprecatedApiCall\\("],
        "fileFilter": "\\.(ts|js)$",
        "outputGrouping": "pattern",
        "resultFact": "apiMigrationAnalysis"
    },
    "operator": "globalPatternRatio",
    "value": 0.8
}
```

### `remoteSubstringValidation`

Validates extracted strings against remote endpoints.

Features:
- Pattern extraction
- Remote API validation
- Flexible HTTP methods
- Response parsing
- JSONPath validation
- Custom headers and body

Example usage in a rule:
```json
{
    "fact": "remoteSubstringValidation",
    "params": {
        "pattern": "\"systemId\":[\\s]*\"([a-z]*)\"",
        "flags": "gi",
        "validationParams": {
            "url": "http://validator.example.com/check",
            "method": "POST",
            "headers": {
                "Content-Type": "application/json"
            },
            "body": {
                "systemId": "#MATCH#"
            },
            "checkJsonPath": "$.validSystems[?(@.id == '#MATCH#')]"
        },
        "resultFact": "validationResult"
    },
    "operator": "invalidRemoteValidation",
    "value": true
}
```

### `missingRequiredFiles`

Checks for required files in the repository.

Features:
- Path pattern matching
- Detailed reporting
- Support for glob patterns
- Path normalization

Example usage in a rule:
```json
{
    "fact": "missingRequiredFiles",
    "params": {
        "requiredFiles": [
            "/README.md",
            "/CONTRIBUTING.md",
            "/LICENSE"
        ],
        "resultFact": "missingRequiredFilesResult"
    },
    "operator": "missingRequiredFiles",
    "value": true
}
```

### AST-Based Facts

Several facts are available for analyzing code structure:

#### `functionComplexity`

Analyzes function complexity metrics.

Features:
- Cyclomatic complexity
- Cognitive complexity
- Nesting depth
- Parameter count
- Return count

Example usage:
```json
{
    "fact": "functionComplexity",
    "params": {
        "resultFact": "complexityResult",
        "thresholds": {
            "cyclomaticComplexity": 20,
            "cognitiveComplexity": 30,
            "nestingDepth": 10,
            "parameterCount": 5,
            "returnCount": 10
        }
    },
    "operator": "astComplexity",
    "value": {
        "cyclomaticComplexity": 20,
        "cognitiveComplexity": 30,
        "nestingDepth": 10,
        "parameterCount": 5,
        "returnCount": 10
    }
}
```

#### `functionCount`

Counts functions in a file.

Features:
- Function type detection
- Named and anonymous functions
- Arrow functions
- Method definitions

#### `codeRhythm`

Analyzes code structure and flow.

Features:
- Consistency measurement
- Complexity analysis
- Readability scoring

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

## Performance Tracking

Facts are automatically tracked for performance metrics:
- Execution count
- Total execution time
- Average execution time
- Longest execution time

These metrics are included in the analysis results and can help identify performance bottlenecks.

## Best Practices

1. **Performance**:
   - Cache expensive operations
   - Use async/await for I/O
   - Implement proper error handling
   - Consider setting appropriate priorities

2. **Security**:
   - Validate all inputs
   - Sanitize file paths
   - Handle sensitive data carefully
   - Use maskSensitiveData for logging

3. **Maintainability**:
   - Document your facts
   - Include unit tests
   - Follow naming conventions
   - Use consistent result formats

4. **Integration**:
   - Always add results to almanac with addRuntimeFact
   - Handle dependencies properly
   - Consider fact priorities
   - Provide detailed error information

## Next Steps

- Learn about [Operators](operators)
- Explore [Rules](rules)
- Create [Custom Plugins](plugins/overview)
