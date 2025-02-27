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

### Setting Up Migration Dashboards

Create dashboards to visualize migration progress:

1. **Configure telemetry collection**:
   ```bash
   xfidelity . -t https://telemetry.example.com
   ```

2. **Add custom metadata to track progress over time**:
   ```json
   "event": {
       "type": "warning",
       "params": {
           "message": "Migration in progress",
           "metadata": {
               "migrationId": "react-hooks-migration",
               "currentRatio": {
                   "fact": "apiMigrationAnalysis.summary.newPatternsTotal"
               },
               "totalPatterns": {
                   "fact": "apiMigrationAnalysis.summary.totalMatches"
               }
           }
       }
   }
   ```

3. **Visualize progress** using tools like Grafana or custom dashboards

### Automated Migration Tools

Combine x-fidelity with code modification tools:

1. **Identify targets**:
   ```bash
   # Export list of files needing migration
   xfidelity . --export-results migration-targets.json
   ```

2. **Generate migration scripts**:
   ```bash
   # Create migration script based on results
   node generate-migration.js --input migration-targets.json
   ```

3. **Apply changes and verify**:
   ```bash
   # Apply changes
   node apply-migration.js
   
   # Verify changes
   xfidelity . --verify-migration
   ```

## Integration with CI/CD

Add these checks to your CI/CD pipeline to:
- Track migration progress over time
- Prevent regression to legacy patterns
- Ensure consistent adoption across teams
- Provide visibility to management

### GitHub Actions Example

```yaml
name: Library Migration Check

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  migration-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install x-fidelity
        run: yarn global add x-fidelity
      - name: Check migration progress
        run: |
          xfidelity . -a migration-tracking
          # Extract progress metrics for PR comment
          node .github/scripts/extract-migration-metrics.js
      - name: Comment PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const metrics = JSON.parse(fs.readFileSync('migration-metrics.json', 'utf8'));
            const progressBar = createProgressBar(metrics.ratio);
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## Migration Progress\n${progressBar}\n**Current ratio:** ${metrics.ratio * 100}%\n**Target:** 80%`
            });
```

## Best Practices

1. **Choose patterns carefully**: Ensure patterns are specific enough to avoid false positives
2. **Document the migration plan**: Share the timeline and expected thresholds with all teams
3. **Provide migration guides**: Create documentation on how to update from legacy to new patterns
4. **Monitor progress**: Regularly review the analysis results to track adoption
5. **Celebrate milestones**: Acknowledge teams when they reach migration targets
6. **Automate where possible**: Create tools to assist with repetitive migration tasks
7. **Set realistic timelines**: Base deadlines on codebase size and complexity

## Next Steps

- Learn about [Exemptions](exemptions) for handling special cases
- Explore [CI/CD Integration](ci-cd/overview) for automated checks
- Set up [Telemetry](telemetry) to track progress over time
