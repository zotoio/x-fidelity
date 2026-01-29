---
name: xfi-create-archetype
description: Guide for creating a new X-Fidelity archetype configuration. Use when defining project templates, configuring rule sets, or setting up dependency requirements.
---

# Creating X-Fidelity Archetypes

This skill guides you through creating a new archetype configuration for X-Fidelity.

## What is an Archetype?

An archetype is a project template that defines:
- Which rules to apply
- Minimum dependency versions
- Expected directory structure
- File inclusion/exclusion patterns
- Notification settings
- Exemption configurations

## Quick Start Checklist

```
Archetype Creation:
- [ ] Step 1: Define archetype purpose
- [ ] Step 2: Create archetype JSON
- [ ] Step 3: Select rules to include
- [ ] Step 4: Configure dependency versions
- [ ] Step 5: Define directory structure
- [ ] Step 6: Set file patterns
- [ ] Step 7: Create exemptions file
- [ ] Step 8: Test the archetype
```

## Archetype Structure

```
packages/x-fidelity-democonfig/src/
├── {archetype-name}.json                    # Main archetype config
├── {archetype-name}-exemptions.json         # Default exemptions
└── {archetype-name}-exemptions/             # Team/project exemptions
    ├── team1-{archetype-name}-exemptions.json
    └── project1-{archetype-name}-exemptions.json
```

## Step 1: Define Archetype Purpose

Before creating, determine:
- **Target project type**: Node.js, Java, Python, etc.
- **Framework focus**: React, Spring Boot, Django, etc.
- **Strictness level**: Development vs production
- **Team requirements**: Specific rules or exemptions

## Step 2: Create Archetype JSON

**File**: `packages/x-fidelity-democonfig/src/{archetype-name}.json`

### Minimal Archetype

```json
{
    "name": "my-archetype",
    "rules": [
        "sensitiveLogging-iterative",
        "missingRequiredFiles-global"
    ],
    "config": {
        "blacklistPatterns": [
            ".*\\/node_modules\\/.*",
            ".*\\/\\..*"
        ],
        "whitelistPatterns": [
            ".*\\.(ts|js)$"
        ]
    }
}
```

### Full Archetype

```json
{
    "name": "my-archetype",
    "rules": [
        "sensitiveLogging-iterative",
        "outdatedFramework-global",
        "missingRequiredFiles-global",
        "nonStandardDirectoryStructure-global",
        "functionComplexity-iterative"
    ],
    "config": {
        "minimumDependencyVersions": {
            "typescript": "5.0.0",
            "react": "18.2.0"
        },
        "standardStructure": {
            "src": {
                "components": null,
                "utils": null
            },
            "package.json": null,
            "README.md": null
        },
        "blacklistPatterns": [
            ".*\\/\\..*",
            ".*\\.(log|lock|txt)$",
            ".*\\/(dist|coverage|build|node_modules)(\\/.*|$)"
        ],
        "whitelistPatterns": [
            ".*\\.(ts|tsx|js|jsx|json)$",
            ".*\\/README\\.md$"
        ],
        "requiredFiles": [
            "README.md",
            "package.json"
        ],
        "sensitiveFileFalsePositives": [
            "src/test/**"
        ],
        "notifications": {
            "enabled": true,
            "providers": ["email"],
            "recipients": {
                "email": ["team@example.com"]
            },
            "codeOwners": true,
            "notifyOnSuccess": true,
            "notifyOnFailure": true
        }
    }
}
```

## Step 3: Select Rules

### Available Rule Types

| Suffix | Type | Runs |
|--------|------|------|
| `-global` | Global | Once per repository |
| `-iterative` | Iterative | Once per matching file |

### Finding Available Rules

Check `packages/x-fidelity-democonfig/src/rules/` for available rules.

### Common Rules by Category

**Code Quality**:
- `functionComplexity-iterative` - Cyclomatic complexity check
- `functionCount-iterative` - Function count per file

**Security**:
- `sensitiveLogging-iterative` - Detect credential logging
- `noDatabases-iterative` - Prevent database config in code

**Dependencies**:
- `outdatedFramework-global` - Version requirement check

**Structure**:
- `missingRequiredFiles-global` - Required file check
- `nonStandardDirectoryStructure-global` - Directory layout

**React**:
- `reactHooksDependency-iterative` - Hook dependency arrays
- `reactHooksMigration-global` - Migration patterns

## Step 4: Configure Dependencies

### Version Syntax

```json
{
    "minimumDependencyVersions": {
        "react": "18.2.0",           // Exact version
        "typescript": ">=5.0.0",     // Minimum version
        "next": "^13.0.0",           // Compatible version
        "node": ">=18.0.0 <23.0.0",  // Range
        "@types/react": ">=18.0.0"   // Scoped packages
    }
}
```

### Semver Operators

