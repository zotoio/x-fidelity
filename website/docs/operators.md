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
- Long line splitting

### `outdatedFramework`

Verifies dependency versions against minimum requirements.

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

Features:
- Semver range support
- Nested dependency checking
- Pre-release version handling
- Package manager compatibility (npm/yarn)
- Build metadata support
- Complex version ranges

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
- Detailed reporting

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
- Error handling for AI responses

### `globalPatternRatio`

Evaluates the ratio of new API patterns to legacy patterns across the codebase.

```json
{
    "fact": "globalFileAnalysis",
    "params": {
        "newPatterns": ["newApiMethod\\("],
        "legacyPatterns": ["legacyApiMethod\\("],
        "fileFilter": "\\.(ts|js)$",
        "resultFact": "apiMigrationAnalysis"
    },
    "operator": "globalPatternRatio",
    "value": {
        "threshold": 0.8,
        "comparison": "gte"
    }
}
```

Features:
- Measures adoption of new APIs
- Tracks deprecation of legacy code
- Configurable threshold
- Supports multiple patterns
- Flexible comparison types (gte/lte)
- Detailed statistics

### `globalPatternCount`

Checks if a pattern appears a certain number of times across the codebase.

```json
{
    "fact": "globalFileAnalysis",
    "params": {
        "newPatterns": ["requiredMethod\\("],
        "fileFilter": "\\.(ts|js)$",
        "resultFact": "requiredMethodAnalysis"
    },
    "operator": "globalPatternCount",
    "value": {
        "threshold": 10,
        "comparison": "gte"
    }
}
```

Features:
- Ensures minimum/maximum usage of patterns
- Supports multiple patterns
- Configurable threshold
- Flexible comparison types (gte/lte)
- Detailed match information

### `hasFilesWithMultiplePatterns`

Identifies files that contain multiple specified patterns.

```json
{
    "fact": "globalFileAnalysis",
    "params": {
        "patterns": ["pattern1\\(", "pattern2\\("],
        "fileFilter": "\\.(ts|js)$",
        "outputGrouping": "file",
        "resultFact": "multiPatternAnalysis"
    },
    "operator": "hasFilesWithMultiplePatterns",
    "value": 2
}
```

Features:
- Finds files with multiple patterns
- Configurable threshold for pattern count
- Works with file-centric output grouping
- Detailed file reporting

### `regexMatch`

Tests if a string matches a regular expression pattern.

```json
{
    "fact": "fileData",
    "path": "$.filePath",
    "operator": "regexMatch",
    "value": "^.*\\/facts\\/(?!.*\\.test).*\\.ts$"
}
```

Features:
- Supports complex regex patterns
- Handles regex flags
- Supports /pattern/flags format
- Detailed error reporting

### `invalidRemoteValidation`

Validates extracted strings against remote endpoints.

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

Features:
- Remote API integration
- Pattern extraction with flags
- JSONPath validation
- Flexible HTTP methods
- Custom headers and body

### `missingRequiredFiles`

Checks if required files are missing from the repository.

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

Features:
- Path pattern matching
- Detailed reporting
- Support for glob patterns
- Path normalization

### `astComplexity`

Evaluates code complexity metrics from AST analysis.

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

Features:
- Multiple complexity metrics
- Configurable thresholds
- Function-level analysis
- Detailed reporting

### `functionCount`

Checks if a file contains too many functions.

```json
{
    "fact": "functionCount",
    "params": {
        "resultFact": "functionCountResult"
    },
    "operator": "functionCount",
    "value": 20
}
```

Features:
- Counts all function types
- Configurable threshold
- Detailed reporting
- File-level analysis

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
        try {
            // Your logic here
            return true; // or false
        } catch (e) {
            logger.error(`customOperator error: ${e}`);
            return false;
        }
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
   - Provide detailed error messages

2. **Performance**:
   - Keep operations lightweight
   - Cache results when possible
   - Use async/await for I/O operations
   - Log performance metrics

3. **Security**:
   - Validate all inputs
   - Protect against path traversal
   - Handle sensitive data carefully
   - Use maskSensitiveData for logging

4. **Testing**:
   - Write comprehensive unit tests
   - Test edge cases and boundary conditions
   - Mock external dependencies
   - Test error handling

5. **Flexibility**:
   - Support multiple input formats
   - Provide configurable options
   - Handle edge cases gracefully
   - Document expected inputs and outputs

## Next Steps

- Learn about [Facts](facts)
- Explore [Rules](rules)
- Create [Custom Plugins](plugins/overview)
