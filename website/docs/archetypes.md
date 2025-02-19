---
sidebar_position: 4
---

# Archetypes

Archetypes are predefined configuration templates that define how x-fidelity should analyze different types of projects.

## What is an Archetype?

An archetype defines:
- Rules to apply
- Required directory structure
- Minimum dependency versions
- File patterns to analyze
- Custom operators and facts to use

## Archetype Structure

```json
{
    "name": "node-fullstack",
    "rules": [
        "sensitiveLogging-iterative",
        "outdatedFramework-global",
        "noDatabases-iterative"
    ],
    "operators": [
        "fileContains",
        "outdatedFramework",
        "nonStandardDirectoryStructure"
    ],
    "facts": [
        "repoFilesystemFacts",
        "repoDependencyFacts"
    ],
    "config": {
        "minimumDependencyVersions": {
            "react": ">=17.0.0",
            "typescript": "^4.0.0"
        },
        "standardStructure": {
            "src": {
                "components": null,
                "utils": null
            }
        },
        "blacklistPatterns": [
            ".*\\/\\..*",
            ".*\\.(log|lock)$",
            ".*\\/(dist|build|node_modules)(\\/.*|$)"
        ],
        "whitelistPatterns": [
            ".*\\.(ts|tsx|js|jsx)$"
        ]
    }
}
```

## Configuration Options

### Rules

The `rules` array lists all rules that should be applied to projects using this archetype. Rules can be:
- **Global**: Applied once per repository (suffix `-global`)
- **Iterative**: Applied to each matching file (suffix `-iterative`)

### Operators

The `operators` array defines which operators are available for use in rules. Common operators include:
- `fileContains`: Check file contents for patterns
- `outdatedFramework`: Check dependency versions
- `nonStandardDirectoryStructure`: Validate directory structure

### Facts

The `facts` array specifies which fact providers to use. Built-in facts include:
- `repoFilesystemFacts`: File system information
- `repoDependencyFacts`: Dependency version data
- `openaiAnalysisFacts`: AI-powered analysis results

### Config Section

#### minimumDependencyVersions

Defines minimum required versions for dependencies using semver ranges:
```json
"minimumDependencyVersions": {
    "react": ">=17.0.0",
    "typescript": "^4.0.0"
}
```

#### standardStructure

Defines the expected directory structure:
```json
"standardStructure": {
    "src": {
        "components": null,
        "utils": null
    }
}
```
- Use `null` for leaf directories
- Nested objects for subdirectories

#### blacklistPatterns

Array of regex patterns for files to exclude:
```json
"blacklistPatterns": [
    ".*\\/\\..*",  // Hidden files
    ".*\\.(log|lock)$",  // Log and lock files
    ".*\\/(dist|build|node_modules)(\\/.*|$)"  // Build directories
]
```

#### whitelistPatterns

Array of regex patterns for files to include:
```json
"whitelistPatterns": [
    ".*\\.(ts|tsx|js|jsx)$"  // TypeScript and JavaScript files
]
```

## Creating Custom Archetypes

1. Create a new JSON file named `your-archetype.json`
2. Define required sections: name, rules, operators, facts, and config
3. Place in your local config directory or on your config server
4. Use with the `-a` or `--archetype` option:
```bash
xfidelity . -a your-archetype
```

## Best Practices

1. **Naming Convention**: Use descriptive names like `node-fullstack` or `java-microservice`
2. **Rule Selection**: Include both global and iterative rules for comprehensive checks
3. **Dependency Management**: Keep minimum versions up to date with security patches
4. **File Patterns**: Be specific with whitelist/blacklist patterns
5. **Directory Structure**: Define structures that match your organization's standards

## Next Steps

- Learn about [Rules](rules)
- Explore [Operators](operators)
- Understand [Facts](facts)