| Operator | Meaning |
|----------|---------|
| `1.2.3` | Exact version |
| `>=1.2.3` | Minimum version |
| `^1.2.3` | Compatible (same major) |
| `~1.2.3` | Approximate (same minor) |
| `<1.2.3` | Less than |
| `1.0.0 - 2.0.0` | Range |
| `1.0.0 \|\| 2.0.0` | Either version |

## Step 5: Define Directory Structure

### Structure Format

```json
{
    "standardStructure": {
        "src": {                    // Required directory
            "components": null,     // Required subdirectory
            "utils": null,
            "config": null
        },
        "tests": null,              // Required directory
        "package.json": null,       // Required file
        "README.md": null
    }
}
```

- Object = directory with children
- `null` = terminal (file or empty directory)

## Step 6: Set File Patterns

### Blacklist (Exclude)

Files matching these patterns are **skipped**:

```json
{
    "blacklistPatterns": [
        ".*\\/\\..*",                                    // Hidden files
        ".*\\.(log|lock|txt)$",                         // Log files
        ".*\\/(node_modules|dist|build)(\\/.*|$)"      // Build dirs
    ]
}
```

### Whitelist (Include)

Only files matching these patterns are **analyzed**:

```json
{
    "whitelistPatterns": [
        ".*\\.(ts|tsx|js|jsx)$",     // TypeScript/JavaScript
        ".*\\.(json|yml|yaml)$",     // Config files
        ".*\\/README\\.md$"          // Specific file
    ]
}
```

### Pattern Syntax

Patterns use Java regex syntax:
- `.*` - Any characters
- `\\.` - Literal dot
- `$` - End of string
- `\\/` - Path separator
- `(a|b)` - Either a or b

## Step 7: Create Exemptions

### Default Exemptions

**File**: `packages/x-fidelity-democonfig/src/{archetype-name}-exemptions.json`

```json
[
    {
        "repoUrl": "*",
        "rule": "sensitiveLogging-iterative",
        "expirationDate": "2025-12-31",
        "reason": "Known pattern allowed in all repos"
    }
]
```

### Team Exemptions

**File**: `packages/x-fidelity-democonfig/src/{archetype-name}-exemptions/team1-{archetype-name}-exemptions.json`

```json
[
    {
        "repoUrl": "git@github.com:org/repo.git",
        "rule": "functionComplexity-iterative",
        "expirationDate": "2025-06-30",
        "reason": "Legacy code refactor scheduled for Q2"
    }
]
```

### Exemption Fields

| Field | Required | Description |
|-------|----------|-------------|
| `repoUrl` | Yes | Git URL or `*` for all |
| `rule` | Yes | Rule name to exempt |
| `expirationDate` | Yes | YYYY-MM-DD format |
| `reason` | Yes | Justification |

## Step 8: Test the Archetype

### Local Testing

```bash
# Run with your archetype
cd /path/to/test/project
xfi --archetype my-archetype --configServer local

# Debug mode
xfi --archetype my-archetype --configServer local --debug
```

### Verify Rules Execute

```bash
xfi --archetype my-archetype --debug 2>&1 | grep -E "(rule|trigger)"
```

## Configuration Options

### Notifications

```json
{
    "notifications": {
        "enabled": true,
        "providers": ["email", "slack"],
        "recipients": {
            "email": ["team@example.com"],
            "slack": ["#quality-alerts"]
        },
        "codeOwners": true,
        "notifyOnSuccess": true,
        "notifyOnFailure": true,
        "customTemplates": {
            "success": "All checks passed! ✅",
            "failure": "Issues found: ${totalIssues}"
        }
    }
}
```

### Template Variables

Available in notification templates:
- `${archetype}` - Archetype name
- `${fileCount}` - Files analyzed
- `${executionTime}` - Analysis duration
- `${totalIssues}` - Issue count
- `${warningCount}` - Warning count
- `${errorCount}` - Error count
- `${fatalityCount}` - Fatality count
- `${affectedFiles}` - Files with issues

## Best Practices

1. **Start minimal** - Add rules incrementally
2. **Test exemptions** - Verify they work before deployment
3. **Document rules** - Explain why each rule is included
4. **Set expiration dates** - Exemptions should be temporary
5. **Version dependencies** - Use ranges for flexibility
6. **Review patterns** - Test include/exclude carefully

## Example Archetypes

Reference existing archetypes:
- `node-fullstack` - Full-featured Node.js template
- `java-microservice` - Java Spring Boot template

## Files Reference

| Purpose | Location |
|---------|----------|
| Archetypes | `packages/x-fidelity-democonfig/src/*.json` |
| Rules | `packages/x-fidelity-democonfig/src/rules/` |
| Exemptions | `packages/x-fidelity-democonfig/src/*-exemptions/` |
| Config schema | `packages/x-fidelity-types/src/config.ts` |
