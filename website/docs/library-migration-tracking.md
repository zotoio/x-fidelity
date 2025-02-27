---
sidebar_position: 12
---

# Library Migration Tracking

x-fidelity provides powerful tools to track and manage API migrations and library upgrades across your codebase.

## Overview

When upgrading libraries or migrating from legacy APIs to new ones, it's crucial to:
- Track adoption progress
- Ensure consistent usage across teams
- Identify areas needing focused migration efforts
- Know when you can safely remove deprecated APIs

x-fidelity's global pattern analysis features make this process transparent and measurable.

## Global Pattern Analysis

The `globalFileAnalysis` fact and related operators allow you to:
1. Define patterns representing new and legacy API usage
2. Analyze their occurrence across your entire codebase
3. Calculate adoption ratios and statistics
4. Set thresholds for acceptable migration progress

### Basic Configuration

```json
{
    "name": "apiMigrationProgress-global",
    "conditions": {
        "all": [
            {
                "fact": "fileData",
                "path": "$.fileName",
                "operator": "equal",
                "value": "REPO_GLOBAL_CHECK"
            },
            {
                "fact": "globalFileAnalysis",
                "params": {
                    "newPatterns": [
                        "newApiMethod\\(",
                        "modernApiCall\\("
                    ],
                    "legacyPatterns": [
                        "legacyApiMethod\\(",
                        "deprecatedApiCall\\("
                    ],
                    "fileFilter": "\\.(ts|js)$",
                    "resultFact": "apiMigrationAnalysis"
                },
                "operator": "globalPatternRatio",
                "value": 0.8
            }
        ]
    },
    "event": {
        "type": "warning",
        "params": {
            "message": "The codebase is not consistently using the new API methods. At least 80% of API calls should use the new methods.",
            "details": {
                "fact": "apiMigrationAnalysis"
            }
        }
    }
}
```

This rule checks if at least 80% of API calls use the new methods instead of legacy ones.

## Real-World Examples

### React Hooks Migration

Track migration from class components to functional components with hooks:

```json
{
    "fact": "globalFileAnalysis",
    "params": {
        "newPatterns": [
            "useState\\(",
            "useEffect\\(",
            "const\\s+\\w+\\s*=\\s*\\(\\)\\s*=>\\s*{"
        ],
        "legacyPatterns": [
            "extends\\s+React\\.Component",
            "componentDidMount\\(",
            "this\\.setState\\("
        ],
        "fileFilter": "\\.(jsx|tsx)$",
        "resultFact": "reactHooksMigration"
    },
    "operator": "globalPatternRatio",
    "value": 0.7
}
```

### TypeScript Adoption

Track migration from JavaScript to TypeScript:

```json
{
    "fact": "globalFileAnalysis",
    "params": {
        "newPatterns": [
            "\\.ts$",
            "\\.tsx$"
        ],
        "legacyPatterns": [
            "\\.js$",
            "\\.jsx$"
        ],
        "fileFilter": "\\.(js|jsx|ts|tsx)$",
        "resultFact": "typescriptAdoption"
    },
    "operator": "globalPatternRatio",
    "value": 0.5
}
```

### Logging Framework Migration

Track migration from console.log to a structured logging framework:

```json
{
    "fact": "globalFileAnalysis",
    "params": {
        "newPatterns": [
            "logger\\.info\\(",
            "logger\\.error\\(",
            "logger\\.debug\\("
        ],
        "legacyPatterns": [
            "console\\.log\\(",
            "console\\.error\\(",
            "console\\.warn\\("
        ],
        "fileFilter": "\\.(js|ts)$",
        "resultFact": "loggingFrameworkAdoption"
    },
    "operator": "globalPatternRatio",
    "value": 0.9
}
```

## Developer Experience

### Gradual Adoption Strategy

1. **Start with low thresholds**: Begin with a low ratio threshold (e.g., 0.2 or 20%)
2. **Increase over time**: Gradually increase the threshold as teams adopt the new patterns
3. **Use warnings first**: Start with warning-level events before making them fatal
4. **Provide exemptions**: Use the exemption system for legitimate exceptions

### Detailed Reporting

The `globalFileAnalysis` fact provides detailed information about:
- Which files contain legacy patterns
- Line numbers and context for each match
- Total counts for each pattern
- Overall statistics

This helps developers identify exactly where changes are needed.

### Integration with CI/CD

Add these checks to your CI/CD pipeline to:
- Track migration progress over time
- Prevent regression to legacy patterns
- Ensure consistent adoption across teams
- Provide visibility to management

## Best Practices

1. **Choose patterns carefully**: Ensure patterns are specific enough to avoid false positives
2. **Document the migration plan**: Share the timeline and expected thresholds with all teams
3. **Provide migration guides**: Create documentation on how to update from legacy to new patterns
4. **Monitor progress**: Regularly review the analysis results to track adoption
5. **Celebrate milestones**: Acknowledge teams when they reach migration targets

## Next Steps

- Learn about [Exemptions](exemptions) for handling special cases
- Explore [CI/CD Integration](ci-cd/overview) for automated checks
- Set up [Telemetry](telemetry) to track progress over time
