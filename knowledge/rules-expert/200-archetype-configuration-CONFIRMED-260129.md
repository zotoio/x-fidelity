# Topic: Archetype Configuration

## Fact: Archetype JSON Structure Overview
### Modified: 2026-01-29
### Priority: H

An archetype defines a project template with rules, plugins, and configuration for code analysis:

```json
{
    "name": "node-fullstack",
    "rules": [
        "sensitiveLogging-iterative",
        "outdatedFramework-global",
        "functionComplexity-iterative"
    ],
    "config": {
        "minimumDependencyVersions": { ... },
        "standardStructure": { ... },
        "blacklistPatterns": [ ... ],
        "whitelistPatterns": [ ... ],
        "requiredFiles": [ ... ],
        "sensitiveFileFalsePositives": [ ... ],
        "notifications": { ... }
    }
}
```

**Top-level Fields:**
- `name`: Unique archetype identifier used for config loading and exemptions
- `rules`: Array of rule names to apply (both global and iterative)
- `config`: Object containing all configuration options

The archetype name is critical - it's used to:
1. Load the archetype JSON file: `{name}.json`
2. Load exemptions: `{name}-exemptions.json` or `{name}-exemptions/` directory
3. Reference in `.xfi-config.json`: `"archetype": "node-fullstack"`

### References
1. [node-fullstack.json](../../packages/x-fidelity-democonfig/src/node-fullstack.json)
2. [exemptionUtils.ts - archetype in exemption loading](../../packages/x-fidelity-core/src/utils/exemptionUtils.ts)

---

## Fact: File Patterns - Whitelist and Blacklist Configuration
### Modified: 2026-01-29
### Priority: H

Archetypes control which files are analyzed using regex patterns:

**Blacklist Patterns** (files to exclude):
```json
{
    "blacklistPatterns": [
        ".*\\/\\..*",                    // Hidden files/directories
        ".*\\.(log|lock|txt)$",          // Non-source files
        ".*\\/(dist|coverage|build|node_modules|tmp|temp|out)(\\/.*|$)"
    ]
}
```

**Whitelist Patterns** (files to include):
```json
{
    "whitelistPatterns": [
        ".*\\.(ts|tsx|js|jsx|json)$",    // Source files
        ".*\\.env$",                      // Environment files
        ".*\\/README\\.md$"               // Documentation
    ]
}
```

**Pattern Evaluation Order:**
1. File must match at least one whitelist pattern
2. File must NOT match any blacklist pattern
3. Both conditions must be true for the file to be analyzed

**Important:** Patterns are JavaScript regular expressions (not globs). Characters like `/` and `.` must be escaped.

### References
1. [node-fullstack.json - pattern configuration](../../packages/x-fidelity-democonfig/src/node-fullstack.json)

---

## Fact: Minimum Dependency Version Configuration
### Modified: 2026-01-29
### Priority: H

Archetypes can enforce minimum (or maximum) versions for dependencies:

```json
{
    "config": {
        "minimumDependencyVersions": {
            "@types/react": ">=18.0.0",           // Greater than or equal
            "react": "18.2.0",                     // Exact version
            "typescript": "5.0.0",                 // Minimum version
            "node": "18.0.0",                      // Runtime version
            "@yarnpkg/lockfile": "<1.2.0",        // Less than (max version)
            "commander": ">=2.0.0 <13.0.0",       // Range constraint
            "@colors/colors": "1.7.0 || 1.6.0"    // Multiple allowed versions
        }
    }
}
```

**Version Specifier Formats:**
- `X.Y.Z`: Minimum version (semantic versioning)
- `>=X.Y.Z`: Explicitly greater than or equal
- `<X.Y.Z`: Maximum version (less than)
- `>=X.Y.Z <A.B.C`: Range with upper bound
- `X.Y.Z || A.B.C`: Multiple allowed versions (OR)

The `repoDependencyAnalysis` fact and `outdatedFramework` operator work together to check these versions against the project's `package.json` dependencies.

### References
1. [node-fullstack.json - minimumDependencyVersions](../../packages/x-fidelity-democonfig/src/node-fullstack.json)
2. [outdatedFramework-global-rule.json](../../packages/x-fidelity-democonfig/src/rules/outdatedFramework-global-rule.json)

---

## Fact: Standard Structure and Required Files Configuration
### Modified: 2026-01-29
### Priority: M

Archetypes can define expected project structure and required files:

**Standard Structure:**
```json
{
    "config": {
        "standardStructure": {
            "src": {
                "components": null,
                "utils": null,
                "config": null,
                "facts": null
            },
            "package.json": null,
            "README.md": null
        }
    }
}
```

Structure is a nested object where:
- Keys are directory/file names
- `null` value means the item should exist
- Nested objects define subdirectory structure

**Required Files:**
```json
{
    "config": {
        "requiredFiles": [
            "README.md",
            "package.json",
            "src/index.js"
        ]
    }
}
```

Required files is a flat array of paths that must exist in the repository. The `missingRequiredFiles` fact checks for these files.

**False Positives Configuration:**
```json
{
    "config": {
        "sensitiveFileFalsePositives": [
            "src/components/SensitiveLogging.tsx"
        ]
    }
}
```

This allows excluding specific files from sensitive data detection rules.

### References
1. [node-fullstack.json - structure configuration](../../packages/x-fidelity-democonfig/src/node-fullstack.json)
2. [missingRequiredFiles-global-rule.json](../../packages/x-fidelity-democonfig/src/rules/missingRequiredFiles-global-rule.json)
